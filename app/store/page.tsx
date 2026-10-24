
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: number;
  model: string;
  name: string;
  category: string;
  size: string | null;
  colors: string | null;
  selling_price: number | string | null;
  image_urls: string[] | null;
  public_description: string | null;
  is_active: boolean;
  is_new_arrival: boolean;
  slug: string | null;
};

type StoreProduct = Product & {
  photoUrl: string | null;
};

const categories = [
  "All",
  "Tote Bags",
  "Canvas Bags",
  "Jute Bags",
  "Pouches",
  "Bottle Bags",
];

const categoryMatches: Record<string, string[]> = {
  "Tote Bags": ["tote"],
  "Canvas Bags": ["canvas"],
  "Jute Bags": ["jute", "juco", "kalamkari"],
  Pouches: ["pouch", "mobile"],
  "Bottle Bags": ["bottle", "water bottle"],
};

function formatPrice(value: number | string | null) {
  if (value === null || value === "") return null;

  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function StorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("products")
        .select(
          "id, model, name, category, size, colors, selling_price, image_urls, public_description, is_active, is_new_arrival, slug"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as Product[];

      const storefrontProducts = await Promise.all(
        rows.map(async (product) => {
          let photoUrl: string | null = null;
          const path = product.image_urls?.[0];

          if (path) {
            const { data: signed, error: imageError } = await supabase.storage
              .from("product-images")
              .createSignedUrl(path, 60 * 60);

            if (!imageError && signed?.signedUrl) {
              photoUrl = signed.signedUrl;
            }
          }

          return { ...product, photoUrl };
        })
      );

      setProducts(storefrontProducts);
    } catch (error) {
      console.error("Unable to load the public catalog:", error);
      setErrorMessage(
        "We couldn't load the collection right now. Please contact us on WhatsApp for our latest catalog."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const text =
        `${product.model} ${product.name} ${product.category} ${product.size ?? ""} ${product.colors ?? ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase().trim());

      const categoryTerms = categoryMatches[activeCategory];
      const matchesCategory =
        activeCategory === "All" ||
        (categoryTerms
          ? categoryTerms.some((term) =>
              product.category.toLowerCase().includes(term)
            )
          : product.category.toLowerCase() === activeCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [products, activeCategory, search]);

  const heroProducts = products.filter((product) => product.photoUrl).slice(0, 4);

  function whatsappLink(message: string) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  function productLink(product: StoreProduct) {
    return product.slug
      ? `/catalog/${encodeURIComponent(product.slug)}`
      : "/store";
  }

  return (
    <main className="min-h-screen bg-[#faf7ef] text-[#3b3429]">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#e9e0cf] bg-[#fffdf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12">
          <a href="/store" className="flex shrink-0 items-center gap-2.5">
            <img
              src="/unity-logo.png"
              alt="Unity Enterprise"
              className="h-11 w-11 object-contain"
            />
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-[0.2em] text-[#a17a3e]">
                UNITY
              </span>
              <span className="block text-[9px] font-semibold tracking-[0.3em] text-[#7d6b50]">
                ENTERPRISE
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-xs font-medium text-[#635947] lg:flex">
            <a className="border-b border-[#6e7858] pb-1" href="#collection">
              Collection
            </a>
            <a className="transition hover:text-[#697451]" href="#our-craft">
              Our Craft
            </a>
            <a
              className="transition hover:text-[#697451]"
              href="#custom-orders"
            >
              Custom Orders
            </a>
            <a className="transition hover:text-[#697451]" href="#contact">
              Contact
            </a>
          </nav>

          <a
            href={whatsappLink(
              "Hello Unity Enterprise, please share your bag catalog and prices."
            )}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-full bg-[#687451] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#536040] sm:inline-flex"
          >
            <span aria-hidden="true">◉</span> WhatsApp
          </a>

          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-full border border-[#e5dbc9] px-4 py-2 text-sm lg:hidden"
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="flex flex-col gap-4 border-t border-[#e9e0cf] bg-[#fffdf8] px-6 py-5 text-sm lg:hidden">
            <a href="#collection" onClick={() => setMobileMenuOpen(false)}>
              Collection
            </a>
            <a href="#our-craft" onClick={() => setMobileMenuOpen(false)}>
              Our Craft
            </a>
            <a
              href="#custom-orders"
              onClick={() => setMobileMenuOpen(false)}
            >
              Custom Orders
            </a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)}>
              Contact
            </a>
            <a
              href={whatsappLink("Hello Unity Enterprise!")}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#687451]"
            >
              Enquire on WhatsApp ↗
            </a>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-[1440px] lg:min-h-[390px] lg:grid-cols-[0.83fr_1.17fr]">
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#a17a3e]">
            Thoughtfully crafted · Bharuch, India
          </p>

          <h1 className="mt-5 max-w-lg font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl lg:text-[56px]">
            Bags made to
            <br />
            carry <span className="italic text-[#6e7858]">more.</span>
          </h1>

          <p className="mt-5 max-w-md text-sm leading-6 text-[#756b5c]">
            Beautifully designed jute, canvas and handcrafted bags for everyday
            use, for a more sustainable tomorrow.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <a
              href="#collection"
              className="rounded-full bg-[#687451] px-6 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#536040]"
            >
              Explore the collection
            </a>
            <a
              href="#custom-orders"
              className="text-xs font-semibold text-[#61553f] underline decoration-[#c7b99f] underline-offset-4 hover:text-[#687451]"
            >
              Custom business orders →
            </a>
          </div>
        </div>

        <div className="relative min-h-[270px] overflow-hidden bg-[#e7dcc6] sm:min-h-[370px] lg:min-h-[390px]">
          {heroProducts.length > 0 ? (
            <div className="grid h-full min-h-[270px] grid-cols-2 grid-rows-2 gap-1 sm:min-h-[370px] lg:min-h-[390px]">
              {heroProducts.map((product) => (
                <a
                  key={product.id}
                  href={productLink(product)}
                  className="group relative flex min-h-0 items-center justify-center overflow-hidden bg-[#e9dfce]"
                >
                  <img
                    src={product.photoUrl!}
                    alt={product.name}
                    className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-105 sm:p-5"
                  />
                </a>
              ))}
              {heroProducts.length < 4 &&
                Array.from({ length: 4 - heroProducts.length }).map(
                  (_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="flex items-center justify-center bg-[#e4d6bd] p-4 text-center font-serif text-sm italic text-[#81745c]"
                    >
                      Thoughtfully made
                    </div>
                  )
                )}
            </div>
          ) : (
            <div className="flex min-h-[270px] items-center justify-center bg-gradient-to-br from-[#eee5d3] via-[#e2d2b5] to-[#c9b38c] p-8 text-center sm:min-h-[370px] lg:min-h-[390px]">
              <div>
                <p className="font-serif text-3xl italic text-[#62533c]">
                  Everyday bags,
                </p>
                <p className="mt-2 font-serif text-3xl text-[#62533c]">
                  thoughtfully made.
                </p>
                <p className="mt-4 text-xs text-[#786a51]">
                  Your product photographs will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Brand values */}
      <section
        id="our-craft"
        className="border-y border-[#e8dfce] bg-[#f0ecdf]"
      >
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 divide-y divide-[#d9cfbb] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center justify-center gap-3 px-4 py-5 text-xs text-[#625b4a]">
            <span className="text-lg text-[#687451]">♧</span>
            Natural materials
          </div>
          <div className="flex items-center justify-center gap-3 px-4 py-5 text-xs text-[#625b4a]">
            <span className="text-lg text-[#687451]">◇</span>
            Custom branding
          </div>
          <div className="flex items-center justify-center gap-3 px-4 py-5 text-xs text-[#625b4a]">
            <span className="text-lg text-[#687451]">▣</span>
            Bulk orders welcome
          </div>
        </div>
      </section>

      {/* Collection */}
      <section
        id="collection"
        className="mx-auto max-w-[1440px] scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16 lg:px-12"
      >
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#a17a3e]">
            Our collection
          </p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl">
            Find your everyday <span className="italic">favourite</span>
          </h2>
          <p className="mt-3 text-sm text-[#817565]">
            Thoughtfully designed bags for work, travel, shopping and more.
          </p>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-4 py-2 text-xs transition ${
                activeCategory === category
                  ? "border-[#687451] bg-[#687451] text-white"
                  : "border-[#e3d9c7] bg-[#fffdf8] text-[#716651] hover:border-[#687451]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-6 max-w-md">
          <label htmlFor="store-search" className="sr-only">
            Search bags
          </label>
          <input
            id="store-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by bag name, model, size or colour..."
            className="w-full rounded-full border border-[#e4dac8] bg-[#fffdf8] px-5 py-3 text-sm outline-none transition placeholder:text-[#a69b89] focus:border-[#89916e] focus:ring-2 focus:ring-[#e8e8d8]"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#817565]">
          <p>
            {loading
              ? "Discovering the collection..."
              : `${filteredProducts.length} ${filteredProducts.length === 1 ? "product" : "products"}`}
          </p>
          <p>Made for everyday moments</p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-[#e7d6b6] bg-[#fff8e9] p-5 text-sm leading-6 text-[#6d5126]"
          >
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="animate-pulse overflow-hidden rounded-xl border border-[#e8dfce] bg-[#fffdf8]"
              >
                <div className="h-64 bg-[#eee7d9]" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-1/3 rounded bg-[#e8dfce]" />
                  <div className="h-4 w-2/3 rounded bg-[#e8dfce]" />
                  <div className="h-3 w-1/2 rounded bg-[#e8dfce]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#d9cbb4] bg-[#fffdf8] px-6 py-14 text-center">
            <p className="font-serif text-2xl">
              {errorMessage ? "Our collection is taking a break." : "Nothing here just yet."}
            </p>
            <p className="mt-3 text-sm text-[#817565]">
              {errorMessage
                ? "Please contact us to ask about available bags."
                : "Try another category or search term, or ask us about available designs."}
            </p>
            <a
              href={whatsappLink(
                "Hello Unity Enterprise, please share your available bag designs."
              )}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-full bg-[#687451] px-5 py-3 text-xs font-semibold text-white hover:bg-[#536040]"
            >
              Ask about available bags ↗
            </a>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="group overflow-hidden rounded-xl border border-[#e9e0d0] bg-[#fffdf8] transition duration-300 hover:-translate-y-1 hover:border-[#cdbb99] hover:shadow-lg"
              >
                <a href={productLink(product)} className="block">
                  <div className="relative flex h-60 items-center justify-center overflow-hidden bg-[#eee7d9] sm:h-64">
                    {product.photoUrl ? (
                      <img
                        src={product.photoUrl}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="px-5 text-center text-[#a19580]">
                        <span className="font-serif text-4xl">♧</span>
                        <p className="mt-2 text-xs">Photo coming soon</p>
                      </div>
                    )}

                    {product.is_new_arrival && (
                      <span className="absolute left-3 top-3 rounded-full bg-[#687451] px-3 py-1.5 text-[10px] font-semibold text-white">
                        New arrival
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#a17a3e]">
                      {product.category}
                    </p>

                    <div className="mt-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-serif text-lg">{product.name}</h3>
                        <p className="mt-1 text-xs text-[#817565]">
                          Model {product.model}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-semibold text-[#687451]">
                        {formatPrice(product.selling_price) ?? "Enquire"}
                      </p>
                    </div>

                    {product.size && (
                      <p className="mt-3 text-xs text-[#817565]">
                        Size: {product.size}
                      </p>
                    )}

                    {product.colors && (
                      <p className="mt-1 line-clamp-1 text-xs text-[#817565]">
                        {product.colors}
                      </p>
                    )}

                    {product.public_description && (
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#817565]">
                        {product.public_description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-[#eee5d6] pt-3">
                      <span className="text-xs font-semibold text-[#756343]">
                        View details
                      </span>
                      <span className="text-sm text-[#756343]">↗</span>
                    </div>
                  </div>
                </a>

                <div className="px-4 pb-4">
                  <a
                    href={whatsappLink(
                      `Hello Unity Enterprise, I am interested in ${product.name} (Model ${product.model}). Please share availability, bulk pricing and details.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-full border border-[#d6ddca] px-4 py-2.5 text-center text-xs font-semibold text-[#596746] transition hover:bg-[#eef1e7]"
                  >
                    Enquire on WhatsApp ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Custom orders */}
      <section
        id="custom-orders"
        className="scroll-mt-24 bg-[#eae5d7] px-5 py-14 sm:px-8 sm:py-16"
      >
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#a17a3e]">
              For businesses & celebrations
            </p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">
              A bag that carries your brand.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#756b5c]">
              Looking for custom-printed bags, branded packaging, event
              giveaways or bulk quantities? Tell us what you need, and our
              team will help you explore suitable options.
            </p>
          </div>

          <a
            href={whatsappLink(
              "Hello Unity Enterprise, I would like to discuss a custom or bulk bag order. Please help me with available materials, sizes, printing and pricing."
            )}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full bg-[#687451] px-6 py-3.5 text-xs font-semibold text-white transition hover:bg-[#536040]"
          >
            Discuss your order ↗
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="scroll-mt-24 bg-[#faf7ef] px-5 py-10 sm:px-8"
      >
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-7 border-b border-[#e5dccb] pb-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <img
              src="/unity-logo.png"
              alt=""
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="font-serif text-lg">Unity Enterprise</p>
              <p className="mt-1 text-xs text-[#817565]">
                Thoughtfully crafted · Bharuch, Gujarat, India
              </p>
            </div>
          </div>

          <div className="text-sm text-[#756b5c]">
            <p className="font-semibold text-[#3b3429]">
              Let&apos;s find the right bag for you.
            </p>
            <a
              href={whatsappLink(
                "Hello Unity Enterprise, I would like to enquire about your bags."
              )}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-[#687451] underline underline-offset-4"
            >
              Contact us on WhatsApp ↗
            </a>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-2 pt-5 text-[11px] text-[#9a8e7c] sm:flex-row">
          <p>© 2026 Unity Enterprise. All rights reserved.</p>
          <a href="/" className="hover:text-[#687451]">
            Staff portal →
          </a>
        </div>
      </footer>
    </main>
  );
}
