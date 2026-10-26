
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const summaryCards = [
  { title: "Total Products", value: "0", note: "Bag models in your catalog", icon: "box", tone: "olive" },
  { title: "Stock Available", value: "0", note: "Pieces in inventory", icon: "layers", tone: "gold" },
  { title: "Total Customers", value: "0", note: "Registered customers", icon: "users", tone: "clay" },
  { title: "Pending Orders", value: "0", note: "Orders to process", icon: "clipboard", tone: "blue" },
] as const;

const shortcuts = [
  { title: "Add Product", description: "Add a bag model, photos, sizes and pricing.", icon: "box", target: "Products & Catalog", number: "01" },
  { title: "Manage Inventory", description: "Review stock levels and record movements.", icon: "layers", target: "Inventory", number: "02" },
  { title: "Add Customer", description: "Keep customer names and contact details organised.", icon: "users", target: "Customers", number: "03" },
  { title: "View Orders", description: "Keep track of customer orders and deliveries.", icon: "clipboard", target: "Orders", number: "04" },
] as const;

const menuItems = [
  { title: "Dashboard", icon: "home" },
  { title: "Products & Catalog", icon: "box" },
  { title: "Inventory", icon: "layers" },
  { title: "Customers", icon: "users" },
  { title: "Orders", icon: "clipboard" },
  { title: "Purchases", icon: "cart" },
  { title: "Payments", icon: "wallet" },
  { title: "Reports", icon: "chart" },
] as const;

type IconName =
  | "home" | "box" | "layers" | "users" | "clipboard"
  | "cart" | "wallet" | "chart" | "arrow" | "pin"
  | "leaf" | "sparkle" | "menu" | "logout";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M3 8v9l9 5 9-5V8" /><path d="M12 13v9" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5a3.5 3.5 0 0 1 0 6.8" /><path d="M18 14a5.5 5.5 0 0 1 3.5 5" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2" /><path d="M8 10h8M8 14h8M8 18h5" /></>,
    cart: <><path d="M3 4h2l2.5 11h10L21 7H6" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2.5" /><path d="M3 9h18" /><path d="M16 14h2" /><path d="M6 5V3h12v2" /></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    leaf: <><path d="M20 4c-9 0-15 4-15 11a5 5 0 0 0 5 5c7 0 11-7 10-16Z" /><path d="M4 21c3-6 7-9 12-12" /></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {paths[name]}
    </svg>
  );
}

