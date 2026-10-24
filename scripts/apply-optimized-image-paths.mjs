import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
dotenv.config({ path: ".env.local" });
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
const report = JSON.parse(
  await fs.readFile("scripts/image-path-preview.json", "utf8")
);
const backup = JSON.parse(
  await fs.readFile("scripts/product-image-paths-backup.json", "utf8")
);
if (!Array.isArray(report.changes) || !Array.isArray(backup.products)) {
  throw new Error("Invalid preview report or backup. No updates made.");
}
if (report.changes.length !== 46 || backup.products.length !== 84) {
  throw new Error(
    `Unexpected counts: ${report.changes.length} changes, ${backup.products.length} backup products. No updates made.`
  );
}
const backupById = new Map(backup.products.map(p => [String(p.id), p]));
const changesByProduct = new Map();
for (const change of report.changes) {
  if (
    change.productId == null ||
    typeof change.oldPath !== "string" ||
    typeof change.newPath !== "string" ||
    !change.oldPath ||
    !change.newPath ||
    !change.newPath.startsWith("optimized/")
  ) {
    throw new Error("Invalid or unsafe change entry. No updates made.");
  }
  const id = String(change.productId);
  if (!backupById.has(id)) {
    throw new Error(`Product ${id} is missing from backup. No updates made.`);
  }
  if (!changesByProduct.has(id)) changesByProduct.set(id, new Map());
  const mapping = changesByProduct.get(id);
  if (mapping.has(change.oldPath) && mapping.get(change.oldPath) !== change.newPath) {
    throw new Error(`Conflicting mappings for product ${id}. No updates made.`);
  }
  mapping.set(change.oldPath, change.newPath);
}
const { data: current, error: readError } = await supabase
  .from("products")
  .select("id,image_urls");
if (readError) throw new Error(`Database read failed: ${readError.message}`);
if (current.length !== backup.products.length) {
  throw new Error("Product count differs from backup. No updates made.");
}
const currentById = new Map(current.map(p => [String(p.id), p]));
const planned = [];
for (const [id, mapping] of changesByProduct) {
  const saved = backupById.get(id);
  const now = currentById.get(id);
  if (!now || !saved) throw new Error(`Product ${id} is missing. No updates made.`);
  if (JSON.stringify(now.image_urls) !== JSON.stringify(saved.image_urls)) {
    throw new Error(`Product ${id} changed since backup. No updates made.`);
  }
  const oldPaths = Array.isArray(now.image_urls) ? now.image_urls : [];
  const newPaths = oldPaths.map(path => mapping.get(path) ?? path);
  if (JSON.stringify(oldPaths) !== JSON.stringify(newPaths)) {
    planned.push({ id: now.id, oldPaths, newPaths });
  }
}
if (planned.length !== 46) {
  throw new Error(`Expected 46 products to change; found ${planned.length}. No updates made.`);
}
const replacementPaths = [
  ...new Set(planned.flatMap(p => p.newPaths.filter(path => path.startsWith("optimized/"))))
];
console.log(`Validating ${replacementPaths.length} replacement image paths...`);
for (const path of replacementPaths) {
  const { data, error } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    throw new Error(`Image validation failed for ${path}: ${error?.message ?? "No signed URL"}. No database updates made.`);
  }
}
console.log("All pre-update checks passed.");
console.log("Updating only image_urls for 46 products...");
let updated = 0;
for (const product of planned) {
  const { data, error } = await supabase
    .from("products")
    .update({ image_urls: product.newPaths })
    .eq("id", product.id)
    .select("id");
  if (error || !data || data.length !== 1) {
    throw new Error(
      `Update failed for product ${product.id}: ${error?.message ?? `updated ${data?.length ?? 0} rows`}. Stop and verify before retrying.`
    );
  }
  updated++;
  console.log(`Updated ${updated}/46`);
}
const { data: finalRows, error: verifyError } = await supabase
  .from("products")
  .select("id,image_urls");
if (verifyError) {
  throw new Error(`Updates ran, but final verification read failed: ${verifyError.message}`);
}
const finalById = new Map(finalRows.map(p => [String(p.id), p]));
for (const product of planned) {
  const saved = finalById.get(String(product.id));
  if (!saved || JSON.stringify(saved.image_urls) !== JSON.stringify(product.newPaths)) {
    throw new Error(`Final verification failed for product ${product.id}. Keep the backup and inspect before retrying.`);
  }
}
console.log("\nMIGRATION AND VERIFICATION SUCCEEDED");
console.log(`Products updated: ${updated}`);
console.log(`Products verified: ${planned.length}`);
console.log(`Replacement paths validated: ${replacementPaths.length}`);
console.log("Only image_urls was changed.");
console.log("Original Storage images were not deleted.");
console.log("Backup retained at scripts/product-image-paths-backup.json");
