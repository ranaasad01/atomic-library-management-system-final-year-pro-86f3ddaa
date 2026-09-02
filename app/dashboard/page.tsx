"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, AlertTriangle, DollarSign, Library, Search, Clock, Receipt, User, ChevronRight, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import type, { Book, Transaction, Fine } from "@/lib/data";
type AppUser = any;
const AppUser: any = [];
import { FINE_RATE_PER_DAY } from "@/lib/data";
type LOAN_PERIOD_DAYS = any;
const LOAN_PERIOD_DAYS: any = [];

// ─── Types ────────────────────────────────────────────────────────────────────

interface IssuedBook {
  transactionId: string;
  bookId: string;
  title: string;
  author: string;
  genre: string | null;
  coverUrl: string | null;
  issueDate: string;
  dueDate: string;
  status: string;
  daysLeft: number;
  isOverdue: boolean;
}

interface DashboardStats {
  booksIssued: number;
  overdue: number;
  pendingFines: number;
  totalBorrowed: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysLeft(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WelcomeBanner({ user }: { user: AppUser | null }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--brand-navy)] px-8 py-8 text-white shadow-[0_4px_24px_rgba(30,58,95,0.25)]">
      {/* decorative circles */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-[var(--brand-gold)]/10" />

      <div className="relative z-10 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white/60">{greeting},</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {user?.full_name ?? "Library Member"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/70">
            {user?.membership_number && (
              <span className="flex items-center gap-1.5">
                <Library className="h-3.5 w-3.5" />
                {user.membership_number}
              </span>
            )}
            {user?.created_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Member since {getMemberSince(user.created_at)}
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 sm:mt-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              user?.is_active
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-red-500/20 text-red-300"
            }`}
          >
            {user?.is_active ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {user?.is_active ? "Active Member" : "Inactive"}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent: string;
  sub?: string;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]"
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-[var(--brand-navy)]">{value}</div>
        <div className="mt-0.5 text-sm font-medium text-gray-500">{label}</div>
        {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
      </div>
    </motion.div>
  );
}

function DueBadge({ daysLeft, isOverdue }: { daysLeft: number; isOverdue: boolean }) {
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <AlertTriangle className="h-3 w-3" />
        {Math.abs(daysLeft)}d overdue
      </span>
    );
  }
  if (daysLeft <= 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <Clock className="h-3 w-3" />
        Due in {daysLeft}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      <CheckCircle className="h-3 w-3" />
      {daysLeft}d left
    </span>
  );
}

function IssuedBookCard({ book }: { book: IssuedBook }) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="flex w-56 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]"
    >
      <div className="relative h-36 w-full overflow-hidden bg-[var(--brand-navy)]/10">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-12 w-12 text-[var(--brand-navy)]/30" />
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <DueBadge daysLeft={book.daysLeft} isOverdue={book.isOverdue} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--brand-navy)]">
          {book.title}
        </p>
        <p className="text-xs text-gray-500">{book.author}</p>
        {book.genre && (
          <span className="mt-1 inline-block w-fit rounded-full bg-[var(--brand-navy)]/8 px-2 py-0.5 text-[10px] font-medium text-[var(--brand-navy)]">
            {book.genre}
          </span>
        )}
        <div className="mt-auto pt-2 text-xs text-gray-400">
          Due: {formatDate(book.dueDate)}
        </div>
      </div>
    </motion.div>
  );
}

const quickActions = [
  {
    href: "/books",
    icon: Search,
    label: "Search Books",
    description: "Browse and find books in the catalogue",
    color: "bg-blue-50 text-blue-600",
    border: "hover:border-blue-200",
  },
  {
    href: "/transactions",
    icon: Receipt,
    label: "My Transactions",
    description: "View your issue and return history",
    color: "bg-amber-50 text-amber-600",
    border: "hover:border-amber-200",
  },
  {
    href: "/fines",
    icon: DollarSign,
    label: "My Fines",
    description: "Check outstanding fines and payments",
    color: "bg-red-50 text-red-600",
    border: "hover:border-red-200",
  },
  {
    href: "/profile",
    icon: User,
    label: "My Profile",
    description: "Update your membership details",
    color: "bg-emerald-50 text-emerald-600",
    border: "hover:border-emerald-200",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    booksIssued: 0,
    overdue: 0,
    pendingFines: 0,
    totalBorrowed: 0,
  });
  const [issuedBooks, setIssuedBooks] = useState<IssuedBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();

      // Get current auth user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setLoading(false);
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser({
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          role: profile.role as "admin" | "member",
          membership_number: profile.membership_number,
          is_active: profile.is_active,
          created_at: profile.created_at,
        });
      }

      // Fetch transactions for this member
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("member_id", authUser.id)
        .order("created_at", { ascending: false });

      const txList: Transaction[] = (transactions ?? []) as Transaction[];

      const activeIssued = txList.filter((t) => t.status === "issued");
      const overdueList = txList.filter((t) => t.status === "overdue");
      const totalBorrowed = txList.length;

      // Fetch fines
      const { data: finesData } = await supabase
        .from("fines")
        .select("*")
        .eq("member_id", authUser.id)
        .eq("is_paid", false)
        .eq("waived", false);

      const pendingFinesTotal = (finesData ?? []).reduce(
        (sum: number, f: Fine) => sum + Number(f.total_amount),
        0
      );

      setStats({
        booksIssued: activeIssued.length,
        overdue: overdueList.length,
        pendingFines: pendingFinesTotal,
        totalBorrowed,
      });

      // Fetch book details for active transactions
      const activeBookIds = activeIssued.map((t) => t.book_id);
      let bookMap: Record<string, Book> = {};

      if (activeBookIds.length > 0) {
        const { data: booksData } = await supabase
          .from("books")
          .select("*")
          .in("id", activeBookIds);

        (booksData ?? []).forEach((b: Book) => {
          bookMap[b.id] = b;
        });
      }

      const issued: IssuedBook[] = activeIssued.map((t) => {
        const book = bookMap[t.book_id];
        const daysLeft = getDaysLeft(t.due_date);
        return {
          transactionId: t.id,
          bookId: t.book_id,
          title: book?.title ?? "Unknown Title",
          author: book?.author ?? "Unknown Author",
          genre: book?.genre ?? null,
          coverUrl: book?.cover_image_url ?? null,
          issueDate: t.issue_date,
          dueDate: t.due_date,
          status: t.status,
          daysLeft,
          isOverdue: daysLeft < 0,
        };
      });

      setIssuedBooks(issued);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--brand-navy)]/20 border-t-[var(--brand-navy)]" />
          <p className="text-sm text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--brand-surface)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Welcome Banner */}
        <Reveal>
          <WelcomeBanner user={user} />
        </Reveal>

        {/* Stats Strip */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            <StatCard
              icon={BookOpen}
              label="Books Issued"
              value={stats.booksIssued}
              accent="bg-blue-100 text-blue-600"
              sub={`of 3 max`}
            />
            <StatCard
              icon={AlertTriangle}
              label="Overdue"
              value={stats.overdue}
              accent="bg-red-100 text-red-600"
              sub={stats.overdue > 0 ? "Return immediately" : "All on time"}
            />
            <StatCard
              icon={DollarSign}
              label="Pending Fines"
              value={`Rs. ${stats.pendingFines.toFixed(0)}`}
              accent="bg-amber-100 text-amber-600"
              sub={`@ Rs. ${FINE_RATE_PER_DAY}/day`}
            />
            <StatCard
              icon={Library}
              label="Total Borrowed"
              value={stats.totalBorrowed}
              accent="bg-emerald-100 text-emerald-600"
              sub="All time"
            />
          </motion.div>
        </Reveal>

        {/* Currently Issued Books */}
        <Reveal>
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--brand-navy)]">
                  Currently Issued Books
                </h2>
                <p className="text-sm text-gray-500">
                  {issuedBooks.length === 0
                    ? "No books currently issued"
                    : `${issuedBooks.length} book${issuedBooks.length > 1 ? "s" : ""} in your possession`}
                </p>
              </div>
              <Link
                href="/transactions"
                className="flex items-center gap-1 text-sm font-medium text-[var(--brand-navy)] transition-colors hover:text-[var(--brand-gold)]"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {issuedBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">No books currently issued</p>
                <p className="mt-1 text-xs text-gray-400">
                  Visit the library or search books to borrow one.
                </p>
                <Link
                  href="/books"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-navy)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--brand-navy)]/90"
                >
                  <Search className="h-4 w-4" /> Browse Books
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="flex gap-4"
                  style={{ width: "max-content" }}
                >
                  {issuedBooks.map((book) => (
                    <IssuedBookCard key={book.transactionId} book={book} />
                  ))}
                </motion.div>
              </div>
            )}
          </section>
        </Reveal>

        {/* Quick Actions */}
        <Reveal>
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-[var(--brand-navy)]">Quick Actions</h2>
              <p className="text-sm text-gray-500">Jump to the most common tasks</p>
            </div>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {quickActions.map((action) => (
                <motion.div key={action.href} variants={fadeInUp}>
                  <Link
                    href={action.href}
                    className={`group flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] ${action.border}`}
                  >
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${action.color}`}
                    >
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--brand-navy)]">{action.label}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{action.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--brand-navy)]" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </section>
        </Reveal>

        {/* Library Policy Notice */}
        <Reveal>
          <div className="rounded-2xl border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/8 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--brand-gold)]/20">
                <AlertTriangle className="h-4 w-4 text-[var(--brand-gold)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--brand-navy)]">Library Policy Reminder</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Members may borrow up to <strong>3 books</strong> at a time for a period of{" "}
                  <strong>{LOAN_PERIOD_DAYS} days</strong>. Overdue books attract a fine of{" "}
                  <strong>Rs. {FINE_RATE_PER_DAY} per day</strong>. Please return books on time to
                  avoid penalties and ensure availability for fellow students.
                </p>
              </div>
            </div>
          </div>
        </Reveal>

      </div>
    </main>
  );
}