
"use client";

import imageCompression from "browser-image-compression";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: number;
  model: string;
  name: string;
  category: string;
  size: string;
  colors: string;
  cost: string;
  price: string;
  notes: string;
  publicDescription: string;
  imageUrls: string[];
  isActive: boolean;
  isNewArrival: boolean;
  slug: string;
  photoUrl?: string;
};

type DatabaseProduct = {
  id: number;
  model: string;
  name: string;
  category: string;
  size: string | null;
  colors: string | null;
  landed_cost: number | string | null;
  selling_price: number | string | null;
  notes: string | null;
  image_urls: string[] | null;
  public_description: string | null;
  is_active: boolean;
  is_new_arrival: boolean;
  slug: string | null;
};

type ProductFilter =
  | "all"
  | "published"
  | "hidden"
  | "price-missing"
  | "photos-missing";

const emptyForm = {
  model: "",
  name: "",
  category: "Jute Bags",
  size: "",
  colors: "",
  cost: "",
  price: "",
  notes: "",
  publicDescription: "",
  isActive: "false",
  isNewArrival: "false",
};

const productSelect =
  "id, model, name, category, size, colors, landed_cost, selling_price, notes, image_urls, public_description, is_active, is_new_arrival, slug";

const inputClass =
  "mt-2 w-full rounded-xl border border-[#e5dac8] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#a17a3e] focus:ring-2 focus:ring-[#eadcc3]";

