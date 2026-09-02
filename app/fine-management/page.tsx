"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Clock, DollarSign, Search, Filter, ChevronDown, X, AlertTriangle, TrendingUp, Users, FileText } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Fine } from "@/lib/data";
import { FINE_RATE_PER_DAY } from "@/lib/data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FineRow {
  id: string;
  transaction_id: string;
  member_id: string;
  overdue_days: number;
  fine_per_day: number;
  total_amount: number;
  is_paid: boolean;
  paid_at: string | null;
  waived: boolean;
  waived_by: string | null;
  created_at: string;
  updated_at: string;
}

interface EnrichedFine extends FineRow {
  member_name: string;
  member_email: string;
  membership_number: string | null;
  book_title: string;
  book_author: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
}

type StatusFilter = "all" | "unpaid" | "paid" | "waived";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-0.5",
        accent
          ? "bg-[var(--brand-navy)] border-[var(--brand-navy)] text-white"
          : "bg-white border-[var(--brand-border)]"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          accent ? "bg-white/15" : "bg-[var(--brand-gold)]/10"
        )}
      >
        <Icon
          className={cn(
            "w-5 h-5",
            accent ? "text-[var(--brand-gold)]" : "text-[var(--brand-navy)]"
          )}
        />
      </div>
      <div>
        <p
          className={cn(
            "text-2xl font-bold tracking-tight",
            accent ? "text-white" : "text-[var(--brand-navy)]"
          )}
        >
          {value}
        </p>
        <p
          className={cn(
            "text-sm font-medium mt-0.5",
            accent ? "text-white/70" : "text-slate-500"
          )}
        >
          {label}
        </p>
        {sub && (
          <p
            className={cn(
              "text-xs mt-1",
              accent ? "text-white/50" : "text-slate-400"
            )}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ fine }: { fine: EnrichedFine }) {
  if (fine.waived) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        <X className="w-3 h-3" /> Waived
      </span>
    );
  }
  if (fine.is_paid) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3 h-3" /> Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
      <AlertCircle className="w-3 h-3" /> Unpaid
    </span>
  );
}

// ─── Fine Detail Modal ────────────────────────────────────────────────────────

