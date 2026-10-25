"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: number;
  model: string;
  name: string;
  size: string | null;
  selling_price: number | string | null;
  is_active: boolean;
};

type OrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  product_model: string;
  product_name: string;
  product_size: string | null;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
  customization_notes: string | null;
};

type OrderHeader = {
  id: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  delivery_address: string | null;
  status: string;
  notes: string | null;
  total_amount: number | string;
  created_at: string;
};

type Order = OrderHeader & { items: OrderItem[] };

type CartLine = {
  rowKey: number;
  productId: string;
  quantity: string;
  unitPrice: string;
  customizationNotes: string;
};

const panelClass =
  "rounded-3xl border border-[#e9e5d9] bg-white p-5 shadow-sm sm:p-6";

const inputClass =
  "mt-2 w-full rounded-xl border border-[#e5dac8] bg-white px-4 py-3 text-sm text-[#29372c] outline-none transition focus:border-[#a17a3e] focus:ring-2 focus:ring-[#eadcc3] disabled:bg-[#f5f5ef]";

const labelClass = "block text-sm font-semibold text-[#485746]";

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function errorText(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

function statusClass(status: string) {
  switch (status.toUpperCase()) {
    case "CONFIRMED":
      return "bg-blue-100 text-blue-800";
    case "PROCESSING":
      return "bg-amber-100 text-amber-800";
    case "DISPATCHED":
      return "bg-violet-100 text-violet-800";
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-stone-100 text-stone-700";
  }
}

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const [nextRowKey, setNextRowKey] = useState(2);

  const [lines, setLines] = useState<CartLine[]>([
    {
      rowKey: 1,
      productId: "",
      quantity: "1",
      unitPrice: "",
      customizationNotes: "",
    },
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData.user) {
        setProducts([]);
        setOrders([]);
        setPageError(
          "Please sign in with an approved Unity Enterprise staff account to access orders."
        );
        return;
      }

      const [productResult, orderResult] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id, model, name, size, selling_price, is_active"
          )
          .order("model", { ascending: true }),

        supabase
          .from("orders")
          .select(
            "id, customer_name, customer_phone, customer_email, delivery_address, status, notes, total_amount, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (productResult.error) throw productResult.error;
      if (orderResult.error) throw orderResult.error;

      const productRows = (productResult.data ?? []) as Product[];
      const orderRows = (orderResult.data ?? []) as OrderHeader[];

      let itemRows: OrderItem[] = [];

      if (orderRows.length > 0) {
        const itemsResult = await supabase
          .from("order_items")
          .select(
            "id, order_id, product_id, product_model, product_name, product_size, quantity, unit_price, line_total, customization_notes"
          )
          .in(
            "order_id",
            orderRows.map((order) => order.id)
          )
          .order("id", { ascending: true });

        if (itemsResult.error) throw itemsResult.error;

        itemRows = (itemsResult.data ?? []) as OrderItem[];
      }

      const itemsByOrder = new Map<number, OrderItem[]>();

      for (const item of itemRows) {
        const existingItems =
          itemsByOrder.get(item.order_id) ?? [];

        existingItems.push(item);
        itemsByOrder.set(item.order_id, existingItems);
      }

      setProducts(productRows);

      setOrders(
        orderRows.map((order) => ({
          ...order,
          items: itemsByOrder.get(order.id) ?? [],
        }))
      );
    } catch (error) {
      setPageError(
        errorText(
          error,
          "Could not load orders. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const piecesShown = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum +
          order.items.reduce(
            (itemSum, item) =>
              itemSum + Number(item.quantity),
            0
          ),
        0
      ),
    [orders]
  );

  const orderValueShown = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum + Number(order.total_amount ?? 0),
        0
      ),
    [orders]
  );

  const draftTotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const quantity = Number(line.quantity);
        const price = Number(line.unitPrice);

        return Number.isSafeInteger(quantity) &&
          quantity > 0 &&
          Number.isFinite(price) &&
          price >= 0
          ? sum + quantity * price
          : sum;
      }, 0),
    [lines]
  );

  function updateLine(
    rowKey: number,
    field: keyof Omit<CartLine, "rowKey">,
    value: string
  ) {
    setLines((current) =>
      current.map((line) => {
        if (line.rowKey !== rowKey) return line;

        if (field === "productId") {
          const product = products.find(
            (item) => String(item.id) === value
          );

          return {
            ...line,
            productId: value,
            unitPrice:
              product?.selling_price == null
                ? ""
                : String(product.selling_price),
          };
        }

        return { ...line, [field]: value };
      })
    );
  }

  function addLine() {
    setLines((current) => [
      ...current,
      {
        rowKey: nextRowKey,
        productId: "",
        quantity: "1",
        unitPrice: "",
        customizationNotes: "",
      },
    ]);

    setNextRowKey((key) => key + 1);
    setPageError("");
    setSuccessMessage("");
  }

  async function handleCreateOrder(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setPageError("");
    setSuccessMessage("");

    if (!customerName.trim()) {
      setPageError("Please enter the customer's name.");
      return;
    }

    if (lines.length === 0) {
      setPageError("Add at least one bag model to the order.");
      return;
    }

    if (
      customerEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        customerEmail.trim()
      )
    ) {
      setPageError(
        "Enter a valid email address, or leave the field empty."
      );
      return;
    }

    const items: {
      product_id: number;
      quantity: number;
      unit_price: string;
      customization_notes: string | null;
    }[] = [];

    for (const line of lines) {
      const product = products.find(
        (item) => String(item.id) === line.productId
      );

      if (!product) {
        setPageError(
          "Select a valid product for every order item."
        );
        return;
      }

      const quantity = Number(line.quantity);

      if (
        !Number.isSafeInteger(quantity) ||
        quantity <= 0 ||
        quantity > 2147483647
      ) {
        setPageError(
          `Enter a positive whole-number quantity for ${product.model}.`
        );
        return;
      }

      const priceText = line.unitPrice.trim();

      if (!/^\d+(\.\d{1,2})?$/.test(priceText)) {
        setPageError(
          `Enter a valid price with at most two decimal places for ${product.model}.`
        );
        return;
      }

      const price = Number(priceText);

      if (
        !Number.isFinite(price) ||
        price < 0 ||
        price > 9999999999.99
      ) {
        setPageError(
          `The price for ${product.model} is out of range.`
        );
        return;
      }

      items.push({
        product_id: product.id,
        quantity,
        unit_price: price.toFixed(2),
        customization_notes:
          line.customizationNotes.trim() || null,
      });
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc(
        "create_order",
        {
          p_customer_name: customerName.trim(),
          p_customer_phone:
            customerPhone.trim() || null,
          p_customer_email:
            customerEmail.trim() || null,
          p_delivery_address:
            deliveryAddress.trim() || null,
          p_notes: orderNotes.trim() || null,
          p_items: items,
        }
      );

      if (error) throw error;

      if (data === null || data === undefined) {
        throw new Error(
          "No order ID was returned by the database."
        );
      }

      setSuccessMessage(
        `Order #${String(data)} was saved successfully with Enquiry status.`
      );

      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setDeliveryAddress("");
      setOrderNotes("");

      setLines([
        {
          rowKey: nextRowKey,
          productId: "",
          quantity: "1",
          unitPrice: "",
          customizationNotes: "",
        },
      ]);

      setNextRowKey((key) => key + 1);

      await loadData();
    } catch (error) {
      setPageError(
        errorText(
          error,
          "Could not save the order. Please try again."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f0] px-4 py-6 text-[#29372c] sm:px-6 sm:py-9 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 overflow-hidden rounded-3xl bg-[#354c38] text-white shadow-[0_12px_36px_rgba(37,57,39,0.13)]">
          <div className="relative p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/10" />

            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d6e0cc]">
                  Unity Enterprise / Workspace
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Order Management
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-[#e0e7db]">
                  Record customer orders, bag quantities,
                  agreed prices and customization requirements
                  in one place.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadData()}
                  disabled={loading || saving}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-50"
                >
                  {loading ? "Refreshing..." : "Refresh orders"}
                </button>

                <a
                  href="/"
                  className="rounded-xl bg-[#f2f0e5] px-4 py-3 text-sm font-semibold text-[#354c38] transition hover:bg-white"
                >
                  Dashboard
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/10 px-6 py-3 text-xs text-[#dce5d7] sm:px-8">
            INTERNAL ORDER RECORDS
          </div>
        </header>

        {pageError && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-[#f0c9bd] bg-[#fff1ec] p-4 text-sm text-[#8d3928]"
          >
            <p className="font-semibold">
              Something needs attention
            </p>
            <p className="mt-1 whitespace-pre-wrap">
              {pageError}
            </p>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-[#cbdcc4] bg-[#edf5e9] p-4 text-sm font-semibold text-[#3d6138]"
          >
            {successMessage}
          </div>
        )}

        <section className="mb-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e9e5d9] bg-white p-5">
            <p className="text-sm text-[#737b6e]">
              Orders shown
            </p>
            <p className="mt-2 text-3xl font-bold text-[#354c38]">
              {orders.length}
            </p>
            <p className="mt-1 text-xs text-[#818779]">
              Latest 100 saved orders
            </p>
          </div>

          <div className="rounded-2xl border border-[#e9e5d9] bg-white p-5">
            <p className="text-sm text-[#737b6e]">
              Pieces ordered
            </p>
            <p className="mt-2 text-3xl font-bold text-[#354c38]">
              {piecesShown.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-[#818779]">
              Across orders shown
            </p>
          </div>

          <div className="rounded-2xl border border-[#e9e5d9] bg-white p-5">
            <p className="text-sm text-[#737b6e]">
              Order value
            </p>
            <p className="mt-2 text-2xl font-bold text-[#354c38]">
              {formatMoney(orderValueShown)}
            </p>
            <p className="mt-1 text-xs text-[#818779]">
              Across orders shown
            </p>
          </div>
        </section>

        <section className={`${panelClass} mb-8`}>
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a17a3e]">
              New order
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#354c38]">
              Customer and order details
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#737b6e]">
              Add customer details and one or more bag models.
              The catalog price fills automatically when available;
              enter the agreed price before saving.
            </p>
          </div>

          {loading ? (
            <p className="py-6 text-sm text-[#818779]">
              Loading products and orders...
            </p>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#deded2] bg-[#fafaf6] p-6 text-sm text-[#737b6e]">
              No products were returned. Check that your staff account
              can access the Products table and that products exist.
            </div>
          ) : (
            <form
              onSubmit={handleCreateOrder}
              className="space-y-7"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    className={labelClass}
                    htmlFor="customer-name"
                  >
                    Customer name *
                  </label>
                  <input
                    id="customer-name"
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(event.target.value)
                    }
                    maxLength={200}
                    required
                    disabled={saving}
                    className={inputClass}
                    placeholder="Customer or business name"
                  />
                </div>

                <div>
                  <label
                    className={labelClass}
                    htmlFor="customer-phone"
                  >
                    Phone / WhatsApp
                  </label>
                  <input
                    id="customer-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(event) =>
                      setCustomerPhone(event.target.value)
                    }
                    maxLength={40}
                    disabled={saving}
                    className={inputClass}
                    placeholder="Customer contact number"
                  />
                </div>

                <div>
                  <label
                    className={labelClass}
                    htmlFor="customer-email"
                  >
                    Email address
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    value={customerEmail}
                    onChange={(event) =>
                      setCustomerEmail(event.target.value)
                    }
                    maxLength={254}
                    disabled={saving}
                    className={inputClass}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label
                    className={labelClass}
                    htmlFor="delivery-address"
                  >
                    Delivery address
                  </label>
                  <input
                    id="delivery-address"
                    value={deliveryAddress}
                    onChange={(event) =>
                      setDeliveryAddress(event.target.value)
                    }
                    maxLength={1000}
                    disabled={saving}
                    className={inputClass}
                    placeholder="Optional delivery details"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    className={labelClass}
                    htmlFor="order-notes"
                  >
                    General order notes
                  </label>
                  <textarea
                    id="order-notes"
                    value={orderNotes}
                    onChange={(event) =>
                      setOrderNotes(event.target.value)
                    }
                    maxLength={2000}
                    rows={3}
                    disabled={saving}
                    className={inputClass}
                    placeholder="Delivery expectations, payment terms or other requirements"
                  />
                </div>
              </div>

              <div className="border-t border-[#ece9df] pt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#354c38]">
                      Bag models
                    </h3>
                    <p className="mt-1 text-sm text-[#737b6e]">
                      Add a separate line for each model and agreed price.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addLine}
                    disabled={saving}
                    className="rounded-xl border border-[#d8dfd1] bg-[#f3f6ef] px-4 py-2.5 text-sm font-semibold text-[#354c38] transition hover:bg-[#e9efe3] disabled:opacity-50"
                  >
                    + Add bag model
                  </button>
                </div>

                <div className="space-y-5">
                  {lines.map((line, index) => (
                    <div
                      key={line.rowKey}
                      className="rounded-2xl border border-[#e9e5d9] bg-[#fcfcf8] p-4 sm:p-5"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-[#485746]">
                          Item {index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            setLines((current) =>
                              current.filter(
                                (item) =>
                                  item.rowKey !== line.rowKey
                              )
                            )
                          }
                          disabled={saving || lines.length === 1}
                          className="text-xs font-semibold text-[#a45d3e] hover:underline disabled:opacity-40"
                        >
                          Remove item
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label
                            className={labelClass}
                            htmlFor={`product-${line.rowKey}`}
                          >
                            Product model *
                          </label>

                          <select
                            id={`product-${line.rowKey}`}
                            value={line.productId}
                            onChange={(event) =>
                              updateLine(
                                line.rowKey,
                                "productId",
                                event.target.value
                              )
                            }
                            required
                            disabled={saving}
                            className={inputClass}
                          >
                            <option value="">
                              Select a bag model
                            </option>

                            {products.map((product) => (
                              <option
                                key={product.id}
                                value={product.id}
                              >
                                {product.model} — {product.name}
                                {product.size
                                  ? ` (${product.size})`
                                  : ""}
                                {!product.is_active
                                  ? " [Hidden]"
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            className={labelClass}
                            htmlFor={`quantity-${line.rowKey}`}
                          >
                            Quantity (pieces) *
                          </label>

                          <input
                            id={`quantity-${line.rowKey}`}
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(
                                line.rowKey,
                                "quantity",
                                event.target.value
                              )
                            }
                            required
                            disabled={saving}
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label
                            className={labelClass}
                            htmlFor={`price-${line.rowKey}`}
                          >
                            Agreed unit price (₹) *
                          </label>

                          <input
                            id={`price-${line.rowKey}`}
                            type="number"
                            min="0"
                            max="9999999999.99"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(event) =>
                              updateLine(
                                line.rowKey,
                                "unitPrice",
                                event.target.value
                              )
                            }
                            required
                            disabled={saving}
                            className={inputClass}
                            placeholder="Enter agreed price"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label
                            className={labelClass}
                            htmlFor={`customization-${line.rowKey}`}
                          >
                            Customization for this model
                          </label>

                          <textarea
                            id={`customization-${line.rowKey}`}
                            value={line.customizationNotes}
                            onChange={(event) =>
                              updateLine(
                                line.rowKey,
                                "customizationNotes",
                                event.target.value
                              )
                            }
                            maxLength={1000}
                            rows={2}
                            disabled={saving}
                            className={inputClass}
                            placeholder="Logo printing, colour, size or other requirements"
                          />
                        </div>

                        <div className="rounded-xl bg-white p-3 md:col-span-2">
                          <p className="text-xs text-[#737b6e]">
                            Line total
                          </p>
                          <p className="mt-1 font-bold text-[#354c38]">
                            {formatMoney(
                              Math.max(
                                0,
                                Number(line.quantity) || 0
                              ) *
                                Math.max(
                                  0,
                                  Number(line.unitPrice) || 0
                                )
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#f3f5ee] p-5">
                <div>
                  <p className="text-sm text-[#737b6e]">
                    Order total preview
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#354c38]">
                    {formatMoney(draftTotal)}
                  </p>
                  <p className="mt-1 text-xs text-[#818779]">
                    The database calculates and saves the total
                    when the order is created.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving || lines.length === 0}
                  className="inline-flex items-center justify-center rounded-xl bg-[#405a40] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#304831] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving order..." : "Save order"}
                </button>
              </div>

              <p className="text-xs leading-5 text-[#818779]">
                Orders start with Enquiry status. Saving an order
                does not automatically deduct inventory. Check customer
                details and agreed prices before saving.
              </p>
            </form>
          )}
        </section>

        <section className={panelClass}>
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a17a3e]">
              Saved records
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#354c38]">
              Recent orders
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#737b6e]">
              These records are fetched from Supabase, not from sample
              API data. Showing the latest 100 orders.
            </p>
          </div>

          {loading ? (
            <p className="py-8 text-sm text-[#818779]">
              Loading saved orders...
            </p>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#deded2] bg-[#fafaf6] px-5 py-10 text-center">
              <p className="font-semibold text-[#485746]">
                No saved orders found
              </p>
              <p className="mt-2 text-sm text-[#818779]">
                Saved orders will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-[#e9e5d9] bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#818779]">
                        Order #{order.id}
                      </p>
                      <h3 className="mt-1 text-lg font-bold text-[#354c38]">
                        {order.customer_name}
                      </h3>
                      <p className="mt-1 text-xs text-[#818779]">
                        {formatDate(order.created_at)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#818779]">
                        Phone / WhatsApp
                      </p>
                      <p className="mt-1 break-words text-[#485746]">
                        {order.customer_phone || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#818779]">
                        Email
                      </p>
                      <p className="mt-1 break-words text-[#485746]">
                        {order.customer_email || "Not provided"}
                      </p>
                    </div>

                    {order.delivery_address && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-[#818779]">
                          Delivery address
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[#485746]">
                          {order.delivery_address}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 overflow-x-auto rounded-xl border border-[#efeee7]">
                    <table className="w-full min-w-[500px] text-left text-sm">
                      <thead className="bg-[#f5f5ee] text-xs text-[#737b6e]">
                        <tr>
                          <th className="px-3 py-3">Bag model</th>
                          <th className="px-3 py-3 text-right">
                            Qty
                          </th>
                          <th className="px-3 py-3 text-right">
                            Unit price
                          </th>
                          <th className="px-3 py-3 text-right">
                            Line total
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {order.items.map((item) => (
                          <tr
                            key={item.id}
                            className="border-t border-[#efeee7]"
                          >
                            <td className="px-3 py-3">
                              <p className="font-semibold text-[#354c38]">
                                {item.product_model} — {item.product_name}
                              </p>

                              {item.product_size && (
                                <p className="mt-1 text-xs text-[#818779]">
                                  {item.product_size}
                                </p>
                              )}

                              {item.customization_notes && (
                                <p className="mt-1 whitespace-pre-wrap text-xs text-[#737b6e]">
                                  Customization: {item.customization_notes}
                                </p>
                              )}
                            </td>

                            <td className="px-3 py-3 text-right tabular-nums">
                              {Number(item.quantity).toLocaleString("en-IN")}
                            </td>

                            <td className="px-3 py-3 text-right tabular-nums">
                              {formatMoney(item.unit_price)}
                            </td>

                            <td className="px-3 py-3 text-right font-semibold tabular-nums">
                              {formatMoney(item.line_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {order.notes && (
                    <div className="mt-4 rounded-xl bg-[#fafaf6] p-3">
                      <p className="text-xs font-semibold text-[#737b6e]">
                        Order notes
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[#485746]">
                        {order.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece9df] pt-4">
                    <p className="text-sm text-[#737b6e]">
                      {order.items
                        .reduce(
                          (sum, item) =>
                            sum + Number(item.quantity),
                          0
                        )
                        .toLocaleString("en-IN")}{" "}
                      pieces
                    </p>

                    <p className="text-lg font-bold text-[#354c38]">
                      {formatMoney(order.total_amount)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-[#e3e2d8] px-1 py-5 text-xs leading-5 text-[#818779]">
          Unity Enterprise · Order Management · Order records
          and inventory movements are kept separate.
        </footer>
      </div>
    </main>
  );
}