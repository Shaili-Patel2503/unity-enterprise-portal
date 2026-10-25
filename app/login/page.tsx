"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(`Unable to sign in: ${error.message}`);
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F3F0E7] p-3 text-[#26372D] sm:p-5 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1440px] overflow-hidden rounded-[26px] border border-[#E5DFD2] bg-[#FFFEFA] shadow-[0_30px_100px_rgba(38,55,45,0.12)] sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[32px] lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.02fr_0.98fr]">
        {/* Brand and visual panel */}
        <section className="relative hidden flex-col overflow-hidden bg-[#233B2E] px-10 py-10 text-white sm:px-12 lg:flex xl:px-16 xl:py-12">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full border border-white/[0.07]" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-[340px] w-[340px] rounded-full border border-white/[0.08]" />
          <div className="pointer-events-none absolute -bottom-40 -left-40 h-[460px] w-[460px] rounded-full bg-[#D8B46C]/[0.07] blur-2xl" />

          {/* Desktop Unity Enterprise logo */}
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-lg shadow-black/10">
              <Image
                src="/unity-logo.png.png"
                alt="Unity Enterprise logo"
                width={220}
                height={90}
                priority
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="text-lg font-semibold tracking-tight">
                Unity Enterprise
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.24em] text-white/55">
                Thoughtfully made. Reliably supplied.
              </p>
            </div>
          </div>

          <div className="relative mt-14 max-w-xl xl:mt-16">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#E8CB8D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D8B46C] shadow-[0_0_10px_rgba(216,180,108,0.8)]" />
              Your business, in one place
            </div>

            <h1 className="mt-7 font-serif text-[42px] font-medium leading-[1.12] tracking-[-0.04em] xl:text-[54px]">
              The little details
              <br />
              make a big
              <br />
              <span className="italic text-[#D8B46C]">difference.</span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-white/65 xl:text-base">
              Your everyday workspace for products, physical stock and a
              thoughtful customer catalogue.
            </p>
          </div>

          {/* Reusable bag illustration */}
          <div className="relative flex flex-1 items-center justify-center py-4">
            <div className="absolute h-64 w-64 rounded-full bg-[#D8B46C]/[0.08] blur-3xl xl:h-80 xl:w-80" />

            <svg
              viewBox="0 0 440 300"
              role="img"
              aria-label="Illustration of reusable shopping bags"
              className="relative w-full max-w-[430px] drop-shadow-2xl"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <ellipse
                cx="220"
                cy="268"
                rx="166"
                ry="13"
                fill="#101E17"
                fillOpacity="0.38"
              />

              <path d="M73 117H187L198 257H62L73 117Z" fill="#D8B46C" />

              <path
                d="M97 117C97 88 108 71 130 71C152 71 163 88 163 117"
                stroke="#D8B46C"
                strokeWidth="8"
                strokeLinecap="round"
              />

              <path d="M73 117H187L184 138H76L73 117Z" fill="#E8CC91" />

              <path
                d="M103 163H157M103 174H147"
                stroke="#243C30"
                strokeOpacity="0.48"
                strokeWidth="2"
                strokeLinecap="round"
              />

              <path
                d="M161 90H300L319 257H147L161 90Z"
                fill="#F3E9D5"
              />

              <path
                d="M190 90C190 54 205 33 232 33C259 33 274 54 274 90"
                stroke="#F3E9D5"
                strokeWidth="9"
                strokeLinecap="round"
              />

              <path
                d="M161 90H300L305 113H157L161 90Z"
                fill="#E1D3B9"
              />

              <rect
                x="197"
                y="153"
                width="67"
                height="44"
                rx="7"
                fill="#243C30"
              />

              <text
                x="230.5"
                y="181"
                fill="#E8CB8C"
                fontSize="25"
                fontWeight="700"
                textAnchor="middle"
              >
                U
              </text>

              <path
                d="M211 211H250M214 220H246"
                stroke="#243C30"
                strokeOpacity="0.35"
                strokeWidth="2"
                strokeLinecap="round"
              />

              <path
                d="M292 136H385L398 257H280L292 136Z"
                fill="#8A9A79"
              />

              <path
                d="M309 136C309 111 319 96 338 96C357 96 367 111 367 136"
                stroke="#8A9A79"
                strokeWidth="7"
                strokeLinecap="round"
              />

              <path
                d="M292 136H385L387 153H290L292 136Z"
                fill="#A6B397"
              />

              <path
                d="M314 183C323 168 337 168 346 183C337 198 323 198 314 183Z"
                fill="#243C30"
                fillOpacity="0.62"
              />

              <path
                d="M330 168V198"
                stroke="#243C30"
                strokeOpacity="0.55"
                strokeWidth="1.5"
              />

              <circle cx="355" cy="54" r="3" fill="#D8B46C" />
              <circle cx="84" cy="64" r="4" fill="#D8B46C" fillOpacity="0.7" />

              <path
                d="M345 77L351 83L357 77M108 43L114 49L120 43"
                stroke="#D8B46C"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="absolute bottom-2 right-1 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-md xl:right-0">
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/50">
                Built around
              </p>
              <p className="mt-1 text-xs font-medium text-[#E8CB8D]">
                Everyday essentials
              </p>
            </div>
          </div>

          <div className="relative mt-auto border-t border-white/10 pt-5">
            <div className="flex flex-wrap gap-2">
              {["Home stock", "Godown stock", "Product catalogue"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-2 text-xs text-white/75"
                  >
                    {item}
                  </span>
                )
              )}
            </div>

            <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
              Bharuch, Gujarat · India
            </p>
          </div>
        </section>

        {/* Login panel */}
        <section className="relative flex items-center justify-center overflow-hidden px-5 py-9 sm:px-10 sm:py-12 lg:px-12 xl:px-16">
          <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#E9DFC9]/45 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[#E6EBDD]/70 blur-3xl" />

          <div className="relative w-full max-w-[410px]">
            {/* Mobile Unity Enterprise logo */}
            <div className="mb-12 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-sm">
                <Image
                  src="/unity-logo.png.png"
                  alt="Unity Enterprise logo"
                  width={220}
                  height={90}
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <p className="font-semibold tracking-tight">
                  Unity Enterprise
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#8A8F81]">
                  Business workspace
                </p>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.23em] text-[#9B7A42]">
                <span className="h-px w-6 bg-[#B99B62]" />
                Staff access
              </div>

              <h2 className="mt-4 font-serif text-[40px] font-medium leading-[1.12] tracking-[-0.045em] text-[#26372D] sm:text-[47px]">
                Welcome back.
              </h2>

              <p className="mt-3 max-w-sm text-sm leading-6 text-[#7B8176]">
                A calmer way to keep your products and stock organised.
                Sign in to continue.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#465044]">
                  Email address
                </span>

                <div className="group flex items-center gap-3 rounded-2xl border border-[#E5E4D9] bg-[#FCFBF7] px-4 transition duration-200 focus-within:border-[#65785A] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#65785A]/10">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px] shrink-0 text-[#92988A] transition group-focus-within:text-[#52664B]"
                    fill="none"
                  >
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M4 7L12 13L20 7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <input
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent py-4 text-sm text-[#26372D] outline-none placeholder:text-[#B1B3A9]"
                    placeholder="you@company.com"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-[#465044]">
                  Password
                </span>

                <div className="group flex items-center gap-3 rounded-2xl border border-[#E5E4D9] bg-[#FCFBF7] px-4 transition duration-200 focus-within:border-[#65785A] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#65785A]/10">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-[18px] w-[18px] shrink-0 text-[#92988A] transition group-focus-within:text-[#52664B]"
                    fill="none"
                  >
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 10V7A4 4 0 0116 7V10"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="15" r="1.2" fill="currentColor" />
                    <path
                      d="M12 16.5V18"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>

                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent py-4 text-sm text-[#26372D] outline-none placeholder:text-[#B1B3A9]"
                    placeholder="Enter your password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    className="shrink-0 rounded-lg px-1 py-1 text-[11px] font-semibold text-[#69775F] transition hover:text-[#26372D] focus:outline-none focus:ring-2 focus:ring-[#65785A]/30"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {message && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-2xl border border-[#E8C5B9] bg-[#FFF5F1] px-4 py-3 text-sm leading-6 text-[#9B493B]"
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#263C30] px-5 py-[17px] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(38,60,48,0.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#314D3D] hover:shadow-[0_12px_24px_rgba(38,60,48,0.22)] focus:outline-none focus:ring-4 focus:ring-[#65785A]/25 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
              >
                <span>
                  {loading ? "Signing you in..." : "Sign in to workspace"}
                </span>

                {!loading && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                  >
                    <path
                      d="M5 12H19M13 6L19 12L13 18"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </form>

            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-[#E7E6DC] bg-[#F8F7F1] p-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6EBDD] text-[#52664B]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                >
                  <path
                    d="M12 3L19 6V11.5C19 16 16 19 12 21C8 19 5 16 5 11.5V6L12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12L11 14L15 10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#465044]">
                  Private staff access
                </p>
                <p className="mt-1 text-[11px] leading-5 text-[#858A7E]">
                  This workspace is for authorised Unity Enterprise staff.
                  Public registration is disabled.
                </p>
              </div>
            </div>

            <p className="mt-9 text-center text-[10px] font-medium tracking-[0.16em] text-[#A2A497]">
              UNITY ENTERPRISE <span className="mx-1.5">·</span> BHARUCH,
              GUJARAT
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}