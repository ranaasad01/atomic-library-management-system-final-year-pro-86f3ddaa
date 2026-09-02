"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";
import { BookOpen, ArrowLeftRight, Search, CheckCircle, Clock, AlertCircle, User, Calendar, Hash, RefreshCw, ChevronDown, X, Plus, RotateCcw, Filter, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { Book, Transaction } from "@/lib/data";

// ─── Local constants ────────────────────────────────────────────────────────
const LOAN_PERIOD_DAYS = 14;
const FINE_RATE_PER_DAY = 5;

// ─── Types ───────────────────────────────────────────────────────────────────
type TransactionWithDetails = Transaction & {
  book_title?: string;
  book_author?: string;
  member_name?: string;
  member_email?: string;
};

type TabKey = "issue" | "return" | "history";

type StatusFilter = "all" | "issued" | "returned" | "overdue";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysDiff(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function isOverdue(due: string): boolean {
  return new Date(due).getTime() < Date.now();
}

function statusBadge(status: string, due_date: string) {
  const overdue = status === "issued" && isOverdue(due_date);
  const effective = overdue ? "overdue" : status;
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    issued: {
      label: "Issued",
      cls: "bg-blue-100 text-blue-700 border-blue-200",
      icon: <Clock className="h-3 w-3" />,
    },
    returned: {
      label: "Returned",
      cls: "bg-green-100 text-green-700 border-green-200",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    overdue: {
      label: "Overdue",
      cls: "bg-red-100 text-red-700 border-red-200",
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };
  const s = map[effective] ?? map["issued"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        s.cls
      )}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <motion.div
      variants={scaleIn}
      className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]"
    >
      <div className={cn("mb-3 inline-flex rounded-xl p-2.5", accent)}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{value}</div>
      <div className="mt-0.5 text-sm text-[hsl(var(--muted-foreground))]">{label}</div>
    </motion.div>
  );
}

