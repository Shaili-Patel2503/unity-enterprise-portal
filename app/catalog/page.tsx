
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string | number;
  model: string;
  name: string;
  category: string | null;
  size: string | null;
  colors: string | null;
  public_description: string | null;
  selling_price: number | null;
  image_urls: string[] | null;
  is_active: boolean;
  is_new_arrival: boolean | null;
  slug: string | null;
  photoUrl: string;
};

const WHATSAPP_NUMBER = "919998213691";

function formatPrice(price: number | null) {
  if (
    price === null ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  ) {
    return "Price on request";
  }

  return `₹${Number(price).toLocaleString("en-IN")}`;
}

function getPrice(product: Product): number | null {
  const price = product.selling_price;

  if (
    price === null ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  ) {
    return null;
  }

  return Number(price);
}

function getProductHref(product: Product) {
  const slug =
    product.slug?.trim() ||
    product.model.trim().toLowerCase().replace(/\s+/g, "-");

  return `/catalog/${encodeURIComponent(slug)}`;
}

function getWhatsAppLink(product?: Product) {
  const message = product
    ? `Hello Unity Enterprise, I am interested in ${product.model} - ${product.name}. Please share the current price, available colours and minimum order quantity.`
    : "Hello Unity Enterprise, I would like to enquire about your bags. Please share your catalogue and pricing.";

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        setLoading(true);
        setError("");

        const supabase = createClient();

        const { data, error: queryError } = await supabase
          .from("catalog_products")
          .select(
            "id, model, name, category, size, colors, public_description, selling_price, image_urls, is_active, is_new_arrival, slug"
          )
          .eq("is_active", true)
          .order("is_new_arrival", { ascending: false })
          .order("name", { ascending: true });

        if (queryError) throw queryError;

        const rows = (data ?? []) as Omit<Product, "photoUrl">[];

        const displayProducts = await Promise.all(
          rows.map(async (product) => {
            let photoUrl = "";
            const firstImage = product.image_urls?.[0];

            if (firstImage) {
              const { data: imageData, error: imageError } =
                await supabase.storage
                  .from("product-images")
                  .createSignedUrl(firstImage, 60 * 60);

              if (!imageError) {
                photoUrl = imageData?.signedUrl ?? "";
              }
            }

            return { ...product, photoUrl } as Product;
          })
        );

        if (!cancelled) {
          setProducts(displayProducts);
        }
      } catch (err) {
        console.error("Catalog loading failed:", err);

        if (!cancelled) {
          setError(
            "We couldn't load the catalogue. Please refresh and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const available = products
      .map((product) => product.category?.trim())
      .filter((value): value is string => Boolean(value));

    return ["All", ...Array.from(new Set(available)).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        category === "All" || product.category === category;

      const searchable = [
        product.model,
        product.name,
        product.category,
        product.size,
        product.colors,
        product.public_description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesCategory && searchable.includes(query);
    });
  }, [products, search, category]);

  const heroProduct = products.find((product) => product.photoUrl);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f5ef] text-[#302d25]">
      <header className="sticky top-0 z-40 border-b border-[#e5ddcf] bg-[#f8f5ef]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[66px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <a href="/catalog" className="flex items-center gap-3">
            <img
              src="/unity-logo.png"
              alt="Unity Enterprise"
              className="h-10 w-10 shrink-0 object-contain"
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#927546] sm:text-[11px]">
                Unity Enterprise
              </p>
              <p className="font-serif text-xl leading-tight tracking-tight sm:text-2xl">
                Bags with purpose.
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm text-[#70695d] md:flex">
            <a href="#collection" className="transition hover:text-[#46533c]">
              Collection
            </a>
            <a href="#approach" className="transition hover:text-[#46533c]">
              Our approach
            </a>
            <a href="#contact" className="transition hover:text-[#46533c]">
              Contact
            </a>
          </nav>

          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full bg-[#3c4935] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#293729] sm:px-6"
          >
            Enquire ↗
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 pb-8 pt-6 sm:px-8 lg:px-12 lg:pt-8">
        <div className="grid overflow-hidden rounded-[4px] bg-[#eae5d9] lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-11 lg:px-12 lg:py-12 xl:px-16">
            <p className="text-[10px] font-semibold uppercase tracking-[0.23em] text-[#987747] sm:text-xs">
              Thoughtful essentials · Bharuch, Gujarat
            </p>

            <h1 className="mt-5 max-w-[480px] font-serif text-[clamp(2.6rem,4.5vw,4.6rem)] leading-[1.02] tracking-[-0.045em]">
              Carry something
              <span className="block italic text-[#58664b]">
                meaningful.
              </span>
            </h1>

            <p className="mt-4 max-w-[400px] text-sm leading-6 text-[#6d6659] sm:text-base sm:leading-7">
              Discover jute, canvas and everyday bags for gifting, shopping,
              businesses and special occasions — thoughtfully selected for
              your needs.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#collection"
                className="rounded-full bg-[#3c4935] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#293729]"
              >
                Explore collection ↓
              </a>
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#c9c0b0] px-5 py-3 text-sm font-medium text-[#454638] transition hover:bg-white/50"
              >
                Ask for pricing ↗
              </a>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#d7cebe] pt-4 text-[10px] font-medium uppercase tracking-[0.14em] text-[#777060] sm:text-[11px]">
              <span>Jute &amp; canvas</span>
              <span>·</span>
              <span>Bulk enquiries</span>
              <span>·</span>
              <span>Business orders</span>
            </div>
          </div>

          <div className="relative min-h-[270px] overflow-hidden bg-[#d8ddcf] sm:min-h-[340px] lg:min-h-[410px]">
            {heroProduct ? (
              <>
                <img
                  src={heroProduct.photoUrl}
                  alt={`${heroProduct.name} bag`}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3 sm:bottom-6 sm:left-6 sm:right-6">
                  <div className="rounded-xl border border-white/50 bg-[#f8f5ef]/90 px-4 py-3 backdrop-blur-sm">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-[#927546]">
                      Featured design
                    </p>
                    <p className="mt-1 font-serif text-lg">
                      {heroProduct.name}
                    </p>
                    <p className="text-xs text-[#70695d]">
                      Model {heroProduct.model}
                    </p>
                  </div>
                  <a
                    href={getProductHref(heroProduct)}
                    className="rounded-full bg-[#f8f5ef] px-4 py-2.5 text-xs font-medium text-[#3c4935] transition hover:bg-white"
                  >
                    Discover ↗
                  </a>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border border-[#b5bea8]" />
                <div className="absolute -bottom-16 -left-10 h-64 w-64 rounded-full border border-[#b5bea8]" />
                <div className="relative max-w-xs text-center">
                  <img
                    src="/unity-logo.png"
                    alt="Unity Enterprise"
                    className="mx-auto h-16 w-16 object-contain"
                  />
                  <p className="mt-4 font-serif text-3xl italic text-[#4b5841]">
                    Bags for everyday moments.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[#6c7461]">
                    Browse our collection and contact us for availability.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        id="collection"
        className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-16 sm:px-8 lg:px-12 lg:pb-20"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-[#e4dccf] pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.23em] text-[#987747]">
              The Unity collection
            </p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
              Find your everyday bag.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#777062]">
              Browse available designs and enquire about prices, colours and
              order quantities.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.12em] text-[#827b6d]">
            {loading
              ? "Loading collection..."
              : `${filteredProducts.length} designs`}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full border px-4 py-2 text-xs transition ${
                  category === item
                    ? "border-[#3c4935] bg-[#3c4935] text-white"
                    : "border-[#ddd4c6] text-[#6d675a] hover:border-[#87917b] hover:bg-white/60"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search bags, sizes, colours..."
            aria-label="Search products"
            className="w-full rounded-full border border-[#ddd4c6] bg-white/60 px-5 py-3 text-sm outline-none placeholder:text-[#a29a8b] focus:border-[#738064] focus:bg-white lg:max-w-[300px]"
          />
        </div>

        {error && (
          <div className="mt-8 rounded-xl border border-[#e5c9bf] bg-[#fff4ef] p-5 text-sm text-[#8b4739]">
            {error}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="ml-2 underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4 pt-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[4/5] bg-[#e9e3d8]" />
                <div className="mt-4 h-3 w-1/3 rounded bg-[#e9e3d8]" />
                <div className="mt-3 h-4 w-2/3 rounded bg-[#e9e3d8]" />
              </div>
            ))}
          </div>
        ) : !error && filteredProducts.length === 0 ? (
          <div className="mt-8 border border-dashed border-[#d8cebd] px-5 py-14 text-center">
            <p className="font-serif text-2xl">No matching bags found.</p>
            <p className="mt-2 text-sm text-[#827b6d]">
              Try another search or choose a different category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
              className="mt-5 rounded-full border border-[#bcb19e] px-5 py-2.5 text-sm text-[#4d5842] hover:bg-white"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 pt-8 sm:gap-x-6 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-7">
            {filteredProducts.map((product) => {
              const price = getPrice(product);

              return (
                <article key={product.id} className="group min-w-0">
                  <a
                    href={getProductHref(product)}
                    className="block overflow-hidden bg-[#e9e4d9] focus:outline-none focus:ring-2 focus:ring-[#59664c]"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      {product.photoUrl ? (
                        <img
                          src={product.photoUrl}
                          alt={`${product.name} - ${product.model}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#e8e4d8] to-[#c9d0c0] p-5">
                          <div className="text-center">
                            <img
                              src="/unity-logo.png"
                              alt=""
                              className="mx-auto h-12 w-12 object-contain opacity-75"
                            />
                            <p className="mt-3 font-serif text-lg text-[#58634e]">
                              Unity Enterprise
                            </p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#727763]">
                              {product.model}
                            </p>
                          </div>
                        </div>
                      )}
                      {product.is_new_arrival && (
                        <span className="absolute left-3 top-3 rounded-full bg-[#f8f5ef]/95 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#526047]">
                          New arrival
                        </span>
                      )}
                    </div>
                  </a>

                  <div className="pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9a7948] sm:text-[10px]">
                        {product.category || "Bag collection"}
                      </p>
                      <p className="text-[10px] text-[#8b8477]">
                        {product.model}
                      </p>
                    </div>

                    <a
                      href={getProductHref(product)}
                      className="mt-2 block font-serif text-lg leading-snug transition hover:text-[#647354] sm:text-xl"
                    >
                      {product.name}
                    </a>

                    {product.size && (
                      <p className="mt-1 text-xs text-[#81796b]">
                        Size: {product.size}
                      </p>
                    )}

                    {product.colors && (
                      <p className="mt-1 line-clamp-2 text-xs text-[#81796b]">
                        Colours: {product.colors}
                      </p>
                    )}

                    {product.public_description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#81796b]">
                        {product.public_description}
                      </p>
                    )}

                    <div className="mt-3 border-t border-[#e5ddd0] pt-3">
                      <p className="text-sm font-medium text-[#414b37]">
                        {formatPrice(price)}
                      </p>
                      <a
                        href={getWhatsAppLink(product)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[#657254] underline decoration-[#c7cbbd] underline-offset-4 transition hover:text-[#303d2b]"
                      >
                        Enquire on WhatsApp ↗
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section
        id="approach"
        className="scroll-mt-24 border-y border-[#e0d9cb] bg-[#efebe2]"
      >
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:px-8 sm:py-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16 lg:px-12 lg:py-16">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.23em] text-[#987747]">
              A thoughtful approach
            </p>
            <h2 className="mt-3 max-w-md font-serif text-3xl leading-tight sm:text-4xl">
              The right bag for your next idea.
            </h2>
          </div>

          <div className="grid gap-7 sm:grid-cols-3">
            <div className="border-t border-[#cfc5b3] pt-4">
              <p className="font-serif text-2xl text-[#58664b]">01</p>
              <h3 className="mt-3 text-sm font-medium">Everyday essentials</h3>
              <p className="mt-2 text-sm leading-6 text-[#777062]">
                Browse designs for gifting, shopping and daily use.
              </p>
            </div>
            <div className="border-t border-[#cfc5b3] pt-4">
              <p className="font-serif text-2xl text-[#58664b]">02</p>
              <h3 className="mt-3 text-sm font-medium">Business orders</h3>
              <p className="mt-2 text-sm leading-6 text-[#777062]">
                Ask us about bulk quantities and your requirements.
              </p>
            </div>
            <div className="border-t border-[#cfc5b3] pt-4">
              <p className="font-serif text-2xl text-[#58664b]">03</p>
              <h3 className="mt-3 text-sm font-medium">Personal assistance</h3>
              <p className="mt-2 text-sm leading-6 text-[#777062]">
                Contact us to confirm pricing, colours and availability.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer id="contact" className="scroll-mt-20 bg-[#303b2d] text-[#f8f5ef]">
        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.23em] text-[#c7b080]">
                Unity Enterprise · Bharuch
              </p>
              <h2 className="mt-3 max-w-xl font-serif text-3xl leading-tight sm:text-4xl">
                Have a bag in mind?
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/65">
                Contact us for product details, current pricing, availability
                and bulk order enquiries.
              </p>
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-3 rounded-full bg-[#f4efe5] px-5 py-3 text-sm font-medium text-[#303b2d] transition hover:bg-white"
              >
                Start a WhatsApp enquiry ↗
              </a>
            </div>

            <div className="space-y-3 border-t border-white/15 pt-5 text-sm leading-6 text-white/70 md:border-t-0 md:pt-0">
              <p className="font-serif text-xl text-white">Visit or contact us</p>
              <p>
                Shop No. 11, Gokuldham Complex,
                <br />
                Dahej Bypass Road, Bharuch – 392001
              </p>
              <p>
                <a href="tel:9998213691" className="hover:text-white">
                  9998213691
                </a>
                <span className="mx-2 text-white/35">·</span>
                <a href="tel:6355669394" className="hover:text-white">
                  6355669394
                </a>
              </p>
              <a
                href="mailto:unity.enterprise2020@gmail.com"
                className="break-words hover:text-white"
              >
                unity.enterprise2020@gmail.com
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-3 border-t border-white/15 pt-5 text-xs text-white/45 sm:flex-row">
            <p>© 2026 Unity Enterprise. All rights reserved.</p>
            <a href="#collection" className="transition hover:text-white">
              Back to collection ↑
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
