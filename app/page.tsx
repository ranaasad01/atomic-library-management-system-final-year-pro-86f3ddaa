"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";
import { BookOpen, Users, ArrowRight, Search, Shield, BarChart3, Clock, CheckCircle, Star, BookMarked, AlertCircle, Layers } from 'lucide-react';
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FINE_RATE_PER_DAY, MAX_BOOKS_PER_MEMBER } from "@/lib/data";
type APP_FULL_NAME = any;
const APP_FULL_NAME: any = [];
type APP_INSTITUTION = any;
const APP_INSTITUTION: any = [];
type APP_TAGLINE = any;
const APP_TAGLINE: any = [];
type LOAN_PERIOD_DAYS = any;
const LOAN_PERIOD_DAYS: any = [];
type BOOK_GENRES = any;
const BOOK_GENRES: any = [];

// ─── Inline data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: BookOpen,
    title: "Smart Book Catalogue",
    description:
      "Browse thousands of titles across every department. Filter by genre, author, or availability in seconds.",
  },
  {
    icon: Users,
    title: "Member Management",
    description:
      "Admins can onboard, edit, and deactivate library members with full audit trails and membership numbers.",
  },
  {
    icon: ArrowRight,
    title: "Issue & Return Workflow",
    description:
      "Streamlined checkout and return process with automatic due-date calculation and status tracking.",
  },
  {
    icon: AlertCircle,
    title: "Fine Calculation",
    description:
      `Overdue fines calculated at PKR ${FINE_RATE_PER_DAY}/day automatically. Admins can waive or mark fines paid.`,
  },
  {
    icon: BarChart3,
    title: "Admin Dashboard",
    description:
      "Real-time overview of active loans, overdue books, collected fines, and member activity at a glance.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description:
      "JWT-secured routes ensure members only see their own data while admins have full system control.",
  },
];

const STATS = [
  { value: "10,000+", label: "Books Catalogued" },
  { value: `${LOAN_PERIOD_DAYS} Days`, label: "Standard Loan Period" },
  { value: `${MAX_BOOKS_PER_MEMBER}`, label: "Books Per Member" },
  { value: "PKR 5/day", label: "Overdue Fine Rate" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Sign In",
    description: "Log in with your institutional credentials. Your role (member or admin) is detected automatically.",
  },
  {
    step: "02",
    title: "Search & Reserve",
    description: "Find any book by title, author, or genre. Check real-time availability before visiting the library.",
  },
  {
    step: "03",
    title: "Issue & Return",
    description: `Librarians issue books in one click. Return within ${LOAN_PERIOD_DAYS} days to avoid overdue fines.`,
  },
  {
    step: "04",
    title: "Track Everything",
    description: "Your dashboard shows active loans, due dates, fine balances, and full transaction history.",
  },
];

const GENRES_PREVIEW = (Array.isArray(BOOK_GENRES) ? BOOK_GENRES : []).slice(0, 8);