export default function Home() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function navigateTo(item: string) {
    setMobileMenuOpen(false);

    if (item === "Dashboard") {
      window.location.href = "/dashboard";
      return;
    }
    if (item === "Products & Catalog") {
      window.location.href = "/products";
      return;
    }
    if (item === "Inventory") {
      window.location.href = "/inventory";
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
        error instanceof Error ? error.message : "Unable to sign out. Please try again."
      );
      setSigningOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f0] text-[#27362b] md:flex">
      <aside className={`${mobileMenuOpen ? "block" : "hidden"} border-b border-[#344537] bg-[#23372b] p-5 text-white md:flex md:min-h-screen md:w-[258px] md:shrink-0 md:flex-col md:border-b-0 md:border-r md:border-[#344537] md:p-6`}>
        <button type="button" onClick={() => navigateTo("Dashboard")} className="mb-9 flex items-center gap-3 text-left">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-sm">
            <img src="/unity-logo.png" alt="Unity Enterprise logo" className="h-full w-full object-contain" />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">Unity Enterprise</span>
            <span className="mt-1 block text-xs tracking-wide text-[#c4d0c5]">BUSINESS WORKSPACE</span>
          </span>
        </button>

        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#aebdaf]">Main menu</div>
        <nav className="flex flex-wrap gap-1.5 md:flex-col">
          {menuItems.map((item) => {
            const active = activePage === item.title;
            return (
              <button key={item.title} type="button" onClick={() => navigateTo(item.title)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition ${active ? "bg-[#d8b777] font-semibold text-[#23372b] shadow-sm" : "text-[#e0e7df] hover:bg-white/10"}`}>
                <Icon name={item.icon} size={18} />
                <span>{item.title}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#23372b]" />}
              </button>
            );
          })}
        </nav>

        <div className="mt-8 rounded-2xl border border-white/15 bg-white/[0.06] p-4 md:mt-auto">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#e5c98f]"><Icon name="pin" size={18} /></div>
          <p className="text-sm font-semibold">Unity Enterprise</p>
          <p className="mt-1 text-xs text-[#c4d0c5]">Bharuch, Gujarat, India</p>
          <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-[#b6c4b8]">Internal business portal · Phase 1</div>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[#e5e4d9] bg-[#fbfaf6] px-5 py-4 md:px-9 md:py-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle navigation menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5e4d9] text-[#455747] hover:bg-[#f0efe6] md:hidden"><Icon name="menu" /></button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#78836f]">UNITY ENTERPRISE / WORKSPACE</p>
              <p className="mt-1 text-sm text-[#6f796e]">Your business, organised.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-[#e5e4d9] bg-white px-3.5 py-2.5 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eef0e5] text-[#53694e]"><Icon name="pin" size={15} /></span>
              <span><span className="block text-[10px] text-[#8a9185]">BUSINESS LOCATION</span><span className="mt-0.5 block text-xs font-semibold">Bharuch, Gujarat</span></span>
            </div>
            <button type="button" onClick={handleSignOut} disabled={signingOut} className="flex items-center gap-2 rounded-xl border border-[#dedfd3] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#3b4d3d] transition hover:bg-[#f0efe6] disabled:cursor-not-allowed disabled:opacity-60">
              <Icon name="logout" size={16} /><span className="hidden sm:inline">{signingOut ? "Signing out..." : "Sign out"}</span>
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] p-5 md:p-9">
          {signOutError && <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Sign out failed: {signOutError}</div>}

          {activePage === "Dashboard" ? (
            <>
              <section className="relative mb-8 overflow-hidden rounded-[28px] bg-[#e9ecdf] p-6 sm:p-8 lg:p-10">
                <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border border-[#cbd2bc] opacity-70" />
                <div className="pointer-events-none absolute -right-2 -top-6 h-44 w-44 rounded-full border border-[#cbd2bc] opacity-70" />
                <div className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-[#d8dfcc]/60" />
                <div className="relative z-10 max-w-2xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cbd2bc] bg-white/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#50664a]"><Icon name="sparkle" size={14} />Your business at a glance</div>
                  <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight text-[#263b2c] sm:text-4xl lg:text-[42px]">A better way to manage{" "}<span className="font-serif italic text-[#71815d]">your business.</span></h1>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-[#5e6c5b] sm:text-base">Welcome to your Unity Enterprise workspace. Keep your bag catalog, inventory and daily operations organised in one place.</p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <button type="button" onClick={() => navigateTo("Products & Catalog")} className="inline-flex items-center gap-2 rounded-xl bg-[#2d4634] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3c5841]">Explore products <Icon name="arrow" size={17} /></button>
                    <button type="button" onClick={() => navigateTo("Inventory")} className="rounded-xl border border-[#cbd2bc] bg-white/70 px-5 py-3 text-sm font-semibold text-[#354a37] transition hover:bg-white">View inventory</button>
                  </div>
                </div>
                <div className="relative z-10 mt-8 flex items-center gap-2 border-t border-[#cbd2bc] pt-4 text-xs text-[#64715e] sm:mt-10"><Icon name="leaf" size={16} /><span>Reusable bags. Thoughtful business.</span></div>
              </section>

              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#849079]">YOUR NUMBERS</p><h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[#2b3b2e]">Business overview</h2><p className="mt-1 text-sm text-[#7b8377]">A snapshot of your business workspace.</p></div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#e5dfc7] bg-[#f4f0df] px-3 py-1.5 text-xs font-medium text-[#827044]"><span className="h-1.5 w-1.5 rounded-full bg-[#b49a5b]" />Initial setup</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => {
                  const toneClasses = { olive: "bg-[#eaf0e4] text-[#536d4b]", gold: "bg-[#f5efdf] text-[#927541]", clay: "bg-[#f5e9e2] text-[#9c684f]", blue: "bg-[#e7edf0] text-[#5b7782]" };
                  return (
                    <article key={card.title} className="rounded-2xl border border-[#e8e6db] bg-[#fffefa] p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-[#747d70]">{card.title}</p><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[card.tone]}`}><Icon name={card.icon} size={21} /></span></div>
                      <p className="mt-5 text-3xl font-semibold tracking-tight text-[#2d3c2f]">{card.value}</p>
                      <p className="mt-2 text-xs leading-5 text-[#92978c]">{card.note}</p>
                    </article>
                  );
                })}
              </div>

              <section className="mt-10">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#849079]">GET THINGS DONE</p><h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[#2b3b2e]">Quick actions</h2><p className="mt-1 text-sm text-[#7b8377]">Jump straight into your everyday tasks.</p></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {shortcuts.map((shortcut) => (
                    <button key={shortcut.title} type="button" onClick={() => navigateTo(shortcut.target)} className="group rounded-2xl border border-[#e7e5d9] bg-[#fffefa] p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-[#c5cfb7] hover:shadow-lg hover:shadow-[#34472c]/5">
                      <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf0e7] text-[#50664a] transition group-hover:bg-[#dfe7d6]"><Icon name={shortcut.icon} size={21} /></span><span className="text-xs font-medium tracking-widest text-[#b1b5a7]">{shortcut.number}</span></div>
                      <h3 className="mt-5 font-semibold text-[#344436]">{shortcut.title}</h3><p className="mt-2 min-h-[48px] text-sm leading-6 text-[#82897d]">{shortcut.description}</p>
                      <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#657b56]">Open section <span className="transition-transform group-hover:translate-x-1"><Icon name="arrow" size={15} /></span></span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-2xl border border-[#e7e5d9] bg-[#fffefa] p-6 sm:p-7">
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4efdf] text-[#947b47]"><Icon name="sparkle" size={20} /></span><div><h3 className="font-semibold text-[#344436]">Recommended next step</h3><p className="mt-1 text-xs text-[#8a9084]">Build your product catalog</p></div></div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[#727b6e]">Start by organising your bag models, product photos, sizes, colours and prices. A well-maintained catalog will make it easier to share your products with customers and handle enquiries.</p>
                  <button type="button" onClick={() => navigateTo("Products & Catalog")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2d4634] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3c5841]">Go to products <Icon name="arrow" size={16} /></button>
                </div>
                <div className="rounded-2xl bg-[#2d4634] p-6 text-white sm:p-7">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#e4c88f]"><Icon name="pin" size={20} /></div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.17em] text-[#c5d0bf]">Made in Bharuch</p><h3 className="mt-2 text-2xl font-semibold leading-snug">Small business.<br />Thoughtful products.</h3>
                  <p className="mt-3 text-sm leading-6 text-[#d0dbce]">One workspace to help your family business grow, one step at a time.</p>
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-2xl border border-[#e7e5d9] bg-[#fffefa] p-8 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#849079]">PORTAL SECTION</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#2d3c2f]">{activePage}</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#727b6e]">This section is part of the planned portal. We will build its working features step by step. Its business data is not connected yet.</p>
              <button type="button" onClick={() => setActivePage("Dashboard")} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2d4634] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3c5841]">Back to Dashboard</button>
            </div>
          )}

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#e5e4d9] pt-5 text-xs text-[#969b8f]">
            <span>Unity Enterprise · Internal business portal</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#82966f]" />Development version</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
