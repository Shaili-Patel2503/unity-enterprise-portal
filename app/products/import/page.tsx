"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import imageCompression from "browser-image-compression";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import {
  extractEmbeddedProductImages,
  type EmbeddedProductImage,
  type WorkbookImageScan,
} from "@/lib/product-import/excel";

type PhotoStatus = "found" | "missing" | "ambiguous";

type ProductPreviewRow = {
  excelRow: number;
  model: string;
  name: string;
  category: string;
  size: string;
  colors: string;
  cost: string;
  sellingPrice: string;
  description: string;
  photos: EmbeddedProductImage[];
  photoStatus: PhotoStatus;
  errors: string[];
  warnings: string[];
};

type PreviewReport = {
  worksheet: string;
  headerExcelRow: number;
  skippedSampleRows: number;
  embeddedMediaCount: number;
  matchedImageCount: number;
  parserWarnings: string[];
};

type ImportResult = {
  excelRow: number;
  model: string;
  name: string;
  status: "success" | "failed";
  message: string;
};

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeHeader(value: unknown): string {
  return cellText(value)
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findColumn(
  headers: unknown[],
  predicate: (header: string) => boolean
): number {
  return headers.findIndex((header) => predicate(normalizeHeader(header)));
}

function parseOptionalNonNegativeNumber(value: string): boolean {
  if (!value) return true;

  const cleaned = value.replace(/[₹,\s]/g, "");
  if (!cleaned) return true;

  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 0;
}

function parseOptionalNumber(value: string): number | null {
  if (!value) return null;

  const cleaned = value.replace(/[₹,\s]/g, "");
  if (!cleaned) return null;

  const number = Number(cleaned);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`"${value}" is not a valid non-negative number.`);
  }

  return number;
}

function columnLetter(zeroBasedColumn: number): string {
  let n = zeroBasedColumn + 1;
  let result = "";

  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }

  return result;
}

function uniqueImages(
  images: EmbeddedProductImage[]
): EmbeddedProductImage[] {
  return Array.from(
    new Map(
      images.map((image) => [image.mediaPath.toLowerCase(), image])
    ).values()
  );
}

function makeSlug(model: string): string {
  const slug = model
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error(`Could not create a slug for model "${model}".`);
  }

  return slug;
}

async function compressProductPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" is not an image.`);
  }

  if (file.size <= 250 * 1024 && file.type === "image/jpeg") {
    return file;
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 0.25,
    maxWidthOrHeight: 1400,
    useWebWorker: true,
    initialQuality: 0.82,
    fileType: "image/jpeg",
  });

  return new File(
    [compressed],
    `${file.name.replace(/\.[^.]+$/, "")}.jpg`,
    {
      type: "image/jpeg",
      lastModified: Date.now(),
    }
  );
}

/**
 * Excel's embedded image blobs sometimes arrive without a MIME type.
 * Detect the image from the filename first, then fall back to its
 * binary signature.
 */
