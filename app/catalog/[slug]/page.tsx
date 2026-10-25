
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: number;
  model: string;
  name: string;
  category: string;
  size: string | null;
  colors: string | null;
  public_description: string | null;
  selling_price: number | string | null;
  image_urls: string[] | null;
  is_new_arrival: boolean;
  slug: string | null;
  catalog_available: boolean;
};

const WHATSAPP = "919998213691";

function displayPrice(product: Product): string {
  const raw = product.selling_price;

  if (raw === null || raw === "") {
    return "Price on request";
  }

  const price = Number(raw);

  if (!Number.isFinite(price) || price < 0) {
    return "Price on request";
  }

  return `₹${price.toLocaleString("en-IN")}`;
}

function LoadingProductPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F5ED] text-[#596548]">
      <p className="font-serif text-xl">Preparing your selection…</p>
    </main>
  );
}

export default function CatalogProductPage() {
  return (
    <Suspense fallback={<LoadingProductPage />}>
      <CatalogProductContent />
    </Suspense>
  );
}

function CatalogProductContent() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug)
    ? params.slug[0] || ""
    : params.slug || "";

  const [product, setProduct] = useState<Product | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        const supabase = createClient();

        const { data, error: queryError } = await supabase
          .from("catalog_products")
          .select(
            "id, model, name, category, size, colors, public_description, selling_price, image_urls, is_new_arrival, catalog_available, slug"
          )
          .eq("is_active", true)
          .eq("slug", slug)
          .maybeSingle();

        if (queryError) throw queryError;
        if (!data) throw new Error("Product not found.");

        const row = data as Product;
        const imagePaths = row.image_urls ?? [];

        const signedPhotos = (
          await Promise.all(
            imagePaths.map(async (path) => {
              const { data: imageData, error: imageError } =
                await supabase.storage
                  .from("product-images")
                  .createSignedUrl(path, 60 * 60);

              if (imageError) {
                console.warn(
                  "Product image unavailable:",
                  imageError.message
                );
              }

              return imageData?.signedUrl ?? "";
            })
          )
        ).filter(Boolean);

        if (!cancelled) {
          setProduct(row);
          setPhotos(signedPhotos);
          setSelectedPhoto(signedPhotos[0] ?? "");
        }
      } catch (err) {
        console.error("Product detail loading failed:", err);
        if (!cancelled) setError("This product could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (slug) {
      void loadProduct();
    }

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return <LoadingProductPage />;
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#F8F5ED] px-4 py-16 text-[#342D24]">
        <div className="mx-auto max-w-xl border border-[#e3dacb] bg-[#FCFAF5] p-10 text-center">
          <p className="font-serif text-3xl">
            {error || "Product not found."}
          </p>
          <Link
            href="/catalog"
            className="mt-6 inline-flex bg-[#3E4935] px-6 py-3 text-sm text-white"
          >
            Return to collection
          </Link>
        </div>
      </main>
    );
  }

  const price = displayPrice(product);
  const message = `Hello Unity Enterprise, I am interested in ${product.model} - ${product.name}. Please share the current price and availability.`;
  const enquiryUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;

  return (
    <main className="min-h-screen bg-[#F8F5ED] text-[#342D24]">
      <header className="sticky top-0 z-40 border-b border-[#e3dacb] bg-[#F8F5ED]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-3 sm:px-10">
          <Link href="/catalog" className="flex items-center gap-3">
            <img
              src="/unity-logo.png"
              alt="Unity Enterprise"
              className="h-10 w-10 object-contain"
            />
            <span>
              <span className="block text-[10px] uppercase tracking-[0.22em] text-[#8C7042]">
                Unity Enterprise
              </span>
              <span className="mt-0.5 block font-serif text-lg">
                Bags with purpose.
              </span>
            </span>
          </Link>
          <Link
            href="/catalog"
            className="border border-[#d5cbb9] px-4 py-2.5 text-xs transition hover:bg-white"
          >
            ← Collection
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 pt-6 sm:px-10 lg:px-14">
        <Link
          href="/catalog"
          className="text-xs text-[#796039] transition hover:underline"
        >
          Collection / {product.category} / {product.model}
        </Link>
      </div>

      <section className="mx-auto grid max-w-[1440px] gap-8 px-4 py-6 sm:px-8 sm:py-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-12 lg:px-14">
        <div className="min-w-0">
          <div className="relative flex aspect-[4/4.5] items-center justify-center overflow-hidden bg-[#EAE5D9] sm:aspect-[4/4.2]">
            {selectedPhoto ? (
              <img
                src={selectedPhoto}
                alt={`${product.name} ${product.model}`}
                className="h-full w-full object-contain p-6 sm:p-10"
              />
            ) : (
              <div className="text-center">
                <img
                  src="/unity-logo.png"
                  alt=""
                  className="mx-auto h-20 w-20 object-contain opacity-50"
                />
                <p className="mt-4 text-sm text-[#887D6D]">
                  Product photo coming soon
                </p>
              </div>
            )}
            {product.is_new_arrival && (
              <span className="absolute left-4 top-4 bg-[#3E4935] px-3 py-2 text-[9px] uppercase tracking-[0.15em] text-white">
                New arrival
              </span>
            )}
          </div>

          {photos.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {photos.map((photo, index) => (
                <button
                  key={photo}
                  type="button"
                  onClick={() => setSelectedPhoto(photo)}
                  aria-label={`View product photo ${index + 1}`}
                  className={`aspect-square overflow-hidden border bg-[#EAE5D9] transition ${
                    selectedPhoto === photo
                      ? "border-[#8C7042] ring-1 ring-[#8C7042]"
                      : "border-transparent hover:border-[#c9bdab]"
                  }`}
                >
                  <img
                    src={photo}
                    alt=""
                    className="h-full w-full object-contain p-2"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 border-y border-[#e3dacb] py-5">
            <div className="pr-4">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#8C7042]">
                Thoughtful selection
              </p>
              <p className="mt-2 font-serif text-lg">Everyday utility</p>
            </div>
            <div className="border-l border-[#e3dacb] pl-4">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#8C7042]">
                Need something custom?
              </p>
              <p className="mt-2 font-serif text-lg">Made personal</p>
            </div>
          </div>
        </div>

        <article className="min-w-0 lg:py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8C7042]">
            {product.category}
          </p>

          <p className="mt-5 text-xs tracking-[0.12em] text-[#887D6D]">
            {product.model}
          </p>

          <h1 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.025em] sm:text-5xl lg:text-6xl">
            {product.name}
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-[#776D5D]">
            {product.public_description ||
              "A practical bag selected for everyday needs. Contact Unity Enterprise to discuss availability and custom requirements."}
          </p>

          <div className="mt-8 border-y border-[#e3dacb] py-5">
            {price !== "Price on request" && (
              <>
                <p className="text-[9px] uppercase tracking-[0.22em] text-[#8C7042]">
                  Price
                </p>
                <p className="mt-2 font-serif text-3xl">{price}</p>
              </>
            )}
            <p
              className={`${
                price !== "Price on request" ? "mt-4" : ""
              } text-[10px] font-semibold uppercase tracking-[0.16em] ${
                product.catalog_available ? "text-[#526047]" : "text-[#a14d3f]"
              }`}
            >
              {product.catalog_available ? "Available" : "Out of stock"}
            </p>
          </div>

          <dl className="mt-2 divide-y divide-[#e3dacb]">
            {[
              ["Model", product.model],
              ["Size", product.size],
              ["Colours", product.colors],
            ]
              .filter((item): item is [string, string] => Boolean(item[1]))
              .map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[100px_1fr] gap-4 py-4"
                >
                  <dt className="text-xs text-[#887D6D]">{label}</dt>
                  <dd className="text-sm leading-6">{value}</dd>
                </div>
              ))}
          </dl>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href={enquiryUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-[#3E4935] px-5 py-4 text-center text-sm text-white transition hover:bg-[#293326]"
            >
              Enquire on WhatsApp ↗
            </a>
            <Link
              href="/catalog"
              className="border border-[#c9bdab] px-5 py-4 text-center text-sm transition hover:bg-white"
            >
              Continue browsing
            </Link>
          </div>

          <div className="mt-8 border border-[#e3dacb] bg-[#F1ECE2] p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8C7042]">
              Custom &amp; bulk orders
            </p>
            <p className="mt-3 text-sm leading-7 text-[#776D5D]">
              Ask about sizes, zip or chain options, single or double-side
              printing, colours and company logo or brand details.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                `Hello Unity Enterprise, I would like to discuss a custom or bulk order for ${product.model} - ${product.name}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-xs font-semibold text-[#596548] underline underline-offset-4"
            >
              Discuss your requirements →
            </a>
          </div>
        </article>
      </section>

      <footer className="mt-8 bg-[#30392B] text-[#F8F5ED]">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 px-5 py-8 sm:flex-row sm:items-center sm:px-10">
          <div className="flex items-center gap-3">
            <img
              src="/unity-logo.png"
              alt=""
              className="h-9 w-9 rounded-full bg-[#F8F5ED] p-1 object-contain"
            />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4BD8F]">
                Unity Enterprise
              </p>
              <p className="mt-1 font-serif text-lg">Bags with purpose.</p>
            </div>
          </div>
          <div className="text-sm leading-6 text-white/70">
            Bharuch, Gujarat · 9998213691 · 6355669394
            <br />
            unity.enterprise2020@gmail.com
          </div>
        </div>
      </footer>
    </main>
  );
}
