"use client";

import React from "react";
import {
  TerminalSquare,
  Command,
  ChevronRight,
  Check,
  Zap,
  BoxSelect,
  Lock,
  Clock3,
  Link2,
  Server,
  Activity,
  CircleHelp,
} from "lucide-react";

/**
 * DRIFTCORE — distinct layout & hero style
 * Visual language: dark charcoal canvas, subtle grid texture, brutalist accents,
 * left vertical rail nav, billboard headline, COMMAND-PALETTE hero (very different
 * from prior cards/duo-column heroes). Tight, utilitarian components.
 */

const CONTAINER = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

const RailLink = ({
  href,
  children,
}: React.PropsWithChildren<{ href: string }>) => (
  <a
    href={href}
    className="block rounded-md px-2.5 py-2 text-[13px] text-slate-300 hover:bg-white/5"
  >
    {children}
  </a>
);

const Stat = ({ k, v }: { k: string; v: string }) => (
  <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
    <div className="text-[10px] uppercase tracking-wider text-slate-400">
      {k}
    </div>
    <div className="text-sm text-slate-100">{v}</div>
  </div>
);

const Feature = ({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) => (
  <div className="grid grid-cols-[28px_1fr] gap-3 items-start border-t border-white/10 py-5 first:border-t-0">
    <div className="h-7 w-7 grid place-items-center rounded-md bg-lime-400/10 text-lime-300">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-300">{desc}</div>
    </div>
  </div>
);

export default function DriftcoreLanding() {
  return (
    <div className="min-h-screen text-white bg-[#0A0D14] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0),radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:24px_24px,48px_48px]">
      {/* Top bar */}
      <header className="border-b border-white/10 sticky top-0 z-50 backdrop-blur bg-[#0A0D14]/70">
        <div className={`${CONTAINER} h-14 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 grid place-items-center rounded-[6px] border border-lime-400/40 text-lime-300">
              <TerminalSquare className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Driftcore</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-[13px] text-slate-300">
            <a href="#why" className="hover:text-white">
              Why
            </a>
            <a href="#studio" className="hover:text-white">
              Studio
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
            <a href="#faq" className="hover:text-white">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="hidden sm:inline-flex h-8 items-center rounded-[6px] px-3 text-[13px] ring-1 ring-white/15 text-slate-200 hover:bg-white/10"
            >
              Sign in
            </a>
            <a
              href="#pricing"
              className="inline-flex h-8 items-center rounded-[6px] bg-lime-400 px-3 text-[13px] font-medium text-black"
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      {/* Hero: vertical rail + command palette */}
      <section className="relative">
        <div
          className={`${CONTAINER} grid lg:grid-cols-[220px_1fr] gap-8 py-10 md:py-14`}
        >
          {/* Left rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-16">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">
                Navigation
              </div>
              <nav className="space-y-1">
                <RailLink href="#hero">Overview</RailLink>
                <RailLink href="#why">Capabilities</RailLink>
                <RailLink href="#studio">Studio</RailLink>
                <RailLink href="#pricing">Plans</RailLink>
              </nav>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <Stat k="Latency" v="<300ms" />
                <Stat k="Regions" v="6" />
                <Stat k="Uptime" v="99.99%" />
                <Stat k="SSO" v="Okta/GS" />
              </div>
            </div>
          </aside>

          {/* Billboard + command */}
          <div id="hero">
            <div className="max-w-3xl">
              <h1 className="text-[40px] sm:text-[56px] leading-[1.05] font-semibold tracking-tight">
                Automate anything.
                <span className="block">Ship in the command palette.</span>
              </h1>
              <p className="mt-4 text-slate-300 text-base sm:text-lg max-w-prose">
                Driftcore is a **command‑palette OS** for teams. Type
                forward‑slash, wire actions, and let the runtime handle queues,
                retries, and secrets.
              </p>
            </div>

            {/* Command palette */}
            <div className="mt-6 rounded-lg border border-white/15 bg-black/30">
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-slate-300/90 text-[13px]">
                <Command className="h-4 w-4" />
                <span>Type a command…</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    k: "/email.send",
                    d: "Send campaign to segment: warm-users",
                  },
                  {
                    k: "/sheet.append",
                    d: "Append new orders to Google Sheet",
                  },
                  { k: "/queue.push", d: "Publish job to payments.retries" },
                  { k: "/image.resize", d: "Create 400/800/1600 px variants" },
                  { k: "/cron.create", d: "Run flow nightly at 01:00 UTC" },
                  { k: "/secret.put", d: "Store RESEND_API_KEY" },
                ].map((it) => (
                  <button
                    key={it.k}
                    className="group flex items-center justify-between gap-3 px-3 py-3 text-left text-[13px] hover:bg-white/5"
                  >
                    <span className="font-mono text-lime-300">{it.k}</span>
                    <span className="text-slate-300">{it.d}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-500 group-hover:text-lime-300" />
                  </button>
                ))}
              </div>
            </div>

            {/* Ticker */}
            <div className="mt-6 overflow-hidden border border-white/10 rounded-md bg-white/5">
              <div className="whitespace-nowrap animate-[marquee_22s_linear_infinite] text-[12px] text-slate-300 p-2 font-mono">
                ↻ Queued: 12 — ✓ Completed: 1,284 — Δ Latency: 238ms — Retries:
                0.01% — Regions: EU‑W, US‑E, US‑W, AP‑S — Secrets rotated —
                Billing ok — Webhooks healthy —
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="border-t border-white/10">
        <div
          className={`${CONTAINER} py-12 md:py-16 grid lg:grid-cols-[220px_1fr] gap-8`}
        >
          <div className="hidden lg:block" />
          <div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Feature
                icon={Zap}
                title="Fast wiring"
                desc="Slash‑commands turn actions into repeatable flows with zero boilerplate."
              />
              <Feature
                icon={BoxSelect}
                title="Composable"
                desc="Actions are tiny, testable functions. Mix, match, and share across teams."
              />
              <Feature
                icon={Server}
                title="Managed runtime"
                desc="Global queues, idempotency, and exponential backoff baked in."
              />
              <Feature
                icon={Lock}
                title="Vaulted secrets"
                desc="Bring your own KMS, rotate keys, trace every access."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Studio */}
      <section id="studio" className="border-t border-white/10">
        <div
          className={`${CONTAINER} py-12 md:py-16 grid lg:grid-cols-[220px_1fr] gap-8`}
        >
          <div className="hidden lg:block" />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                t: "Observe",
                d: "Real‑time traces, flame graphs, and alerting hooks.",
                i: Activity,
              },
              {
                t: "Schedule",
                d: "Cron, delay, and backfill with budget guardrails.",
                i: Clock3,
              },
              {
                t: "Connect",
                d: "Webhooks, queues, and databases with strong typing.",
                i: Link2,
              },
            ].map(({ t, d, i: Icon }) => (
              <div
                key={t}
                className="rounded-lg border border-white/10 bg-black/30 p-5"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="h-4 w-4 text-lime-300" /> {t}
                </div>
                <p className="mt-2 text-sm text-slate-300">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/10">
        <div
          className={`${CONTAINER} py-12 md:py-16 grid lg:grid-cols-[220px_1fr] gap-8`}
        >
          <div className="hidden lg:block" />
          <div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  n: "Starter",
                  p: "$0",
                  f: ["2k ops/mo", "3 teammates", "Community"],
                },
                {
                  n: "Pro",
                  p: "$29",
                  f: ["50k ops/mo", "Unlimited teammates", "Priority"],
                },
                {
                  n: "Scale",
                  p: "Custom",
                  f: ["SSO/SAML", "VPC/regions", "SLA"],
                },
              ].map(({ n, p, f }) => (
                <div
                  key={n}
                  className="rounded-lg border border-white/10 bg-white/5 p-6 flex flex-col"
                >
                  <div className="flex items-baseline justify-between">
                    <div className="text-base font-medium">{n}</div>
                    <span className="text-[11px] text-slate-300">
                      {n === "Pro" ? "Popular" : ""}
                    </span>
                  </div>
                  <div className="mt-2 text-3xl font-semibold">
                    {p}
                    <span className="ml-1 text-sm text-slate-300">
                      {p !== "Custom" ? "/mo" : ""}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    {f.map((x) => (
                      <li key={x} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-lime-300" />{" "}
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#"
                    className="mt-5 inline-flex items-center justify-center rounded-[6px] bg-lime-400 px-4 py-2 text-[13px] font-medium text-black"
                  >
                    Choose
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-white/10">
        <div
          className={`${CONTAINER} py-12 md:py-16 grid lg:grid-cols-[220px_1fr] gap-8`}
        >
          <div className="hidden lg:block" />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                q: "What is Driftcore?",
                a: "A command‑palette automation OS that lets teams wire actions into flows without boilerplate.",
              },
              {
                q: "Is there an API?",
                a: "Yes. Type‑safe SDKs plus REST and webhooks. CLI for local dev and deploy.",
              },
              {
                q: "How am I billed?",
                a: "Usage‑based on operations per month with generous free tier.",
              },
              {
                q: "Do you support SSO?",
                a: "Okta, Google, Azure AD on Pro+ with audit trails.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="rounded-lg border border-white/10 bg-black/30 p-5"
              >
                <div className="text-sm font-medium">{q}</div>
                <p className="mt-1 text-sm text-slate-300">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div
          className={`${CONTAINER} py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6`}
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 grid place-items-center rounded-[6px] border border-lime-400/40 text-lime-300">
              <TerminalSquare className="h-4 w-4" />
            </div>
            <span className="font-semibold">Driftcore</span>
          </div>
          <div className="text-[13px] text-slate-400">
            © {new Date().getFullYear()} Driftcore Labs. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-[13px] text-slate-300">
            <a href="#" className="hover:underline">
              Status
            </a>
            <a href="#" className="hover:underline">
              Security
            </a>
            <a href="#" className="hover:underline flex items-center gap-1">
              <CircleHelp className="h-4 w-4" /> Help
            </a>
          </div>
        </div>
      </footer>

      <style>{`
      @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      `}</style>
    </div>
  );
}
