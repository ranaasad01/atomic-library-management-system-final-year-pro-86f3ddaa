"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Clock, AlertCircle, CheckCircle, Search, ArrowRight, BookMarked, TrendingUp, Calendar, Star } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { staggerContainer, fadeInUp, scaleIn } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { FINE_RATE_PER_DAY, MAX_BOOKS_PER_MEMBER } from "@/lib/data";
type LOAN_PERIOD_DAYS = any;
const LOAN_PERIOD_DAYS: any = [];
import type { Book, Transaction, Fine } from "@/lib/data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  booksIssued: number;
  booksReturned: number;
  overdueBooks: number;
  totalFines: number;
  unpaidFines: number;
}

interface EnrichedTransaction extends Transaction {
  book_title?: string;
  book_author?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysRemaining(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    issued: { label: "Issued", cls: "bg-blue-100 text-blue-700" },
    returned: { label: "Returned", cls: "bg-green-100 text-green-700" },
    overdue: { label: "Overdue", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
}

function StatCard({ icon, label, value, sub, accent, danger }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 8px 30px rgba(30,58,95,0.12)" }}
      transition={{ duration: 0.2 }}
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
        accent
          ? "border-[var(--brand-primary)]/20 bg-[var(--brand-primary)] text-white"
          : danger
          ? "border-red-200 bg-red-50"
          : "border-[var(--brand-border)] bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            accent ? "bg-white/20" : danger ? "bg-red-100" : "bg-[var(--brand-primary)]/10"
          }`}
        >
          <span className={accent ? "text-white" : danger ? "text-red-600" : "text-[var(--brand-primary)]"}>
            {icon}
          </span>
        </div>
        {accent && (
          <TrendingUp className="h-5 w-5 text-white/40" />
        )}
      </div>
      <div className="mt-4">
        <div
          className={`text-3xl font-bold tracking-tight ${
            accent ? "text-white" : danger ? "text-red-700" : "text-[var(--brand-primary)]"
          }`}
        >
          {value}
        </div>
        <div
          className={`mt-1 text-sm font-medium ${
            accent ? "text-white/80" : danger ? "text-red-600" : "text-[var(--brand-muted)]"
          }`}
        >
          {label}
        </div>
        {sub && (
          <div className={`mt-0.5 text-xs ${accent ? "text-white/60" : "text-[var(--brand-muted)]/70"}`}>
            {sub}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Quick Action Button ───────────────────────────────────────────────────────

function QuickAction({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-4 rounded-2xl border border-[var(--brand-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-[var(--brand-primary)]/30 hover:shadow-[0_4px_16px_rgba(30,58,95,0.1)]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--brand-primary)]">{label}</div>
          <div className="text-xs text-[var(--brand-muted)]">{description}</div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--brand-muted)]" />
      </motion.div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomeUserDashboardPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<{ full_name: string; membership_number: string | null; role: string } | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    booksIssued: 0,
    booksReturned: 0,
    overdueBooks: 0,
    totalFines: 0,
    unpaidFines: 0,
  });
  const [activeTransactions, setActiveTransactions] = useState<EnrichedTransaction[]>([]);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, membership_number, role")
        .eq("id", user.id)
        .single();
      if (profileData) setProfile(profileData);

      // Transactions for this member
      const { data: txData } = await supabase
        .from("transactions")
        .select("*")
        .eq("member_id", user.id)
        .order("created_at", { ascending: false });

      const txList: Transaction[] = txData ?? [];

      const issued = txList.filter((t) => t.status === "issued" || t.status === "overdue");
      const returned = txList.filter((t) => t.status === "returned");
      const overdue = txList.filter((t) => t.status === "overdue");

      // Enrich active transactions with book info
      const enriched: EnrichedTransaction[] = [];
      for (const tx of issued.slice(0, 5)) {
        const { data: bookData } = await supabase
          .from("books")
          .select("title, author")
          .eq("id", tx.book_id)
          .single();
        enriched.push({
          ...tx,
          book_title: bookData?.title ?? "Unknown Title",
          book_author: bookData?.author ?? "Unknown Author",
        });
      }
      setActiveTransactions(enriched);

      // Fines
      const { data: finesData } = await supabase
        .from("fines")
        .select("total_amount, is_paid")
        .eq("member_id", user.id);

      const finesList: Fine[] = finesData ?? [];
      const totalFines = finesList.reduce((sum, f) => sum + Number(f.total_amount), 0);
      const unpaidFines = finesList
        .filter((f) => !f.is_paid && !f.waived)
        .reduce((sum, f) => sum + Number(f.total_amount), 0);

      setStats({
        booksIssued: issued.length,
        booksReturned: returned.length,
        overdueBooks: overdue.length,
        totalFines,
        unpaidFines,
      });

      // Recent books catalogue
      const { data: booksData } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);
      setRecentBooks((booksData as Book[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/books?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const firstName = profile?.full_name?.split(" ")[0] ?? "Member";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)]" />
          <p className="text-sm text-[var(--brand-muted)]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--brand-surface)] pb-16">
      {/* ── Hero / Welcome Banner ─────────────────────────────────────────── */}
      <Reveal>
        <section className="bg-[var(--brand-primary)] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-widest text-[var(--brand-gold)]/80">
                  NCBA&amp;E Library Management System
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Welcome back, {firstName}.
                </h1>
                <p className="mt-2 text-white/70">
                  {profile?.membership_number
                    ? `Member ID: ${profile.membership_number}`
                    : "Your personal library dashboard"}
                  {" · "}Up to {MAX_BOOKS_PER_MEMBER} books · {LOAN_PERIOD_DAYS}-day loan period
                </p>
              </div>

              {/* Search bar */}
              <form onSubmit={handleSearch} className="w-full md:max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search books, authors..."
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-white/50 backdrop-blur-sm transition focus:border-[var(--brand-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/30"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-[var(--brand-gold)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] transition hover:bg-[var(--brand-gold)]/90"
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </Reveal>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ── Stats Grid ──────────────────────────────────────────────────── */}
        <Reveal className="mt-8">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={<BookMarked className="h-5 w-5" />}
                label="Books Currently Issued"
                value={stats.booksIssued}
                sub={`Max ${MAX_BOOKS_PER_MEMBER} allowed`}
                accent
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={<CheckCircle className="h-5 w-5" />}
                label="Books Returned"
                value={stats.booksReturned}
                sub="All time"
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={<AlertCircle className="h-5 w-5" />}
                label="Overdue Books"
                value={stats.overdueBooks}
                sub={`PKR ${FINE_RATE_PER_DAY}/day fine`}
                danger={stats.overdueBooks > 0}
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Unpaid Fines"
                value={`PKR ${stats.unpaidFines.toFixed(0)}`}
                sub={stats.unpaidFines > 0 ? "Action required" : "All clear"}
                danger={stats.unpaidFines > 0}
              />
            </motion.div>
          </motion.div>
        </Reveal>

        {/* ── Main Content Grid ────────────────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Active Transactions */}
          <Reveal className="lg:col-span-2">
            <div className="rounded-2xl border border-[var(--brand-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-6 py-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[var(--brand-primary)]" />
                  <h2 className="text-base font-semibold text-[var(--brand-primary)]">
                    Active Borrowings
                  </h2>
                </div>
                <Link
                  href="/transactions"
                  className="flex items-center gap-1 text-xs font-medium text-[var(--brand-gold)] hover:underline"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {activeTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-10 w-10 text-[var(--brand-muted)]/40" />
                  <p className="mt-3 text-sm font-medium text-[var(--brand-muted)]">
                    No active borrowings
                  </p>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]/70">
                    Browse the catalogue to issue a book.
                  </p>
                  <Link
                    href="/books"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-primary)]/90"
                  >
                    Browse Books <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[var(--brand-border)]">
                  {activeTransactions.map((tx) => {
                    const daysLeft = getDaysRemaining(tx.due_date);
                    const isOverdue = daysLeft < 0;
                    return (
                      <motion.div
                        key={tx.id}
                        whileHover={{ backgroundColor: "rgba(30,58,95,0.02)" }}
                        className="flex items-start gap-4 px-6 py-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10">
                          <BookOpen className="h-5 w-5 text-[var(--brand-primary)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--brand-primary)]">
                            {tx.book_title}
                          </p>
                          <p className="text-xs text-[var(--brand-muted)]">{tx.book_author}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <StatusBadge status={tx.status} />
                            <span className="flex items-center gap-1 text-xs text-[var(--brand-muted)]">
                              <Calendar className="h-3 w-3" />
                              Due {formatDate(tx.due_date)}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`text-sm font-bold ${
                              isOverdue ? "text-red-600" : daysLeft <= 3 ? "text-amber-600" : "text-green-600"
                            }`}
                          >
                            {isOverdue
                              ? `${Math.abs(daysLeft)}d overdue`
                              : daysLeft === 0
                              ? "Due today"
                              : `${daysLeft}d left`}
                          </span>
                          {isOverdue && (
                            <p className="mt-0.5 text-xs text-red-500">
                              Fine: PKR {Math.abs(daysLeft) * FINE_RATE_PER_DAY}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </Reveal>

          {/* Quick Actions */}
          <Reveal>
            <div className="rounded-2xl border border-[var(--brand-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="border-b border-[var(--brand-border)] px-6 py-4">
                <h2 className="text-base font-semibold text-[var(--brand-primary)]">Quick Actions</h2>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <QuickAction
                  href="/books"
                  icon={<Search className="h-5 w-5" />}
                  label="Browse Catalogue"
                  description="Search and discover books"
                />
                <QuickAction
                  href="/transactions"
                  icon={<BookMarked className="h-5 w-5" />}
                  label="My Transactions"
                  description="Issue &amp; return history"
                />
                <QuickAction
                  href="/fines"
                  icon={<AlertCircle className="h-5 w-5" />}
                  label="My Fines"
                  description="View and pay outstanding fines"
                />
              </div>

              {/* Loan policy info */}
              <div className="mx-4 mb-4 rounded-xl bg-[var(--brand-primary)]/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-primary)]">
                  Loan Policy
                </p>
                <ul className="mt-2 space-y-1.5">
                  {[
                    { icon: <Clock className="h-3.5 w-3.5" />, text: `${LOAN_PERIOD_DAYS}-day loan period` },
                    { icon: <BookOpen className="h-3.5 w-3.5" />, text: `Max ${MAX_BOOKS_PER_MEMBER} books at once` },
                    { icon: <AlertCircle className="h-3.5 w-3.5" />, text: `PKR ${FINE_RATE_PER_DAY}/day overdue fine` },
                  ].map((item) => (
                    <li key={item.text} className="flex items-center gap-2 text-xs text-[var(--brand-muted)]">
                      <span className="text-[var(--brand-primary)]">{item.icon}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ── Recently Added Books ─────────────────────────────────────────── */}
        <Reveal className="mt-8">
          <div className="rounded-2xl border border-[var(--brand-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-6 py-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-[var(--brand-gold)]" />
                <h2 className="text-base font-semibold text-[var(--brand-primary)]">
                  Recently Added Books
                </h2>
              </div>
              <Link
                href="/books"
                className="flex items-center gap-1 text-xs font-medium text-[var(--brand-gold)] hover:underline"
              >
                Browse all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentBooks.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--brand-muted)]">
                No books in catalogue yet.
              </div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-1 gap-px bg-[var(--brand-border)] sm:grid-cols-2 lg:grid-cols-3"
              >
                {recentBooks.map((book) => (
                  <motion.div
                    key={book.id}
                    variants={scaleIn}
                    whileHover={{ backgroundColor: "rgba(30,58,95,0.02)" }}
                    className="flex gap-4 bg-white p-5 transition-colors"
                  >
                    {/* Cover */}
                    <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--brand-primary)]/10">
                      {book.cover_image_url ? (
                        <img
                          src={book.cover_image_url}
                          alt={book.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <BookOpen className="h-6 w-6 text-[var(--brand-primary)]/50" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--brand-primary)]">
                        {book.title}
                      </p>
                      <p className="truncate text-xs text-[var(--brand-muted)]">{book.author}</p>
                      {book.genre && (
                        <span className="mt-1.5 inline-block rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--brand-primary)]">
                          {book.genre}
                        </span>
                      )}
                      <div className="mt-2 flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            book.available_copies > 0 ? "bg-green-500" : "bg-red-400"
                          }`}
                        />
                        <span className="text-xs text-[var(--brand-muted)]">
                          {book.available_copies > 0
                            ? `${book.available_copies} available`
                            : "Not available"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </Reveal>

        {/* ── Fine Alert Banner ────────────────────────────────────────────── */}
        {stats.unpaidFines > 0 && (
          <Reveal className="mt-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    You have unpaid fines of PKR {stats.unpaidFines.toFixed(0)}
                  </p>
                  <p className="mt-0.5 text-xs text-red-600">
                    Fines accumulate at PKR {FINE_RATE_PER_DAY} per overdue day. Please clear them to continue borrowing.
                  </p>
                </div>
              </div>
              <Link
                href="/fines"
                className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Pay Now
              </Link>
            </motion.div>
          </Reveal>
        )}
      </div>
    </main>
  );
}