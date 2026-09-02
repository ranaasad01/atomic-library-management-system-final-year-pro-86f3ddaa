"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Edit, Trash2, X, Check, BookOpen, Filter, ChevronDown, AlertCircle, Image, Save } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type BookRow = Database["public"]["Tables"]["books"]["Row"];

const BOOK_GENRES_LOCAL = [
  "Computer Science",
  "Software Engineering",
  "Networking",
  "Engineering",
  "Economics",
  "Business & Entrepreneurship",
  "Management",
  "Law & Business",
  "Islamic Studies",
  "History",
  "Fiction",
  "Non-Fiction",
] as const;

type LocalGenre = (typeof BOOK_GENRES_LOCAL)[number];

const GENRE_FILTER_OPTIONS = ["All", ...BOOK_GENRES_LOCAL] as const;

const AVAILABILITY_OPTIONS = ["All", "Available", "Unavailable"] as const;

const emptyForm = {
  title: "",
  author: "",
  isbn: "",
  genre: "" as LocalGenre | "",
  publisher: "",
  publication_year: "",
  total_copies: "1",
  available_copies: "1",
  shelf_location: "",
  description: "",
  cover_image_url: "",
};

type BookForm = typeof emptyForm;

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 flex flex-col gap-1",
        accent
          ? "bg-[var(--brand-navy)] border-[var(--brand-navy)] text-white"
          : "bg-white border-[var(--brand-border)]"
      )}
    >
      <span
        className={cn(
          "text-3xl font-bold tracking-tight",
          accent ? "text-[var(--brand-gold)]" : "text-[var(--brand-navy)]"
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          "text-sm",
          accent ? "text-white/70" : "text-[var(--brand-muted)]"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function Badge({
  available,
  total,
}: {
  available: number;
  total: number;
}) {
  const pct = total > 0 ? available / total : 0;
  const color =
    pct === 0
      ? "bg-red-100 text-red-700"
      : pct < 0.4
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";
  const label =
    pct === 0 ? "Unavailable" : pct < 0.4 ? "Low Stock" : "Available";
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", color)}>
      {label}
    </span>
  );
}

export default function BookManagementPage() {
  const supabase = createClient();

  const [books, setBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("All");
  const [availFilter, setAvailFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BookRow | null>(null);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BookRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setBooks(data ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const filtered = books.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.isbn ?? "").toLowerCase().includes(q) ||
      (b.genre ?? "").toLowerCase().includes(q);
    const matchGenre = genreFilter === "All" || b.genre === genreFilter;
    const matchAvail =
      availFilter === "All"
        ? true
        : availFilter === "Available"
        ? b.available_copies > 0
        : b.available_copies === 0;
    return matchSearch && matchGenre && matchAvail;
  });

  const totalBooks = books.length;
  const totalCopies = books.reduce((s, b) => s + b.total_copies, 0);
  const availableCopies = books.reduce((s, b) => s + b.available_copies, 0);
  const unavailableBooks = books.filter((b) => b.available_copies === 0).length;

  function openAdd() {
    setEditingBook(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(book: BookRow) {
    setEditingBook(book);
    setForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn ?? "",
      genre: (book.genre as LocalGenre | "") ?? "",
      publisher: book.publisher ?? "",
      publication_year: book.publication_year?.toString() ?? "",
      total_copies: book.total_copies.toString(),
      available_copies: book.available_copies.toString(),
      shelf_location: book.shelf_location ?? "",
      description: book.description ?? "",
      cover_image_url: book.cover_image_url ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingBook(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function handleFormChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) return setFormError("Title is required.");
    if (!form.author.trim()) return setFormError("Author is required.");
    const totalCopiesNum = parseInt(form.total_copies, 10);
    const availCopiesNum = parseInt(form.available_copies, 10);
    if (isNaN(totalCopiesNum) || totalCopiesNum < 1)
      return setFormError("Total copies must be at least 1.");
    if (isNaN(availCopiesNum) || availCopiesNum < 0)
      return setFormError("Available copies cannot be negative.");
    if (availCopiesNum > totalCopiesNum)
      return setFormError("Available copies cannot exceed total copies.");

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: form.isbn.trim() || null,
      genre: form.genre || null,
      publisher: form.publisher.trim() || null,
      publication_year: form.publication_year
        ? parseInt(form.publication_year, 10)
        : null,
      total_copies: totalCopiesNum,
      available_copies: availCopiesNum,
      shelf_location: form.shelf_location.trim() || null,
      description: form.description.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingBook) {
      const { error: err } = await supabase
        .from("books")
        .update(payload)
        .eq("id", editingBook.id);
      if (err) {
        setFormError(err.message);
        setSaving(false);
        return;
      }
      showToast("Book updated successfully.");
    } else {
      const { error: err } = await supabase.from("books").insert({
        ...payload,
        created_at: new Date().toISOString(),
      });
      if (err) {
        setFormError(err.message);
        setSaving(false);
        return;
      }
      showToast("Book added successfully.");
    }

    setSaving(false);
    closeModal();
    fetchBooks();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: err } = await supabase
      .from("books")
      .delete()
      .eq("id", deleteTarget.id);
    if (err) {
      showToast(err.message, false);
    } else {
      showToast("Book deleted.");
      fetchBooks();
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <main className="min-h-screen bg-[var(--brand-surface)] pb-20">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-6 right-6 z-[200] flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium shadow-lg",
              toast.ok
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            )}
          >
            {toast.ok ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <Reveal>
        <div className="bg-[var(--brand-navy)] text-white px-6 py-12 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className="h-7 w-7 text-[var(--brand-gold)]" />
                  <span className="text-sm font-semibold uppercase tracking-widest text-[var(--brand-gold)]">
                    Admin Panel
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                  Book Management
                </h1>
                <p className="mt-2 text-white/60 text-sm max-w-xl">
                  Add, edit, and remove books from the library catalogue. Track
                  copies, availability, and shelf locations.
                </p>
              </div>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 bg-[var(--brand-gold)] text-[var(--brand-navy)] font-semibold px-5 py-2.5 rounded-xl hover:brightness-110 transition-all duration-200 shadow-md self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                Add Book
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-10 space-y-10">
        {/* Stats */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {[
              { label: "Total Titles", value: totalBooks, accent: true },
              { label: "Total Copies", value: totalCopies },
              { label: "Available Copies", value: availableCopies },
              { label: "Fully Checked Out", value: unavailableBooks },
            ].map((s) => (
              <motion.div key={s.label} variants={fadeInUp}>
                <StatCard label={s.label} value={s.value} accent={s.accent} />
              </motion.div>
            ))}
          </motion.div>
        </Reveal>

        {/* Search & Filters */}
        <Reveal>
          <div className="bg-white rounded-2xl border border-[var(--brand-border)] p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-muted)]" />
                <input
                  type="text"
                  placeholder="Search by title, author, ISBN, or genre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 bg-[var(--brand-surface)]"
                />
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200",
                  showFilters
                    ? "bg-[var(--brand-navy)] text-white border-[var(--brand-navy)]"
                    : "bg-white text-[var(--brand-navy)] border-[var(--brand-border)] hover:border-[var(--brand-navy)]"
                )}
              >
                <Filter className="h-4 w-4" />
                Filters
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    showFilters && "rotate-180"
                  )}
                />
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Genre
                      </label>
                      <select
                        value={genreFilter}
                        onChange={(e) => setGenreFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 bg-[var(--brand-surface)]"
                      >
                        {GENRE_FILTER_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Availability
                      </label>
                      <select
                        value={availFilter}
                        onChange={(e) => setAvailFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 bg-[var(--brand-surface)]"
                      >
                        {AVAILABILITY_OPTIONS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setSearch("");
                          setGenreFilter("All");
                          setAvailFilter("All");
                        }}
                        className="px-4 py-2 rounded-xl border border-[var(--brand-border)] text-sm text-[var(--brand-muted)] hover:text-[var(--brand-navy)] hover:border-[var(--brand-navy)] transition-all duration-200"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>

        {/* Books Table */}
        <Reveal>
          <div className="bg-white rounded-2xl border border-[var(--brand-border)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--brand-border)] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--brand-navy)] text-base">
                Library Catalogue
              </h2>
              <span className="text-xs text-[var(--brand-muted)] bg-[var(--brand-surface)] px-3 py-1 rounded-full border border-[var(--brand-border)]">
                {filtered.length} of {totalBooks} titles
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-[var(--brand-muted)] text-sm gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="h-5 w-5 border-2 border-[var(--brand-navy)] border-t-transparent rounded-full"
                />
                Loading catalogue...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20 gap-2 text-red-600 text-sm">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--brand-muted)] gap-3">
                <BookOpen className="h-10 w-10 opacity-30" />
                <p className="text-sm">No books match your search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--brand-surface)] text-[var(--brand-muted)] text-xs uppercase tracking-wide">
                      <th className="px-6 py-3 text-left font-semibold">
                        Title / Author
                      </th>
                      <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">
                        Genre
                      </th>
                      <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">
                        ISBN
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Copies
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">
                        Shelf
                      </th>
                      <th className="px-6 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--brand-border)]">
                    <AnimatePresence>
                      {filtered.map((book) => (
                        <motion.tr
                          key={book.id}
                          variants={fadeInUp}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0 }}
                          className="hover:bg-[var(--brand-surface)] transition-colors duration-150"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {book.cover_image_url ? (
                                <img
                                  src={book.cover_image_url}
                                  alt={book.title}
                                  className="h-10 w-8 object-cover rounded-md border border-[var(--brand-border)] flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display =
                                      "none";
                                  }}
                                />
                              ) : (
                                <div className="h-10 w-8 rounded-md bg-[var(--brand-navy)]/10 flex items-center justify-center flex-shrink-0">
                                  <Image className="h-4 w-4 text-[var(--brand-navy)]/40" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-[var(--brand-navy)] leading-tight line-clamp-1">
                                  {book.title}
                                </p>
                                <p className="text-[var(--brand-muted)] text-xs mt-0.5">
                                  {book.author}
                                  {book.publication_year
                                    ? ` · ${book.publication_year}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            {book.genre ? (
                              <span className="text-xs bg-[var(--brand-navy)]/10 text-[var(--brand-navy)] px-2 py-0.5 rounded-full font-medium">
                                {book.genre}
                              </span>
                            ) : (
                              <span className="text-[var(--brand-muted)] text-xs">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell text-[var(--brand-muted)] text-xs font-mono">
                            {book.isbn ?? "—"}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="font-semibold text-[var(--brand-navy)]">
                              {book.available_copies}
                            </span>
                            <span className="text-[var(--brand-muted)]">
                              /{book.total_copies}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <Badge
                              available={book.available_copies}
                              total={book.total_copies}
                            />
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell text-[var(--brand-muted)] text-xs">
                            {book.shelf_location ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => openEdit(book)}
                                className="p-2 rounded-lg border border-[var(--brand-border)] text-[var(--brand-navy)] hover:bg-[var(--brand-navy)] hover:text-white hover:border-[var(--brand-navy)] transition-all duration-200"
                                title="Edit book"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDeleteTarget(book)}
                                className="p-2 rounded-lg border border-[var(--brand-border)] text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200"
                                title="Delete book"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              key="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
              onClick={closeModal}
            />
            <motion.div
              key="modal-panel"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--brand-border)] sticky top-0 bg-white z-10">
                  <h2 className="font-bold text-[var(--brand-navy)] text-lg">
                    {editingBook ? "Edit Book" : "Add New Book"}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-2 rounded-lg hover:bg-[var(--brand-surface)] text-[var(--brand-muted)] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="px-6 py-6 space-y-5">
                  {formError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="title"
                        value={form.title}
                        onChange={handleFormChange}
                        placeholder="e.g. Introduction to Algorithms"
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Author <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="author"
                        value={form.author}
                        onChange={handleFormChange}
                        placeholder="e.g. Thomas H. Cormen"
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        ISBN
                      </label>
                      <input
                        name="isbn"
                        value={form.isbn}
                        onChange={handleFormChange}
                        placeholder="e.g. 978-0-262-03384-8"
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Genre
                      </label>
                      <select
                        name="genre"
                        value={form.genre}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 bg-white"
                      >
                        <option value="">Select genre</option>
                        {BOOK_GENRES_LOCAL.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Publisher
                      </label>
                      <input
                        name="publisher"
                        value={form.publisher}
                        onChange={handleFormChange}
                        placeholder="e.g. MIT Press"
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Publication Year
                      </label>
                      <input
                        name="publication_year"
                        value={form.publication_year}
                        onChange={handleFormChange}
                        placeholder="e.g. 2022"
                        type="number"
                        min="1800"
                        max={new Date().getFullYear() + 1}
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Total Copies <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="total_copies"
                        value={form.total_copies}
                        onChange={handleFormChange}
                        type="number"
                        min="1"
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Available Copies <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="available_copies"
                        value={form.available_copies}
                        onChange={handleFormChange}
                        type="number"
                        min="0"
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Shelf Location
                      </label>
                      <input
                        name="shelf_location"
                        value={form.shelf_location}
                        onChange={handleFormChange}
                        placeholder="e.g. A-12"
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Cover Image URL
                      </label>
                      <input
                        name="cover_image_url"
                        value={form.cover_image_url}
                        onChange={handleFormChange}
                        placeholder="https://..."
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[var(--brand-muted)] mb-1 uppercase tracking-wide">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleFormChange}
                        rows={3}
                        placeholder="Brief description of the book..."
                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--brand-border)]">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-5 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm font-medium text-[var(--brand-muted)] hover:text-[var(--brand-navy)] hover:border-[var(--brand-navy)] transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 bg-[var(--brand-navy)] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[var(--brand-navy)]/90 transition-all duration-200 disabled:opacity-60"
                    >
                      {saving ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            duration: 1,
                            ease: "linear",
                          }}
                          className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? "Saving..." : editingBook ? "Update Book" : "Add Book"}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              key="del-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
              onClick={() => setDeleteTarget(null)}
            />
            <motion.div
              key="del-panel"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--brand-navy)]">
                      Delete Book
                    </h3>
                    <p className="text-xs text-[var(--brand-muted)]">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--brand-navy)] mb-6">
                  Are you sure you want to remove{" "}
                  <span className="font-semibold">
                    &ldquo;{deleteTarget.title}&rdquo;
                  </span>{" "}
                  by {deleteTarget.author} from the catalogue?
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="px-5 py-2.5 rounded-xl border border-[var(--brand-border)] text-sm font-medium text-[var(--brand-muted)] hover:text-[var(--brand-navy)] hover:border-[var(--brand-navy)] transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-red-700 transition-all duration-200 disabled:opacity-60"
                  >
                    {deleting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 1,
                          ease: "linear",
                        }}
                        className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {deleting ? "Deleting..." : "Delete Book"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}