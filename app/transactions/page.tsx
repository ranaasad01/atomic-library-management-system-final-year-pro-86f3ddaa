"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Clock, CheckCircle, AlertTriangle, RotateCcw, Send, ChevronRight, Calendar, Search, Filter, Loader2, XCircle, FileText } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { Transaction, Fine } from "@/lib/data";
import { FINE_RATE_PER_DAY } from "@/lib/data";
type LOAN_PERIOD_DAYS = any;
const LOAN_PERIOD_DAYS: any = [];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BookRow {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  genre: string | null;
  available_copies: number;
  total_copies: number;
  cover_image_url: string | null;
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
  book?: BookRow | null;
}

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

// ---------------------------------------------------------------------------
// Motion variants
// ---------------------------------------------------------------------------
const tabContentVariants: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" } },
  exit: { opacity: 0, x: -16, transition: { duration: 0.2, ease: "easeIn" } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut", delay: i * 0.05 },
  }),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysOverdue(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function isOverdue(dueDateStr: string, status: string): boolean {
  if (status === "returned") return false;
  return daysOverdue(dueDateStr) > 0;
}

function calcFine(days: number): number {
  return days * FINE_RATE_PER_DAY;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function StatusBadge({ status, dueDate }: { status: string; dueDate: string }) {
  const overdue = isOverdue(dueDate, status);
  if (status === "returned") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle className="h-3 w-3" /> Returned
      </span>
    );
  }
  if (overdue || status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3 w-3" /> Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      <BookOpen className="h-3 w-3" /> Issued
    </span>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-navy)]/10">
        <Icon className="h-8 w-8 text-[var(--brand-navy)]/50" />
      </div>
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Active Borrowings
// ---------------------------------------------------------------------------
function ActiveBorrowingsTab({
  transactions,
  loading,
  onReturn,
  returning,
}: {
  transactions: TransactionRow[];
  loading: boolean;
  onReturn: (id: string) => void;
  returning: string | null;
}) {
  const active = transactions.filter((t) => t.status === "issued" || t.status === "overdue");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-navy)]" />
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No active borrowings"
        description="You have no books currently checked out. Browse the catalogue to borrow a book."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3">Book</th>
            <th className="px-4 py-3">Issue Date</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Fine (est.)</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {active.map((tx, i) => {
            const days = daysOverdue(tx.due_date);
            const fine = calcFine(days);
            return (
              <motion.tr
                key={tx.id}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                className="group bg-white transition-colors hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--brand-navy)]/10">
                      <BookOpen className="h-4 w-4 text-[var(--brand-navy)]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 line-clamp-1">
                        {tx.book?.title ?? "Unknown Book"}
                      </p>
                      <p className="text-xs text-gray-500">{tx.book?.author ?? "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDate(tx.issue_date)}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(tx.due_date)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={tx.status} dueDate={tx.due_date} />
                </td>
                <td className="px-4 py-3">
                  {days > 0 ? (
                    <span className="font-semibold text-red-600">PKR {fine}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onReturn(tx.id)}
                    disabled={returning === tx.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-navy)] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {returning === tx.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    Return
                  </motion.button>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: History
// ---------------------------------------------------------------------------
function HistoryTab({
  transactions,
  loading,
}: {
  transactions: TransactionRow[];
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "returned" | "overdue" | "issued">("all");

  const history = transactions.filter((t) => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesSearch =
      search === "" ||
      (t.book?.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.book?.author ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-navy)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-[var(--brand-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          {(["all", "issued", "returned", "overdue"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                statusFilter === s
                  ? "bg-[var(--brand-navy)] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {history.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No transactions found"
          description="No transaction records match your current filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Return Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((tx, i) => (
                <motion.tr
                  key={tx.id}
                  custom={i}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  className="bg-white transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 line-clamp-1">
                        {tx.book?.title ?? "Unknown Book"}
                      </p>
                      <p className="text-xs text-gray-500">{tx.book?.author ?? "—"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(tx.issue_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(tx.due_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(tx.return_date)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tx.status} dueDate={tx.due_date} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Requests
// ---------------------------------------------------------------------------
interface BookRequest {
  id: string;
  title: string;
  author: string;
  reason: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
}

const MOCK_REQUESTS: BookRequest[] = [
  {
    id: "req-1",
    title: "Clean Code",
    author: "Robert C. Martin",
    reason: "Required for Software Engineering course project.",
    submittedAt: "2024-12-01",
    status: "pending",
  },
  {
    id: "req-2",
    title: "The Pragmatic Programmer",
    author: "David Thomas & Andrew Hunt",
    reason: "Recommended by professor for advanced programming concepts.",
    submittedAt: "2024-11-20",
    status: "approved",
  },
  {
    id: "req-3",
    title: "Introduction to Algorithms",
    author: "Cormen et al.",
    reason: "Needed for Data Structures and Algorithms coursework.",
    submittedAt: "2024-11-10",
    status: "rejected",
  },
];

function RequestStatusBadge({ status }: { status: BookRequest["status"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle className="h-3 w-3" /> Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function RequestsTab() {
  const [requests, setRequests] = useState<BookRequest[]>(MOCK_REQUESTS);
  const [form, setForm] = useState({ title: "", author: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; author?: string; reason?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = "Book title is required.";
    if (!form.author.trim()) e.author = "Author name is required.";
    if (!form.reason.trim()) e.reason = "Please provide a reason for your request.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    const newReq: BookRequest = {
      id: `req-${Date.now()}`,
      title: form.title,
      author: form.author,
      reason: form.reason,
      submittedAt: new Date().toISOString().split("T")[0],
      status: "pending",
    };
    setRequests((prev) => [newReq, ...prev]);
    setForm({ title: "", author: "", reason: "" });
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      {/* Request Form */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
          <h3 className="mb-1 text-base font-semibold text-gray-900">Request a Book</h3>
          <p className="mb-5 text-sm text-gray-500">
            Can&apos;t find a book in our catalogue? Submit a request and the library team will review it.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Book Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Clean Code"
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/20",
                  errors.title ? "border-red-400" : "border-gray-200 focus:border-[var(--brand-navy)]"
                )}
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Author</label>
              <input
                type="text"
                value={form.author}
                onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
                placeholder="e.g. Robert C. Martin"
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/20",
                  errors.author ? "border-red-400" : "border-gray-200 focus:border-[var(--brand-navy)]"
                )}
              />
              {errors.author && <p className="mt-1 text-xs text-red-500">{errors.author}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Reason / Notes</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Why do you need this book?"
                rows={3}
                className={cn(
                  "w-full resize-none rounded-lg border px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/20",
                  errors.reason ? "border-red-400" : "border-gray-200 focus:border-[var(--brand-navy)]"
                )}
              />
              {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-navy)] py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Submitting..." : "Submit Request"}
            </motion.button>
            <AnimatePresence>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                >
                  <CheckCircle className="h-4 w-4" /> Request submitted successfully.
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>

      {/* Pending Requests List */}
      <div className="lg:col-span-3">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Your Requests</h3>
        {requests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No requests yet"
            description="Submit a book request using the form on the left."
          />
        ) : (
          <div className="space-y-3">
            {requests.map((req, i) => (
              <motion.div
                key={req.id}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{req.title}</p>
                    <p className="text-xs text-gray-500">{req.author}</p>
                    <p className="mt-1.5 text-sm text-gray-600 line-clamp-2">{req.reason}</p>
                  </div>
                  <RequestStatusBadge status={req.status} />
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  Submitted {formatDate(req.submittedAt)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary stat cards
// ---------------------------------------------------------------------------
function SummaryCards({ transactions, loading }: { transactions: TransactionRow[]; loading: boolean }) {
  const active = transactions.filter((t) => t.status === "issued" || t.status === "overdue").length;
  const returned = transactions.filter((t) => t.status === "returned").length;
  const overdue = transactions.filter((t) => isOverdue(t.due_date, t.status)).length;
  const totalFine = transactions
    .filter((t) => isOverdue(t.due_date, t.status))
    .reduce((sum, t) => sum + calcFine(daysOverdue(t.due_date)), 0);

  const cards = [
    {
      label: "Active Borrowings",
      value: loading ? "—" : String(active),
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Books Returned",
      value: loading ? "—" : String(returned),
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Overdue Books",
      value: loading ? "—" : String(overdue),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Estimated Fines",
      value: loading ? "—" : `PKR ${totalFine}`,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card, i) => (
        <Reveal key={card.label} delay={i * 0.07}>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
            <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-xl", card.bg)}>
              <card.icon className={cn("h-5 w-5", card.color)} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="mt-0.5 text-xs text-gray-500">{card.label}</div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
type TabKey = "active" | "history" | "requests";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "active", label: "Active Borrowings", icon: BookOpen },
  { key: "history", label: "History", icon: FileText },
  { key: "requests", label: "Book Requests", icon: Send },
];

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("transactions")
      .select("*, book:books(id, title, author, isbn, genre, available_copies, total_copies, cover_image_url)")
      .eq("member_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTransactions(data as TransactionRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();

    const supabase = createClient();
    const channel = supabase
      .channel("transactions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => { fetchTransactions(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTransactions]);

  async function handleReturn(transactionId: string) {
    setReturning(transactionId);
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase
      .from("transactions")
      .update({ status: "returned", return_date: now, updated_at: now })
      .eq("id", transactionId);
    await fetchTransactions();
    setReturning(null);
  }

  return (
    <main className="min-h-screen bg-[var(--brand-surface)] pb-16">
      {/* Page Header */}
      <Reveal>
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-navy)]/10">
                <RotateCcw className="h-5 w-5 text-[var(--brand-navy)]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-navy)]">
                  Issue &amp; Return
                </h1>
                <p className="text-sm text-gray-500">
                  Manage your borrowed books, view history, and request new titles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <SummaryCards transactions={transactions} loading={loading} />

        {/* Tabs + Content */}
        <Reveal>
          <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
            {/* Tab Bar */}
            <div className="flex items-center gap-1 border-b border-gray-200 px-4 pt-4">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "relative flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    activeTab === tab.key
                      ? "text-[var(--brand-navy)]"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[var(--brand-navy)]"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {activeTab === "active" && (
                    <ActiveBorrowingsTab
                      transactions={transactions}
                      loading={loading}
                      onReturn={handleReturn}
                      returning={returning}
                    />
                  )}
                  {activeTab === "history" && (
                    <HistoryTab transactions={transactions} loading={loading} />
                  )}
                  {activeTab === "requests" && <RequestsTab />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>

        {/* Info Banner */}
        <Reveal>
          <div className="rounded-2xl border border-[var(--brand-navy)]/20 bg-[var(--brand-navy)]/5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--brand-navy)]/10">
                  <AlertTriangle className="h-4 w-4 text-[var(--brand-navy)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-navy)]">Library Borrowing Policy</p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    Members may borrow up to 3 books at a time for a period of {LOAN_PERIOD_DAYS} days.
                    Overdue books accrue a fine of PKR {FINE_RATE_PER_DAY} per day. Please return books
                    on time to avoid fines and ensure availability for other members.
                  </p>
                </div>
              </div>
              <a
                href="/fines"
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[var(--brand-navy)]/30 bg-white px-4 py-2 text-xs font-semibold text-[var(--brand-navy)] transition-colors hover:bg-[var(--brand-navy)]/5"
              >
                View My Fines <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
}