// ─── Issue Form ───────────────────────────────────────────────────────────────
function IssueForm({
  onSuccess,
  currentUserId,
}: {
  onSuccess: () => void;
  currentUserId: string | null;
}) {
  const supabase = createClient();
  const [bookSearch, setBookSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<{ id: string; full_name: string; email: string; membership_number: string | null }[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedMember, setSelectedMember] = useState<{ id: string; full_name: string; email: string; membership_number: string | null } | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bookDropdown, setBookDropdown] = useState(false);
  const [memberDropdown, setMemberDropdown] = useState(false);
  const [searchingBooks, setSearchingBooks] = useState(false);
  const [searchingMembers, setSearchingMembers] = useState(false);

  const searchBooks = useCallback(async (q: string) => {
    if (!q.trim()) { setBooks([]); setBookDropdown(false); return; }
    setSearchingBooks(true);
    const { data } = await supabase
      .from("books")
      .select("*")
      .or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%`)
      .gt("available_copies", 0)
      .limit(8);
    setBooks((data as Book[]) ?? []);
    setBookDropdown(true);
    setSearchingBooks(false);
  }, [supabase]);

  const searchMembers = useCallback(async (q: string) => {
    if (!q.trim()) { setMembers([]); setMemberDropdown(false); return; }
    setSearchingMembers(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, membership_number")
      .eq("role", "member")
      .eq("is_active", true)
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,membership_number.ilike.%${q}%`)
      .limit(8);
    setMembers((data as { id: string; full_name: string; email: string; membership_number: string | null }[]) ?? []);
    setMemberDropdown(true);
    setSearchingMembers(false);
  }, [supabase]);

  useEffect(() => {
    const t = setTimeout(() => searchBooks(bookSearch), 300);
    return () => clearTimeout(t);
  }, [bookSearch, searchBooks]);

  useEffect(() => {
    const t = setTimeout(() => searchMembers(memberSearch), 300);
    return () => clearTimeout(t);
  }, [memberSearch, searchMembers]);

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBook || !selectedMember || !currentUserId) {
      setError("Please select both a book and a member.");
      return;
    }
    setLoading(true);
    setError(null);
    const now = new Date().toISOString();
    const due = addDays(now, LOAN_PERIOD_DAYS);
    const { error: txErr } = await supabase.from("transactions").insert({
      book_id: selectedBook.id,
      member_id: selectedMember.id,
      issued_by: currentUserId,
      status: "issued",
      issue_date: now,
      due_date: due,
      notes: notes || null,
    });
    if (txErr) { setError(txErr.message); setLoading(false); return; }
    // Decrement available_copies
    await supabase
      .from("books")
      .update({ available_copies: selectedBook.available_copies - 1, updated_at: now })
      .eq("id", selectedBook.id);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setSelectedBook(null);
      setSelectedMember(null);
      setBookSearch("");
      setMemberSearch("");
      setNotes("");
      onSuccess();
    }, 1800);
  }

  return (
    <form onSubmit={handleIssue} className="space-y-5">
      {/* Book search */}
      <div className="relative">
        <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
          Book <span className="text-red-500">*</span>
        </label>
        {selectedBook ? (
          <div className="flex items-center justify-between rounded-xl border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/5 px-4 py-3">
            <div>
              <p className="font-medium text-[hsl(var(--foreground))]">{selectedBook.title}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{selectedBook.author} · {selectedBook.available_copies} copies available</p>
            </div>
            <button type="button" onClick={() => { setSelectedBook(null); setBookSearch(""); }} className="rounded-lg p-1 hover:bg-black/5 transition-colors">
              <X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              value={bookSearch}
              onChange={e => setBookSearch(e.target.value)}
              placeholder="Search by title, author, or ISBN…"
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all"
            />
            {searchingBooks && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[hsl(var(--muted-foreground))]" />}
          </div>
        )}
        <AnimatePresence>
          {bookDropdown && books.length > 0 && !selectedBook && (
            <motion.ul
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg overflow-hidden"
            >
              {books.map(b => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedBook(b); setBookDropdown(false); setBookSearch(""); }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{b.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{b.author} · {b.available_copies} available</p>
                    </div>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
          {bookDropdown && books.length === 0 && bookSearch.trim() && !searchingBooks && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute z-20 mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] shadow-lg"
            >
              No available books found.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Member search */}
      <div className="relative">
        <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
          Member <span className="text-red-500">*</span>
        </label>
        {selectedMember ? (
          <div className="flex items-center justify-between rounded-xl border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/5 px-4 py-3">
            <div>
              <p className="font-medium text-[hsl(var(--foreground))]">{selectedMember.full_name}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{selectedMember.email} · #{selectedMember.membership_number ?? "N/A"}</p>
            </div>
            <button type="button" onClick={() => { setSelectedMember(null); setMemberSearch(""); }} className="rounded-lg p-1 hover:bg-black/5 transition-colors">
              <X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search by name, email, or membership number…"
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all"
            />
            {searchingMembers && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[hsl(var(--muted-foreground))]" />}
          </div>
        )}
        <AnimatePresence>
          {memberDropdown && members.length > 0 && !selectedMember && (
            <motion.ul
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg overflow-hidden"
            >
              {members.map(m => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedMember(m); setMemberDropdown(false); setMemberSearch(""); }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{m.full_name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{m.email} · #{m.membership_number ?? "N/A"}</p>
                    </div>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
          {memberDropdown && members.length === 0 && memberSearch.trim() && !searchingMembers && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute z-20 mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] shadow-lg"
            >
              No active members found.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loan summary */}
      {selectedBook && selectedMember && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/8 p-4 space-y-2"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-accent)]">Loan Summary</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">Issue Date:</span>{" "}
              <span className="font-medium text-[hsl(var(--foreground))]">{formatDate(new Date().toISOString())}</span>
            </div>
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">Due Date:</span>{" "}
              <span className="font-medium text-[hsl(var(--foreground))]">{formatDate(addDays(new Date().toISOString(), LOAN_PERIOD_DAYS))}</span>
            </div>
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">Loan Period:</span>{" "}
              <span className="font-medium text-[hsl(var(--foreground))]">{LOAN_PERIOD_DAYS} days</span>
            </div>
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">Fine Rate:</span>{" "}
              <span className="font-medium text-[hsl(var(--foreground))]">Rs. {FINE_RATE_PER_DAY}/day</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Notes */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Any special instructions or remarks…"
          className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2.5 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all resize-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || success || !selectedBook || !selectedMember}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200",
          success
            ? "bg-green-500 text-white"
            : "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
        ) : success ? (
          <><CheckCircle className="h-4 w-4" /> Book Issued Successfully!</>
        ) : (
          <><Plus className="h-4 w-4" /> Issue Book</>
        )}
      </button>
    </form>
  );
}

// ─── Return Form ──────────────────────────────────────────────────────────────
function ReturnForm({ onSuccess }: { onSuccess: () => void }) {
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<TransactionWithDetails[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TransactionWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fineInfo, setFineInfo] = useState<{ days: number; amount: number } | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    // Search active transactions by member name/email or book title
    const { data: txs } = await supabase
      .from("transactions")
      .select("*")
      .eq("status", "issued")
      .limit(20);

    if (!txs) { setSearching(false); return; }

    // Enrich with book + member info
    const enriched: TransactionWithDetails[] = [];
    for (const tx of txs) {
      const { data: book } = await supabase.from("books").select("title, author").eq("id", tx.book_id).single();
      const { data: member } = await supabase.from("profiles").select("full_name, email").eq("id", tx.member_id).single();
      const t: TransactionWithDetails = {
        ...tx,
        book_title: book?.title,
        book_author: book?.author,
        member_name: member?.full_name,
        member_email: member?.email,
      };
      const matchesQ =
        (t.book_title ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (t.member_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (t.member_email ?? "").toLowerCase().includes(q.toLowerCase());
      if (matchesQ) enriched.push(t);
    }
    setResults(enriched);
    setSearching(false);
  }, [supabase]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 400);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  useEffect(() => {
    if (!selected) { setFineInfo(null); return; }
    const today = new Date().toISOString();
    if (isOverdue(selected.due_date)) {
      const days = daysDiff(selected.due_date, today);
      setFineInfo({ days, amount: days * FINE_RATE_PER_DAY });
    } else {
      setFineInfo(null);
    }
  }, [selected]);

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError(null);
    const now = new Date().toISOString();

    const newStatus = isOverdue(selected.due_date) ? "overdue" : "returned";
    const { error: txErr } = await supabase
      .from("transactions")
      .update({ status: newStatus, return_date: now, updated_at: now })
      .eq("id", selected.id);

    if (txErr) { setError(txErr.message); setLoading(false); return; }

    // Restore available_copies
    const { data: book } = await supabase.from("books").select("available_copies").eq("id", selected.book_id).single();
    if (book) {
      await supabase.from("books").update({ available_copies: book.available_copies + 1, updated_at: now }).eq("id", selected.book_id);
    }

    // Create fine record if overdue
    if (fineInfo && fineInfo.days > 0) {
      await supabase.from("fines").insert({
        transaction_id: selected.id,
        member_id: selected.member_id,
        overdue_days: fineInfo.days,
        fine_per_day: FINE_RATE_PER_DAY,
        total_amount: fineInfo.amount,
        is_paid: false,
        waived: false,
      });
    }

    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setSelected(null);
      setSearch("");
      setResults([]);
      onSuccess();
    }, 1800);
  }

  return (
    <form onSubmit={handleReturn} className="space-y-5">
      <div className="relative">
        <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
          Find Active Issue <span className="text-red-500">*</span>
        </label>
        {selected ? (
          <div className="flex items-center justify-between rounded-xl border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/5 px-4 py-3">
            <div>
              <p className="font-medium text-[hsl(var(--foreground))]">{selected.book_title}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Issued to {selected.member_name} · Due {formatDate(selected.due_date)}
              </p>
            </div>
            <button type="button" onClick={() => { setSelected(null); setSearch(""); }} className="rounded-lg p-1 hover:bg-black/5 transition-colors">
              <X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by book title or member name/email…"
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[hsl(var(--muted-foreground))]" />}
          </div>
        )}
        <AnimatePresence>
          {results.length > 0 && !selected && (
            <motion.ul
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg overflow-hidden"
            >
              {results.map(tx => (
                <li key={tx.id}>
                  <button
                    type="button"
                    onClick={() => { setSelected(tx); setResults([]); }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{tx.book_title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {tx.member_name} · Due {formatDate(tx.due_date)}
                        {isOverdue(tx.due_date) && <span className="ml-1 text-red-500 font-medium">OVERDUE</span>}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
          {results.length === 0 && search.trim() && !searching && !selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute z-20 mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] shadow-lg"
            >
              No active issues found.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fine warning */}
      {fineInfo && fineInfo.days > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1"
        >
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <AlertCircle className="h-4 w-4" />
            Overdue Fine Applicable
          </div>
          <p className="text-sm text-red-600">
            This book is <strong>{fineInfo.days} day{fineInfo.days !== 1 ? "s" : ""}</strong> overdue.
            A fine of <strong>Rs. {fineInfo.amount}</strong> will be recorded automatically.
          </p>
        </motion.div>
      )}

      {selected && !fineInfo && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-green-200 bg-green-50 p-4"
        >
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            On time return — no fine applicable.
          </div>
        </motion.div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || success || !selected}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200",
          success
            ? "bg-green-500 text-white"
            : "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
        ) : success ? (
          <><CheckCircle className="h-4 w-4" /> Book Returned Successfully!</>
        ) : (
          <><RotateCcw className="h-4 w-4" /> Process Return</>
        )}
      </button>
    </form>
  );
}

// ─── History Table ────────────────────────────────────────────────────────────
function HistoryTable() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data: txs } = await query;
    if (!txs) { setLoading(false); return; }

    const enriched: TransactionWithDetails[] = await Promise.all(
      txs.map(async tx => {
        const [{ data: book }, { data: member }] = await Promise.all([
          supabase.from("books").select("title, author").eq("id", tx.book_id).single(),
          supabase.from("profiles").select("full_name, email").eq("id", tx.member_id).single(),
        ]);
        return {
          ...tx,
          book_title: book?.title,
          book_author: book?.author,
          member_name: member?.full_name,
          member_email: member?.email,
        };
      })
    );
    setTransactions(enriched);
    setLoading(false);
  }, [supabase, statusFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const filtered = transactions.filter(tx => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    return (
      (tx.book_title ?? "").toLowerCase().includes(q) ||
      (tx.member_name ?? "").toLowerCase().includes(q) ||
      (tx.member_email ?? "").toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            value={searchQ}
            onChange={e => { setSearchQ(e.target.value); setPage(0); }}
            placeholder="Search transactions…"
            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2 pl-9 pr-4 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          {(["all", "issued", "returned", "overdue"] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(0); }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all",
                statusFilter === s
                  ? "bg-[var(--brand-primary)] text-white"
                  : "border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[var(--brand-primary)]/40 hover:text-[hsl(var(--foreground))]"
              )}
            >
              {s}
            </button>
          ))}
          <button
            onClick={fetchTransactions}
            className="rounded-lg border border-[hsl(var(--border))] p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Book</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Member</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Issue Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Return Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[hsl(var(--border))]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-[hsl(var(--muted))]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">
                  <ArrowLeftRight className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  No transactions found.
                </td>
              </tr>
            ) : (
              paginated.map(tx => (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-[hsl(var(--muted))]/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[hsl(var(--foreground))] line-clamp-1">{tx.book_title ?? "—"}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{tx.book_author ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[hsl(var(--foreground))]">{tx.member_name ?? "—"}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{tx.member_email ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--foreground))]">{formatDate(tx.issue_date)}</td>
                  <td className="px-4 py-3 text-[hsl(var(--foreground))]">{formatDate(tx.due_date)}</td>
                  <td className="px-4 py-3 text-[hsl(var(--foreground))]">{formatDate(tx.return_date)}</td>
                  <td className="px-4 py-3">{statusBadge(tx.status, tx.due_date)}</td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[hsl(var(--muted-foreground))]">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:border-[var(--brand-primary)]/40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:border-[var(--brand-primary)]/40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IssueReturnPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<TabKey>("issue");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalIssued: 0,
    totalReturned: 0,
    totalOverdue: 0,
    todayIssued: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ count: issued }, { count: returned }, { count: overdue }, { count: todayIssued }] =
      await Promise.all([
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "issued"),
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "returned"),
        supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "overdue"),
        supabase.from("transactions").select("*", { count: "exact", head: true }).gte("issue_date", today.toISOString()),
      ]);

    setStats({
      totalIssued: issued ?? 0,
      totalReturned: returned ?? 0,
      totalOverdue: overdue ?? 0,
      todayIssued: todayIssued ?? 0,
    });
    setStatsLoading(false);
  }, [supabase]);

  useEffect(() => { fetchStats(); }, [fetchStats, refreshKey]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("transactions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        setRefreshKey(k => k + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "issue", label: "Issue Book", icon: <Plus className="h-4 w-4" /> },
    { key: "return", label: "Return Book", icon: <RotateCcw className="h-4 w-4" /> },
    { key: "history", label: "Transaction History", icon: <Clock className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] pb-20">
      {/* Page header */}
      <Reveal>
        <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[var(--brand-primary)]/10 p-3">
                <ArrowLeftRight className="h-7 w-7 text-[var(--brand-primary)]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-3xl">
                  Issue &amp; Return
                </h1>
                <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                  Manage book loans, process returns, and view the full transaction history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Stats */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            <StatCard
              icon={<BookOpen className="h-5 w-5 text-blue-600" />}
              label="Currently Issued"
              value={statsLoading ? "…" : stats.totalIssued}
              accent="bg-blue-100"
            />
            <StatCard
              icon={<CheckCircle className="h-5 w-5 text-green-600" />}
              label="Total Returned"
              value={statsLoading ? "…" : stats.totalReturned}
              accent="bg-green-100"
            />
            <StatCard
              icon={<AlertCircle className="h-5 w-5 text-red-600" />}
              label="Overdue"
              value={statsLoading ? "…" : stats.totalOverdue}
              accent="bg-red-100"
            />
            <StatCard
              icon={<Calendar className="h-5 w-5 text-[var(--brand-accent)]" />}
              label="Issued Today"
              value={statsLoading ? "…" : stats.todayIssued}
              accent="bg-[var(--brand-accent)]/15"
            />
          </motion.div>
        </Reveal>

        {/* Tabs + Content */}
        <Reveal>
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all duration-200 border-b-2",
                    activeTab === tab.key
                      ? "border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[hsl(var(--background))]"
                      : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/50"
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === "issue" && (
                  <motion.div
                    key="issue"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-5">
                      <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Issue a Book</h2>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        Search for an available book and assign it to an active library member. The loan period is {LOAN_PERIOD_DAYS} days.
                      </p>
                    </div>
                    <div className="max-w-xl">
                      <IssueForm
                        onSuccess={() => setRefreshKey(k => k + 1)}
                        currentUserId={currentUserId}
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === "return" && (
                  <motion.div
                    key="return"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-5">
                      <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Process a Return</h2>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        Find an active issue record and mark the book as returned. Overdue fines are calculated at Rs. {FINE_RATE_PER_DAY}/day and recorded automatically.
                      </p>
                    </div>
                    <div className="max-w-xl">
                      <ReturnForm onSuccess={() => setRefreshKey(k => k + 1)} />
                    </div>
                  </motion.div>
                )}

                {activeTab === "history" && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-5">
                      <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Transaction History</h2>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        Full log of all book issue and return events. Filter by status or search by book or member.
                      </p>
                    </div>
                    <HistoryTable key={refreshKey} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>

        {/* Info strip */}
        <Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: <Hash className="h-5 w-5 text-[var(--brand-primary)]" />,
                title: "Loan Period",
                desc: `Each book may be borrowed for up to ${LOAN_PERIOD_DAYS} days from the issue date.`,
              },
              {
                icon: <AlertCircle className="h-5 w-5 text-red-500" />,
                title: "Overdue Fines",
                desc: `A fine of Rs. ${FINE_RATE_PER_DAY} per day is charged for every day past the due date.`,
              },
              {
                icon: <BookOpen className="h-5 w-5 text-green-600" />,
                title: "Book Limit",
                desc: "Each active member may hold up to 3 books at any given time.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <div className="flex gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.title}</p>
                    <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>
    </main>
  );
}