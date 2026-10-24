import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "product-images";
const OUTPUT_FOLDER = "optimized";
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase URL or service role key in .env.local");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function listFiles(folder = "", depth = 0) {
  if (depth > 10) throw new Error(`Folder nesting is too deep: ${folder}`);
  const results = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Cannot list ${folder || "/"}: ${error.message}`);
    for (const item of data ?? []) {
      const filePath = folder ? `${folder}/${item.name}` : item.name;
      // Exclude optimized copies only when scanning the original root.
      if (
        !folder &&
        (filePath === OUTPUT_FOLDER ||
          filePath.startsWith(`${OUTPUT_FOLDER}/`))
      ) continue;
      if (!item.id) {
        results.push(...(await listFiles(filePath, depth + 1)));
      } else if (/\.(jpe?g|png|webp|tif?f|avif)$/i.test(item.name)) {
        results.push(filePath);
      }
    }
    if (!data || data.length < pageSize) break;
  }
  return results;
}
function basePath(filePath) {
  return filePath.replace(/\.[^.]+$/, "");
}
async function main() {
  console.log("Reading original and optimized image paths...");
  const originalPaths = await listFiles();
  const optimizedPaths = await listFiles(OUTPUT_FOLDER);
  const optimizedByBase = new Map(
    optimizedPaths.map((filePath) => [
      basePath(filePath.slice(OUTPUT_FOLDER.length + 1)),
      filePath,
    ])
  );
  const { data: products, error } = await supabase
    .from("products")
    .select("id, image_urls");
  if (error) throw new Error(`Could not read products: ${error.message}`);
  const originalSet = new Set(originalPaths);
  const changes = [];
  const missingOriginals = [];
  const unmatched = [];
  for (const product of products ?? []) {
    const paths = Array.isArray(product.image_urls) ? product.image_urls : [];
    for (const oldPath of paths) {
      if (typeof oldPath !== "string" || !oldPath) continue;
      if (!originalSet.has(oldPath)) {
        missingOriginals.push({ productId: product.id, path: oldPath });
        continue;
      }
      const replacement = optimizedByBase.get(basePath(oldPath));
      if (replacement && replacement !== oldPath) {
        changes.push({ productId: product.id, oldPath, newPath: replacement });
      } else if (!replacement) {
        unmatched.push({ productId: product.id, path: oldPath });
      }
    }
  }
  const report = {
    generatedAt: new Date().toISOString(),
    databaseUpdated: false,
    originalsDeleted: false,
    productsRead: products?.length ?? 0,
    originalImageFilesFound: originalPaths.length,
    optimizedImageFilesFound: optimizedPaths.length,
    pathsToChange: changes.length,
    productsWithImageChanges: new Set(changes.map(x => x.productId)).size,
    missingOriginalPaths: missingOriginals,
    unmatchedOriginalPaths: unmatched,
    changes,
  };
  const outputPath = "scripts/image-path-preview.json";
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");
  console.log("\nPreview complete. No database changes were made.");
  console.log(`Products read: ${report.productsRead}`);
  console.log(`Original image files found: ${report.originalImageFilesFound}`);
  console.log(`Optimized image files found: ${report.optimizedImageFilesFound}`);
  console.log(`Image paths that can be changed: ${report.pathsToChange}`);
  console.log(`Products affected: ${report.productsWithImageChanges}`);
  console.log(`Original paths not found: ${missingOriginals.length}`);
  console.log(`Paths without optimized copies: ${unmatched.length}`);
  console.log(`Report saved to: ${outputPath}`);
}
main().catch(error => {
  console.error("\nPreview failed:", error.message);
  process.exitCode = 1;
});
