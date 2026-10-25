
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: number;
  model: string | null;
  name: string | null;
  category?: string | null;
  size: string | null;
  is_active: boolean | null;
  stock_count_verified: boolean | null;
};

type LocationName = "Godown" | "Home";
type MovementType = "IN" | "OUT";

type Balance = {
  product_id: number;
  location: LocationName;
  quantity: number;
  updated_at: string;
};

type Movement = {
  id: number;
  product_id: number;
  location: LocationName;
  movement_type: MovementType;
  quantity: number;
  reason: string;
  notes: string | null;
  created_by: string;
  created_at: string;
};

type StockCount = {
  id: number;
  product_id: number;
  location: LocationName;
  previous_quantity: number | null;
  counted_quantity: number;
  difference: number | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

const locations: LocationName[] = ["Godown", "Home"];

const reasonsByType: Record<MovementType, string[]> = {
  IN: [
    "Supplier purchase",
    "Return received",
    "Opening / correction",
    "Transfer received",
    "Other",
  ],
  OUT: [
    "Offline sale",
    "Damaged stock",
    "Sample given",
    "Transfer sent",
    "Correction",
    "Other",
  ],
};

const inputClass =
  "w-full rounded-xl border border-[#deded2] bg-white px-4 py-3 text-sm text-[#29372c] outline-none transition placeholder:text-[#a1a69a] focus:border-[#627b5f] focus:ring-4 focus:ring-[#627b5f]/10 disabled:cursor-not-allowed disabled:bg-[#f2f1e9]";

const labelClass =
  "mb-2 block text-sm font-semibold text-[#414b40]";

const panelClass =
  "rounded-2xl border border-[#e8e6dc] bg-white p-5 shadow-[0_4px_20px_rgba(43,55,40,0.035)] sm:p-6";

function productLabel(product: Product) {
  const name =
    product.name?.trim() ||
    product.model?.trim() ||
    "Unnamed product";
  const model = product.model?.trim();
  const size = product.size?.trim();

  return [
    name,
    model && model !== name ? `Model ${model}` : null,
    size ? `Size ${size}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function SearchableProductSelect({
  id,
  label,
  products,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  products: Product[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find(
    (product) => String(product.id) === value
  );

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();

    if (!search) return products;

    return products.filter((product) => {
      const fields = [
        product.model,
        product.name,
        product.category,
        product.size,
        productLabel(product),
        product.is_active === true ? "published active" : "hidden inactive",
      ];

      return fields.some((field) =>
        field?.toLocaleLowerCase().includes(search)
      );
    });
  }, [products, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedProduct ? productLabel(selectedProduct) : "");
    }
  }, [value, selectedProduct, isOpen]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () =>
      document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function chooseProduct(product: Product) {
    setQuery(productLabel(product));
    setIsOpen(false);
    setActiveIndex(0);
    onChange(String(product.id));
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setQuery(selectedProduct ? productLabel(selectedProduct) : "");
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
        return;
      }

      setActiveIndex((current) =>
        filteredProducts.length
          ? (current + 1) % filteredProducts.length
          : 0
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        filteredProducts.length
          ? (current - 1 + filteredProducts.length) %
            filteredProducts.length
          : 0
      );
      return;
    }

    if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      if (filteredProducts[activeIndex]) {
        chooseProduct(filteredProducts[activeIndex]);
      }
      return;
    }

    if (event.key === "Tab") setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>

      <div
        className={`flex items-center gap-3 rounded-xl border bg-white px-3 transition ${
          isOpen
            ? "border-[#627b5f] ring-4 ring-[#627b5f]/10"
            : "border-[#deded2]"
        } ${disabled ? "bg-[#f2f1e9] opacity-60" : ""}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5 shrink-0 text-[#879080]"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
        </svg>

        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`${id}-results`}
          aria-activedescendant={
            isOpen && filteredProducts[activeIndex]
              ? `${id}-option-${filteredProducts[activeIndex].id}`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
          value={query}
          disabled={disabled}
          placeholder={
            products.length
              ? "Search model, name, category or size..."
              : "No products found"
          }
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setActiveIndex(0);
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
            if (value) onChange("");
          }}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-[#29372c] outline-none placeholder:text-[#a1a69a]"
        />

        {query && !disabled && (
          <button
            type="button"
            aria-label="Clear product search"
            onClick={() => {
              setQuery("");
              setIsOpen(true);
              setActiveIndex(0);
              onChange("");
              inputRef.current?.focus();
            }}
            className="rounded-lg p-1.5 text-[#879080] hover:bg-[#f1f2eb] hover:text-[#29372c]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        )}

        <button
          type="button"
          aria-label={isOpen ? "Close product results" : "Show products"}
          disabled={disabled || products.length === 0}
          onClick={() => {
            setIsOpen((current) => !current);
            setActiveIndex(0);
            inputRef.current?.focus();
          }}
          className="rounded-lg p-1.5 text-[#687564] hover:bg-[#f1f2eb] disabled:opacity-40"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {isOpen && !disabled && (
        <div
          id={`${id}-results`}
          role="listbox"
          aria-label="Matching products"
          className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#e5e5d9] bg-white p-1.5 shadow-[0_16px_40px_rgba(32,45,31,0.15)]"
        >
          <div className="px-3 py-2 text-xs font-semibold text-[#7b8375]">
            {filteredProducts.length} matching{" "}
            {filteredProducts.length === 1 ? "product" : "products"}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="px-3 py-5 text-center">
              <p className="text-sm font-semibold text-[#374337]">
                No matching products
              </p>
              <p className="mt-1 text-xs text-[#7b8375]">
                Try a model number, name, category, or size.
              </p>
            </div>
          ) : (
            filteredProducts.map((product, index) => (
              <button
                key={product.id}
                id={`${id}-option-${product.id}`}
                type="button"
                role="option"
                aria-selected={String(product.id) === value}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseProduct(product)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                  index === activeIndex
                    ? "bg-[#f0f3eb]"
                    : "hover:bg-[#f8f8f4]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    String(product.id) === value
                      ? "bg-[#dfe8d9] text-[#3e5a3d]"
                      : "bg-[#f0f0e9] text-[#687564]"
                  }`}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="h-5 w-5"
                  >
                    <path d="M5 8 12 4l7 4v11H5z" />
                    <path d="M5 8h14M9 8v11m6-11v11" />
                  </svg>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold text-[#29372c]">
                    {product.model?.trim() ||
                      product.name ||
                      "Unnamed product"}
                  </span>

                  {product.name &&
                    product.model &&
                    product.name.trim() !== product.model.trim() && (
                      <span className="mt-0.5 block break-words text-xs text-[#747c70]">
                        {product.name}
                      </span>
                    )}

                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {product.category && (
                      <span className="rounded-md bg-[#f1f1eb] px-2 py-1 text-xs text-[#656e60]">
                        {product.category}
                      </span>
                    )}

                    {product.size && (
                      <span className="rounded-md bg-[#f1f1eb] px-2 py-1 text-xs text-[#656e60]">
                        Size {product.size}
                      </span>
                    )}

                    <span
                      className={`rounded-md px-2 py-1 text-xs ${
                        product.is_active === true
                          ? "bg-[#e6f1e2] text-[#41623c]"
                          : "bg-[#efefe9] text-[#6d7168]"
                      }`}
                    >
                      {product.is_active === true ? "Published" : "Hidden"}
                    </span>
                  </span>
                </span>

                {String(product.id) === value && (
                  <span className="mt-1 shrink-0 text-[#456544]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-5 w-5"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      <p className="mt-2 text-xs leading-5 text-[#818779]">
        Search by model, product name, category, or size.
      </p>
    </div>
  );
}

function SummaryCard({
  eyebrow,
  value,
  detail,
  accent,
  icon,
}: {
  eyebrow: string;
  value: number;
  detail: string;
  accent: "olive" | "sage" | "gold" | "ink";
  icon: React.ReactNode;
}) {
  const styles = {
    olive: "bg-[#e6eddf] text-[#42603e]",
    sage: "bg-[#e8eee8] text-[#4d6b57]",
    gold: "bg-[#f7ecd4] text-[#926d2d]",
    ink: "bg-[#e9eae3] text-[#4b5548]",
  };

  return (
    <div className="group rounded-2xl border border-[#e7e5da] bg-white p-5 shadow-[0_4px_20px_rgba(43,55,40,0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(43,55,40,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#737b6e]">{eyebrow}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#29372c]">
            {value.toLocaleString("en-IN")}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles[accent]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#858b7e]">{detail}</p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#718367]">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 text-xl font-bold tracking-tight text-[#29372c]">
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-[#747c70]">
        {description}
      </p>
    </div>
  );
}

export default function InventoryPage() {
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [location, setLocation] = useState<LocationName>("Godown");
  const [movementType, setMovementType] = useState<MovementType>("IN");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("Supplier purchase");
  const [notes, setNotes] = useState("");

  const [countProductId, setCountProductId] = useState("");
  const [countLocation, setCountLocation] =
    useState<LocationName>("Godown");
  const [countedQuantity, setCountedQuantity] = useState("");
  const [countNotes, setCountNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCount, setSavingCount] = useState(false);
  const [pageError, setPageError] = useState("");
  const [countError, setCountError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [countSuccessMessage, setCountSuccessMessage] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const [
        productResult,
        balanceResult,
        movementResult,
        countResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id, model, name, category, size, is_active, stock_count_verified"
          )
          .order("name", { ascending: true }),
        supabase
          .from("inventory_balances")
          .select("product_id, location, quantity, updated_at"),
        supabase
          .from("inventory_movements")
          .select(
            "id, product_id, location, movement_type, quantity, reason, notes, created_by, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("stock_counts")
          .select(
            "id, product_id, location, previous_quantity, counted_quantity, difference, notes, created_by, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (productResult.error) {
        throw new Error(
          `Products query failed: ${productResult.error.message}`
        );
      }
      if (balanceResult.error) {
        throw new Error(
          `Inventory balances query failed: ${balanceResult.error.message}`
        );
      }
      if (movementResult.error) {
        throw new Error(
          `Inventory movements query failed: ${movementResult.error.message}`
        );
      }
      if (countResult.error) {
        throw new Error(
          `Physical count history query failed: ${countResult.error.message}`
        );
      }

      const productRows = (productResult.data ?? []) as Product[];

      setProducts(productRows);
      setBalances((balanceResult.data ?? []) as Balance[]);
      setMovements((movementResult.data ?? []) as Movement[]);
      setStockCounts((countResult.data ?? []) as StockCount[]);

      setSelectedProductId((current) => {
        if (current && productRows.some((p) => String(p.id) === current)) {
          return current;
        }
        return productRows.length ? String(productRows[0].id) : "";
      });

      setCountProductId((current) => {
        if (current && productRows.some((p) => String(p.id) === current)) {
          return current;
        }
        return productRows.length ? String(productRows[0].id) : "";
      });
    } catch (error) {
      setPageError(
        errorMessage(error, "Could not load inventory. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    setReason(reasonsByType[movementType][0]);
  }, [movementType]);

  const selectedProduct = products.find(
    (product) => String(product.id) === selectedProductId
  );

  const countProduct = products.find(
    (product) => String(product.id) === countProductId
  );

  const publishedCount = products.filter(
    (product) => product.is_active === true
  ).length;

  const hiddenCount = products.length - publishedCount;

  function getBalance(productId: number, selectedLocation: LocationName) {
    return (
      balances.find(
        (balance) =>
          balance.product_id === productId &&
          balance.location === selectedLocation
      )?.quantity ?? 0
    );
  }

  function hasBalanceRecord(
    productId: number,
    selectedLocation: LocationName
  ) {
    return balances.some(
      (balance) =>
        balance.product_id === productId &&
        balance.location === selectedLocation
    );
  }

  const selectedLocationBalance = selectedProduct
    ? getBalance(selectedProduct.id, location)
    : 0;

  const selectedProductTotal = selectedProduct
    ? locations.reduce(
        (total, currentLocation) =>
          total + getBalance(selectedProduct.id, currentLocation),
        0
      )
    : 0;

  const countLocationBalance = countProduct
    ? getBalance(countProduct.id, countLocation)
    : 0;

  const countLocationHasBalance = countProduct
    ? hasBalanceRecord(countProduct.id, countLocation)
    : false;

  const totalStock = balances.reduce(
    (total, balance) => total + balance.quantity,
    0
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError("");
    setSuccessMessage("");

    const parsedQuantity = Number(quantity);

    if (!selectedProductId || !selectedProduct) {
      setPageError("Please search for and select a product first.");
      return;
    }

    if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity <= 0) {
      setPageError("Quantity must be a positive whole number.");
      return;
    }

    if (!reason.trim()) {
      setPageError("Please select a reason.");
      return;
    }

    if (
      movementType === "OUT" &&
      parsedQuantity > selectedLocationBalance
    ) {
      setPageError(
        `Only ${selectedLocationBalance} recorded pieces are available at ${location}.`
      );
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc(
        "record_inventory_movement",
        {
          p_product_id: Number(selectedProductId),
          p_location: location,
          p_movement_type: movementType,
          p_quantity: parsedQuantity,
          p_reason: reason.trim(),
          p_notes: notes.trim() || null,
        }
      );

      if (error) throw error;

      setSuccessMessage(
        `${movementType === "IN" ? "Stock added" : "Stock removed"} successfully. New ${location} balance: ${data}.`
      );
      setQuantity("1");
      setNotes("");
      await loadInventory();
    } catch (error) {
      setPageError(
        errorMessage(error, "Could not record this stock movement.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePhysicalCount(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setCountError("");
    setCountSuccessMessage("");

    const parsedCount = Number(countedQuantity);

    if (!countProductId || !countProduct) {
      setCountError("Please search for and select a product.");
      return;
    }

    if (!Number.isSafeInteger(parsedCount) || parsedCount < 0) {
      setCountError(
        "Enter a non-negative whole number, including 0 if you counted none."
      );
      return;
    }

    const confirmed = window.confirm(
      `Save physical count of ${parsedCount} pieces for ${productLabel(countProduct)} at ${countLocation}?\n\nThis will set the recorded balance at that location to the counted quantity.`
    );

    if (!confirmed) return;

    setSavingCount(true);

    try {
      const { data, error } = await supabase.rpc(
        "record_physical_stock_count",
        {
          p_product_id: Number(countProductId),
          p_location: countLocation,
          p_counted_quantity: parsedCount,
          p_notes: countNotes.trim() || null,
        }
      );

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      if (!result) {
        throw new Error(
          "The count was submitted, but no result was returned."
        );
      }

      let message =
        `Physical count saved. Recorded balance at ${countLocation}: ${result.new_quantity} pieces.`;

      if (result.old_quantity === null) {
        message +=
          " There was no previous balance record, so no difference was calculated.";
      } else {
        const difference = Number(result.quantity_difference ?? 0);
        message += ` Difference from previous recorded balance: ${difference > 0 ? "+" : ""}${difference} pieces.`;
      }

      message += result.fully_verified
        ? " Both Home and Godown have recorded physical counts for this product."
        : " This product is not yet counted at both Home and Godown.";

      setCountSuccessMessage(message);
      setCountedQuantity("");
      setCountNotes("");
      await loadInventory();
    } catch (error) {
      setCountError(
        errorMessage(error, "Could not save the physical stock count.")
      );
    } finally {
      setSavingCount(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f0] px-4 py-6 text-[#29372c] sm:px-6 sm:py-9 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 overflow-hidden rounded-3xl bg-[#354c38] text-white shadow-[0_12px_36px_rgba(37,57,39,0.13)]">
          <div className="relative p-6 sm:p-8 lg:p-9">
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-1 -top-10 h-44 w-44 rounded-full border border-white/10" />
            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      className="h-5 w-5"
                    >
                      <path d="M5 8 12 4l7 4v11H5z" />
                      <path d="M5 8h14M9 8v11m6-11v11" />
                    </svg>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#d6e0cc]">
                    Unity Enterprise
                  </span>
                </div>

                <p className="text-sm font-medium text-[#d1ddca]">
                  Your business, in better balance
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                  Inventory
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#e0e7db]">
                  Keep track of every bag at your Godown and Home, record stock
                  changes, and verify physical quantities.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                  <p className="text-xs text-[#d1ddca]">Stock locations</p>
                  <p className="mt-1 text-lg font-semibold">Home + Godown</p>
                </div>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f2f0e5] px-4 py-3 text-sm font-semibold text-[#354c38] transition hover:bg-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Dashboard
                </a>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/10 px-6 py-3 text-xs text-[#dce5d7] sm:px-9">
            <span>INTERNAL STOCK MANAGEMENT</span>
            <span>Counts and movements are recorded separately</span>
          </div>
        </header>

        {pageError && (
          <div
            role="alert"
            className="mb-5 flex gap-3 rounded-2xl border border-[#f0c9bd] bg-[#fff1ec] p-4 text-sm text-[#8d3928]"
          >
            <span className="font-bold">!</span>
            <p>{pageError}</p>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-5 flex gap-3 rounded-2xl border border-[#cbdcc4] bg-[#edf5e9] p-4 text-sm text-[#3d6138]"
          >
            <span className="font-bold">✓</span>
            <p>{successMessage}</p>
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            eyebrow="Product models"
            value={products.length}
            detail="Models available in your internal catalog"
            accent="olive"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
              >
                <path d="M5 8 12 4l7 4v11H5z" />
                <path d="M5 8h14M9 8v11m6-11v11" />
              </svg>
            }
          />
          <SummaryCard
            eyebrow="Published"
            value={publishedCount}
            detail="Products marked active in Products & Catalog"
            accent="sage"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
              >
                <path d="m5 12 4 4L19 6" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            }
          />
          <SummaryCard
            eyebrow="Hidden"
            value={hiddenCount}
            detail="Products not currently marked active"
            accent="gold"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
              >
                <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a15 15 0 0 1-3.1 3.7M6.2 6.2C4.1 7.7 3 12 3 12s3.5 7 9 7a9.5 9.5 0 0 0 3-.5" />
              </svg>
            }
          />
          <SummaryCard
            eyebrow="Recorded stock"
            value={totalStock}
            detail="Pieces across both locations; not necessarily verified"
            accent="ink"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
              >
                <path d="M4 7h16M4 12h16M4 17h10" />
                <circle cx="19" cy="17" r="2" />
              </svg>
            }
          />
        </section>

        <section className="mb-8 flex gap-4 rounded-2xl border border-[#e8d9b8] bg-[#fbf4e4] p-4 sm:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0e2c2] text-[#8c6a30]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path d="M12 3 2.8 20h18.4L12 3Z" />
              <path d="M12 9v5m0 3h.01" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-[#725525]">
              Recorded stock is not the same as verified stock
            </p>
            <p className="mt-1 text-sm leading-6 text-[#786849]">
              Published status only describes whether a product is active.
              Hidden products can still be tracked here. If a balance record is
              missing, the displayed zero does not confirm that no bags are
              physically present. Use Physical Stock Count after checking the
              actual pieces.
            </p>
          </div>
        </section>

        <section className={`${panelClass} mb-8`}>
          <SectionHeading
            eyebrow="Inventory verification"
            title="Physical Stock Count"
            description="Count the actual pieces at Home or Godown. Saving a count sets the recorded balance at that location to the number you enter."
          />

          {countError && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-[#f0c9bd] bg-[#fff1ec] p-3 text-sm text-[#8d3928]"
            >
              {countError}
            </div>
          )}

          {countSuccessMessage && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-[#cbdcc4] bg-[#edf5e9] p-3 text-sm text-[#3d6138]"
            >
              {countSuccessMessage}
            </div>
          )}

          <form
            onSubmit={handlePhysicalCount}
            className="grid gap-5 md:grid-cols-2"
          >
            <SearchableProductSelect
              id="count-product"
              label="Product model"
              products={products}
              value={countProductId}
              onChange={setCountProductId}
              disabled={loading || products.length === 0 || savingCount}
            />

            <div>
              <label htmlFor="count-location" className={labelClass}>
                Location being counted
              </label>
              <select
                id="count-location"
                value={countLocation}
                onChange={(event) =>
                  setCountLocation(event.target.value as LocationName)
                }
                disabled={savingCount}
                className={inputClass}
              >
                {locations.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-[#e7e7dc] bg-[#f7f7f1] p-4">
              <p className="text-sm font-medium text-[#737b6e]">
                Previously recorded balance
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-[#354c38]">
                {countLocationBalance.toLocaleString("en-IN")}{" "}
                <span className="text-sm font-medium text-[#747c70]">
                  pieces
                </span>
              </p>
              <p className="mt-2 text-xs leading-5 text-[#818779]">
                {countLocationHasBalance
                  ? "A balance record exists for this location."
                  : "No balance record exists yet. This displayed zero is not a confirmed physical count."}
              </p>
            </div>

            <div>
              <label htmlFor="count-quantity" className={labelClass}>
                Actual pieces counted
              </label>
              <input
                id="count-quantity"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={countedQuantity}
                onChange={(event) => setCountedQuantity(event.target.value)}
                disabled={savingCount}
                placeholder="Enter the physical count"
                className={inputClass}
                required
              />
              <p className="mt-2 text-xs leading-5 text-[#818779]">
                Enter 0 only after physically checking and confirming that no
                pieces are present.
              </p>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="count-notes" className={labelClass}>
                Count notes <span className="font-normal text-[#92988c]">(optional)</span>
              </label>
              <textarea
                id="count-notes"
                value={countNotes}
                onChange={(event) => setCountNotes(event.target.value)}
                disabled={savingCount}
                rows={3}
                maxLength={1000}
                placeholder="For example, counted all cartons on the left rack."
                className={inputClass}
              />
            </div>

            <div className="flex gap-3 rounded-xl border border-[#ead8b2] bg-[#fbf4e4] p-4 text-sm text-[#78613a] md:col-span-2">
              <span className="font-bold">!</span>
              <p className="leading-6">
                <strong>Before saving:</strong> this is a stock adjustment as
                well as a count record. It replaces the selected location’s
                recorded balance with the quantity you enter. Please verify
                your physical count carefully.
              </p>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={
                  loading ||
                  savingCount ||
                  !countProductId ||
                  !countProduct ||
                  countedQuantity.trim() === ""
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#405a40] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#304831] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingCount ? (
                  "Saving physical count..."
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                    Save Physical Count
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section className={panelClass}>
            <SectionHeading
              eyebrow="Stock operations"
              title="Record Stock Movement"
              description="Record new bags arriving or bags leaving your stock."
            />

            <form onSubmit={handleSubmit} className="space-y-5">
              <SearchableProductSelect
                id="inventory-product"
                label="Product model"
                products={products}
                value={selectedProductId}
                onChange={setSelectedProductId}
                disabled={loading || products.length === 0 || saving}
              />

              {selectedProduct && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#f7f7f1] px-3 py-2.5 text-sm">
                  <span className="text-[#737b6e]">Publishing status</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selectedProduct.is_active === true
                        ? "bg-[#e2efdc] text-[#41623c]"
                        : "bg-[#e9e9e1] text-[#6d7168]"
                    }`}
                  >
                    {selectedProduct.is_active === true
                      ? "Published"
                      : "Hidden"}
                  </span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="inventory-location" className={labelClass}>
                    Stock location
                  </label>
                  <select
                    id="inventory-location"
                    value={location}
                    onChange={(event) =>
                      setLocation(event.target.value as LocationName)
                    }
                    className={inputClass}
                  >
                    {locations.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="movement-type" className={labelClass}>
                    Movement
                  </label>
                  <select
                    id="movement-type"
                    value={movementType}
                    onChange={(event) =>
                      setMovementType(event.target.value as MovementType)
                    }
                    className={inputClass}
                  >
                    <option value="IN">Stock In (+)</option>
                    <option value="OUT">Stock Out (−)</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e7e7dc] bg-[#f7f7f1] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-[#737b6e]">
                    Recorded stock at {location}
                  </span>
                  <span className="text-xl font-bold text-[#354c38]">
                    {selectedLocationBalance.toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-medium text-[#737b6e]">
                      pieces
                    </span>
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e2e3d9] pt-3">
                  <span className="text-sm text-[#737b6e]">
                    Across both locations
                  </span>
                  <span className="font-semibold text-[#354c38]">
                    {selectedProductTotal.toLocaleString("en-IN")} pieces
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="inventory-quantity" className={labelClass}>
                  Quantity (pieces)
                </label>
                <input
                  id="inventory-quantity"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="inventory-reason" className={labelClass}>
                  Reason
                </label>
                <select
                  id="inventory-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className={inputClass}
                  required
                >
                  {reasonsByType[movementType].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="inventory-notes" className={labelClass}>
                  Notes <span className="font-normal text-[#92988c]">(optional)</span>
                </label>
                <textarea
                  id="inventory-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Supplier delivery, customer reference, etc."
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={
                  loading || saving || !selectedProductId || !selectedProduct
                }
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  movementType === "IN"
                    ? "bg-[#405a40] hover:bg-[#304831]"
                    : "bg-[#a45d3e] hover:bg-[#8b4b31]"
                }`}
              >
                {saving
                  ? "Saving movement..."
                  : movementType === "IN"
                    ? "＋ Record Stock In"
                    : "− Record Stock Out"}
              </button>
            </form>
          </section>

          <section className={panelClass}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <SectionHeading
                eyebrow="Current balances"
                title="Stock by Location"
                description="Compare recorded pieces at Home and Godown for each product."
              />
              <button
                type="button"
                onClick={() => void loadInventory()}
                disabled={loading}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#deded2] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#485746] transition hover:bg-[#f7f7f1] disabled:opacity-50"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                >
                  <path d="M20 7v5h-5M4 17v-5h5" />
                  <path d="M5.6 9A7 7 0 0 1 17 6l3 6M4 12l3 6a7 7 0 0 0 11.4-3" />
                </svg>
                Refresh
              </button>
            </div>

            {loading ? (
              <p className="py-8 text-sm text-[#818779]">
                Loading inventory...
              </p>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#deded2] bg-[#fafaf6] px-5 py-10 text-center">
                <p className="font-semibold text-[#485746]">
                  No products found yet
                </p>
                <p className="mt-2 text-sm text-[#818779]">
                  Add a product in Products &amp; Catalog first.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#e9e8df]">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-[#f5f5ee]">
                    <tr className="text-[11px] font-bold uppercase tracking-wider text-[#737b6e]">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-3 py-3 text-right">Godown</th>
                      <th className="px-3 py-3 text-right">Home</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const godown = getBalance(product.id, "Godown");
                      const home = getBalance(product.id, "Home");

                      return (
                        <tr
                          key={product.id}
                          className="border-t border-[#efeee7] transition hover:bg-[#fafaf6]"
                        >
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedProductId(String(product.id))
                              }
                              className="text-left font-semibold text-[#354c38] hover:underline"
                            >
                              {product.name ||
                                product.model ||
                                `Product ${product.id}`}
                            </button>
                            {product.size && (
                              <p className="mt-1 text-xs text-[#818779]">
                                {product.size}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span
                                className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                                  product.is_active === true
                                    ? "bg-[#e2efdc] text-[#41623c]"
                                    : "bg-[#e9e9e1] text-[#6d7168]"
                                }`}
                              >
                                {product.is_active === true
                                  ? "Published"
                                  : "Hidden"}
                              </span>
                              <span
                                className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                                  product.stock_count_verified === true
                                    ? "bg-[#e2ecef] text-[#3d626a]"
                                    : "bg-[#fbf0d9] text-[#87672e]"
                                }`}
                              >
                                {product.stock_count_verified === true
                                  ? "Count verified"
                                  : "Count pending"}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-right tabular-nums text-[#505b4c]">
                            {godown.toLocaleString("en-IN")}
                          </td>
                          <td className="px-3 py-4 text-right tabular-nums text-[#505b4c]">
                            {home.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-4 text-right font-bold tabular-nums text-[#354c38]">
                            {(godown + home).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs leading-5 text-[#818779]">
              Missing balance records appear as zero; physical stock may still
              need to be counted.
            </p>
          </section>
        </div>

        <section className={`${panelClass} mt-8`}>
          <SectionHeading
            eyebrow="Audit trail"
            title="Recent Physical Counts"
            description="The latest 50 physical count records, including previous balances and differences."
          />

          {loading ? (
            <p className="py-6 text-sm text-[#818779]">
              Loading physical count history...
            </p>
          ) : stockCounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#deded2] bg-[#fafaf6] px-5 py-8 text-center">
              <p className="font-semibold text-[#485746]">
                No physical counts recorded yet
              </p>
              <p className="mt-1 text-sm text-[#818779]">
                Your saved count records will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e9e8df]">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-[#f5f5ee]">
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-[#737b6e]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3 text-right">Previous</th>
                    <th className="px-3 py-3 text-right">Counted</th>
                    <th className="px-3 py-3 text-right">Difference</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {stockCounts.map((count) => {
                    const product = products.find(
                      (item) => item.id === count.product_id
                    );

                    return (
                      <tr
                        key={count.id}
                        className="border-t border-[#efeee7] hover:bg-[#fafaf6]"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 text-xs text-[#737b6e]">
                          {formatDate(count.created_at)}
                        </td>
                        <td className="px-3 py-3.5 font-medium text-[#354c38]">
                          {product?.name ||
                            product?.model ||
                            `Product ${count.product_id}`}
                        </td>
                        <td className="px-3 py-3.5">{count.location}</td>
                        <td className="px-3 py-3.5 text-right tabular-nums">
                          {count.previous_quantity === null
                            ? "No record"
                            : count.previous_quantity}
                        </td>
                        <td className="px-3 py-3.5 text-right font-semibold tabular-nums">
                          {count.counted_quantity}
                        </td>
                        <td className="px-3 py-3.5 text-right tabular-nums">
                          {count.difference === null
                            ? "Not available"
                            : `${count.difference > 0 ? "+" : ""}${count.difference}`}
                        </td>
                        <td className="max-w-xs px-4 py-3.5 text-[#737b6e]">
                          {count.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${panelClass} mt-8`}>
          <SectionHeading
            eyebrow="Audit trail"
            title="Recent Stock Movements"
            description="Your latest 50 recorded stock changes, with their location and reason."
          />

          {loading ? (
            <p className="py-8 text-sm text-[#818779]">
              Loading movement history...
            </p>
          ) : movements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#deded2] bg-[#fafaf6] px-5 py-8 text-center">
              <p className="font-semibold text-[#485746]">
                No stock movements yet
              </p>
              <p className="mt-1 text-sm text-[#818779]">
                Your first Stock In or Stock Out entry will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e9e8df]">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-[#f5f5ee]">
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-[#737b6e]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Location</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const product = products.find(
                      (item) => item.id === movement.product_id
                    );

                    return (
                      <tr
                        key={movement.id}
                        className="border-t border-[#efeee7] hover:bg-[#fafaf6]"
                      >
                        <td className="whitespace-nowrap px-4 py-3.5 text-xs text-[#737b6e]">
                          {formatDate(movement.created_at)}
                        </td>
                        <td className="px-3 py-3.5 font-medium text-[#354c38]">
                          {product?.name ||
                            product?.model ||
                            `Product ${movement.product_id}`}
                        </td>
                        <td className="px-3 py-3.5">{movement.location}</td>
                        <td className="px-3 py-3.5">
                          <span
                            className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                              movement.movement_type === "IN"
                                ? "bg-[#e2efdc] text-[#41623c]"
                                : "bg-[#fbebdf] text-[#985638]"
                            }`}
                          >
                            {movement.movement_type === "IN"
                              ? "Stock In"
                              : "Stock Out"}
                          </span>
                        </td>
                        <td
                          className={`px-3 py-3.5 text-right font-semibold tabular-nums ${
                            movement.movement_type === "IN"
                              ? "text-[#41623c]"
                              : "text-[#985638]"
                          }`}
                        >
                          {movement.movement_type === "IN" ? "+" : "−"}
                          {movement.quantity}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-[#485746]">{movement.reason}</p>
                          {movement.notes && (
                            <p className="mt-1 max-w-xs whitespace-pre-wrap text-xs leading-5 text-[#818779]">
                              {movement.notes}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e2d8] px-1 py-5 text-xs leading-5 text-[#818779]">
          <span>Unity Enterprise · Inventory Management</span>
          <span>
            Stock movements and physical counts are recorded separately.
          </span>
        </footer>
      </div>
    </main>
  );
}
