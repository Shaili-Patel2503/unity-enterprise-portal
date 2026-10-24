
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const summaryCards = [
  { title: "Total Products", value: "0", note: "Bag models in catalog", icon: "▤" },
  { title: "Stock Available", value: "0", note: "Pieces in inventory", icon: "▣" },
  { title: "Total Customers", value: "0", note: "Registered customers", icon: "♙" },
  { title: "Pending Orders", value: "0", note: "Orders to process", icon: "◷" },
];

const shortcuts = [
  { title: "Add Product", description: "Add a bag model and its photos", icon: "＋" },
  { title: "Manage Inventory", description: "Review available stock", icon: "▦" },
  { title: "Add Customer", description: "Save customer contact details", icon: "♙" },
  { title: "View Orders", description: "Track orders and deliveries", icon: "⇄" },
];

const menuItems = [
  "Dashboard",
  "Products & Catalog",
  "Inventory",
  "Customers",
  "Orders",
  "Purchases",
  "Payments",
  "Reports",
];

export default function Home() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  function navigateTo(item: string) {
    if (item === "Products & Catalog") {
      window.location.href = "/products";
      return;
    }

    setActivePage(item);
  }

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setSignOutError(error.message);
        setSigningOut(false);
        return;
      }

      window.location.replace("/login");
    } catch (error) {
      setSignOutError(
        error instanceof Error
          ? error.message
          : "Unable to sign out. Please try again."
      );
      setSigningOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="bg-slate-950 p-5 text-white md:min-h-screen md:w-64 md:shrink-0">
        <div className="mb-8">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-xl font-bold text-slate-950">
            U
          </div>
          <h1 className="text-xl font-bold">Unity Enterprise</h1>
          <p className="mt-1 text-sm text-slate-400">Business Management</p>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Workspace
        </p>

        <nav className="flex flex-wrap gap-2 md:flex-col">
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => navigateTo(item)}
              className={`rounded-lg px-3 py-2.5 text-left text-sm transition ${
                activePage === item
                  ? "bg-amber-500 font-semibold text-slate-950"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-8 rounded-xl border border-slate-800 p-3">
          <p className="text-sm font-medium">Unity Enterprise</p>
          <p className="mt-1 text-xs text-slate-400">
            Bharuch, Gujarat, India
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Portal prototype · Phase 1
          </p>
        </div>
      </aside>

      <section className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-amber-700">
              UNITY ENTERPRISE / WORKSPACE
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              {activePage}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Manage your products, stock, customers and orders in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-slate-500">Business location</p>
              <p className="mt-1 font-semibold">Bharuch, Gujarat</p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </header>

        {signOutError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            Sign out failed: {signOutError}
          </div>
        )}

        {activePage === "Dashboard" ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Business overview</h3>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                Initial setup
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{card.title}</p>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-700">
                      {card.icon}
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-bold">{card.value}</p>
                  <p className="mt-2 text-xs text-slate-500">{card.note}</p>
                </article>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold">Quick actions</h3>
              <p className="mt-1 text-sm text-slate-500">
                Common tasks for your daily business operations.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {shortcuts.map((shortcut) => {
                  const target =
                    shortcut.title === "Add Product"
                      ? "Products & Catalog"
                      : shortcut.title === "Manage Inventory"
                        ? "Inventory"
                        : shortcut.title === "Add Customer"
                          ? "Customers"
                          : "Orders";

                  return (
                    <button
                      key={shortcut.title}
                      onClick={() => navigateTo(target)}
                      className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">
                        {shortcut.icon}
                      </span>
                      <h4 className="mt-4 font-semibold">
                        {shortcut.title}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {shortcut.description}
                      </p>
                      <p className="mt-4 text-sm font-semibold text-amber-700">
                        Open section →
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
              <h3 className="font-semibold">Your next step</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Start by adding your bag models, such as DM 123, with their
                photos, sizes, colours and pricing. We will then connect the
                catalog to a database so your product information can be
                saved permanently.
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-amber-700">
              PORTAL SECTION
            </p>
            <h3 className="mt-2 text-xl font-bold">{activePage}</h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              This section is part of the planned portal. We will build its
              working features step by step. Your business data is not
              connected yet.
            </p>
            <button
              onClick={() => setActivePage("Dashboard")}
              className="mt-6 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              ← Back to Dashboard
            </button>
          </div>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-400">
          Unity Enterprise · Internal business portal · Development version
        </footer>
      </section>
    </main>
  );
}
