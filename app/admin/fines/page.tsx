"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { DollarSign, AlertCircle, CheckCircle, Clock, Search, Filter, ChevronDown, X, Check, Eye, TrendingUp, Users } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Reveal } from "@/components/Reveal";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeInUp } from "@/lib/motion";

// ─── Local constants ────────────────────────────────────────────────────────
const FINE_RATE_PER_DAY = 5;

type FineStatus = "all" | "unpaid" | "paid" | "waived";

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

interface TransactionRow {
  id: string;
  book_id: string;
  member_id: string;
  issued_by: string;
  status: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  membership_number: string | null;
}

interface BookRow {
  id: string;
  title: string;
  author: string;
}

interface EnrichedFine extends FineRow {
  member_name: string;
  member_email: string;
  membership_number: string | null;
  book_title: string;
  book_author: string;
  due_date: string;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-[hsl(var(--foreground))]">{value}</p>
          {sub && (
            <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{sub}</p>
          )}
        </div>
        <div className={cn("rounded-xl p-2.5", accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ fine }: { fine: EnrichedFine }) {
  if (fine.waived) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
        <X className="h-3 w-3" /> Waived
      </span>
    );
  }
  if (fine.is_paid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <Check className="h-3 w-3" /> Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
      <AlertCircle className="h-3 w-3" /> Unpaid
    </span>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function FineDetailModal({
  fine,
  onClose,
  onMarkPaid,
  onWaive,
  actionLoading,
}: {
  fine: EnrichedFine;
  onClose: () => void;
  onMarkPaid: (id: string) => void;
  onWaive: (id: string) => void;
  actionLoading: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.25)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
            Fine Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4 space-y-2">
            <p className="font-medium text-[hsl(var(--foreground))]">Member</p>
            <p className="text-[hsl(var(--muted-foreground))]">{fine.member_name}</p>
            <p className="text-[hsl(var(--muted-foreground))]">{fine.member_email}</p>
            {fine.membership_number && (
              <p className="text-[hsl(var(--muted-foreground))]">
                Membership: {fine.membership_number}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-4 space-y-2">
            <p className="font-medium text-[hsl(var(--foreground))]">Book</p>
            <p className="text-[hsl(var(--muted-foreground))]">{fine.book_title}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              by {fine.book_author}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-3">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Overdue Days</p>
              <p className="mt-0.5 font-semibold text-[hsl(var(--foreground))]">
                {fine.overdue_days} days
              </p>
            </div>
            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-3">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Rate / Day</p>
              <p className="mt-0.5 font-semibold text-[hsl(var(--foreground))]">
                PKR {fine.fine_per_day}
              </p>
            </div>
            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-3">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Total Fine</p>
              <p className="mt-0.5 font-semibold text-[var(--accent)]">
                PKR {fine.total_amount.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-[hsl(var(--muted))]/50 p-3">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Status</p>
              <div className="mt-1">
                <StatusBadge fine={fine} />
              </div>
            </div>
          </div>

          {fine.is_paid && fine.paid_at && (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Paid on:{" "}
              {new Date(fine.paid_at).toLocaleDateString("en-PK", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {!fine.is_paid && !fine.waived && (
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => onMarkPaid(fine.id)}
              disabled={actionLoading === fine.id}
              className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
            >
              {actionLoading === fine.id ? "Processing..." : "Mark as Paid"}
            </button>
            <button
              onClick={() => onWaive(fine.id)}
              disabled={actionLoading === fine.id}
              className="flex-1 rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--foreground))] transition-all hover:bg-[hsl(var(--muted))] disabled:opacity-60"
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
export default function AdminFinesPage() {
  const supabase = createClient();

  const [fines, setFines] = useState<EnrichedFine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FineStatus>("all");
  const [selectedFine, setSelectedFine] = useState<EnrichedFine | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Fetch & enrich ──────────────────────────────────────────────────────
  const fetchFines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [finesRes, txRes, profilesRes, booksRes] = await Promise.all([
        supabase.from("fines").select("*").order("created_at", { ascending: false }),
        supabase.from("transactions").select("id,book_id,member_id,due_date"),
        supabase.from("profiles").select("id,full_name,email,membership_number"),
        supabase.from("books").select("id,title,author"),
      ]);

      if (finesRes.error) throw finesRes.error;
      if (txRes.error) throw txRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (booksRes.error) throw booksRes.error;

      const txMap = new Map<string, TransactionRow>(
        (txRes.data ?? []).map((t) => [t.id, t as TransactionRow])
      );
      const profileMap = new Map<string, ProfileRow>(
        (profilesRes.data ?? []).map((p) => [p.id, p as ProfileRow])
      );
      const bookMap = new Map<string, BookRow>(
        (booksRes.data ?? []).map((b) => [b.id, b as BookRow])
      );

      const enriched: EnrichedFine[] = (finesRes.data ?? []).map((f) => {
        const tx = txMap.get(f.transaction_id);
        const profile = profileMap.get(f.member_id);
        const book = tx ? bookMap.get(tx.book_id) : undefined;
        return {
          ...f,
          member_name: profile?.full_name ?? "Unknown Member",
          member_email: profile?.email ?? "",
          membership_number: profile?.membership_number ?? null,
          book_title: book?.title ?? "Unknown Book",
          book_author: book?.author ?? "",
          due_date: tx?.due_date ?? "",
        };
      });

      setFines(enriched);
    } catch (err) {
      setError("Failed to load fines. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFines();
  }, [fetchFines]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleMarkPaid = async (fineId: string) => {
    setActionLoading(fineId);
    try {
      const { error: err } = await supabase
        .from("fines")
        .update({ is_paid: true, paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", fineId);
      if (err) throw err;
      setFines((prev) =>
        prev.map((f) =>
          f.id === fineId
            ? { ...f, is_paid: true, paid_at: new Date().toISOString() }
            : f
        )
      );
      setSelectedFine(null);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleWaive = async (fineId: string) => {
    setActionLoading(fineId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: err } = await supabase
        .from("fines")
        .update({ waived: true, waived_by: user?.id ?? null, updated_at: new Date().toISOString() })
        .eq("id", fineId);
      if (err) throw err;
      setFines((prev) =>
        prev.map((f) =>
          f.id === fineId ? { ...f, waived: true, waived_by: user?.id ?? null } : f
        )
      );
      setSelectedFine(null);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalFines = fines.length;
  const unpaidFines = fines.filter((f) => !f.is_paid && !f.waived);
  const paidFines = fines.filter((f) => f.is_paid);
  const waivedFines = fines.filter((f) => f.waived);
  const totalRevenue = paidFines.reduce((s, f) => s + Number(f.total_amount), 0);
  const totalOutstanding = unpaidFines.reduce((s, f) => s + Number(f.total_amount), 0);

  // ── Chart data ───────────────────────────────────────────────────────────
  const pieData = [
    { name: "Unpaid", value: unpaidFines.length, color: "#ef4444" },
    { name: "Paid", value: paidFines.length, color: "#22c55e" },
    { name: "Waived", value: waivedFines.length, color: "#a855f7" },
  ].filter((d) => d.value > 0);

  // Monthly bar chart — last 6 months
  const barData = (() => {
    const months: { month: string; collected: number; outstanding: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      const monthFines = fines.filter((f) => {
        const fd = new Date(f.created_at);
        return fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear();
      });
      months.push({
        month: label,
        collected: monthFines.filter((f) => f.is_paid).reduce((s, f) => s + Number(f.total_amount), 0),
        outstanding: monthFines.filter((f) => !f.is_paid && !f.waived).reduce((s, f) => s + Number(f.total_amount), 0),
      });
    }
    return months;
  })();

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = fines.filter((f) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      f.member_name.toLowerCase().includes(q) ||
      f.member_email.toLowerCase().includes(q) ||
      f.book_title.toLowerCase().includes(q) ||
      (f.membership_number ?? "").toLowerCase().includes(q);
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && f.is_paid) ||
      (statusFilter === "waived" && f.waived) ||
      (statusFilter === "unpaid" && !f.is_paid && !f.waived);
    return matchSearch && matchStatus;
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Header */}
        <Reveal>
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--accent)]/10 p-2.5">
                <DollarSign className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                  Fine Management
                </h1>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Review, collect, and waive overdue fines across all members.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Error */}
        {error && (
          <Reveal>
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
              <button
                onClick={fetchFines}
                className="ml-auto rounded-lg border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          </Reveal>
        )}

        {/* Stat Cards */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {[
              {
                label: "Total Fines",
                value: String(totalFines),
                sub: "all records",
                icon: Filter,
                accent: "bg-blue-100 text-blue-600",
              },
              {
                label: "Outstanding",
                value: `PKR ${totalOutstanding.toFixed(0)}`,
                sub: `${unpaidFines.length} unpaid`,
                icon: AlertCircle,
                accent: "bg-red-100 text-red-600",
              },
              {
                label: "Collected",
                value: `PKR ${totalRevenue.toFixed(0)}`,
                sub: `${paidFines.length} paid`,
                icon: CheckCircle,
                accent: "bg-green-100 text-green-600",
              },
              {
                label: "Waived",
                value: String(waivedFines.length),
                sub: `${FINE_RATE_PER_DAY} PKR/day rate`,
                icon: Clock,
                accent: "bg-purple-100 text-purple-600",
              },
            ].map((s) => (
              <motion.div key={s.label} variants={fadeInUp}>
                <StatCard {...s} />
              </motion.div>
            ))}
          </motion.div>
        </Reveal>

        {/* Charts */}
        <Reveal>
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Bar chart */}
            <div className="col-span-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  Fine Revenue — Last 6 Months
                </h2>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`PKR ${value.toFixed(0)}`, ""]}
                  />
                  <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outstanding" name="Outstanding" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  Fine Status Breakdown
                </h2>
              </div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                          {value}
                        </span>
                      )}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                  No fine data yet.
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* Filters */}
        <Reveal>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Search member, book, or membership no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2.5 pl-9 pr-4 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FineStatus)}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2.5 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              >
                <option value="all">All Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="waived">Waived</option>
              </select>
            </div>
          </div>
        </Reveal>

        {/* Table */}
        <Reveal>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)] overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-[hsl(var(--muted-foreground))]">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="h-8 w-8 rounded-full border-2 border-[var(--accent)] border-t-transparent"
                />
                <span className="text-sm">Loading fines...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20 text-[hsl(var(--muted-foreground))]">
                <DollarSign className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No fines found</p>
                <p className="text-xs">Try adjusting your search or filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Member
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Book
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Days
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Created
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {filtered.map((fine) => (
                      <motion.tr
                        key={fine.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="group transition-colors hover:bg-[hsl(var(--muted))]/30"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-[hsl(var(--foreground))]">
                            {fine.member_name}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {fine.membership_number ?? fine.member_email}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[hsl(var(--foreground))] line-clamp-1">
                            {fine.book_title}
                          </p>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {fine.book_author}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-[hsl(var(--foreground))]">
                            {fine.overdue_days}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-[var(--accent)]">
                            PKR {Number(fine.total_amount).toFixed(0)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge fine={fine} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                          {new Date(fine.created_at).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedFine(fine)}
                              className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {!fine.is_paid && !fine.waived && (
                              <>
                                <button
                                  onClick={() => handleMarkPaid(fine.id)}
                                  disabled={actionLoading === fine.id}
                                  className="rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
                                  title="Mark as paid"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleWaive(fine.id)}
                                  disabled={actionLoading === fine.id}
                                  className="rounded-lg p-1.5 text-purple-600 transition-colors hover:bg-purple-50 disabled:opacity-50"
                                  title="Waive fine"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table footer */}
            {!loading && filtered.length > 0 && (
              <div className="border-t border-[hsl(var(--border))] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                Showing {filtered.length} of {fines.length} fine records
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* Detail Modal */}
      {selectedFine && (
        <FineDetailModal
          fine={selectedFine}
          onClose={() => setSelectedFine(null)}
          onMarkPaid={handleMarkPaid}
          onWaive={handleWaive}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}