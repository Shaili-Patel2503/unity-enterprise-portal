
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import path from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = "product-images";
const OUTPUT_FOLDER = "optimized";
const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 82;
const MIN_SIZE_TO_OPTIMIZE = 500 * 1024;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function listImages(folder = "", depth = 0) {
  if (depth > 10) {
    throw new Error(`Folder nesting is unexpectedly deep: ${folder}`);
  }

  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 100,
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    throw new Error(`Cannot list ${folder || "/"}: ${error.message}`);
  }

  const results = [];

  for (const item of data ?? []) {
    const filePath = folder ? `${folder}/${item.name}` : item.name;

    // Ignore our output folder so repeated runs do not process copies.
    if (
      filePath === OUTPUT_FOLDER ||
      filePath.startsWith(`${OUTPUT_FOLDER}/`)
    ) {
      continue;
    }

    if (!item.id) {
      results.push(...(await listImages(filePath, depth + 1)));
      continue;
    }

    if (!/\.(jpe?g|png|webp|tif?f|avif)$/i.test(item.name)) {
      continue;
    }

    results.push({
      path: filePath,
      size: Number(item.metadata?.size ?? 0),
      type: String(item.metadata?.mimetype ?? ""),
    });
  }

  return results;
}

async function downloadImage(filePath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath);

  if (error) {
    throw new Error(`Download failed for ${filePath}: ${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

async function main() {
  console.log(`\nReading images from "${BUCKET}"...`);
  console.log("Original images will not be changed or deleted.\n");

  const images = await listImages();
  const candidates = images.filter(
    (image) => image.size >= MIN_SIZE_TO_OPTIMIZE
  );

  console.log(`Images found: ${images.length}`);
  console.log(`Images at least 500 KB: ${candidates.length}`);
  console.log(`Destination folder: ${OUTPUT_FOLDER}/\n`);

  if (!candidates.length) {
    console.log("No images need optimisation.");
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let originalBytes = 0;
  let optimizedBytes = 0;

  for (const image of candidates) {
    try {
      console.log(`Processing: ${image.path}`);

      const original = await downloadImage(image.path);

      const metadata = await sharp(original, {
        failOn: "error",
      }).metadata();

      let pipeline = sharp(original).rotate().resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      });

      let output;
      let outputPath;

      if (metadata.hasAlpha) {
        output = await pipeline.png({ compressionLevel: 9 }).toBuffer();
        outputPath = `${OUTPUT_FOLDER}/${image.path.replace(/\.[^.]+$/, "")}.png`;
      } else {
        output = await pipeline.jpeg({
          quality: JPEG_QUALITY,
          mozjpeg: true,
        }).toBuffer();
        outputPath = `${OUTPUT_FOLDER}/${image.path.replace(/\.[^.]+$/, "")}.jpg`;
      }

      if (output.length >= original.length) {
        console.log(
          `  Skipped: compressed copy would not be smaller (${formatBytes(output.length)}).`
        );
        skipped++;
        continue;
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(outputPath, output, {
          contentType: outputPath.endsWith(".png")
            ? "image/png"
            : "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        if (uploadError.message.toLowerCase().includes("already exists")) {
          console.log("  Skipped: destination copy already exists.");
          skipped++;
          continue;
        }
        throw new Error(uploadError.message);
      }

      uploaded++;
      originalBytes += original.length;
      optimizedBytes += output.length;

      const saving = Math.round(
        (1 - output.length / original.length) * 100
      );

      console.log(
        `  Uploaded copy: ${outputPath}\n` +
          `  ${formatBytes(original.length)} → ${formatBytes(output.length)} (${saving}% smaller)`
      );
    } catch (error) {
      failed++;
      console.error(`  ERROR: ${error.message}`);
    }
  }

  console.log("\nCopy creation summary");
  console.log("---------------------");
  console.log(`Uploaded compressed copies: ${uploaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Original size of uploaded copies: ${formatBytes(originalBytes)}`);
  console.log(`Compressed copy size: ${formatBytes(optimizedBytes)}`);

  console.log(
    "\nIMPORTANT: Product records still point to the original images. " +
      "No product records or original files were changed."
  );
  console.log(
    "Review the copies before switching any product image paths.\n"
  );
}

main().catch((error) => {
  console.error("\nOptimisation failed:", error.message);
  process.exitCode = 1;
});
