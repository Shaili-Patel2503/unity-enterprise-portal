"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
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

/**
 * Removes duplicate references to the same embedded image file.
 * Matching is based on the embedded image itself, not its displayed filename.
 */
function uniqueImages(
  images: EmbeddedProductImage[]
): EmbeddedProductImage[] {
  return Array.from(
    new Map(
      images.map((image) => [image.mediaPath.toLowerCase(), image])
    ).values()
  );
}

export default function ProductImportPage() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ProductPreviewRow[]>([]);
  const [report, setReport] = useState<PreviewReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

        // Excel rows are one-based. Blank rows are preserved above so this
        // remains aligned with the picture's worksheet anchor row.
        const excelRow = arrayIndex + 1;

        // The image's top-left anchor row determines its product row.
        // A floating picture can visually extend into other rows and columns.
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

        // Prefer pictures anchored in the Product Photo column.
        const photoColumnImages = imagesOnThisRow.filter(
          (image) => image.columnIndex === columns.photo
        );

        // Excel 2019 stores inserted pictures as floating objects.
        // If no image starts in the Product Photo column, accept pictures
        // anchored anywhere else on the same Excel row.
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
            new Set(photos.map((image) => columnLetter(image.columnIndex)))
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
                extraImages.map((image) => columnLetter(image.columnIndex))
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
        modelCounts.set(key, (modelCounts.get(key) || 0) + 1);
      }

      const parsedRows = baseRows.map((row) => {
        const errors = [...row.errors];

        if (
          row.model &&
          (modelCounts.get(row.model.trim().toLowerCase()) || 0) > 1
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
      console.error("Product workbook preview failed:", cause);

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

  const rowErrorCount = rows.filter(
    (row) => row.errors.length > 0
  ).length;

  const rowsWithPhotos = rows.filter(
    (row) => row.photoStatus === "found"
  ).length;

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
            embedded bag photos. The sample row is skipped automatically.
            No database or storage changes are made.
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
              <span className="font-semibold">Selected:</span> {fileName}
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
                <p className="mt-1 font-semibold">{report.worksheet}</p>
              </div>

              <div className="rounded-xl border border-[#eee5d7] p-4">
                <p className="text-xs text-[#817565]">Embedded media files</p>
                <p className="mt-1 font-semibold">
                  {report.embeddedMediaCount}
                </p>
              </div>

              <div className="rounded-xl border border-[#eee5d7] p-4">
                <p className="text-xs text-[#817565]">Images extracted</p>
                <p className="mt-1 font-semibold">
                  {report.matchedImageCount}
                </p>
              </div>

              <div className="rounded-xl border border-[#eee5d7] p-4">
                <p className="text-xs text-[#817565]">
                  Rows with a matched photo
                </p>
                <p className="mt-1 font-semibold">{rowsWithPhotos}</p>
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
                      <th className="px-4 py-4 font-semibold">Model</th>
                      <th className="px-4 py-4 font-semibold">Product</th>
                      <th className="px-4 py-4 font-semibold">Category</th>
                      <th className="px-4 py-4 font-semibold">Size</th>
                      <th className="px-4 py-4 font-semibold">Colours</th>
                      <th className="px-4 py-4 font-semibold">Cost</th>
                      <th className="px-4 py-4 font-semibold">
                        Selling Price
                      </th>
                      <th className="px-4 py-4 font-semibold">Validation</th>
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
                              alt={row.name || row.model || "Product photo"}
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

                        <td className="px-4 py-4">{row.name || "—"}</td>
                        <td className="px-4 py-4">{row.category || "—"}</td>
                        <td className="px-4 py-4">{row.size || "—"}</td>
                        <td className="px-4 py-4">{row.colors || "—"}</td>
                        <td className="px-4 py-4">{row.cost || "—"}</td>

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
                                <li key={message}>{message}</li>
                              ))}
                            </ul>
                          )}

                          {row.warnings.length > 0 && (
                            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-800">
                              {row.warnings.map((message) => (
                                <li key={message}>{message}</li>
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
                Automatically skipped {report.skippedSampleRows} sample row
                {report.skippedSampleRows === 1 ? "" : "s"}.
              </p>
            )}
          </section>
        )}

        <section className="mt-8 rounded-3xl border border-[#e9dfce] bg-[#fffdf8] p-6">
          <h2 className="text-lg font-semibold">3. Import confirmation</h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#817565]">
            The preview is read-only. Importing is intentionally disabled
            while we verify the photo matching against workbooks containing
            real embedded bag photos. No product data or images have been
            saved to Supabase or storage.
          </p>

          <button
            type="button"
            disabled
            className="mt-4 cursor-not-allowed rounded-full bg-[#d9d2c6] px-5 py-3 text-sm font-semibold text-[#82796c]"
          >
            Import Products — Disabled During Testing
          </button>
        </section>
      </div>
    </main>
  );
}