const filterOptions: { value: ProductFilter; label: string }[] = [
  { value: "all", label: "All products" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
  { value: "price-missing", label: "Price missing" },
  { value: "photos-missing", label: "Photos missing" },
];

function toProduct(row: DatabaseProduct): Product {
  return {
    id: row.id,
    model: row.model,
    name: row.name,
    category: row.category,
    size: row.size ?? "",
    colors: row.colors ?? "",
    cost: row.landed_cost == null ? "" : String(row.landed_cost),
    price: row.selling_price == null ? "" : String(row.selling_price),
    notes: row.notes ?? "",
    publicDescription: row.public_description ?? "",
    imageUrls: row.image_urls ?? [],
    isActive: row.is_active,
    isNewArrival: row.is_new_arrival,
    slug: row.slug ?? "",
  };
}

function makeSlug(model: string) {
  const base = model
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${base || "bag"}-${crypto.randomUUID().slice(0, 8)}`;
}

function validPrice(value: string): boolean {
  if (value.trim() === "") return false;

  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

function formatPrice(value: string) {
  if (!validPrice(value)) return "Price on request";

  return `₹${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
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
    { type: "image/jpeg", lastModified: Date.now() }
  );
}

function ProductPhoto({
  src,
  name,
}: {
  src?: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center bg-[#f2eee5] px-6 text-center">
        <img
          src="/unity-logo.png"
          alt=""
          className="h-12 w-12 object-contain opacity-35"
        />
        <p className="mt-3 text-sm font-medium text-[#827665]">
          {src ? "Photo could not be displayed" : "Product photo not added"}
        </p>
        <p className="mt-1 text-xs text-[#a09584]">
          Edit this product to manage its photos.
        </p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="h-full min-h-64 w-full object-contain p-5 transition duration-500 group-hover:scale-[1.035]"
    />
  );
}

function ExistingPhoto({
  path,
  onRemove,
}: {
  path: string;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function sign() {
      const supabase = createClient();

      const { data, error } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60);

      if (!cancelled && !error && data?.signedUrl) {
        setUrl(data.signedUrl);
        setFailed(false);
      } else if (!cancelled) {
        setFailed(true);
      }
    }

    void sign();

    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <div className="rounded-xl border border-[#e9dfce] bg-[#f7f4ec] p-2">
      {url && !failed ? (
        <img
          src={url}
          alt="Existing product photo"
          onError={() => setFailed(true)}
          className="h-32 w-full rounded-lg bg-white object-contain"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg bg-white px-3 text-center text-xs text-[#817565]">
          {failed ? "Photo could not be loaded" : "Loading photo..."}
        </div>
      )}

      <p className="mt-1 truncate text-xs text-[#817565]" title={path}>
        {path.split("/").pop()}
      </p>

      <button
        type="button"
        onClick={onRemove}
        className="mt-2 text-xs font-semibold text-red-700 hover:underline"
      >
        Remove photo
      </button>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [removeExistingPaths, setRemoveExistingPaths] = useState<string[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadProducts = useCallback(async () => {
    setLoaded(false);
    setMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("products")
        .select(productSelect)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = ((data ?? []) as DatabaseProduct[]).map(toProduct);

      const withPhotos = await Promise.all(
        rows.map(async (product) => {
          const path = product.imageUrls[0];

          if (!path) return product;

          const { data: signed, error: imageError } = await supabase.storage
            .from("product-images")
            .createSignedUrl(path, 60 * 60);

          if (imageError || !signed?.signedUrl) {
            console.error(
              `Could not create a photo URL for model ${product.model}:`,
              imageError
            );
            return product;
          }

          return { ...product, photoUrl: signed.signedUrl };
        })
      );

      setProducts(withPhotos);
    } catch (error) {
      console.error("Could not load products:", error);
      setMessage(
        "Could not load products. Check your sign-in, database permissions, and connection."
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const urls = newPhotos.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);

    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [newPhotos]);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setNewPhotos([]);
    setRemoveExistingPaths([]);
    setExistingPhotoUrls([]);
    setEditingId(null);
    setShowForm(false);
  }

  function startEditing(product: Product) {
    setEditingId(product.id);

    setForm({
      model: product.model,
      name: product.name,
      category: product.category,
      size: product.size,
      colors: product.colors,
      cost: product.cost,
      price: product.price,
      notes: product.notes,
      publicDescription: product.publicDescription,
      isActive: String(product.isActive),
      isNewArrival: String(product.isNewArrival),
    });

    setNewPhotos([]);
    setRemoveExistingPaths([]);
    setExistingPhotoUrls(product.imageUrls);
    setMessage("");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openNewProductForm() {
    if (showForm) {
      resetForm();
    } else {
      setEditingId(null);
      setForm(emptyForm);
      setNewPhotos([]);
      setRemoveExistingPaths([]);
      setExistingPhotoUrls([]);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setMessage("");
  }

  function choosePhotos(files: FileList | null) {
    if (!files) return;

    const selected = Array.from(files);

    if (selected.some((file) => !file.type.startsWith("image/"))) {
      setMessage("Please select image files only.");
      return;
    }

    if (selected.some((file) => file.size > 10 * 1024 * 1024)) {
      setMessage("Each photo must be 10 MB or smaller before optimisation.");
      return;
    }

    setNewPhotos((current) => {
      const remaining = Math.max(0, 10 - current.length);
      const accepted = selected.slice(0, remaining);

      if (accepted.length < selected.length) {
        setMessage("A maximum of 10 new photos can be selected at once.");
      }

      return [...current, ...accepted];
    });
  }

  function markExistingPhotoForRemoval(path: string) {
    setExistingPhotoUrls((current) =>
      current.filter((item) => item !== path)
    );

    setRemoveExistingPaths((current) =>
      current.includes(path) ? current : [...current, path]
    );
  }

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const model = form.model.trim();
    const name = form.name.trim();

    if (!model || !name) {
      setMessage("Please enter a model number and product name.");
      return;
    }

    if (
      products.some(
        (product) =>
          product.id !== editingId &&
          product.model.toLowerCase() === model.toLowerCase()
      )
    ) {
      setMessage("That model number already exists. Use a unique model number.");
      return;
    }

    const cost = form.cost.trim() === "" ? null : Number(form.cost);
    const price = form.price.trim() === "" ? null : Number(form.price);

    if (
      (cost !== null && (!Number.isFinite(cost) || cost < 0)) ||
      (price !== null && (!Number.isFinite(price) || price < 0))
    ) {
      setMessage("Please enter valid, non-negative prices.");
      return;
    }

    if (form.isActive === "true" && price === null) {
      setMessage(
        "This product cannot be published without a selling price. Enter an approved price or keep it hidden."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const supabase = createClient();
    const existingProduct = products.find(
      (product) => product.id === editingId
    );
    const uploadedPaths: string[] = [];

    try {
      let imageUrls =
        existingProduct?.imageUrls.filter(
          (path) => !removeExistingPaths.includes(path)
        ) ?? [];

      let totalOriginalKb = 0;
      let totalCompressedKb = 0;

      for (let index = 0; index < newPhotos.length; index++) {
        const photo = newPhotos[index];

        setMessage(`Optimising photo ${index + 1} of ${newPhotos.length}...`);
        totalOriginalKb += photo.size / 1024;

        const compressedPhoto = await compressProductPhoto(photo);
        totalCompressedKb += compressedPhoto.size / 1024;

        const safeModel = model.replace(/[^a-zA-Z0-9_-]/g, "_");
        const path = `${safeModel}/${crypto.randomUUID()}.jpg`;

        setMessage(`Uploading photo ${index + 1} of ${newPhotos.length}...`);

        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, compressedPhoto, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (error) throw error;

        uploadedPaths.push(path);
        imageUrls.push(path);
      }

      const slug = existingProduct?.slug || makeSlug(model);

      const values = {
        model,
        name,
        category: form.category,
        size: form.size.trim() || null,
        colors: form.colors.trim() || null,
        landed_cost: cost,
        selling_price: price,
        notes: form.notes.trim() || null,
        public_description: form.publicDescription.trim() || null,
        is_active: form.isActive === "true",
        is_new_arrival: form.isNewArrival === "true",
        image_urls: imageUrls,
        slug,
      };

      let savedRow: DatabaseProduct;

      if (editingId !== null) {
        const { data, error } = await supabase
          .from("products")
          .update(values)
          .eq("id", editingId)
          .select(productSelect)
          .single();

        if (error) throw error;
        savedRow = data as DatabaseProduct;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(values)
          .select(productSelect)
          .single();

        if (error) throw error;
        savedRow = data as DatabaseProduct;
      }

      const savedProduct = toProduct(savedRow);

      if (savedProduct.imageUrls[0]) {
        const { data: signed } = await supabase.storage
          .from("product-images")
          .createSignedUrl(savedProduct.imageUrls[0], 60 * 60);

        if (signed?.signedUrl) {
          savedProduct.photoUrl = signed.signedUrl;
        }
      }

      setProducts((current) =>
        editingId === null
          ? [savedProduct, ...current]
          : current.map((product) =>
              product.id === editingId ? savedProduct : product
            )
      );

      if (removeExistingPaths.length) {
        const { error: cleanupError } = await supabase.storage
          .from("product-images")
          .remove(removeExistingPaths);

        if (cleanupError) {
          console.error(
            "Product saved, but some removed photos could not be deleted:",
            cleanupError
          );
        }
      }

      const action = editingId === null ? "saved" : "updated";

      const compressionNote = newPhotos.length
        ? ` ${newPhotos.length} photo(s) uploaded; image size reduced from ${Math.round(totalOriginalKb)} KB to ${Math.round(totalCompressedKb)} KB.`
        : "";

      resetForm();

      setMessage(
        `Product ${action} successfully.${savedProduct.isActive ? " It is marked for the public catalog." : " It is currently hidden from the public catalog."}${compressionNote}`
      );
    } catch (error) {
      console.error("Could not save product or photos:", error);

      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage
          .from("product-images")
          .remove(uploadedPaths);

        if (cleanupError) {
          console.error("Could not clean up newly uploaded photos:", cleanupError);
        }
      }

      setMessage(
        error instanceof Error
          ? `Could not save the product or photos: ${error.message}`
          : "Could not save the product or photos. Check database and Storage permissions."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleProductFlag(
    product: Product,
    field: "is_active" | "is_new_arrival"
  ) {
    const nextValue =
      field === "is_active" ? !product.isActive : !product.isNewArrival;

    if (field === "is_active" && nextValue && !validPrice(product.price)) {
      setMessage(
        `Cannot publish ${product.model}: enter an approved selling price first. Its current status is Price on request.`
      );
      return;
    }

    setUpdatingId(product.id);
    setMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("products")
        .update({ [field]: nextValue })
        .eq("id", product.id)
        .select(productSelect)
        .single();

      if (error) throw error;

      const updatedProduct = toProduct(data as DatabaseProduct);
      updatedProduct.photoUrl = product.photoUrl;

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? updatedProduct : item
        )
      );

      setMessage(
        field === "is_active"
          ? nextValue
            ? "Product published to the public catalog."
            : "Product hidden from the public catalog."
          : nextValue
            ? "Product marked as a new arrival."
            : "New arrival label removed."
      );
    } catch (error) {
      console.error("Could not update product:", error);
      setMessage(
        "Could not update this product. Check your database permissions and try again."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      "Delete this product from the shared database? This affects all authorised staff accounts."
    );

    if (!confirmed) return;

    setDeletingId(product.id);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      setProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );

      setMessage(
        "Product deleted successfully. Its photos were retained in Storage."
      );
    } catch (error) {
      console.error("Could not delete product:", error);
      setMessage(
        "Could not delete the product. Check your database permissions and try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const searchedProducts = products.filter((product) =>
    `${product.model} ${product.name} ${product.category} ${product.colors} ${product.size}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const filteredProducts = searchedProducts.filter((product) => {
    switch (filter) {
      case "published":
        return product.isActive;

      case "hidden":
        return !product.isActive;

      case "price-missing":
        return !validPrice(product.price);

      case "photos-missing":
        return product.imageUrls.length === 0;

      default:
        return true;
    }
  });

  const counts: Record<ProductFilter, number> = {
    all: products.length,
    published: products.filter((product) => product.isActive).length,
    hidden: products.filter((product) => !product.isActive).length,
    "price-missing": products.filter(
      (product) => !validPrice(product.price)
    ).length,
    "photos-missing": products.filter(
      (product) => product.imageUrls.length === 0
    ).length,
  };

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f0] p-8 text-[#675443]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#e8ddc8] border-t-[#a17a3e]" />
          <p className="font-medium">
            Preparing your Unity Enterprise collection...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7f0] px-4 py-6 text-[#30291f] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#80643e] transition hover:text-[#4e3c25]"
        >
          <span aria-hidden="true">←</span>
          Back to dashboard
        </a>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] border border-[#e9dfce] bg-[#fffdf8] shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#eee5d3]/60 blur-3xl" />

          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-9">
            <div className="flex items-center gap-4">
              <img
                src="/unity-logo.png"
                alt="Unity Enterprise"
                className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
              />

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#a17a3e] sm:text-xs">
                  Unity Enterprise · Bharuch
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Products &amp; Catalog
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#817565]">
                  Manage bag models, pricing, photos and customer visibility
                  in one place.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openNewProductForm}
              className="shrink-0 rounded-full bg-[#6d7658] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#555f43] focus:outline-none focus:ring-2 focus:ring-[#a8b397] focus:ring-offset-2"
            >
              {showForm ? "Close form" : "+ Add a product"}
            </button>
          </div>

          <div className="h-1.5 bg-gradient-to-r from-[#b18b4d] via-[#e6d5b4] to-[#8b9674]" />
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e9dfce] bg-[#fffdf8] p-5">
            <p className="text-sm text-[#817565]">Total bag models</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {products.length}
            </p>
            <p className="mt-1 text-xs text-[#9a8b78]">
              Models in your database
            </p>
          </div>

          <div className="rounded-2xl border border-[#e9dfce] bg-[#fffdf8] p-5">
            <p className="text-sm text-[#817565]">Published products</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {counts.published}
            </p>
            <p className="mt-1 text-xs text-[#9a8b78]">
              Marked for the public catalog
            </p>
          </div>

          <div className="rounded-2xl border border-[#e9dfce] bg-[#fffdf8] p-5">
            <p className="text-sm text-[#817565]">Needs attention</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {counts["price-missing"] + counts["photos-missing"]}
            </p>
            <p className="mt-1 text-xs text-[#9a8b78]">
              Missing prices and photos; a product may need both
            </p>
          </div>
        </section>

        {message && (
          <div
            role="status"
            className="mt-5 rounded-2xl border border-[#e8d8b8] bg-[#fff8e9] p-4 text-sm leading-6 text-[#6d5126]"
          >
            {message}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={addProduct}
            className="mt-8 rounded-[1.75rem] border border-[#e9dfce] bg-[#fffdf8] p-5 shadow-sm sm:p-8"
          >
            <div className="border-b border-[#eee5d6] pb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a17a3e]">
                Product management
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {editingId === null ? "Add a bag model" : "Edit bag model"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#817565]">
                Landed costs and internal notes are staff-only fields. Only
                approved public details belong in the customer catalog.
              </p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium">
                Model number *
                <input
                  required
                  value={form.model}
                  onChange={(event) => updateField("model", event.target.value)}
                  placeholder="e.g. DM 123"
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-medium">
                Product name *
                <input
                  required
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="e.g. Jute Shopping Bag"
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-medium">
                Category *
                <select
                  value={form.category}
                  onChange={(event) => updateField("category", event.target.value)}
                  className={inputClass}
                >
                  <option>Jute Bags</option>
                  <option>Jute &amp; Designer Bags</option>
                  <option>JUCO &amp; Kalamkari Bags</option>
                  <option>Canvas Bags</option>
                  <option>Paper Bags</option>
                  <option>Cloth Bags</option>
                  <option>Mobile Pouches</option>
                  <option>Tiffin Bags</option>
                  <option>Water Bottle Bags</option>
                  <option>Customised Bags</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Available sizes
                <input
                  value={form.size}
                  onChange={(event) => updateField("size", event.target.value)}
                  placeholder="10 × 13, 11 × 12 inches"
                  className={inputClass}
                />
                <span className="mt-1 block text-xs font-normal text-[#817565]">
                  Separate sizes with commas.
                </span>
              </label>

              <label className="text-sm font-medium">
                Colours / patterns
                <input
                  value={form.colors}
                  onChange={(event) => updateField("colors", event.target.value)}
                  placeholder="Natural, Red flowers, Blue flowers"
                  className={inputClass}
                />
                <span className="mt-1 block text-xs font-normal text-[#817565]">
                  Separate colours or patterns with commas.
                </span>
              </label>

              <label className="text-sm font-medium">
                Landed cost per piece · staff only (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(event) => updateField("cost", event.target.value)}
                  placeholder="e.g. 15"
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-medium">
                Approved selling price per piece (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  placeholder="Leave blank until approved"
                  className={inputClass}
                />
                <span className="mt-1 block text-xs font-normal text-[#817565]">
                  No PDF MRP is used automatically. Blank means Price on request.
                </span>
              </label>

              <label className="text-sm font-medium sm:col-span-2">
                Internal notes · staff only
                <input
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder="Supplier details or private information"
                  className={inputClass}
                />
              </label>

              <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">
                Public description
                <textarea
                  value={form.publicDescription}
                  onChange={(event) =>
                    updateField("publicDescription", event.target.value)
                  }
                  rows={3}
                  placeholder="Describe the bag, material, uses or customisation options."
                  className={inputClass}
                />
              </label>

              <div className="space-y-4 rounded-2xl bg-[#f7f4ec] p-5 sm:col-span-2 lg:col-span-3">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive === "true"}
                    onChange={(event) =>
                      updateField("isActive", String(event.target.checked))
                    }
                    className="mt-1 h-4 w-4 accent-[#6d7658]"
                  />
                  <span>
                    <span className="font-semibold">Show in public catalog</span>
                    <span className="mt-1 block leading-5 text-[#817565]">
                      Requires an approved selling price before saving.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isNewArrival === "true"}
                    onChange={(event) =>
                      updateField("isNewArrival", String(event.target.checked))
                    }
                    className="mt-1 h-4 w-4 accent-[#6d7658]"
                  />
                  <span>
                    <span className="font-semibold">Mark as a new arrival</span>
                    <span className="mt-1 block leading-5 text-[#817565]">
                      Highlight this product in the customer catalog.
                    </span>
                  </span>
                </label>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium">
                  Product photos · up to 10 new photos
                </label>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    choosePhotos(event.target.files);
                    event.currentTarget.value = "";
                  }}
                  className="mt-2 block w-full rounded-xl border border-[#e5dac8] bg-white px-3.5 py-3 text-sm"
                />

                <p className="mt-1 text-xs text-[#817565]">
                  Maximum 10 MB per image. Photos are compressed before
                  uploading. Existing photos remain unless removed below.
                </p>

                {editingId !== null && existingPhotoUrls.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold">Existing photos</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {existingPhotoUrls.map((path) => (
                        <ExistingPhoto
                          key={path}
                          path={path}
                          onRemove={() => markExistingPhotoForRemoval(path)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {photoPreviews.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold">New photo previews</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {photoPreviews.map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          className="rounded-xl border border-[#e9dfce] bg-[#f7f4ec] p-2"
                        >
                          <img
                            src={url}
                            alt={`New product photo ${index + 1}`}
                            className="h-32 w-full rounded-lg bg-white object-contain"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setNewPhotos((current) =>
                                current.filter((_, i) => i !== index)
                              )
                            }
                            className="mt-2 text-xs font-semibold text-red-700 hover:underline"
                          >
                            Remove selected
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#6d7658] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#555f43] disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId === null
                    ? "Save product"
                    : "Save changes"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  resetForm();
                  setMessage("");
                }}
                className="rounded-full border border-[#dfd4c2] px-6 py-3 text-sm font-medium transition hover:bg-[#f7f4ec] disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a17a3e]">
                Your collection
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Product models</h2>
              <p className="mt-2 text-sm text-[#817565]">
                Search your collection and filter products by their current status.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search models, sizes, colours..."
              aria-label="Search products"
              className="w-full rounded-full border border-[#e5dac8] bg-[#fffdf8] px-5 py-3 text-sm outline-none transition focus:border-[#a17a3e] sm:max-w-sm"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-[#e9dfce] bg-[#fffdf8] p-4 sm:p-5">
            <p className="mb-3 text-sm font-semibold text-[#675443]">
              Filter products
            </p>

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => {
                const selected = filter === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilter(option.value)}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                      selected
                        ? "border-[#6d7658] bg-[#6d7658] text-white"
                        : "border-[#dfd4c2] bg-white text-[#675443] hover:bg-[#f7f4ec]"
                    }`}
                  >
                    {option.label}
                    <span className="ml-2 tabular-nums opacity-80">
                      {counts[option.value]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eee5d6] pt-4 text-sm text-[#817565]">
              <p>
                Showing{" "}
                <strong className="text-[#30291f]">
                  {filteredProducts.length}
                </strong>{" "}
                of {products.length} products
              </p>

              {(filter !== "all" || search !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                  className="font-semibold text-[#80643e] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-[#d9cbb4] bg-[#fffdf8] px-5 py-16 text-center">
              <img
                src="/unity-logo.png"
                alt=""
                className="mx-auto h-14 w-14 object-contain opacity-40"
              />
              <p className="mt-4 text-lg font-semibold">
                {search || filter !== "all"
                  ? "No matching products found"
                  : "Your collection starts here"}
              </p>
              <p className="mt-2 text-sm text-[#817565]">
                {search || filter !== "all"
                  ? "Try another search or choose a different filter."
                  : 'Select "+ Add a product" to enter your first bag model.'}
              </p>

              {(search || filter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                  className="mt-4 rounded-full border border-[#dfd4c2] px-5 py-2.5 text-sm font-semibold text-[#675443] hover:bg-[#f7f4ec]"
                >
                  Show all products
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const hasPrice = validPrice(product.price);
                const hasPhotos = product.imageUrls.length > 0;

                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-[1.6rem] border border-[#e9dfce] bg-[#fffdf8] shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#d4c09b] hover:shadow-xl"
                  >
                    <a
                      href={
                        product.slug
                          ? `/catalog/${encodeURIComponent(product.slug)}`
                          : "/catalog"
                      }
                      aria-label={`View details for ${product.model}, ${product.name}`}
                      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a17a3e]"
                    >
                      <div className="relative flex h-72 items-center justify-center overflow-hidden bg-[#f3eee4] sm:h-80">
                        <ProductPhoto
                          src={product.photoUrl}
                          name={product.name}
                        />

                        {product.isNewArrival && (
                          <span className="absolute left-4 top-4 rounded-full bg-[#6d7658] px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                            New arrival
                          </span>
                        )}

                        <span
                          className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${
                            product.isActive
                              ? "bg-[#e5edda] text-[#4e633d]"
                              : "bg-[#fffdf8]/95 text-[#817565]"
                          }`}
                        >
                          {product.isActive ? "Published" : "Hidden"}
                        </span>

                        <span className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#fffdf8]/90 text-lg text-[#80643e] shadow-sm transition group-hover:translate-x-1">
                          →
                        </span>
                      </div>

                      <div className="p-5 sm:p-6">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a17a3e]">
                          {product.category}
                        </p>

                        <div className="mt-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-xl font-semibold tracking-tight">
                              {product.model}
                            </h3>
                            <p className="mt-1 text-sm leading-5 text-[#817565]">
                              {product.name}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p
                              className={`text-lg font-semibold ${
                                hasPrice ? "text-[#687451]" : "text-[#8b7860]"
                              }`}
                            >
                              {formatPrice(product.price)}
                            </p>
                            <p className="mt-1 text-[10px] text-[#9a8b78]">
                              {hasPrice ? "Selling price entered" : "Price not entered"}
                            </p>
                          </div>
                        </div>

                        {(!hasPrice || !hasPhotos) && (
                          <div className="mt-3 space-y-2">
                            {!hasPrice && (
                              <p className="rounded-lg bg-[#fff4df] px-3 py-2 text-xs leading-5 text-[#805d2d]">
                                Add an approved selling price before publishing.
                              </p>
                            )}

                            {!hasPhotos && (
                              <p className="rounded-lg bg-[#f2eee5] px-3 py-2 text-xs leading-5 text-[#756a5a]">
                                No product photo has been added yet.
                              </p>
                            )}
                          </div>
                        )}

                        {(product.size || product.colors) && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {product.size && (
                              <span className="rounded-full bg-[#f2eee5] px-3 py-1.5 text-xs text-[#756a5a]">
                                Size: {product.size}
                              </span>
                            )}

                            {product.colors && (
                              <span className="max-w-full rounded-full bg-[#f2eee5] px-3 py-1.5 text-xs text-[#756a5a]">
                                {product.colors}
                              </span>
                            )}
                          </div>
                        )}

                        {product.publicDescription && (
                          <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#817565]">
                            {product.publicDescription}
                          </p>
                        )}

                        <div className="mt-5 flex items-center justify-between border-t border-[#eee5d6] pt-4">
                          <span className="text-sm font-semibold text-[#80643e]">
                            View product details
                          </span>
                          <span aria-hidden="true" className="text-sm text-[#80643e]">
                            ↗
                          </span>
                        </div>
                      </div>
                    </a>

                    <div className="border-t border-dashed border-[#dfd4c2] p-5 sm:p-6">
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium text-[#817565] transition hover:text-[#4e3c25]">
                          Staff information
                        </summary>

                        <div className="mt-3 space-y-2 rounded-xl bg-[#f7f4ec] p-4">
                          <p className="break-words">
                            <span className="text-[#817565]">Landed cost:</span>{" "}
                            <strong>{formatPrice(product.cost)}</strong>
                          </p>

                          <p className="break-words">
                            <span className="text-[#817565]">Selling price:</span>{" "}
                            <strong>{formatPrice(product.price)}</strong>
                          </p>

                          {product.notes && (
                            <p className="break-words">
                              <span className="text-[#817565]">Internal notes:</span>{" "}
                              {product.notes}
                            </p>
                          )}
                        </div>
                      </details>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(product)}
                          className="rounded-full border border-[#dfd4c2] px-3.5 py-2 text-xs font-semibold transition hover:bg-[#f7f4ec]"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={updatingId === product.id}
                          onClick={() => void toggleProductFlag(product, "is_active")}
                          className="rounded-full border border-[#cbd5bd] px-3.5 py-2 text-xs font-semibold text-[#536442] transition hover:bg-[#edf1e7] disabled:opacity-60"
                        >
                          {updatingId === product.id
                            ? "Updating..."
                            : product.isActive
                              ? "Hide"
                              : "Publish"}
                        </button>

                        <button
                          type="button"
                          disabled={updatingId === product.id}
                          onClick={() =>
                            void toggleProductFlag(product, "is_new_arrival")
                          }
                          className="rounded-full border border-[#e4d2ae] px-3.5 py-2 text-xs font-semibold text-[#8d6d3d] transition hover:bg-[#fbf3e4] disabled:opacity-60"
                        >
                          {product.isNewArrival ? "Remove new" : "Mark new"}
                        </button>

                        <button
                          type="button"
                          disabled={deletingId === product.id}
                          onClick={() => void deleteProduct(product)}
                          className="rounded-full border border-[#e8caca] px-3.5 py-2 text-xs font-semibold text-[#a34848] transition hover:bg-[#fff0f0] disabled:opacity-60"
                        >
                          {deletingId === product.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-10 rounded-2xl border border-[#e9dfce] bg-[#f1ecdf] p-5 text-sm leading-6 text-[#756a5a]">
          <p className="font-semibold text-[#514638]">Your business data</p>
          <p className="mt-1">
            Product records and photos are stored in Supabase. Photos use
            temporary signed URLs because the Storage bucket is private.
            Landed costs and internal notes are intended for authorised staff,
            not customers.
          </p>
        </footer>
      </div>
    </main>
  );
}