function FineDetailModal({
  fine,
  onClose,
  onMarkPaid,
  onWaive,
  loading,
}: {
  fine: EnrichedFine;
  onClose: () => void;
  onMarkPaid: (id: string) => void;
  onWaive: (id: string) => void;
  loading: boolean;
}) {
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-PK", { dateStyle: "medium" }) : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--brand-border)] overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="bg-[var(--brand-navy)] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Fine Details</h2>
            <p className="text-white/60 text-xs mt-0.5 font-mono">
              #{fine.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Member */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Member
            </p>
            <p className="font-semibold text-[var(--brand-navy)]">
              {fine.member_name}
            </p>
            <p className="text-sm text-slate-500">{fine.member_email}</p>
            {fine.membership_number && (
              <p className="text-xs text-slate-400 font-mono">
                {fine.membership_number}
              </p>
            )}
          </div>

          {/* Book */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Book
            </p>
            <p className="font-semibold text-[var(--brand-navy)]">
              {fine.book_title}
            </p>
            <p className="text-sm text-slate-500">{fine.book_author}</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Issued", val: fmt(fine.issue_date) },
              { label: "Due", val: fmt(fine.due_date) },
              { label: "Returned", val: fmt(fine.return_date) },
            ].map((d) => (
              <div
                key={d.label}
                className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center"
              >
                <p className="text-xs text-slate-400 font-medium">{d.label}</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">
                  {d.val}
                </p>
              </div>
            ))}
          </div>

          {/* Fine breakdown */}
          <div className="rounded-xl border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/5 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Fine Breakdown
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Overdue days</span>
                <span className="font-semibold text-slate-800">
                  {fine.overdue_days} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Rate per day</span>
                <span className="font-semibold text-slate-800">
                  Rs. {fine.fine_per_day}
                </span>
              </div>
              <div className="border-t border-[var(--brand-gold)]/20 pt-2 flex justify-between">
                <span className="font-bold text-[var(--brand-navy)]">
                  Total Fine
                </span>
                <span className="font-bold text-[var(--brand-navy)] text-base">
                  Rs. {fine.total_amount}
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge fine={fine} />
            {fine.paid_at && (
              <p className="text-xs text-slate-400">
                Paid on {fmt(fine.paid_at)}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {!fine.is_paid && !fine.waived && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => onMarkPaid(fine.id)}
              disabled={loading}
              className="flex-1 bg-[var(--brand-navy)] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[var(--brand-navy)]/90 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Mark as Paid"}
            </button>
            <button
              onClick={() => onWaive(fine.id)}
              disabled={loading}
              className="flex-1 border border-purple-300 text-purple-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-purple-50 transition-all duration-200 disabled:opacity-50"
            >
              Waive Fine
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FineManagementPage() {
  const supabase = createClient();

  const [fines, setFines] = useState<EnrichedFine[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedFine, setSelectedFine] = useState<EnrichedFine | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchFines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch fines
      const { data: finesData, error: finesErr } = await supabase
        .from("fines")
        .select("*")
        .order("created_at", { ascending: false });

      if (finesErr) throw finesErr;
      if (!finesData || finesData.length === 0) {
        setFines([]);
        setLoading(false);
        return;
      }

      // Fetch related transactions
      const txIds = [...new Set(finesData.map((f) => f.transaction_id))];
      const { data: txData, error: txErr } = await supabase
        .from("transactions")
        .select("id, book_id, member_id, issue_date, due_date, return_date")
        .in("id", txIds);

      if (txErr) throw txErr;

      // Fetch related books
      const bookIds = [...new Set((txData ?? []).map((t) => t.book_id))];
      const { data: booksData, error: booksErr } = await supabase
        .from("books")
        .select("id, title, author")
        .in("id", bookIds);

      if (booksErr) throw booksErr;

      // Fetch related profiles
      const memberIds = [...new Set(finesData.map((f) => f.member_id))];
      const { data: profilesData, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, membership_number")
        .in("id", memberIds);

      if (profilesErr) throw profilesErr;

      // Enrich
      const txMap = new Map((txData ?? []).map((t) => [t.id, t]));
      const bookMap = new Map((booksData ?? []).map((b) => [b.id, b]));
      const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p]));

      const enriched: EnrichedFine[] = finesData.map((f) => {
        const tx = txMap.get(f.transaction_id);
        const book = tx ? bookMap.get(tx.book_id) : undefined;
        const profile = profileMap.get(f.member_id);
        return {
          ...f,
          member_name: profile?.full_name ?? "Unknown Member",
          member_email: profile?.email ?? "",
          membership_number: profile?.membership_number ?? null,
          book_title: book?.title ?? "Unknown Book",
          book_author: book?.author ?? "",
          issue_date: tx?.issue_date ?? "",
          due_date: tx?.due_date ?? "",
          return_date: tx?.return_date ?? null,
        };
      });

      setFines(enriched);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load fines.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFines();
  }, [fetchFines]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleMarkPaid = async (fineId: string) => {
    setActionLoading(true);
    try {
      const { error: err } = await supabase
        .from("fines")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", fineId);
      if (err) throw err;
      await fetchFines();
      setSelectedFine(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWaive = async (fineId: string) => {
    setActionLoading(true);
    try {
      const { error: err } = await supabase
        .from("fines")
        .update({ waived: true })
        .eq("id", fineId);
      if (err) throw err;
      await fetchFines();
      setSelectedFine(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to waive fine.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalFines = fines.length;
  const unpaidFines = fines.filter((f) => !f.is_paid && !f.waived);
  const paidFines = fines.filter((f) => f.is_paid);
  const waivedFines = fines.filter((f) => f.waived);
  const totalRevenue = paidFines.reduce((s, f) => s + Number(f.total_amount), 0);
  const totalOutstanding = unpaidFines.reduce(
    (s, f) => s + Number(f.total_amount),
    0
  );

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = fines.filter((f) => {
    const matchSearch =
      search === "" ||
      f.member_name.toLowerCase().includes(search.toLowerCase()) ||
      f.member_email.toLowerCase().includes(search.toLowerCase()) ||
      f.book_title.toLowerCase().includes(search.toLowerCase()) ||
      (f.membership_number ?? "")
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "unpaid" && !f.is_paid && !f.waived) ||
      (statusFilter === "paid" && f.is_paid) ||
      (statusFilter === "waived" && f.waived);

    return matchSearch && matchStatus;
  });

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-PK", { dateStyle: "medium" }) : "—";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[var(--brand-surface)] pb-16">
      {/* Page Header */}
      <Reveal>
        <div className="bg-[var(--brand-navy)] px-4 sm:px-6 lg:px-8 py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-[var(--brand-gold)] text-sm font-semibold uppercase tracking-widest mb-1">
                  Library Management System
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Fine Management
                </h1>
                <p className="text-white/60 mt-2 text-sm max-w-xl">
                  Track overdue fines, process payments, and manage waivers for
                  all library members.
                </p>
              </div>
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  Rate: Rs. {FINE_RATE_PER_DAY} / day
                </span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Error Banner */}
        {error && (
          <Reveal>
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-800 text-sm">
                  Something went wrong
                </p>
                <p className="text-red-600 text-sm mt-0.5">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </Reveal>
        )}

        {/* Stat Cards */}
        <Reveal>
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={FileText}
                label="Total Fines"
                value={totalFines}
                sub={`${unpaidFines.length} pending`}
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={AlertCircle}
                label="Outstanding"
                value={`Rs. ${totalOutstanding.toLocaleString("en-PK")}`}
                sub={`${unpaidFines.length} unpaid records`}
                accent
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={TrendingUp}
                label="Revenue Collected"
                value={`Rs. ${totalRevenue.toLocaleString("en-PK")}`}
                sub={`${paidFines.length} paid fines`}
              />
            </motion.div>
            <motion.div variants={fadeInUp}>
              <StatCard
                icon={Users}
                label="Waived Fines"
                value={waivedFines.length}
                sub="Admin discretion"
              />
            </motion.div>
          </motion.div>
        </Reveal>

        {/* Filters */}
        <Reveal>
          <div className="bg-white rounded-2xl border border-[var(--brand-border)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by member name, email, or book title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/20 focus:border-[var(--brand-navy)] transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StatusFilter)
                  }
                  className="pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/20 focus:border-[var(--brand-navy)] transition-all appearance-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="waived">Waived</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Result count */}
            <p className="text-xs text-slate-400 mt-3">
              Showing{" "}
              <span className="font-semibold text-slate-600">
                {filtered.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-600">{totalFines}</span>{" "}
              fine records
            </p>
          </div>
        </Reveal>

        {/* Table */}
        <Reveal>
          <div className="bg-white rounded-2xl border border-[var(--brand-border)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-10 h-10 border-4 border-[var(--brand-navy)]/20 border-t-[var(--brand-navy)] rounded-full animate-spin" />
                <p className="text-slate-500 text-sm">Loading fine records...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <DollarSign className="w-7 h-7 text-slate-400" />
                </div>
                <p className="font-semibold text-slate-700">No fines found</p>
                <p className="text-slate-400 text-sm text-center max-w-xs">
                  {search || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "No fine records exist yet. Fines are generated automatically for overdue books."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {[
                          "Member",
                          "Book",
                          "Overdue",
                          "Fine Amount",
                          "Due Date",
                          "Status",
                          "Action",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map((fine, i) => (
                        <motion.tr
                          key={fine.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.3 }}
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-[var(--brand-navy)] leading-tight">
                              {fine.member_name}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {fine.member_email}
                            </p>
                            {fine.membership_number && (
                              <p className="text-xs text-slate-300 font-mono">
                                {fine.membership_number}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-800 leading-tight line-clamp-1">
                              {fine.book_title}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {fine.book_author}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold",
                                fine.overdue_days > 30
                                  ? "bg-red-100 text-red-700"
                                  : fine.overdue_days > 14
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-amber-100 text-amber-700"
                              )}
                            >
                              <Clock className="w-3 h-3" />
                              {fine.overdue_days}d
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-bold text-[var(--brand-navy)]">
                              Rs. {Number(fine.total_amount).toLocaleString("en-PK")}
                            </p>
                            <p className="text-xs text-slate-400">
                              @ Rs. {fine.fine_per_day}/day
                            </p>
                          </td>
                          <td className="px-5 py-4 text-slate-600 text-xs">
                            {fmt(fine.due_date)}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge fine={fine} />
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => setSelectedFine(fine)}
                              className="text-xs font-semibold text-[var(--brand-navy)] hover:text-[var(--brand-gold)] transition-colors px-3 py-1.5 rounded-lg border border-slate-200 hover:border-[var(--brand-gold)]/40 hover:bg-[var(--brand-gold)]/5"
                            >
                              View
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filtered.map((fine, i) => (
                    <motion.div
                      key={fine.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      className="p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[var(--brand-navy)] text-sm">
                            {fine.member_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {fine.member_email}
                          </p>
                        </div>
                        <StatusBadge fine={fine} />
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                        <p className="text-sm font-medium text-slate-700 line-clamp-1">
                          {fine.book_title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {fine.book_author}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400">Fine Amount</p>
                          <p className="font-bold text-[var(--brand-navy)]">
                            Rs. {Number(fine.total_amount).toLocaleString("en-PK")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Overdue</p>
                          <p className="font-semibold text-orange-600 text-sm">
                            {fine.overdue_days} days
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedFine(fine)}
                          className="text-xs font-semibold text-[var(--brand-navy)] px-3 py-1.5 rounded-lg border border-slate-200 hover:border-[var(--brand-gold)]/40 hover:bg-[var(--brand-gold)]/5 transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Reveal>

        {/* Summary Footer */}
        {!loading && filtered.length > 0 && (
          <Reveal>
            <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Summary for Current View
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label: "Records shown",
                    value: filtered.length,
                    color: "text-slate-800",
                  },
                  {
                    label: "Total outstanding",
                    value: `Rs. ${filtered
                      .filter((f) => !f.is_paid && !f.waived)
                      .reduce((s, f) => s + Number(f.total_amount), 0)
                      .toLocaleString("en-PK")}`,
                    color: "text-red-600",
                  },
                  {
                    label: "Total collected",
                    value: `Rs. ${filtered
                      .filter((f) => f.is_paid)
                      .reduce((s, f) => s + Number(f.total_amount), 0)
                      .toLocaleString("en-PK")}`,
                    color: "text-emerald-600",
                  },
                  {
                    label: "Total waived",
                    value: `Rs. ${filtered
                      .filter((f) => f.waived)
                      .reduce((s, f) => s + Number(f.total_amount), 0)
                      .toLocaleString("en-PK")}`,
                    color: "text-purple-600",
                  },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className={cn("text-xl font-bold", s.color)}>
                      {s.value}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>

      {/* Fine Detail Modal */}
      {selectedFine && (
        <FineDetailModal
          fine={selectedFine}
          onClose={() => setSelectedFine(null)}
          onMarkPaid={handleMarkPaid}
          onWaive={handleWaive}
          loading={actionLoading}
        />
      )}
    </main>
  );
}