async function objectUrlToFile(
  url: string,
  fileName: string
): Promise<File> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not read embedded image "${fileName}".`);
  }

  const blob = await response.blob();

  let mimeType = blob.type;

  const extension = fileName
    .split(".")
    .pop()
    ?.toLowerCase();

  const extensionMimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
  };

  if (!mimeType.startsWith("image/") && extension) {
    mimeType = extensionMimeTypes[extension] || "";
  }

  if (!mimeType.startsWith("image/")) {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 16));

    const startsWith = (signature: number[]) =>
      signature.every((byte, index) => bytes[index] === byte);

    if (startsWith([0x89, 0x50, 0x4e, 0x47])) {
      mimeType = "image/png";
    } else if (
      startsWith([0xff, 0xd8, 0xff])
    ) {
      mimeType = "image/jpeg";
    } else if (
      startsWith([0x47, 0x49, 0x46, 0x38])
    ) {
      mimeType = "image/gif";
    } else if (
      startsWith([0x52, 0x49, 0x46, 0x46]) &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      mimeType = "image/webp";
    } else if (
      startsWith([0x42, 0x4d])
    ) {
      mimeType = "image/bmp";
    } else if (
      startsWith([0x49, 0x49, 0x2a, 0x00]) ||
      startsWith([0x4d, 0x4d, 0x00, 0x2a])
    ) {
      mimeType = "image/tiff";
    }
  }

  if (!mimeType.startsWith("image/")) {
    throw new Error(
      `Embedded file "${fileName}" is not a supported image.`
    );
  }

  return new File([blob], fileName, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

export default function ProductImportPage() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ProductPreviewRow[]>([]);
  const [report, setReport] = useState<PreviewReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importComplete, setImportComplete] = useState(false);

  const objectUrlsRef = useRef<string[]>([]);

  function clearObjectUrls() {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }

    objectUrlsRef.current = [];
  }

  useEffect(() => {
    return () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    input.value = "";

    if (!file) return;

    clearObjectUrls();
    setFileName(file.name);
    setRows([]);
    setReport(null);
    setError("");
    setImportResults([]);
    setImportComplete(false);
    setLoading(true);

    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        throw new Error("Please upload an Excel .xlsx file.");
      }

      if (file.size > 30 * 1024 * 1024) {
        throw new Error(
          "This workbook is larger than 30 MB. Please compress the product photos and try again."
        );
      }

      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });

      const worksheetName =
        workbook.SheetNames.find(
          (name) => name.trim().toLowerCase() === "products"
        ) || workbook.SheetNames[0];

      if (!worksheetName) {
        throw new Error("No worksheet was found in the Excel workbook.");
      }

      const worksheet = workbook.Sheets[worksheetName];

      const rawRows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        blankrows: true,
        raw: false,
      }) as unknown[][];

      const headerIndex = rawRows.findIndex((row) => {
        const headers = row.map(normalizeHeader);

        return (
          headers.some(
            (header) =>
              header === "model number" ||
              header === "model" ||
              header.startsWith("model number ")
          ) &&
          headers.some(
            (header) =>
              header === "product name" ||
              header.startsWith("product name ")
          ) &&
          headers.some((header) => header === "category")
        );
      });

      if (headerIndex < 0) {
        throw new Error(
          'Could not locate the column-header row. Use the "Products" sheet from the Unity Enterprise template.'
        );
      }

      const headers = rawRows[headerIndex];

      const columns = {
        model: findColumn(
          headers,
          (value) =>
            value === "model number" ||
            value === "model" ||
            value.startsWith("model number ")
        ),
        name: findColumn(
          headers,
          (value) =>
            value === "product name" || value.startsWith("product name ")
        ),
        category: findColumn(
          headers,
          (value) => value === "category"
        ),
        size: findColumn(headers, (value) => value === "size"),
        colors: findColumn(
          headers,
          (value) =>
            value === "colours" ||
            value === "colors" ||
            value === "colour" ||
            value === "color"
        ),
        cost: findColumn(
          headers,
          (value) => value === "landed cost" || value === "cost"
        ),
        sellingPrice: findColumn(
          headers,
          (value) =>
            value === "selling price" || value === "price"
        ),
        description: findColumn(
          headers,
          (value) =>
            value === "public description" || value === "description"
        ),
        photo: findColumn(
          headers,
          (value) => value.includes("product photo")
        ),
      };

      if (
        columns.model < 0 ||
        columns.name < 0 ||
        columns.category < 0 ||
        columns.photo < 0
      ) {
        throw new Error(
          "The Products sheet must contain Model Number, Product Name, Category and Product Photo columns."
        );
      }

      const scan: WorkbookImageScan =
        await extractEmbeddedProductImages(file, (url) => {
          objectUrlsRef.current.push(url);
        });

      const embeddedImages = scan.images;
      let skippedSampleRows = 0;

      const baseRows: ProductPreviewRow[] = [];

      for (
        let arrayIndex = headerIndex + 1;
        arrayIndex < rawRows.length;
        arrayIndex += 1
      ) {
        const cells = rawRows[arrayIndex] || [];

        const excelRow = arrayIndex + 1;

        const imagesOnThisRow = uniqueImages(
          embeddedImages.filter((image) => image.excelRow === excelRow)
        );

        const relevantColumns = [
          columns.model,
          columns.name,
          columns.category,
          columns.size,
          columns.colors,
          columns.cost,
          columns.sellingPrice,
          columns.description,
        ].filter((index) => index >= 0);

        const hasProductData = relevantColumns.some(
          (column) => cellText(cells[column]) !== ""
        );

        const hasEmbeddedImage = imagesOnThisRow.length > 0;

        if (!hasProductData && !hasEmbeddedImage) {
          continue;
        }

        const model = cellText(cells[columns.model]);
        const name = cellText(cells[columns.name]);

        if (model.toUpperCase() === "SAMPLE-DELETE") {
          skippedSampleRows += 1;
          continue;
        }

        const category = cellText(cells[columns.category]);

        const size =
          columns.size >= 0 ? cellText(cells[columns.size]) : "";

        const colors =
          columns.colors >= 0 ? cellText(cells[columns.colors]) : "";

        const cost =
          columns.cost >= 0 ? cellText(cells[columns.cost]) : "";

        const sellingPrice =
          columns.sellingPrice >= 0
            ? cellText(cells[columns.sellingPrice])
            : "";

        const description =
          columns.description >= 0
            ? cellText(cells[columns.description])
            : "";

        const photoColumnImages = imagesOnThisRow.filter(
          (image) => image.columnIndex === columns.photo
        );

        const usedColumnFallback = photoColumnImages.length === 0;

        const photos = uniqueImages(
          photoColumnImages.length > 0
            ? photoColumnImages
            : imagesOnThisRow
        );

        const photoStatus: PhotoStatus =
          photos.length === 1
            ? "found"
            : photos.length > 1
              ? "ambiguous"
              : "missing";

        const errors: string[] = [];
        const warnings: string[] = [];

        if (!model) {
          errors.push("Model Number is required.");
        }

        if (!name) {
          errors.push("Product Name is required.");
        }

        if (!category) {
          errors.push("Category is required.");
        }

        if (!parseOptionalNonNegativeNumber(cost)) {
          errors.push("Landed Cost must be a non-negative number.");
        }

        if (!parseOptionalNonNegativeNumber(sellingPrice)) {
          errors.push("Selling Price must be a non-negative number.");
        }

        if (usedColumnFallback && photos.length > 0) {
          const imageColumns = Array.from(
            new Set(
              photos.map((image) =>
                columnLetter(image.columnIndex)
              )
            )
          );

          warnings.push(
            `Photo matched using its Excel row anchor. Its top-left anchor is in column ${imageColumns.join(", ")}, rather than the Product Photo column. The photo will still be used for this row.`
          );
        }

        if (photoColumnImages.length > 0) {
          const extraImages = imagesOnThisRow.filter(
            (image) => image.columnIndex !== columns.photo
          );

          if (extraImages.length > 0) {
            const extraColumns = Array.from(
              new Set(
                extraImages.map((image) =>
                  columnLetter(image.columnIndex)
                )
              )
            );

            warnings.push(
              `Additional picture(s) are anchored to this row in column ${extraColumns.join(", ")}. Pictures in the Product Photo column were preferred.`
            );
          }
        }

        if (photoStatus === "missing") {
          errors.push(
            "No embedded photo was found with an anchor on this product's Excel row."
          );

          const photoCellText = cellText(cells[columns.photo]);

          if (
            photoCellText &&
            !photoCellText.toLowerCase().includes("insert photo")
          ) {
            warnings.push(
              "The Product Photo cell contains text, but no embedded picture was matched to this row."
            );
          }
        }

        if (photoStatus === "ambiguous") {
          errors.push(
            "Multiple different embedded photos match this product row. Review the pictures so that the correct photo can be identified."
          );
        }

        baseRows.push({
          excelRow,
          model,
          name,
          category,
          size,
          colors,
          cost,
          sellingPrice,
          description,
          photos,
          photoStatus,
          errors,
          warnings,
        });
      }

      const modelCounts = new Map<string, number>();

      for (const row of baseRows) {
        if (!row.model) continue;

        const key = row.model.trim().toLowerCase();
        modelCounts.set(
          key,
          (modelCounts.get(key) || 0) + 1
        );
      }

      const parsedRows = baseRows.map((row) => {
        const errors = [...row.errors];

        if (
          row.model &&
          (modelCounts.get(
            row.model.trim().toLowerCase()
          ) || 0) > 1
        ) {
          errors.push(
            "Duplicate Model Number within this Excel workbook."
          );
        }

        return { ...row, errors };
      });

      const parserWarnings = [...scan.warnings];

      if (scan.embeddedMediaCount === 0) {
        parserWarnings.push(
          "No embedded image files were detected. In Excel 2019, select the destination cell using the Name Box beside the formula bar, then choose Insert > Pictures > This Device. Save as .xlsx and upload again."
        );
      } else if (scan.images.length === 0) {
        parserWarnings.push(
          "The workbook contains embedded media, but no pictures could be matched to worksheet rows. Open and save the workbook again in Excel 2019, then upload it again."
        );
      }

      if (parsedRows.length === 0) {
        parserWarnings.push(
          "No product rows were found. The SAMPLE-DELETE row is intentionally ignored. Add product data beneath the column headers."
        );
      }

      setRows(parsedRows);

      setReport({
        worksheet: worksheetName,
        headerExcelRow: headerIndex + 1,
        skippedSampleRows,
        embeddedMediaCount: scan.embeddedMediaCount,
        matchedImageCount: scan.images.length,
        parserWarnings,
      });
    } catch (cause) {
      console.error(
        "Product workbook preview failed:",
        cause
      );

      clearObjectUrls();

      setError(
        cause instanceof Error
          ? cause.message
          : "Could not read this workbook. Please check that it is a valid .xlsx file."
      );
    } finally {
      setLoading(false);
    }
  }

  async function importProducts() {
    if (rows.length === 0) {
      setError("There are no product rows to import.");
      return;
    }

    const rowsWithErrors = rows.filter(
      (row) => row.errors.length > 0
    );

    if (rowsWithErrors.length > 0) {
      setError(
        "Import is blocked because one or more product rows have validation errors. Fix the workbook and upload it again."
      );
      return;
    }

    if (importing) return;

    setImporting(true);
    setError("");
    setImportResults([]);
    setImportComplete(false);

    const supabase = createClient();
    const results: ImportResult[] = [];

    try {
      const modelValues = rows.map(
        (row) => row.model.trim()
      );

      const modelKeys = modelValues.map((model) =>
        model.toLowerCase()
      );

      const uniqueModels = Array.from(
        new Set(modelValues)
      );

      const { data: existingProducts, error: existingError } =
        await supabase
          .from("products")
          .select("model, slug")
          .in("model", uniqueModels);

      if (existingError) {
        throw new Error(
          `Could not check existing products: ${existingError.message}`
        );
      }

      const existingModelKeys = new Set(
        (existingProducts || []).map((product) =>
          String(product.model).trim().toLowerCase()
        )
      );

      const existingSlugs = new Set(
        (existingProducts || [])
          .map((product) =>
            product.slug
              ? String(product.slug).trim().toLowerCase()
              : ""
          )
          .filter(Boolean)
      );

      const plannedSlugs = new Set<string>();

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const modelKey = modelKeys[index];

        if (existingModelKeys.has(modelKey)) {
          results.push({
            excelRow: row.excelRow,
            model: row.model,
            name: row.name,
            status: "failed",
            message:
              "A product with this Model Number already exists in Supabase. Nothing was uploaded for this row.",
          });

          continue;
        }

        let slug = "";

        try {
          slug = makeSlug(row.model);
        } catch (cause) {
          results.push({
            excelRow: row.excelRow,
            model: row.model,
            name: row.name,
            status: "failed",
            message:
              cause instanceof Error
                ? cause.message
                : "Could not create product slug.",
          });

          continue;
        }

        if (
          existingSlugs.has(slug) ||
          plannedSlugs.has(slug)
        ) {
          results.push({
            excelRow: row.excelRow,
            model: row.model,
            name: row.name,
            status: "failed",
            message:
              "The generated product slug already exists. Nothing was uploaded for this row.",
          });

          continue;
        }

        plannedSlugs.add(slug);

        let uploadedPath = "";

        try {
          if (row.photos.length !== 1) {
            throw new Error(
              "Exactly one matched product photo is required before import."
            );
          }

          const originalFile = await objectUrlToFile(
            row.photos[0].url,
            row.photos[0].fileName
          );

          const compressedPhoto =
            await compressProductPhoto(originalFile);

          const safeModel = row.model.replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
          );

          uploadedPath = `${safeModel}/${crypto.randomUUID()}.jpg`;

          const { error: uploadError } =
            await supabase.storage
              .from("product-images")
              .upload(
                uploadedPath,
                compressedPhoto,
                {
                  contentType: "image/jpeg",
                  upsert: false,
                }
              );

          if (uploadError) {
            throw new Error(
              `Photo upload failed: ${uploadError.message}`
            );
          }

          const landedCost =
            parseOptionalNumber(row.cost);

          const sellingPrice =
            parseOptionalNumber(row.sellingPrice);

          const { error: insertError } =
            await supabase.from("products").insert({
              model: row.model,
              name: row.name,
              category: row.category,
              size: row.size || null,
              colors: row.colors || null,
              landed_cost: landedCost,
              selling_price: sellingPrice,
              notes: null,
              public_description:
                row.description || null,
              is_active: false,
              is_new_arrival: false,
              catalog_available: false,
              stock_count_verified: false,
              image_urls: [uploadedPath],
              slug,
            });

          if (insertError) {
            await supabase.storage
              .from("product-images")
              .remove([uploadedPath]);

            uploadedPath = "";

            throw new Error(
              `Product record creation failed: ${insertError.message}`
            );
          }

          results.push({
            excelRow: row.excelRow,
            model: row.model,
            name: row.name,
            status: "success",
            message:
              "Product record created successfully. Photo uploaded. Product remains inactive, unavailable from the public catalog, and stock-unverified.",
          });
        } catch (cause) {
          if (uploadedPath) {
            await supabase.storage
              .from("product-images")
              .remove([uploadedPath]);
          }

          results.push({
            excelRow: row.excelRow,
            model: row.model,
            name: row.name,
            status: "failed",
            message:
              cause instanceof Error
                ? cause.message
                : "Import failed for this row.",
          });
        }
      }

      setImportResults(results);
      setImportComplete(true);

      const failedCount = results.filter(
        (result) => result.status === "failed"
      ).length;

      if (failedCount > 0) {
        setError(
          `${failedCount} row(s) were not imported. Review the import results below.`
        );
      }
    } catch (cause) {
      console.error(
        "Product import failed:",
        cause
      );

      setError(
        cause instanceof Error
          ? cause.message
          : "The product import could not be completed."
      );
    } finally {
      setImporting(false);
    }
  }

  const rowErrorCount = rows.filter(
    (row) => row.errors.length > 0
  ).length;

  const rowsWithPhotos = rows.filter(
    (row) => row.photoStatus === "found"
  ).length;

  const successfulImports = importResults.filter(
    (result) => result.status === "success"
  ).length;

  const failedImports = importResults.filter(
    (result) => result.status === "failed"
  ).length;

  const importBlocked =
    rows.length === 0 ||
    rowErrorCount > 0 ||
    importing ||
    importComplete;

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-4 py-8 text-[#302a24] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <a
          href="/products"
          className="text-sm font-semibold text-[#8a6535] hover:underline"
        >
          &larr; Back to Products
        </a>

        <header className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a17a3e]">
            Unity Enterprise
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Import Products from Excel
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#817565]">
            Upload your completed workbook to preview product details and
            embedded bag photos. New products remain inactive and hidden from
            the public catalog until they are reviewed.
          </p>
        </header>

        <section className="mt-8 rounded-3xl border border-[#e9dfce] bg-[#fffdf8] p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                1. Upload your Excel workbook
              </h2>

              <p className="mt-1 text-sm leading-6 text-[#817565]">
                Supports embedded photos inserted in Excel 2019, including
                floating pictures anchored to worksheet rows.
              </p>
            </div>

            <a
              href="/Unity-Enterprise-Product-Import-Template.xlsx"
              download
              className="inline-flex items-center justify-center rounded-full border border-[#d7c5a5] bg-white px-5 py-3 text-sm font-semibold text-[#66502e] transition hover:bg-[#f8f1e6]"
            >
              Download Template
            </a>
          </div>

          <div className="mt-5 rounded-2xl border border-[#e9dfce] bg-[#faf7f0] p-4 text-sm leading-6 text-[#665b4d]">
            <p className="font-semibold text-[#302a24]">
              How to add photos in Excel 2019
            </p>

            <p className="mt-2">
              Select the Product Photo cell by using Excel&apos;s Name Box
              beside the formula bar. You can type the cell address even when
              a large picture is covering that cell.
            </p>

            <p className="mt-2">
              Then choose <strong>Insert &gt; Pictures &gt; This Device</strong>.
              Matching uses the picture&apos;s top-left anchor row. The picture
              may extend over nearby cells; it does not need to fit entirely
              inside one cell.
            </p>
          </div>

          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d9cbb5] bg-[#faf7f0] px-6 py-12 text-center transition hover:border-[#a17a3e]">
            <span className="text-4xl" aria-hidden="true">
              📊
            </span>

            <span className="mt-3 text-sm font-semibold">
              Choose completed Excel file
            </span>

            <span className="mt-1 text-xs text-[#817565]">
              .xlsx only · Maximum 30 MB
            </span>

            <input
              type="file"
              accept=".xlsx"
              onChange={handleFile}
              className="hidden"
            />
          </label>

          {fileName && (
            <div className="mt-4 rounded-xl bg-[#f4eee3] px-4 py-3 text-sm">
              <span className="font-semibold">Selected:</span>{" "}
              {fileName}
            </div>
          )}

          {loading && (
            <div className="mt-4 rounded-xl bg-[#f4eee3] px-4 py-3 text-sm">
              Reading Excel rows and inspecting embedded images...
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {report && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[#eee5d7] p-4">
                <p className="text-xs text-[#817565]">Worksheet</p>
                <p className="mt-1 font-semibold">
                  {report.worksheet}
                </p>
              </div>

              <div className="rounded-xl border border-[#eee5d7] p-4">
                <p className="text-xs text-[#817565]">
                  Embedded media files
                </p>
                <p className="mt-1 font-semibold">
                  {report.embeddedMediaCount}
                </p>
              </div>

              <div className="rounded-xl border border-[#eee5d7] p-4">
                <p className="text-xs text-[#817565]">
                  Images extracted
                </p>
                <p className="mt-1 font-semibold">
                  {report.matchedImageCount}
                </p>
              </div>

              <div className="rounded-xl border border-[#eee5d7] p-4">
                <p className="text-xs text-[#817565]">
                  Rows with a matched photo
                </p>
                <p className="mt-1 font-semibold">
                  {rowsWithPhotos}
                </p>
              </div>
            </div>
          )}
        </section>

        {report?.parserWarnings.map((warning, index) => (
          <div
            key={`${index}-${warning}`}
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900"
          >
            {warning}
          </div>
        ))}

        {report && rows.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a17a3e]">
                  Preview
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  2. Review your product rows
                </h2>
              </div>

              <div className="text-sm text-[#817565]">
                {rows.length} rows · {rowsWithPhotos} matched photos ·{" "}
                {rowErrorCount} rows with issues
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-[#e9dfce] bg-[#fffdf8]">
              <div className="overflow-x-auto">
                <table className="min-w-[1300px] w-full text-left text-sm">
                  <thead className="bg-[#f4eee3]">
                    <tr>
                      <th className="px-4 py-4 font-semibold">
                        Excel row / Photo
                      </th>
                      <th className="px-4 py-4 font-semibold">
                        Model
                      </th>
                      <th className="px-4 py-4 font-semibold">
                        Product
                      </th>
                      <th className="px-4 py-4 font-semibold">
                        Category
                      </th>
                      <th className="px-4 py-4 font-semibold">
                        Size
                      </th>
                      <th className="px-4 py-4 font-semibold">
                        Colours
                      </th>
                      <th className="px-4 py-4 font-semibold">
                        Cost
                      </th>
                      <th className="px-4 py-4 font-semibold">
                        Selling Price
                      </th>
                      <th className="px-4 py-4 font-semibold">
                        Validation
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.excelRow}
                        className="border-t border-[#eee5d7] align-top"
                      >
                        <td className="px-4 py-4">
                          <p className="mb-2 text-xs text-[#817565]">
                            Excel row {row.excelRow}
                          </p>

                          {row.photos.length === 1 ? (
                            <img
                              src={row.photos[0].url}
                              alt={
                                row.name ||
                                row.model ||
                                "Product photo"
                              }
                              className="h-24 w-24 rounded-xl border border-[#e3d7c5] bg-white object-contain"
                            />
                          ) : row.photos.length > 1 ? (
                            <div className="flex max-w-[210px] flex-wrap gap-2">
                              {row.photos.map((photo) => (
                                <img
                                  key={photo.mediaPath}
                                  src={photo.url}
                                  alt="Possible product photo match"
                                  className="h-20 w-20 rounded-xl border border-amber-300 bg-white object-contain"
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-2 text-center text-xs text-amber-800">
                              Photo missing
                            </div>
                          )}

                          <p className="mt-2 text-xs text-[#817565]">
                            {row.photoStatus === "found"
                              ? "Photo matched"
                              : row.photoStatus === "ambiguous"
                                ? "Multiple possible photos"
                                : "No matched photo"}
                          </p>
                        </td>

                        <td className="px-4 py-4 font-semibold">
                          {row.model || "—"}
                        </td>

                        <td className="px-4 py-4">
                          {row.name || "—"}
                        </td>

                        <td className="px-4 py-4">
                          {row.category || "—"}
                        </td>

                        <td className="px-4 py-4">
                          {row.size || "—"}
                        </td>

                        <td className="px-4 py-4">
                          {row.colors || "—"}
                        </td>

                        <td className="px-4 py-4">
                          {row.cost || "—"}
                        </td>

                        <td className="px-4 py-4">
                          {row.sellingPrice || "—"}
                        </td>

                        <td className="max-w-sm px-4 py-4">
                          {row.errors.length === 0 ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                              Preview checks passed
                            </span>
                          ) : (
                            <ul className="list-inside list-disc space-y-1 text-xs text-red-700">
                              {row.errors.map((message) => (
                                <li key={message}>
                                  {message}
                                </li>
                              ))}
                            </ul>
                          )}

                          {row.warnings.length > 0 && (
                            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-800">
                              {row.warnings.map((message) => (
                                <li key={message}>
                                  {message}
                                </li>
                              ))}
                            </ul>
                          )}

                          {row.description && (
                            <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#817565]">
                              {row.description}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {report.skippedSampleRows > 0 && (
              <p className="mt-3 text-sm text-[#817565]">
                Automatically skipped{" "}
                {report.skippedSampleRows} sample row
                {report.skippedSampleRows === 1 ? "" : "s"}.
              </p>
            )}
          </section>
        )}

        {report && rows.length > 0 && (
          <section className="mt-8 rounded-3xl border border-[#e9dfce] bg-[#fffdf8] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a17a3e]">
              Controlled import
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              3. Import validated products
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#817565]">
              Importing creates the product record and uploads its photo.
              Imported products remain inactive, unavailable from the public
              catalog, and stock-unverified. No inventory rows are created.
            </p>

            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              <p className="font-semibold">
                Safety state for every imported product
              </p>

              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Active: No</li>
                <li>Public catalog available: No</li>
                <li>Stock count verified: No</li>
                <li>Inventory balance/movement: None created</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={importProducts}
              disabled={importBlocked}
              className={
                importBlocked
                  ? "mt-5 cursor-not-allowed rounded-full bg-[#d9d2c6] px-5 py-3 text-sm font-semibold text-[#82796c]"
                  : "mt-5 rounded-full bg-[#8a6535] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#72542d]"
              }
            >
              {importing
                ? "Importing Products..."
                : importComplete
                  ? "Import Completed"
                  : rowErrorCount > 0
                    ? "Fix Validation Issues First"
                    : "Import Validated Products"}
            </button>

            {importResults.length > 0 && (
              <div className="mt-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#eee5d7] p-4">
                    <p className="text-xs text-[#817565]">
                      Successful
                    </p>
                    <p className="mt-1 text-xl font-semibold text-green-700">
                      {successfulImports}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#eee5d7] p-4">
                    <p className="text-xs text-[#817565]">
                      Failed
                    </p>
                    <p className="mt-1 text-xl font-semibold text-red-700">
                      {failedImports}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#eee5d7] p-4">
                    <p className="text-xs text-[#817565]">
                      Total processed
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {importResults.length}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {importResults.map((result) => (
                    <div
                      key={`${result.excelRow}-${result.model}`}
                      className={
                        result.status === "success"
                          ? "rounded-2xl border border-green-200 bg-green-50 p-4 text-sm"
                          : "rounded-2xl border border-red-200 bg-red-50 p-4 text-sm"
                      }
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold">
                          Row {result.excelRow} · {result.model}
                        </p>

                        <span
                          className={
                            result.status === "success"
                              ? "font-semibold text-green-700"
                              : "font-semibold text-red-700"
                          }
                        >
                          {result.status === "success"
                            ? "SUCCESS"
                            : "FAILED"}
                        </span>
                      </div>

                      <p className="mt-1 text-[#665b4d]">
                        {result.name}
                      </p>

                      <p className="mt-2 leading-6">
                        {result.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="mt-8 rounded-3xl border border-[#e9dfce] bg-[#fffdf8] p-6">
          <h2 className="text-lg font-semibold">
            Important import rules
          </h2>

          <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-6 text-[#817565]">
            <li>
              Each product must have exactly one matched embedded photo.
            </li>
            <li>
              Duplicate Model Numbers in the workbook are blocked.
            </li>
            <li>
              Existing Model Numbers already in Supabase are skipped.
            </li>
            <li>
              Product photos are stored in the existing private
              product-images bucket.
            </li>
            <li>
              The Storage path is saved in the product&apos;s image_urls field.
            </li>
            <li>
              No catalog_products rows are created or modified.
            </li>
            <li>
              No inventory_balances, inventory_movements, or stock_counts rows
              are created.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}