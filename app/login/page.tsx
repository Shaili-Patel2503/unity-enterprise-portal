
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(`Login failed: ${error.message}`);
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Error: ${error.message}`
          : "An unexpected error occurred."
      );
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-2xl font-bold text-slate-950">
          U
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-amber-700">
          Unity Enterprise
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Staff login
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sign in to manage your business products and catalog.
        </p>

        <form onSubmit={handleLogin} className="mt-7 space-y-5">
          <label className="block text-sm font-medium">
            Email address
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              placeholder="Enter your staff email"
            />
          </label>

          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              placeholder="Enter your password"
            />
          </label>

          {message && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Access is restricted to authorised Unity Enterprise staff. New public
          registrations are disabled.
        </p>
      </section>
    </main>
  );
}
