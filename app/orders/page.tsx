"use client";
import { useEffect, useState } from "react";
type Order = {
  id: string;
  customer: string;
  model: string;
  quantity: number;
  status: string;
};
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function loadOrders() {
      try {
        const response = await fetch("http://localhost:8080/api/orders", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        const data: Order[] = await response.json();
        setOrders(data);
        setError("");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load orders."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadOrders();
    return () => controller.abort();
  }, []);
  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 md:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-medium text-amber-700">
          UNITY ENTERPRISE / WORKSPACE
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <a
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100"
          >
            Back to dashboard
          </a>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Orders currently returned by your Java Spring Boot API.
        </p>
        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            Loading orders...
          </div>
        ) : error ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
          >
            <h2 className="font-semibold">Could not load orders</h2>
            <p className="mt-2 text-sm">{error}</p>
            <p className="mt-2 text-sm">
              Check that Spring Boot is running on port 8080.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Orders returned</p>
                <p className="mt-2 text-3xl font-bold">{orders.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Total pieces in sample</p>
                <p className="mt-2 text-3xl font-bold">
                  {orders.reduce((total, order) => total + order.quantity, 0)}
                </p>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Order ID</th>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Bag model</th>
                    <th className="px-5 py-4 font-semibold">Quantity</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4 font-semibold">
                        {order.id}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {order.customer}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {order.model}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {order.quantity}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <p className="p-6 text-slate-500">No orders were returned.</p>
              )}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              These are sample API records, not saved business orders.
            </p>
          </>
        )}
      </div>
    </main>
  );
}