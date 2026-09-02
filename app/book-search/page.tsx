"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Filter, BookOpen, X, ChevronDown, Star, MapPin, Hash, Calendar, User, Layers } from 'lucide-react';
import { createClient } from "@/lib/supabase/client";
import { Reveal } from "@/components/Reveal";
import { staggerContainer, fadeInUp } from "@/lib/motion";
type BOOK_GENRES = any;
const BOOK_GENRES: any = [];
import type { Book } from "@/lib/data";
import { cn } from "@/lib/utils";

const AVAILABILITY_OPTIONS = ["All", "Available", "Unavailable"] as const;
type AvailabilityFilter = (typeof AVAILABILITY_OPTIONS)[number];

function BookCard({ book }: { book: Book }) {
  const available = book.available_copies > 0;
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group flex flex-col rounded-2xl border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)] overflow-hidden transition-shadow duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_16px_40px_-12px_rgba(0,0,0,0.16)]"
    >
      {/* Cover */}
      <div className="relative h-48 bg-gradient-to-br from-[var(--brand-navy)]/10 to-[var(--brand-gold)]/10 flex items-center justify-center overflow-hidden">
        {book.cover_image_url ? (
          <img
            src={book.cover_image_url}
            alt={book.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--brand-navy)]/30">
            <BookOpen className="h-14 w-14" />
            <span className="text-xs font-medium tracking-wide uppercase">No Cover</span>
          </div>
        )}
        {/* Availability badge */}
        <span
          className={cn(
            "absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
            available
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-600"
          )}
        >
          {available ? `${book.available_copies} Available` : "Unavailable"}
        </span>
        {book.genre && (
          <span className="absolute bottom-3 left-3 rounded-full bg-[var(--brand-navy)]/80 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {book.genre}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--brand-navy)] group-hover:text-[var(--brand-gold)] transition-colors duration-200">
            {book.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <User className="h-3.5 w-3.5 shrink-0" />
            {book.author}
          </p>
        </div>

        {book.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
            {book.description}
          </p>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-black/5 pt-3">
          {book.isbn && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Hash className="h-3 w-3 shrink-0" />
              <span className="truncate">{book.isbn}</span>
            </div>
          )}
          {book.publication_year && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{book.publication_year}</span>
            </div>
          )}
          {book.shelf_location && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{book.shelf_location}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Layers className="h-3 w-3 shrink-0" />
            <span>{book.total_copies} total</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-black/8 bg-white overflow-hidden animate-pulse">
      <div className="h-48 bg-slate-100" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
      </div>
    </div>
  );
}

export default function BookSearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [availability, setAvailability] = useState<AvailabilityFilter>("All");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let q = supabase
        .from("books")
        .select("*", { count: "exact" })
        .order("title", { ascending: true });

      if (debouncedQuery.trim()) {
        q = q.or(
          `title.ilike.%${debouncedQuery}%,author.ilike.%${debouncedQuery}%,isbn.ilike.%${debouncedQuery}%,publisher.ilike.%${debouncedQuery}%`
        );
      }

      if (selectedGenre !== "All") {
        q = q.eq("genre", selectedGenre);
      }

      if (availability === "Available") {
        q = q.gt("available_copies", 0);
      } else if (availability === "Unavailable") {
        q = q.eq("available_copies", 0);
      }

      const { data, error, count } = await q;
      if (!error && data) {
        setBooks(data as Book[]);
        setTotalCount(count ?? data.length);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedGenre, availability]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const clearFilters = () => {
    setQuery("");
    setSelectedGenre("All");
    setAvailability("All");
  };

  const hasActiveFilters =
    query.trim() !== "" || selectedGenre !== "All" || availability !== "All";

  const genres = ["All", ...BOOK_GENRES];

  return (
    <div className="min-h-screen bg-[var(--brand-surface)]">
      {/* Hero search header */}
      <Reveal>
        <section className="bg-[var(--brand-navy)] px-4 py-16 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm">
              <BookOpen className="h-4 w-4 text-[var(--brand-gold)]" />
              NCBA&amp;E Library Catalogue
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              Find Your Next{" "}
              <span className="text-[var(--brand-gold)]">Book</span>
            </h1>
            <p className="mt-3 text-base text-white/60 md:text-lg">
              Search across thousands of titles by name, author, ISBN, or publisher.
            </p>

            {/* Search bar */}
            <div className="mt-8 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title, author, ISBN, publisher..."
                  className="w-full rounded-xl border border-white/10 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-lg outline-none focus:ring-2 focus:ring-[var(--brand-gold)] transition-all duration-200"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all duration-200",
                  showFilters
                    ? "border-[var(--brand-gold)] bg-[var(--brand-gold)] text-[var(--brand-navy)]"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-navy)] text-[10px] font-bold text-white">
                    {[selectedGenre !== "All", availability !== "All"].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="mt-4 rounded-xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm text-left"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Genre */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
                      Genre
                    </label>
                    <div className="relative">
                      <select
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-white/10 bg-white/10 py-2.5 pl-3 pr-8 text-sm text-white backdrop-blur-sm outline-none focus:ring-2 focus:ring-[var(--brand-gold)] transition-all"
                      >
                        {genres.map((g) => (
                          <option key={g} value={g} className="text-slate-800 bg-white">
                            {g}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                    </div>
                  </div>

                  {/* Availability */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
                      Availability
                    </label>
                    <div className="flex gap-2">
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setAvailability(opt)}
                          className={cn(
                            "flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all duration-200",
                            availability === opt
                              ? "border-[var(--brand-gold)] bg-[var(--brand-gold)] text-[var(--brand-navy)]"
                              : "border-white/10 bg-white/10 text-white hover:bg-white/20"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear all filters
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </section>
      </Reveal>

      {/* Results section */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Results meta */}
        <Reveal>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">
                {loading ? (
                  "Searching..."
                ) : (
                  <>
                    <span className="font-semibold text-[var(--brand-navy)]">{totalCount}</span>{" "}
                    {totalCount === 1 ? "book" : "books"} found
                    {debouncedQuery && (
                      <>
                        {" "}for{" "}
                        <span className="font-medium text-[var(--brand-navy)]">
                          &ldquo;{debouncedQuery}&rdquo;
                        </span>
                      </>
                    )}
                  </>
                )}
              </p>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {selectedGenre !== "All" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-navy)]/20 bg-[var(--brand-navy)]/5 px-3 py-1 text-xs font-medium text-[var(--brand-navy)]">
                    {selectedGenre}
                    <button onClick={() => setSelectedGenre("All")}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {availability !== "All" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 px-3 py-1 text-xs font-medium text-[var(--brand-navy)]">
                    {availability}
                    <button onClick={() => setAvailability("All")}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <Reveal>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-24 text-center">
              <BookOpen className="h-14 w-14 text-slate-200" />
              <h3 className="mt-4 text-lg font-semibold text-slate-700">No books found</h3>
              <p className="mt-1 text-sm text-slate-400">
                Try adjusting your search or clearing the filters.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-5 rounded-lg bg-[var(--brand-navy)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--brand-navy)]/90 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          </Reveal>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </motion.div>
        )}

        {/* Genre quick-browse */}
        {!hasActiveFilters && !loading && (
          <Reveal className="mt-16">
            <div className="rounded-2xl border border-black/8 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
              <div className="mb-5 flex items-center gap-2">
                <Star className="h-5 w-5 text-[var(--brand-gold)]" />
                <h2 className="text-lg font-semibold text-[var(--brand-navy)]">Browse by Genre</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {BOOK_GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => {
                      setSelectedGenre(genre);
                      setShowFilters(false);
                    }}
                    className="rounded-full border border-[var(--brand-navy)]/15 bg-[var(--brand-surface)] px-4 py-1.5 text-sm font-medium text-[var(--brand-navy)] transition-all duration-200 hover:border-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/10 hover:text-[var(--brand-navy)]"
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}