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

type Order = OrderHeader & {
  items: OrderItem[];
  history: StatusHistory[];
};

type StatusHistory = {
  id: number;
  order_id: number;
  previous_status: string;
  new_status: string;
  changed_at: string;
};

type CartLine = {
  rowKey: number;
  productId: string;
  quantity: string;
  unitPrice: string;
  customizationNotes: string;
};

const ORDER_STATUSES = [
  "ENQUIRY",
  "CONFIRMED",
  "PROCESSING",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
] as const;

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

function readableStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusDrafts, setStatusDrafts] = useState<
    Record<number, string>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStatusId, setSavingStatusId] = useState<number | null>(
    null
  );

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

  const loadData = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
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
            "Please sign in with an approved Unity Enterprise staff account."
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

        const orderIds = orderRows.map((order) => order.id);

        let itemRows: OrderItem[] = [];
        let historyRows: StatusHistory[] = [];

        if (orderIds.length > 0) {
          const [itemResult, historyResult] = await Promise.all([
            supabase
              .from("order_items")
              .select(
                "id, order_id, product_id, product_model, product_name, product_size, quantity, unit_price, line_total, customization_notes"
              )
              .in("order_id", orderIds)
              .order("id", { ascending: true }),

            supabase
              .from("order_status_history")
              .select(
                "id, order_id, previous_status, new_status, changed_at"
              )
              .in("order_id", orderIds)
              .order("changed_at", { ascending: false })
              .limit(500),
          ]);

          if (itemResult.error) throw itemResult.error;
          if (historyResult.error) throw historyResult.error;

          itemRows = (itemResult.data ?? []) as OrderItem[];
          historyRows = (historyResult.data ?? []) as StatusHistory[];
        }

        const itemsByOrder = new Map<number, OrderItem[]>();
        const historyByOrder = new Map<number, StatusHistory[]>();

        for (const item of itemRows) {
          const existing = itemsByOrder.get(item.order_id) ?? [];
          existing.push(item);
          itemsByOrder.set(item.order_id, existing);
        }

        for (const entry of historyRows) {
          const existing = historyByOrder.get(entry.order_id) ?? [];
          existing.push(entry);
          historyByOrder.set(entry.order_id, existing);
        }

        setProducts(productRows);

        setOrders(
          orderRows.map((order) => ({
            ...order,
            items: itemsByOrder.get(order.id) ?? [],
            history: historyByOrder.get(order.id) ?? [],
          }))
        );

        setStatusDrafts(
          Object.fromEntries(
            orderRows.map((order) => [order.id, order.status])
          ) as Record<number, string>
        );
      } catch (error) {
        setPageError(
          errorText(error, "Could not load orders. Please try again.")
        );
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const piecesShown = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum +
          order.items.reduce(
            (itemSum, item) => itemSum + Number(item.quantity),
            0
          ),
        0
      ),
    [orders]
  );

  const orderValueShown = useMemo(
    () =>
      orders.reduce(
        (sum, order) => sum + Number(order.total_amount ?? 0),
        0
      ),
    [orders]
  );

  const draftTotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const quantity = Number(line.quantity);
        const price = Number(line.unitPrice);

        if (
          Number.isSafeInteger(quantity) &&
          quantity > 0 &&
          Number.isFinite(price) &&
          price >= 0
        ) {
          return sum + quantity * price;
        }

        return sum;
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

    if (
      customerEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
    ) {
      setPageError("Enter a valid email address or leave it blank.");
      return;
    }

    if (lines.length === 0) {
      setPageError("Add at least one bag model.");
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
        setPageError("Select a valid product for every order item.");
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

      if (!Number.isFinite(price) || price < 0) {
        setPageError(`Enter a valid price for ${product.model}.`);
        return;
      }

      items.push({
        product_id: product.id,
        quantity,
        unit_price: price.toFixed(2),
        customization_notes: line.customizationNotes.trim() || null,
      });
    }

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc("create_order", {
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone.trim() || null,
        p_customer_email: customerEmail.trim() || null,
        p_delivery_address: deliveryAddress.trim() || null,
        p_notes: orderNotes.trim() || null,
        p_items: items,
      });

      if (error) throw error;

      if (data === null || data === undefined) {
        throw new Error("No order ID was returned by the database.");
      }

      setSuccessMessage(
        `Order #${String(data)} saved successfully with Enquiry status.`
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
      await loadData(true);
    } catch (error) {
      setPageError(
        errorText(error, "Could not save the order. Please try again.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(order: Order) {
    const newStatus = statusDrafts[order.id];

    if (!newStatus || newStatus === order.status) return;

    if (
      !ORDER_STATUSES.includes(
        newStatus as (typeof ORDER_STATUSES)[number]
      )
    ) {
      setPageError("Select a valid order status.");
      return;
    }

    const confirmed = window.confirm(
      `Change order #${order.id} from ${order.status} to ${newStatus}?`
    );

    if (!confirmed) return;

    setSavingStatusId(order.id);
    setPageError("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "update_order_status",
        {
          p_order_id: order.id,
          p_new_status: newStatus,
        }
      );

      if (error) throw error;

      setSuccessMessage(
        `Order #${order.id} status updated to ${String(data)}.`
      );

      await loadData(true);
    } catch (error) {
      setPageError(
        errorText(
          error,
          `Could not update order #${order.id}. Please try again.`
        )
      );
    } finally {
      setSavingStatusId(null);
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
                  Record customer orders, manage order progress, and maintain
                  a history of status changes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadData()}
                  disabled={loading || saving || savingStatusId !== null}
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
            <p className="font-semibold">Something needs attention</p>
            <p className="mt-1 whitespace-pre-wrap">{pageError}</p>
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
            <p className="text-sm text-[#737b6e]">Orders shown</p>
            <p className="mt-2 text-3xl font-bold text-[#354c38]">
              {orders.length}
            </p>
            <p className="mt-1 text-xs text-[#818779]">Latest 100 saved orders</p>
          </div>
          <div className="rounded-2xl border border-[#e9e5d9] bg-white p-5">
            <p className="text-sm text-[#737b6e]">Pieces ordered</p>
            <p className="mt-2 text-3xl font-bold text-[#354c38]">
              {piecesShown.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-[#818779]">Across orders shown</p>
          </div>
          <div className="rounded-2xl border border-[#e9e5d9] bg-white p-5">
            <p className="text-sm text-[#737b6e]">Order value</p>
            <p className="mt-2 text-2xl font-bold text-[#354c38]">
              {formatMoney(orderValueShown)}
            </p>
            <p className="mt-1 text-xs text-[#818779]">Across orders shown</p>
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
              Add customer details and one or more bag models. Prices are
              saved with the order and do not automatically deduct inventory.
            </p>
          </div>

          {loading ? (
            <p className="py-6 text-sm text-[#818779]">
              Loading products and orders...
            </p>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#deded2] bg-[#fafaf6] p-6 text-sm text-[#737b6e]">
              No products were returned. Check staff access and the Products table.
            </div>
          ) : (
            <form onSubmit={handleCreateOrder} className="space-y-7">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="customer-name">
                    Customer name *
                  </label>
                  <input
                    id="customer-name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    maxLength={200}
                    required
                    disabled={saving}
                    className={inputClass}
                    placeholder="Customer or business name"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="customer-phone">
                    Phone / WhatsApp
                  </label>
                  <input
                    id="customer-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    maxLength={40}
                    disabled={saving}
                    className={inputClass}
                    placeholder="Customer contact number"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="customer-email">
                    Email address
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    maxLength={254}
                    disabled={saving}
                    className={inputClass}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="delivery-address">
                    Delivery address
                  </label>
                  <input
                    id="delivery-address"
                    value={deliveryAddress}
                    onChange={(event) => setDeliveryAddress(event.target.value)}
                    maxLength={1000}
                    disabled={saving}
                    className={inputClass}
                    placeholder="Optional delivery details"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass} htmlFor="order-notes">
                    General order notes
                  </label>
                  <textarea
                    id="order-notes"
                    value={orderNotes}
                    onChange={(event) => setOrderNotes(event.target.value)}
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
                    <h3 className="text-lg font-bold text-[#354c38]">Bag models</h3>
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
                              current.filter((item) => item.rowKey !== line.rowKey)
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
                          <label className={labelClass} htmlFor={`product-${line.rowKey}`}>
                            Product model *
                          </label>
                          <select
                            id={`product-${line.rowKey}`}
                            value={line.productId}
                            onChange={(event) =>
                              updateLine(line.rowKey, "productId", event.target.value)
                            }
                            required
                            disabled={saving}
                            className={inputClass}
                          >
                            <option value="">Select a bag model</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.model} — {product.name}
                                {product.size ? ` (${product.size})` : ""}
                                {!product.is_active ? " [Hidden]" : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className={labelClass} htmlFor={`quantity-${line.rowKey}`}>
                            Quantity (pieces) *
                          </label>
                          <input
                            id={`quantity-${line.rowKey}`}
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(line.rowKey, "quantity", event.target.value)
                            }
                            required
                            disabled={saving}
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className={labelClass} htmlFor={`price-${line.rowKey}`}>
                            Agreed unit price (₹) *
                          </label>
                          <input
                            id={`price-${line.rowKey}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(event) =>
                              updateLine(line.rowKey, "unitPrice", event.target.value)
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
                          <p className="text-xs text-[#737b6e]">Line total</p>
                          <p className="mt-1 font-bold text-[#354c38]">
                            {formatMoney(
                              Math.max(0, Number(line.quantity) || 0) *
                                Math.max(0, Number(line.unitPrice) || 0)
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
                  <p className="text-sm text-[#737b6e]">Order total preview</p>
                  <p className="mt-1 text-2xl font-bold text-[#354c38]">
                    {formatMoney(draftTotal)}
                  </p>
                  <p className="mt-1 text-xs text-[#818779]">
                    The database calculates the saved order total.
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
            </form>
          )}
        </section>

        <section className={panelClass}>
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a17a3e]">
              Saved records
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#354c38]">Recent orders</h2>
            <p className="mt-2 text-sm leading-6 text-[#737b6e]">
              Update status for each saved order. Every successful change is recorded.
            </p>
          </div>

          {loading ? (
            <p className="py-8 text-sm text-[#818779]">Loading saved orders...</p>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#deded2] bg-[#fafaf6] px-5 py-10 text-center">
              <p className="font-semibold text-[#485746]">No saved orders found</p>
              <p className="mt-2 text-sm text-[#818779]">
                Saved orders will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const draftStatus = statusDrafts[order.id] ?? order.status;
                const isSavingThisOrder = savingStatusId === order.id;

                return (
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
                        {readableStatus(order.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-[#818779]">Phone / WhatsApp</p>
                        <p className="mt-1 break-words text-[#485746]">
                          {order.customer_phone || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#818779]">Email</p>
                        <p className="mt-1 break-words text-[#485746]">
                          {order.customer_email || "Not provided"}
                        </p>
                      </div>
                      {order.delivery_address && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-[#818779]">Delivery address</p>
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
                            <th className="px-3 py-3 text-right">Qty</th>
                            <th className="px-3 py-3 text-right">Unit price</th>
                            <th className="px-3 py-3 text-right">Line total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.id} className="border-t border-[#efeee7]">
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

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece9df] pt-4">
                      <p className="text-sm text-[#737b6e]">
                        {order.items
                          .reduce((sum, item) => sum + Number(item.quantity), 0)
                          .toLocaleString("en-IN")}{" "}
                        pieces
                      </p>
                      <p className="text-lg font-bold text-[#354c38]">
                        {formatMoney(order.total_amount)}
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl bg-[#f7f7f1] p-4">
                      <p className="text-sm font-bold text-[#354c38]">
                        Update order status
                      </p>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <select
                          aria-label={`New status for order ${order.id}`}
                          value={draftStatus}
                          onChange={(event) =>
                            setStatusDrafts((current) => ({
                              ...current,
                              [order.id]: event.target.value,
                            }))
                          }
                          disabled={savingStatusId !== null}
                          className={inputClass}
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {readableStatus(status)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void handleUpdateStatus(order)}
                          disabled={
                            savingStatusId !== null ||
                            draftStatus === order.status
                          }
                          className="shrink-0 rounded-xl bg-[#405a40] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#304831] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSavingThisOrder ? "Updating..." : "Update status"}
                        </button>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#818779]">
                        You'll be asked to confirm before saving the status change.
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl border border-[#e9e5d9] bg-[#fcfcf8] p-4 sm:p-5">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-[#354c38]">
                            Order status timeline
                          </h4>
                          <p className="mt-1 text-xs text-[#818779]">
                            Follow this order from creation to its latest update.
                          </p>
                        </div>
                        <span className="rounded-full bg-[#eaf0e4] px-2.5 py-1 text-[11px] font-semibold text-[#405a40]">
                          {order.history.length + 1} {order.history.length === 0 ? "event" : "events"}
                        </span>
                      </div>
                      <ol className="relative ml-2 border-l-2 border-[#dfe6d8] pl-5">
                        <li className="relative pb-5">
                          <span className="absolute -left-[1.72rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#405a40] bg-[#f8faf5]">
                            <span className="h-2 w-2 rounded-full bg-[#405a40]" />
                          </span>
                          <div className="rounded-xl border border-[#e9e5d9] bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-[#354c38]">
                                Order created
                              </p>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass("ENQUIRY")}`}>
                                Enquiry
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#818779]">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                        </li>
                        {[...order.history].reverse().map((entry, index) => (
                          <li
                            key={entry.id}
                            className={`relative ${index === order.history.length - 1 ? "" : "pb-5"}`}
                          >
                            <span className="absolute -left-[1.72rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#a17a3e] bg-[#fffaf0]">
                              <span className="h-2 w-2 rounded-full bg-[#a17a3e]" />
                            </span>
                            <div className="rounded-xl border border-[#e9e5d9] bg-white p-3">
                              <p className="text-sm font-semibold text-[#485746]">
                                {readableStatus(entry.previous_status)}{" "}
                                <span aria-hidden="true">→</span>{" "}
                                {readableStatus(entry.new_status)}
                              </p>
                              <p className="mt-1 text-xs text-[#818779]">
                                {formatDate(entry.changed_at)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                      {order.history.length === 0 && (
                        <p className="mt-2 text-xs text-[#818779]">
                          No status changes have been recorded yet.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-[#e3e2d8] px-1 py-5 text-xs leading-5 text-[#818779]">
          Unity Enterprise · Order Management · Order status changes are audited.
          Inventory is maintained separately.
        </footer>
      </div>
    </main>
  );
}