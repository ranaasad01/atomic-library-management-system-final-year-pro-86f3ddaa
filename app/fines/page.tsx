"use client";

import { useState, useEffect, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Reveal } from "@/components/Reveal";
import { AlertCircle, CheckCircle, Clock, BookOpen, Receipt, TrendingUp, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { Fine, Transaction } from "@/lib/data";

// ─── Local constants ────────────────────────────────────────────────────────
const FINE_RATE = 5; // Rs. per day
const MAX_FINE_DAYS = 30;

// ─── Types ───────────────────────────────────────────────────────────────────
interface FineWithMeta extends Fine {
  bookTitle: string;
  bookAuthor: string;
  issueDate: string;
  dueDate: string;
}

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || target === 0) { setValue(target); return; }
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

// ─── Summary card ─────────────────────────────────────────────────────────────
const pulseVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: "easeOut" } },
};

function SummaryCard({
  totalOutstanding,
  unpaidCount,
  lastPaymentDate,
}: {
  totalOutstanding: number;
  unpaidCount: number;
  lastPaymentDate: string | null;
}) {
  const [animate, setAnimate] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimate(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const displayAmount = useCountUp(totalOutstanding, 1000, animate);
  const displayCount = useCountUp(unpaidCount, 800, animate);

  return (
    <motion.div
      ref={ref}
      variants={pulseVariants}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-[var(--brand-gold)]/30 bg-gradient-to-br from-[var(--brand-navy)] to-[var(--brand-navy-light)] p-8 shadow-[0_4px_32px_rgba(30,58,95,0.18)] text-white"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Outstanding amount */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-gold)]/15 ring-1 ring-[var(--brand-gold)]/30">
            <TrendingUp className="h-7 w-7 text-[var(--brand-gold)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/60 uppercase tracking-wider">Total Outstanding</p>
            <p className="mt-1 text-4xl font-bold text-[var(--brand-gold)] tabular-nums">
              Rs. {displayAmount.toLocaleString("en-PK")}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-16 w-px bg-white/10 md:block" />

        {/* Unpaid count */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-400/30">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/60 uppercase tracking-wider">Unpaid Fines</p>
            <p className="mt-1 text-4xl font-bold text-white tabular-nums">{displayCount}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden h-16 w-px bg-white/10 md:block" />

        {/* Last payment */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
            <CheckCircle className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/60 uppercase tracking-wider">Last Payment</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {lastPaymentDate
                ? new Date(lastPaymentDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
                : "No payments yet"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Rule callout ─────────────────────────────────────────────────────────────
function RuleCallout() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/8 px-5 py-4">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-gold)]" />
      <p className="text-sm text-[hsl(var(--foreground))]/80 leading-relaxed">
        <span className="font-semibold text-[var(--brand-gold)]">Fine Policy:</span>{" "}
        A fine of <span className="font-semibold">Rs. {FINE_RATE}/day</span> is charged for each overdue day, up to a maximum of{" "}
        <span className="font-semibold">{MAX_FINE_DAYS} days</span> (Rs. {FINE_RATE * MAX_FINE_DAYS} cap per book).
        Fines must be cleared at the library counter before borrowing additional books.
      </p>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ paid, waived }: { paid: boolean; waived: boolean }) {
  if (waived) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
      <CheckCircle className="h-3 w-3" /> Waived
    </span>
  );
  if (paid) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      <CheckCircle className="h-3 w-3" /> Paid
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
      <Clock className="h-3 w-3" /> Unpaid
    </span>
  );
}

// ─── Outstanding fines table ──────────────────────────────────────────────────
function OutstandingFinesTable({
  fines,
  onMarkPaid,
}: {
  fines: FineWithMeta[];
  onMarkPaid: (id: string) => void;
}) {
  const unpaid = fines.filter((f) => !f.is_paid && !f.waived);

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Outstanding Fines</h2>
        </div>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
          {unpaid.length} unpaid
        </span>
      </div>

      {unpaid.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-400" />
          <p className="text-base font-medium text-[hsl(var(--foreground))]">No outstanding fines</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">You are all clear. Keep returning books on time!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Book</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Issue Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Due Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Overdue Days</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {unpaid.map((fine) => (
                <tr key={fine.id} className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-navy)]/8">
                        <BookOpen className="h-4 w-4 text-[var(--brand-navy)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[hsl(var(--foreground))] line-clamp-1">{fine.bookTitle}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{fine.bookAuthor}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[hsl(var(--muted-foreground))]">
                    {new Date(fine.issueDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-4 text-[hsl(var(--muted-foreground))]">
                    {new Date(fine.dueDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
                      {fine.overdue_days}d
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-red-600">
                    Rs. {fine.total_amount.toLocaleString("en-PK")}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onMarkPaid(fine.id)}
                      className="rounded-lg bg-[var(--brand-gold)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-navy)] shadow-sm transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]"
                    >
                      Pay Now
                    </motion.button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Payment history table ────────────────────────────────────────────────────
function PaymentHistoryTable({ fines }: { fines: FineWithMeta[] }) {
  const paid = fines.filter((f) => f.is_paid || f.waived);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? paid : paid.slice(0, 5);

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Payment History</h2>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
          {paid.length} cleared
        </span>
      </div>

      {paid.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Receipt className="h-12 w-12 text-[hsl(var(--muted-foreground))]/40" />
          <p className="text-base font-medium text-[hsl(var(--foreground))]">No payment history</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Cleared fines will appear here.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Date Cleared</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Book</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {visible.map((fine) => (
                  <tr key={fine.id} className="hover:bg-[hsl(var(--muted))]/30 transition-colors">
                    <td className="px-6 py-4 text-[hsl(var(--muted-foreground))]">
                      {fine.paid_at
                        ? new Date(fine.paid_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
                        : fine.waived
                        ? "Waived"
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-[hsl(var(--foreground))] line-clamp-1">{fine.bookTitle}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{fine.bookAuthor}</p>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-[hsl(var(--foreground))]">
                      Rs. {fine.total_amount.toLocaleString("en-PK")}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <StatusBadge paid={fine.is_paid} waived={fine.waived} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/60 px-2.5 py-0.5 text-xs font-mono text-[hsl(var(--muted-foreground))]">
                        #{fine.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paid.length > 5 && (
            <div className="border-t border-[hsl(var(--border))] px-6 py-3 text-center">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-navy)] hover:underline focus-visible:outline-none"
              >
                {expanded ? (
                  <><ChevronUp className="h-4 w-4" /> Show less</>
                ) : (
                  <><ChevronDown className="h-4 w-4" /> Show all {paid.length} records</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FinesPage() {
  const supabase = createClient();

  const [fines, setFines] = useState<FineWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch current user then their fines joined with transaction + book data
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      // Fetch fines for this member
      const { data: fineRows, error: fineErr } = await supabase
        .from("fines")
        .select("*")
        .eq("member_id", user.id)
        .order("created_at", { ascending: false });

      if (fineErr || !fineRows) { setLoading(false); return; }

      // Fetch related transactions
      const txIds = fineRows.map((f) => f.transaction_id);
      const { data: txRows } = txIds.length
        ? await supabase.from("transactions").select("*").in("id", txIds)
        : { data: [] };

      // Fetch related books
      const bookIds = (txRows ?? []).map((t: Transaction) => t.book_id);
      const { data: bookRows } = bookIds.length
        ? await supabase.from("books").select("id,title,author").in("id", bookIds)
        : { data: [] };

      const txMap = new Map((txRows ?? []).map((t: Transaction) => [t.id, t]));
      const bookMap = new Map((bookRows ?? []).map((b: { id: string; title: string; author: string }) => [b.id, b]));

      const enriched: FineWithMeta[] = fineRows.map((f) => {
        const tx = txMap.get(f.transaction_id);
        const book = tx ? bookMap.get(tx.book_id) : undefined;
        return {
          ...f,
          bookTitle: book?.title ?? "Unknown Book",
          bookAuthor: book?.author ?? "Unknown Author",
          issueDate: tx?.issue_date ?? f.created_at,
          dueDate: tx?.due_date ?? f.created_at,
        };
      });

      setFines(enriched);
      setLoading(false);
    }
    load();
  }, []);

  // Optimistic mark-paid (UI only — real payment handled at counter)
  function handleMarkPaid(id: string) {
    setFines((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, is_paid: true, paid_at: new Date().toISOString() } : f
      )
    );
  }

  const unpaid = fines.filter((f) => !f.is_paid && !f.waived);
  const totalOutstanding = unpaid.reduce((sum, f) => sum + Number(f.total_amount), 0);
  const lastPaid = fines
    .filter((f) => f.is_paid && f.paid_at)
    .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())[0]?.paid_at ?? null;

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] pb-20">
      {/* Page header */}
      <Reveal>
        <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-navy)]/10">
                <Receipt className="h-5 w-5 text-[var(--brand-navy)]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                  My Fines
                </h1>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  View outstanding fines and payment history for your library account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="h-10 w-10 rounded-full border-4 border-[var(--brand-navy)]/20 border-t-[var(--brand-navy)]"
            />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading your fines…</p>
          </div>
        ) : (
          <>
            {/* Summary hero */}
            <Reveal>
              <SummaryCard
                totalOutstanding={totalOutstanding}
                unpaidCount={unpaid.length}
                lastPaymentDate={lastPaid}
              />
            </Reveal>

            {/* Fine policy callout */}
            <Reveal delay={0.05}>
              <RuleCallout />
            </Reveal>

            {/* Outstanding fines */}
            <Reveal delay={0.1}>
              <OutstandingFinesTable fines={fines} onMarkPaid={handleMarkPaid} />
            </Reveal>

            {/* Payment history */}
            <Reveal delay={0.15}>
              <PaymentHistoryTable fines={fines} />
            </Reveal>

            {/* Empty state when no fines at all */}
            {fines.length === 0 && !loading && (
              <Reveal>
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[hsl(var(--border))] py-24 text-center">
                  <CheckCircle className="h-14 w-14 text-emerald-400" />
                  <div>
                    <p className="text-lg font-semibold text-[hsl(var(--foreground))]">No fines on record</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      Great job returning books on time. Keep it up!
                    </p>
                  </div>
                </div>
              </Reveal>
            )}
          </>
        )}
      </div>
    </main>
  );
}