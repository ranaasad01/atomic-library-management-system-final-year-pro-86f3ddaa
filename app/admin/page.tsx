"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Users, ArrowLeftRight, AlertCircle, TrendingUp, Clock, CheckCircle, XCircle, ChevronRight, RefreshCw, BookMarked, UserCheck, DollarSign, Activity } from 'lucide-react';
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
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalBooks: number;
  availableBooks: number;
  totalMembers: number;
  activeMembers: number;
  totalTransactions: number;
  activeIssues: number;
  overdueCount: number;
  totalFines: number;
  unpaidFines: number;
  collectedFines: number;
}

interface RecentTransaction {
  id: string;
  book_id: string;
  member_id: string;
  status: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
}

interface RecentFine {
  id: string;
  member_id: string;
  total_amount: number;
  is_paid: boolean;
  waived: boolean;
  created_at: string;
}

interface GenreCount {
  genre: string;
  count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FINE_RATE_PER_DAY = 5;
const LOAN_PERIOD_DAYS = 14;

const STATUS_COLORS: Record<string, string> = {
  issued: "#e8b84b",
  returned: "#22c55e",
  overdue: "#ef4444",
};

const PIE_COLORS = ["#1e3a5f", "#e8b84b", "#22c55e", "#ef4444", "#6366f1", "#f97316"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return `PKR ${amount.toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(dueDateStr: string, returnDate: string | null) {
  if (returnDate) return false;
  return new Date(dueDateStr) < new Date();
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: boolean;
  sub?: string;
  href?: string;
}

function StatCard({ label, value, icon, accent, sub, href }: StatCardProps) {
  const inner = (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border p-5 transition-all duration-300",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]",
        accent
          ? "border-[var(--accent)]/30 bg-[var(--accent)]/8"
          : "border-[hsl(var(--border))] bg-[hsl(var(--card))]",
        href && "cursor-pointer hover:shadow-[0_4px_32px_-8px_rgba(30,58,95,0.18)] hover:-translate-y-0.5",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            accent ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]",
          )}
        >
          {icon}
        </div>
        {href && (
          <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <div>
        <div className={cn("text-2xl font-bold tracking-tight", accent ? "text-[var(--accent)]" : "text-[hsl(var(--foreground))]")}>
          {value}
        </div>
        <div className="mt-0.5 text-sm font-medium text-[hsl(var(--muted-foreground))]">{label}</div>
        {sub && <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]/70">{sub}</div>}
      </div>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: RecentTransaction }) {
  const overdue = isOverdue(tx.due_date, tx.return_date);
  const effectiveStatus = overdue && tx.status === "issued" ? "overdue" : tx.status;

  const statusConfig: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    issued: {
      label: "Issued",
      icon: <Clock className="h-3.5 w-3.5" />,
      cls: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    returned: {
      label: "Returned",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      cls: "bg-green-100 text-green-800 border-green-200",
    },
    overdue: {
      label: "Overdue",
      icon: <XCircle className="h-3.5 w-3.5" />,
      cls: "bg-red-100 text-red-800 border-red-200",
    },
  };

  const cfg = statusConfig[effectiveStatus] ?? statusConfig["issued"];

  return (
    <tr className="border-b border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--muted))]/40">
      <td className="py-3 pl-4 pr-3 text-xs font-mono text-[hsl(var(--muted-foreground))]">
        {tx.id.slice(0, 8)}…
      </td>
      <td className="px-3 py-3 text-xs text-[hsl(var(--muted-foreground))]">
        {tx.book_id.slice(0, 8)}…
      </td>
      <td className="px-3 py-3 text-xs text-[hsl(var(--muted-foreground))]">
        {formatDate(tx.issue_date)}
      </td>
      <td className="px-3 py-3 text-xs text-[hsl(var(--muted-foreground))]">
        {formatDate(tx.due_date)}
      </td>
      <td className="px-3 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            cfg.cls,
          )}
        >
          {cfg.icon}
          {cfg.label}
        </span>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [recentFines, setRecentFines] = useState<RecentFine[]>([]);
  const [genreData, setGenreData] = useState<GenreCount[]>([]);
  const [statusChartData, setStatusChartData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const [
        { data: books },
        { data: profiles },
        { data: transactions },
        { data: fines },
      ] = await Promise.all([
        supabase.from("books").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("fines").select("*").order("created_at", { ascending: false }),
      ]);

      const bookList = books ?? [];
      const profileList = profiles ?? [];
      const txList = transactions ?? [];
      const fineList = fines ?? [];

      const totalBooks = bookList.reduce((s, b) => s + (b.total_copies ?? 0), 0);
      const availableBooks = bookList.reduce((s, b) => s + (b.available_copies ?? 0), 0);
      const totalMembers = profileList.filter((p) => p.role === "member").length;
      const activeMembers = profileList.filter((p) => p.role === "member" && p.is_active).length;
      const activeIssues = txList.filter((t) => t.status === "issued").length;
      const overdueCount = txList.filter(
        (t) => t.status === "issued" && new Date(t.due_date) < new Date(),
      ).length;
      const totalFinesAmt = fineList.reduce((s, f) => s + (f.total_amount ?? 0), 0);
      const unpaidFines = fineList.filter((f) => !f.is_paid && !f.waived).reduce((s, f) => s + (f.total_amount ?? 0), 0);
      const collectedFines = fineList.filter((f) => f.is_paid).reduce((s, f) => s + (f.total_amount ?? 0), 0);

      setStats({
        totalBooks,
        availableBooks,
        totalMembers,
        activeMembers,
        totalTransactions: txList.length,
        activeIssues,
        overdueCount,
        totalFines: totalFinesAmt,
        unpaidFines,
        collectedFines,
      });

      setRecentTransactions(txList.slice(0, 8));
      setRecentFines(fineList.slice(0, 5));

      // Genre distribution
      const genreMap: Record<string, number> = {};
      for (const b of bookList) {
        const g = b.genre ?? "Uncategorised";
        genreMap[g] = (genreMap[g] ?? 0) + (b.total_copies ?? 1);
      }
      setGenreData(
        Object.entries(genreMap)
          .map(([genre, count]) => ({ genre, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8),
      );

      // Transaction status distribution
      const statusMap: Record<string, number> = { issued: 0, returned: 0, overdue: 0 };
      for (const t of txList) {
        const eff =
          t.status === "issued" && new Date(t.due_date) < new Date() ? "overdue" : t.status;
        statusMap[eff] = (statusMap[eff] ?? 0) + 1;
      }
      setStatusChartData([
        { name: "Issued", value: statusMap["issued"] ?? 0 },
        { name: "Returned", value: statusMap["returned"] ?? 0 },
        { name: "Overdue", value: statusMap["overdue"] ?? 0 },
      ]);

      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Realtime subscription for transactions
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-dashboard-transactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          fetchDashboardData();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">

        {/* ── Header ── */}
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-0.5 text-xs font-semibold text-[var(--accent)]">
                  <Activity className="h-3 w-3" />
                  Admin Panel
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                Library Dashboard
              </h1>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                Real-time overview of library activity, inventory, and member data.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastRefreshed && (
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  Updated {lastRefreshed.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm transition-all hover:bg-[hsl(var(--muted))] disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </button>
            </div>
          </div>
        </Reveal>

        {/* ── Quick Nav ── */}
        <Reveal delay={0.05}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Manage Books", href: "/admin/books", icon: <BookOpen className="h-4 w-4" /> },
              { label: "Manage Users", href: "/admin/users", icon: <Users className="h-4 w-4" /> },
              { label: "Transactions", href: "/transactions", icon: <ArrowLeftRight className="h-4 w-4" /> },
              { label: "Manage Fines", href: "/admin/fines", icon: <DollarSign className="h-4 w-4" /> },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm font-medium text-[hsl(var(--foreground))] shadow-sm transition-all hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 hover:text-[var(--accent)]"
              >
                <span className="text-[var(--accent)]">{item.icon}</span>
                {item.label}
                <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40" />
              </Link>
            ))}
          </div>
        </Reveal>

        {/* ── Stat Cards ── */}
        {loading && !stats ? (
          <Reveal delay={0.08}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]"
                />
              ))}
            </div>
          </Reveal>
        ) : stats ? (
          <Reveal delay={0.08}>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
            >
              {[
                {
                  label: "Total Books",
                  value: stats.totalBooks.toLocaleString(),
                  icon: <BookOpen className="h-5 w-5" />,
                  sub: `${stats.availableBooks} available`,
                  href: "/admin/books",
                },
                {
                  label: "Members",
                  value: stats.totalMembers.toLocaleString(),
                  icon: <Users className="h-5 w-5" />,
                  sub: `${stats.activeMembers} active`,
                  href: "/admin/users",
                },
                {
                  label: "Active Issues",
                  value: stats.activeIssues.toLocaleString(),
                  icon: <BookMarked className="h-5 w-5" />,
                  sub: `${LOAN_PERIOD_DAYS}-day loan period`,
                  accent: true,
                  href: "/transactions",
                },
                {
                  label: "Overdue",
                  value: stats.overdueCount.toLocaleString(),
                  icon: <AlertCircle className="h-5 w-5" />,
                  sub: `PKR ${FINE_RATE_PER_DAY}/day fine`,
                  href: "/admin/fines",
                },
                {
                  label: "Fines Collected",
                  value: formatCurrency(stats.collectedFines),
                  icon: <DollarSign className="h-5 w-5" />,
                  sub: `${formatCurrency(stats.unpaidFines)} pending`,
                  href: "/admin/fines",
                },
              ].map((s, i) => (
                <motion.div key={s.label} variants={fadeInUp}>
                  <StatCard {...s} />
                </motion.div>
              ))}
            </motion.div>
          </Reveal>
        ) : null}

        {/* ── Secondary Stats Row ── */}
        {stats && (
          <Reveal delay={0.1}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1e3a5f]">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[hsl(var(--foreground))]">
                    {stats.totalTransactions.toLocaleString()}
                  </div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">Total Transactions</div>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[hsl(var(--foreground))]">
                    {stats.activeMembers.toLocaleString()}
                  </div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">Active Members</div>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[hsl(var(--foreground))]">
                    {formatCurrency(stats.totalFines)}
                  </div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">Total Fines Levied</div>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* ── Charts Row ── */}
        <Reveal delay={0.12}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Genre Bar Chart */}
            <div className="col-span-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">
                Books by Genre
              </h2>
              {genreData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={genreData} margin={{ top: 4, right: 8, left: -16, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="genre"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                  No book data yet.
                </div>
              )}
            </div>

            {/* Transaction Status Pie */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">
                Transaction Status
              </h2>
              {statusChartData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={
                            entry.name === "Issued"
                              ? STATUS_COLORS["issued"]
                              : entry.name === "Returned"
                              ? STATUS_COLORS["returned"]
                              : STATUS_COLORS["overdue"]
                          }
                        />
                      ))}
                    </Pie>
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                  No transaction data yet.
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* ── Recent Transactions Table ── */}
        <Reveal delay={0.14}>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
              <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">
                Recent Transactions
              </h2>
              <Link
                href="/transactions"
                className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded-lg bg-[hsl(var(--muted))]" />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-[hsl(var(--muted-foreground))]">
                <ArrowLeftRight className="h-8 w-8 opacity-30" />
                <p className="text-sm">No transactions recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
                      <th className="py-2.5 pl-4 pr-3 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                        Txn ID
                      </th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                        Book ID
                      </th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                        Issued
                      </th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                        Due
                      </th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Reveal>

        {/* ── Recent Fines + Overdue Alert ── */}
        <Reveal delay={0.16}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Recent Fines */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
                <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Recent Fines</h2>
                <Link
                  href="/admin/fines"
                  className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Manage <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {loading ? (
                <div className="space-y-2 p-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 animate-pulse rounded-lg bg-[hsl(var(--muted))]" />
                  ))}
                </div>
              ) : recentFines.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-[hsl(var(--muted-foreground))]">
                  <DollarSign className="h-7 w-7 opacity-30" />
                  <p className="text-sm">No fines recorded yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[hsl(var(--border))]">
                  {recentFines.map((fine) => (
                    <li key={fine.id} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <div className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                          {fine.id.slice(0, 10)}…
                        </div>
                        <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                          {formatDate(fine.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                          {formatCurrency(fine.total_amount)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs font-medium",
                            fine.waived
                              ? "border-purple-200 bg-purple-50 text-purple-700"
                              : fine.is_paid
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-red-200 bg-red-50 text-red-700",
                          )}
                        >
                          {fine.waived ? "Waived" : fine.is_paid ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Overdue Alert Panel */}
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h2 className="text-base font-semibold text-red-800">Overdue Alert</h2>
              </div>
              {stats ? (
                <>
                  <div className="mb-4 text-4xl font-bold text-red-700">
                    {stats.overdueCount}
                  </div>
                  <p className="mb-4 text-sm text-red-700">
                    {stats.overdueCount === 0
                      ? "No overdue books right now. Great job!"
                      : `${stats.overdueCount} book${stats.overdueCount !== 1 ? "s" : ""} past their due date. Fine accruing at PKR ${FINE_RATE_PER_DAY}/day per book.`}
                  </p>
                  <div className="mb-4 rounded-xl border border-red-200 bg-white/60 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-red-700">Unpaid fines total</span>
                      <span className="font-semibold text-red-800">
                        {formatCurrency(stats.unpaidFines)}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-red-700">Collected fines</span>
                      <span className="font-semibold text-green-700">
                        {formatCurrency(stats.collectedFines)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/admin/fines"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700"
                  >
                    Review Overdue Fines
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <div className="h-24 animate-pulse rounded-xl bg-red-100" />
              )}
            </div>
          </div>
        </Reveal>

        {/* ── System Info Footer ── */}
        <Reveal delay={0.18}>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 px-6 py-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                Supabase connected
              </span>
              <span>Loan period: {LOAN_PERIOD_DAYS} days</span>
              <span>Fine rate: PKR {FINE_RATE_PER_DAY}/day</span>
              <span>Realtime: transactions table</span>
              <span className="ml-auto">NCBA&amp;E Library Management System</span>
            </div>
          </div>
        </Reveal>

      </div>
    </main>
  );
}