const TESTIMONIALS = [
  {
    name: "Ayesha Tariq",
    role: "BS Computer Science, Year 3",
    quote:
      "Finding and borrowing books used to take 20 minutes at the counter. Now I check availability from my phone and the librarian has it ready when I arrive.",
    initials: "AT",
  },
  {
    name: "Muhammad Bilal",
    role: "MBA Student",
    quote:
      "The fine tracking feature keeps me accountable. I get a clear view of what I owe and can see exactly which book triggered the charge.",
    initials: "MB",
  },
  {
    name: "Sara Noor",
    role: "Library Administrator",
    quote:
      "Managing 400+ members manually was exhausting. The admin panel lets me issue books, track returns, and waive fines in a fraction of the time.",
    initials: "SN",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const t = useTranslations();

  return (
    <main className="overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative min-h-[92vh] flex items-center bg-[var(--brand-navy)]"
      >
        {/* Subtle mesh gradient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-[var(--brand-gold)]/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[var(--brand-gold)]/5 blur-[100px]" />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(var(--brand-gold) 1px, transparent 1px), linear-gradient(90deg, var(--brand-gold) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-24 lg:px-12">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
            {/* Left: copy */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-6"
            >
              {/* Eyebrow */}
              <motion.div variants={fadeInUp}>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold)]">
                  <BookMarked className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("hero.eyebrow")}
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={fadeInUp}
                className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl text-balance"
              >
                {t("hero.headline1")}{" "}
                <span className="text-[var(--brand-gold)]">
                  {t("hero.headline2")}
                </span>{" "}
                {t("hero.headline3")}
              </motion.h1>

              {/* Subhead */}
              <motion.p
                variants={fadeInUp}
                className="max-w-lg text-lg leading-relaxed text-white/70"
              >
                {t("hero.subhead")}
              </motion.p>

              {/* CTAs */}
              <motion.div
                variants={fadeInUp}
                className="flex flex-wrap items-center gap-4 pt-2"
              >
                <Link
                  href="/books"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-6 py-3 text-sm font-semibold text-[var(--brand-navy)] shadow-[0_4px_24px_rgba(232,184,75,0.35)] transition-all duration-300 hover:brightness-110 hover:shadow-[0_6px_32px_rgba(232,184,75,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-gold)]"
                >
                  {t("hero.cta.primary")}
                  <Search className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50"
                >
                  {t("hero.cta.secondary")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                variants={fadeInUp}
                className="flex flex-wrap items-center gap-6 pt-4 text-xs text-white/50"
              >
                {[
                  t("hero.badge.secure"),
                  t("hero.badge.roles"),
                  t("hero.badge.realtime"),
                ].map((badge) => (
                  <span key={badge} className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-[var(--brand-gold)]" aria-hidden="true" />
                    {badge}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: visual card stack */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="hidden lg:flex flex-col gap-4"
            >
              {/* Main card */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold)]">
                    {t("hero.card.activeLoans")}
                  </span>
                  <span className="rounded-full bg-[var(--brand-gold)]/20 px-3 py-0.5 text-xs font-bold text-[var(--brand-gold)]">
                    Live
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { title: "Introduction to Algorithms", due: "3 days", status: "ok" },
                    { title: "Business Communication", due: "Overdue", status: "overdue" },
                    { title: "Islamic Finance Principles", due: "10 days", status: "ok" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-4 w-4 text-white/40" aria-hidden="true" />
                        <span className="text-sm text-white/80 truncate max-w-[180px]">
                          {item.title}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          item.status === "overdue"
                            ? "text-red-400"
                            : "text-emerald-400"
                        )}
                      >
                        {item.due}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Two mini cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                  <div className="text-2xl font-bold text-[var(--brand-gold)]">247</div>
                  <div className="mt-1 text-xs text-white/50">{t("hero.minicard.booksIssued")}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                  <div className="text-2xl font-bold text-white">PKR 1,840</div>
                  <div className="mt-1 text-xs text-white/50">{t("hero.minicard.finesCollected")}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section id="stats" className="bg-[var(--brand-gold)] py-10">
        <Reveal>
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-[var(--brand-navy)]">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm font-medium text-[var(--brand-navy)]/70">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="bg-[var(--brand-surface)] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <Reveal>
            <div className="mb-16 max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold)]">
                {t("features.eyebrow")}
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--brand-navy)] sm:text-4xl text-balance">
                {t("features.heading")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--brand-muted)]">
                {t("features.subheading")}
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <Reveal key={feat.title} delay={i * 0.07}>
                  <div className="group flex flex-col gap-4 rounded-2xl border border-[var(--brand-navy)]/8 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_32px_-8px_rgba(30,58,95,0.18)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-navy)]/8 transition-colors duration-300 group-hover:bg-[var(--brand-gold)]/15">
                      <Icon className="h-5 w-5 text-[var(--brand-navy)] transition-colors duration-300 group-hover:text-[var(--brand-gold)]" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--brand-navy)]">
                      {feat.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--brand-muted)]">
                      {feat.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-[var(--brand-navy)] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold)]">
                {t("howItWorks.eyebrow")}
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
                {t("howItWorks.heading")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60">
                {t("howItWorks.subheading")}
              </p>
            </div>
          </Reveal>

          <div className="relative">
            {/* Connector line (desktop) */}
            <div
              aria-hidden="true"
              className="absolute top-8 left-0 right-0 hidden h-px bg-gradient-to-r from-transparent via-[var(--brand-gold)]/30 to-transparent lg:block"
            />
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step, i) => (
                <Reveal key={step.step} delay={i * 0.1}>
                  <div className="relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--brand-gold)]/40 bg-[var(--brand-gold)]/10 text-xl font-bold text-[var(--brand-gold)]">
                      {step.step}
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-white/60">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Genre catalogue preview ───────────────────────────────────────── */}
      <section id="catalogue" className="bg-white py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
            {/* Left: copy */}
            <Reveal>
              <div className="flex flex-col gap-6">
                <span className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold)]">
                  {t("catalogue.eyebrow")}
                </span>
                <h2 className="text-3xl font-bold tracking-tight text-[var(--brand-navy)] sm:text-4xl text-balance">
                  {t("catalogue.heading")}
                </h2>
                <p className="text-base leading-relaxed text-[var(--brand-muted)]">
                  {t("catalogue.body")}
                </p>
                <Link
                  href="/books"
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--brand-navy)] px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-[var(--brand-navy)]/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-navy)]"
                >
                  {t("catalogue.cta")}
                  <Search className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>

            {/* Right: genre pills grid */}
            <Reveal delay={0.1}>
              <div className="flex flex-wrap gap-3">
                {GENRES_PREVIEW.map((genre, i) => (
                  <motion.div
                    key={genre}
                    whileHover={{ scale: 1.04 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      href={`/books?genre=${encodeURIComponent(genre)}`}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        i % 3 === 0
                          ? "border-[var(--brand-navy)]/20 bg-[var(--brand-navy)]/5 text-[var(--brand-navy)] hover:bg-[var(--brand-navy)]/10"
                          : i % 3 === 1
                          ? "border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/8 text-[var(--brand-navy)] hover:bg-[var(--brand-gold)]/15"
                          : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <Layers className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                      {genre}
                    </Link>
                  </motion.div>
                ))}
                <Link
                  href="/books"
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--brand-navy)]/20 px-4 py-2.5 text-sm font-medium text-[var(--brand-muted)] transition-colors hover:border-[var(--brand-navy)]/40 hover:text-[var(--brand-navy)]"
                >
                  {t("catalogue.viewAll")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section id="testimonials" className="bg-[var(--brand-surface)] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold)]">
                {t("testimonials.eyebrow")}
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--brand-navy)] sm:text-4xl text-balance">
                {t("testimonials.heading")}
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t_item, i) => (
              <Reveal key={t_item.name} delay={i * 0.1}>
                <div className="flex flex-col gap-5 rounded-2xl border border-[var(--brand-navy)]/8 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
                  {/* Stars */}
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star
                        key={si}
                        className="h-4 w-4 fill-[var(--brand-gold)] text-[var(--brand-gold)]"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--brand-muted)]">
                    &ldquo;{t_item.quote}&rdquo;
                  </p>
                  <div className="mt-auto flex items-center gap-3 border-t border-[var(--brand-navy)]/6 pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-navy)] text-xs font-bold text-white">
                      {t_item.initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--brand-navy)]">
                        {t_item.name}
                      </div>
                      <div className="text-xs text-[var(--brand-muted)]">
                        {t_item.role}
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role split CTA ───────────────────────────────────────────────── */}
      <section id="get-started" className="bg-[var(--brand-navy)] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <Reveal>
            <div className="mb-12 text-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold)]">
                {t("cta.eyebrow")}
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
                {t("cta.heading")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60">
                {t("cta.subheading")}
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Member card */}
            <Reveal delay={0.05}>
              <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15">
                  <BookOpen className="h-6 w-6 text-[var(--brand-gold)]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {t("cta.member.title")}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {t("cta.member.body")}
                  </p>
                </div>
                <ul className="space-y-2">
                  {[
                    t("cta.member.f1"),
                    t("cta.member.f2"),
                    t("cta.member.f3"),
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle className="h-4 w-4 shrink-0 text-[var(--brand-gold)]" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className="mt-auto inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--brand-navy)] transition-all duration-300 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-gold)]"
                >
                  {t("cta.member.cta")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>

            {/* Admin card */}
            <Reveal delay={0.12}>
              <div className="flex flex-col gap-5 rounded-2xl border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/8 p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-gold)]/20">
                  <Shield className="h-6 w-6 text-[var(--brand-gold)]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {t("cta.admin.title")}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {t("cta.admin.body")}
                  </p>
                </div>
                <ul className="space-y-2">
                  {[
                    t("cta.admin.f1"),
                    t("cta.admin.f2"),
                    t("cta.admin.f3"),
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle className="h-4 w-4 shrink-0 text-[var(--brand-gold)]" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/admin"
                  className="mt-auto inline-flex items-center gap-2 rounded-xl border border-[var(--brand-gold)]/40 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50"
                >
                  {t("cta.admin.cta")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Bottom info strip */}
          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8 border-t border-white/10 pt-10 text-xs text-white/40">
              <span className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {t("cta.strip.loan")}
              </span>
              <span className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                {t("cta.strip.limit")}
              </span>
              <span className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {t("cta.strip.fine")}
              </span>
              <span className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                {t("cta.strip.jwt")}
              </span>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}