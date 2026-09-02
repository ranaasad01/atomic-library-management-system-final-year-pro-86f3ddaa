"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Star, AlertCircle, Check, X } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";
import { Book } from "@/lib/data";
type BOOK_GENRES = any;
const BOOK_GENRES: any = [];
import { createClient } from "@/lib/supabase/client";

// ─── helpers ────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

const ITEMS_PER_PAGE = 12;

// ─── availability chip ───────────────────────────────────────────────────────

function AvailabilityChip({ available, total }: { available: number; total: number }) {
  const isAvailable = available > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isAvailable
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-600"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isAvailable ? "bg-emerald-500" : "bg-red-500"
        )}
      />
      {isAvailable ? `${available}/${total} Available` : "Unavailable"}
    </span>
  );
}

// ─── genre badge ─────────────────────────────────────────────────────────────

function GenreBadge({ genre }: { genre: string | null }) {
  if (!genre) return null;
  return (
    <span className="inline-block rounded-md bg-[var(--brand-navy)]/10 px-2 py-0.5 text-xs font-medium text-[var(--brand-navy)]">
      {genre}
    </span>
  );
}

// ─── book card ───────────────────────────────────────────────────────────────

function BookCard({ book }: { book: Book }) {
  const [issued, setIssued] = useState(false);
  const isAvailable = book.available_copies > 0;

  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)] transition-shadow duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_16px_40px_-12px_rgba(0,0,0,0.16)]"
    >
      {/* Cover */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[var(--brand-navy)] to-[var(--brand-navy)]/70">
        {book.cover_image_url ? (
          <img
            src={book.cover_image_url}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
            <BookOpen className="h-12 w-12 text-white/40" />
            <p className="line-clamp-2 text-sm font-medium text-white/70">{book.title}</p>
          </div>
        )}
        {/* availability overlay badge */}
        <div className="absolute right-2 top-2">
          <AvailabilityChip available={book.available_copies} total={book.total_copies} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--brand-navy)]">
            {book.title}
          </h3>
          <p className="mt-1 text-xs text-gray-500">{book.author}</p>
          {book.isbn && (
            <p className="mt-0.5 text-xs text-gray-400">ISBN: {book.isbn}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <GenreBadge genre={book.genre} />
          {book.shelf_location && (
            <span className="text-xs text-gray-400">Shelf {book.shelf_location}</span>
          )}
        </div>

        {book.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
            {book.description}
          </p>
        )}

        {/* CTA */}
        <button
          disabled={!isAvailable || issued}
          onClick={() => isAvailable && setIssued(true)}
          className={cn(
            "mt-auto flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
            issued
              ? "bg-emerald-500 text-white"
              : isAvailable
              ? "bg-[var(--brand-navy)] text-white hover:bg-[var(--brand-navy)]/90 active:scale-95"
              : "cursor-not-allowed bg-gray-100 text-gray-400"
          )}
        >
          {issued ? (
            <>
              <Check className="h-4 w-4" /> Reserved
            </>
          ) : isAvailable ? (
            <>
              <BookOpen className="h-4 w-4" /> Issue / Reserve
            </>
          ) : (
            "Not Available"
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ─── skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="h-48 w-full animate-pulse bg-gray-200" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="mt-2 h-9 w-full animate-pulse rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

// ─── pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={onPrev}
        disabled={page === 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition",
              page === p
                ? "border-[var(--brand-navy)] bg-[var(--brand-navy)] text-white"
                : "border-black/10 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={onNext}
        disabled={page === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function BooksPage() {
  const supabase = createClient();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // pagination
  const [page, setPage] = useState(1);

  // ── fetch from Supabase ──────────────────────────────────────────────────
  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: sbError } = await supabase
          .from("books")
          .select("*")
          .order("title", { ascending: true });

        if (sbError) throw new Error(sbError.message);
        setBooks((data as Book[]) ?? []);
      } catch (err) {
        setError((err as Error).message ?? "Failed to load books.");
      } finally {
        setLoading(false);
      }
    }
    fetchBooks();
  }, []);

  // ── client-side filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return books.filter((b) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.isbn ?? "").toLowerCase().includes(q);
      const matchesAuthor =
        !authorFilter || b.author.toLowerCase().includes(authorFilter.toLowerCase());
      const matchesGenre = genreFilter === "All" || b.genre === genreFilter;
      const matchesAvail = !availableOnly || b.available_copies > 0;
      return matchesSearch && matchesAuthor && matchesGenre && matchesAvail;
    });
  }, [books, search, authorFilter, genreFilter, availableOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePageNum = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePageNum - 1) * ITEMS_PER_PAGE,
    safePageNum * ITEMS_PER_PAGE
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    setAuthorFilter("");
    setGenreFilter("All");
    setAvailableOnly(false);
    setPage(1);
  }, []);

  const hasActiveFilters =
    search || authorFilter || genreFilter !== "All" || availableOnly;

  // reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, authorFilter, genreFilter, availableOnly]);

  const genres = ["All", ...BOOK_GENRES] as const;

  return (
    <main className="min-h-screen bg-[var(--brand-surface)]">
      {/* ── Hero / Header ─────────────────────────────────────────────── */}
      <Reveal>
        <section className="border-b border-black/5 bg-[var(--brand-navy)] px-4 py-14 text-white">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold)]/80">
                NCBA&amp;E Library
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Book Catalogue
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/70">
                Browse, search, and reserve books from our campus library collection. Filter by
                genre, author, or availability to find exactly what you need.
              </p>
            </div>

            {/* Stats row */}
            <div className="mt-8 flex flex-wrap gap-6">
              {[
                { label: "Total Books", value: books.length },
                {
                  label: "Available Now",
                  value: books.filter((b) => b.available_copies > 0).length,
                },
                {
                  label: "Genres",
                  value: new Set(books.map((b) => b.genre).filter(Boolean)).size,
                },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="text-2xl font-bold text-[var(--brand-gold)]">
                    {loading ? "—" : stat.value}
                  </span>
                  <span className="text-xs text-white/60">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Sticky Search + Filter Bar ────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-black/5 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, author, or ISBN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[var(--brand-navy)] focus:bg-white focus:ring-2 focus:ring-[var(--brand-navy)]/10"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
                showFilters
                  ? "border-[var(--brand-navy)] bg-[var(--brand-navy)] text-white"
                  : "border-black/10 bg-gray-50 text-gray-700 hover:bg-gray-100"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-gold)] text-[10px] font-bold text-[var(--brand-navy)]">
                  !
                </span>
              )}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showFilters && "rotate-180"
                )}
              />
            </button>

            {/* Availability toggle */}
            <button
              onClick={() => setAvailableOnly((v) => !v)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
                availableOnly
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-black/10 bg-gray-50 text-gray-700 hover:bg-gray-100"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  availableOnly ? "bg-emerald-500" : "bg-gray-300"
                )}
              />
              Available Only
            </button>
          </div>

          {/* Expanded filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex flex-col gap-3 border-t border-black/5 pt-3 sm:flex-row sm:items-end">
                  {/* Author filter */}
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Author
                    </label>
                    <input
                      type="text"
                      placeholder="Filter by author..."
                      value={authorFilter}
                      onChange={(e) => setAuthorFilter(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-[var(--brand-navy)] focus:bg-white focus:ring-2 focus:ring-[var(--brand-navy)]/10"
                    />
                  </div>

                  {/* Genre dropdown */}
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Genre
                    </label>
                    <div className="relative">
                      <select
                        value={genreFilter}
                        onChange={(e) => setGenreFilter(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-black/10 bg-gray-50 px-3 py-2 pr-8 text-sm text-gray-800 outline-none transition focus:border-[var(--brand-navy)] focus:bg-white focus:ring-2 focus:ring-[var(--brand-navy)]/10"
                      >
                        {genres.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  {/* Reset */}
                  {hasActiveFilters && (
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                    >
                      <X className="h-3.5 w-3.5" /> Clear All
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Genre Pills ───────────────────────────────────────────────── */}
      <Reveal>
        <div className="border-b border-black/5 bg-white px-4 py-3">
          <div className="mx-auto max-w-6xl">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenreFilter(g)}
                  className={cn(
                    "flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                    genreFilter === g
                      ? "border-[var(--brand-navy)] bg-[var(--brand-navy)] text-white"
                      : "border-black/10 bg-gray-50 text-gray-600 hover:border-[var(--brand-navy)]/30 hover:bg-[var(--brand-navy)]/5 hover:text-[var(--brand-navy)]"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── Results Summary ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {loading ? (
              "Loading books..."
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-[var(--brand-navy)]">
                  {paginated.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-[var(--brand-navy)]">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1 ? "book" : "books"}
                {hasActiveFilters && " (filtered)"}
              </>
            )}
          </p>
          {hasActiveFilters && !loading && (
            <button
              onClick={resetFilters}
              className="text-xs font-medium text-[var(--brand-navy)] underline underline-offset-2 hover:text-[var(--brand-navy)]/70"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Book Grid ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        {/* Error state */}
        {error && (
          <Reveal>
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Failed to load books</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </Reveal>
        )}

        {/* Loading skeleton */}
        {loading && !error && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <Reveal>
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-black/10 bg-white py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-navy)]/5">
                <BookOpen className="h-8 w-8 text-[var(--brand-navy)]/40" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">No books found</p>
                <p className="mt-1 text-sm text-gray-400">
                  Try adjusting your search or filters.
                </p>
              </div>
              <button
                onClick={resetFilters}
                className="rounded-xl bg-[var(--brand-navy)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-navy)]/90"
              >
                Clear Filters
              </button>
            </div>
          </Reveal>
        )}

        {/* Book grid */}
        {!loading && !error && paginated.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {paginated.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </motion.div>
        )}
      </section>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {!loading && !error && totalPages > 1 && (
        <Reveal>
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-4">
            <Pagination
              page={safePageNum}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              onPage={(p) => setPage(p)}
            />
            <p className="mt-3 text-center text-xs text-gray-400">
              Page {safePageNum} of {totalPages}
            </p>
          </div>
        </Reveal>
      )}

      {/* ── Info Banner ───────────────────────────────────────────────── */}
      <Reveal>
        <div className="border-t border-black/5 bg-[var(--brand-navy)]/5 px-4 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-gold)]/20">
              <Star className="h-6 w-6 text-[var(--brand-gold)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--brand-navy)]">
                Need a book that is not listed?
              </p>
              <p className="mt-0.5 text-sm text-gray-500">
                Visit the library desk or contact the librarian to request a new acquisition.
                Loan period is 14 days with a fine of PKR 5 per overdue day.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </main>
  );
}