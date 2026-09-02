"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import { Search, Plus, Edit, Trash2, X, Check, BookOpen, AlertCircle, ChevronDown, Save, Image } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeInUp } from "@/lib/motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  genre: string | null;
  publisher: string | null;
  publication_year: number | null;
  total_copies: number;
  available_copies: number;
  shelf_location: string | null;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

type BookFormData = Omit<Book, "id" | "created_at" | "updated_at">;

// ─── Constants ────────────────────────────────────────────────────────────────

const BOOK_GENRES = [
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

const EMPTY_FORM: BookFormData = {
  title: "",
  author: "",
  isbn: "",
  genre: "",
  publisher: "",
  publication_year: null,
  total_copies: 1,
  available_copies: 1,
  shelf_location: "",
  description: "",
  cover_image_url: "",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className={cn(
        "rounded-2xl border p-5 flex flex-col gap-1",
        accent
          ? "bg-[var(--brand-navy)] border-[var(--brand-navy)] text-white"
          : "bg-white border-[hsl(var(--border))]"
      )}
    >
      <span
        className={cn(
          "text-xs font-medium uppercase tracking-wider",
          accent ? "text-white/60" : "text-[hsl(var(--muted-foreground))]"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-3xl font-bold",
          accent ? "text-white" : "text-[var(--brand-navy)]"
        )}
      >
        {value}
      </span>
      {sub && (
        <span
          className={cn(
            "text-xs",
            accent ? "text-white/50" : "text-[hsl(var(--muted-foreground))]"
          )}
        >
          {sub}
        </span>
      )}
    </motion.div>
  );
}

// ─── Book Form Modal ──────────────────────────────────────────────────────────

function BookFormModal({
  open,
  onClose,
  onSave,
  initial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: BookFormData) => Promise<void>;
  initial: BookFormData | null;
  loading: boolean;
}) {
  const [form, setForm] = useState<BookFormData>(initial ?? EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof BookFormData, string>>>({});

  useEffect(() => {
    setForm(initial ?? EMPTY_FORM);
    setErrors({});
  }, [initial, open]);

  const set = <K extends keyof BookFormData>(key: K, val: BookFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof BookFormData, string>> = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.author.trim()) e.author = "Author is required.";
    if (form.total_copies < 1) e.total_copies = "Must have at least 1 copy.";
    if (form.available_copies < 0) e.available_copies = "Cannot be negative.";
    if (form.available_copies > form.total_copies)
      e.available_copies = "Cannot exceed total copies.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    await onSave(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[var(--brand-navy)]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--brand-gold)]" />
            {initial === EMPTY_FORM || !initial?.title
              ? "Add New Book"
              : "Edit Book"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--brand-navy)] mb-1 uppercase tracking-wide">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Introduction to Algorithms"
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30",
                  errors.title ? "border-red-400" : "border-[hsl(var(--border))]"
                )}
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            {/* Author */}
            <div>
              <label className="block text-xs font-semibold text-[var(--brand-navy)] mb-1 uppercase tracking-wide">
                Author <span className="text-red-500">*</span>
              </label>
              <input
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                placeholder="e.g. Thomas H. Cormen"
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30",
                  errors.author ? "border-red-400" : "border-[hsl(var(--border))]"
                )}
              />
              {errors.author && (
                <p className="text-xs text-red-500 mt-1">{errors.author}</p>
              )}
            </div>

            {/* ISBN */}
            <div>
              <label className="block text-xs font-semibold text-[var(--brand-navy)] mb-1 uppercase tracking-wide">
                ISBN
              </label>
              <input
                value={form.isbn ?? ""}
                onChange={(e) => set("isbn", e.target.value || null)}
                placeholder="e.g. 978-0-262-03384-8"
                className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
              />
            </div>

            {/* Genre */}
            <div>
              <label className="block text-xs font-semibold text-[var(--brand-navy)] mb-1 uppercase tracking-wide">
                Genre
              </label>
              <div className="relative">
                <select
                  value={form.genre ?? ""}
                  onChange={(e) => set("genre", e.target.value || null)}
                  className="w-full appearance-none rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 bg-white pr-8"
                >
                  <option value="">Select genre</option>
                  {BOOK_GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Publisher */}
            <div>
              <label className="block text-xs font-semibold text-[var(--brand-navy)] mb-1 uppercase tracking-wide">
                Publisher
              </label>
              <input
                value={form.publisher ?? ""}
                onChange={(e) => set("publisher", e.target.value || null)}
                placeholder="e.g. MIT Press"
                className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
              />
            </div>

            {/* Publication Year */}
            <div>
              <label className="block text-xs font-semibold text-[var(--brand-navy)] mb-1 uppercase tracking-wide">
                Publication Year
              </label>
              <input
                type="number"
                value={form.publication_year ?? ""}
                onChange={(e) =>
                  set(
                    "publication_year",
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                placeholder="e.g. 2022"
                min={1800}
                max={new Date().getFullYear() + 1}
                className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
              />
            </div>

            {/* Total Copies */}
            <div>
              <label className="block text-xs font-semibold text-[var(--brand-navy)] mb-1 uppercase tracking-wide">
                Total Copies <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.total_copies}
                onChange={(e) =>
                  set("total_copies", parseInt(e.target.value) || 1)
                }
                min={1}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30",
                  errors.total_copies
                    ? "border-red-400"
                    : "border-[hsl(var(--border))]"
                )}
              />
              {errors.total_copies && (
                <p className="text-xs text-red-500 mt-1">{errors.total_copies}</p>
              )}
            </div>

            {/* Available Copies */}
            <div>
              <label className="block text-xs font-semibold text-[var(--brand-navy)] mb-1 uppercase tracking-wide">
                Available Copies <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.available_copies}
                onChange={(e) =>
                  set("available_copies", parseInt(e.target.value) || 0)
                }
                min={0}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30",
                  errors.available_copies
                    ? "border-red-400"
                    : "border-[hsl(var(--border))]"
                )}
              />
              {errors.available_copies && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.available_copies}
                </p>
              )}
            </div>

            {/* Shelf Location */}
            <div>
              <label className="block text-xs font-semibold text-[var(--brand-navy)] mb-1 uppercase tracking-wide">
                Shelf Location
              </label>
              <input
                value={form.shelf_location ?? ""}
                onChange={(e) => set("shelf_location", e.target.value || null)}
                placeholder="e.g. A-12"
                className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
              />
            </div>

            {/* Cover Image URL */}
            <div>
              <label className="block text-xs font-semibold text-[var(--brand-navy)] mb-1 uppercase tracking-wide">
                Cover Image URL
              </label>
              <input
                value={form.cover_image_url ?? ""}
                onChange={(e) =>
                  set("cover_image_url", e.target.value || null)
                }
                placeholder="https://..."
                className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--brand-navy)] mb-1 uppercase tracking-wide">
                Description
              </label>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value || null)}
                placeholder="Brief description of the book..."
                rows={3}
                className="w-full rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[var(--brand-navy)] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[var(--brand-navy)]/90 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Book
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
  book,
  onClose,
  onConfirm,
  loading,
}: {
  book: Book | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}) {
  if (!book) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] p-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Delete Book</h3>
            <p className="text-xs text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-6">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-[var(--brand-navy)]">
            &ldquo;{book.title}&rdquo;
          </span>
          ? All associated records may be affected.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <motion.div
      className={cn(
        "fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium",
        type === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      {type === "success" ? (
        <Check className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      {message}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBooksPage() {
  const supabase = createClient();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("All");
  const [availFilter, setAvailFilter] = useState<"all" | "available" | "unavailable">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [deleteBook, setDeleteBook] = useState<Book | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      showToast("Failed to load books.", "error");
    } else {
      setBooks((data as Book[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalBooks = books.length;
  const totalCopies = books.reduce((s, b) => s + b.total_copies, 0);
  const availableCopies = books.reduce((s, b) => s + b.available_copies, 0);
  const overdueBooks = books.filter((b) => b.available_copies === 0).length;

  // ── Filtered list ──────────────────────────────────────────────────────────
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
      availFilter === "all"
        ? true
        : availFilter === "available"
        ? b.available_copies > 0
        : b.available_copies === 0;
    return matchSearch && matchGenre && matchAvail;
  });

  // ── Save (create / update) ─────────────────────────────────────────────────
  const handleSave = async (formData: BookFormData) => {
    setSaving(true);
    if (editBook) {
      const { error } = await supabase
        .from("books")
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq("id", editBook.id);
      if (error) {
        showToast("Failed to update book.", "error");
      } else {
        showToast("Book updated successfully.", "success");
        setModalOpen(false);
        setEditBook(null);
        fetchBooks();
      }
    } else {
      const { error } = await supabase.from("books").insert([
        {
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      if (error) {
        showToast("Failed to add book.", "error");
      } else {
        showToast("Book added successfully.", "success");
        setModalOpen(false);
        fetchBooks();
      }
    }
    setSaving(false);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteBook) return;
    setDeleting(true);
    const { error } = await supabase
      .from("books")
      .delete()
      .eq("id", deleteBook.id);
    if (error) {
      showToast("Failed to delete book.", "error");
    } else {
      showToast("Book deleted.", "success");
      setDeleteBook(null);
      fetchBooks();
    }
    setDeleting(false);
  };

  const openAdd = () => {
    setEditBook(null);
    setModalOpen(true);
  };

  const openEdit = (book: Book) => {
    setEditBook(book);
    setModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#f5f5f5] pb-16">
      {/* ── Page Header ── */}
      <Reveal>
        <div className="bg-[var(--brand-navy)] px-6 py-10 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[var(--brand-gold)] text-xs font-semibold uppercase tracking-widest mb-1">
                  Admin Panel
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  Book Management
                </h1>
                <p className="text-white/60 text-sm mt-1">
                  Add, edit, and remove books from the library catalogue.
                </p>
              </div>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-gold)] text-[var(--brand-navy)] text-sm font-bold hover:bg-[var(--brand-gold)]/90 transition-colors shadow-md"
              >
                <Plus className="h-4 w-4" />
                Add New Book
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8 space-y-8">
        {/* ── Stat Cards ── */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatCard
              label="Total Titles"
              value={totalBooks}
              sub="unique books"
              accent
            />
            <StatCard
              label="Total Copies"
              value={totalCopies}
              sub="across all titles"
            />
            <StatCard
              label="Available"
              value={availableCopies}
              sub="copies on shelf"
            />
            <StatCard
              label="Fully Issued"
              value={overdueBooks}
              sub="titles with 0 copies"
            />
          </motion.div>
        </Reveal>

        {/* ── Filters ── */}
        <Reveal>
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] p-4 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, author, ISBN, or genre..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[hsl(var(--border))] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
              />
            </div>

            {/* Genre filter */}
            <div className="relative">
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-[hsl(var(--border))] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
              >
                <option value="All">All Genres</option>
                {BOOK_GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Availability filter */}
            <div className="relative">
              <select
                value={availFilter}
                onChange={(e) =>
                  setAvailFilter(
                    e.target.value as "all" | "available" | "unavailable"
                  )
                }
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-[hsl(var(--border))] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30"
              >
                <option value="all">All Availability</option>
                <option value="available">Available</option>
                <option value="unavailable">Fully Issued</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </Reveal>

        {/* ── Table ── */}
        <Reveal>
          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
            {/* Table header */}
            <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--brand-navy)] text-sm">
                {filtered.length} book{filtered.length !== 1 ? "s" : ""} found
              </h2>
              {search || genreFilter !== "All" || availFilter !== "all" ? (
                <button
                  onClick={() => {
                    setSearch("");
                    setGenreFilter("All");
                    setAvailFilter("all");
                  }}
                  className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
                >
                  <X className="h-3 w-3" /> Clear filters
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
                <span className="h-6 w-6 border-2 border-[var(--brand-navy)]/20 border-t-[var(--brand-navy)] rounded-full animate-spin" />
                Loading catalogue...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                <BookOpen className="h-10 w-10 opacity-30" />
                <p className="text-sm">No books match your filters.</p>
                <button
                  onClick={openAdd}
                  className="text-xs text-[var(--brand-navy)] font-semibold hover:underline"
                >
                  Add the first book
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#f5f5f5] text-left">
                      <th className="px-4 py-3 font-semibold text-[var(--brand-navy)] text-xs uppercase tracking-wide">
                        Book
                      </th>
                      <th className="px-4 py-3 font-semibold text-[var(--brand-navy)] text-xs uppercase tracking-wide hidden md:table-cell">
                        Genre
                      </th>
                      <th className="px-4 py-3 font-semibold text-[var(--brand-navy)] text-xs uppercase tracking-wide hidden lg:table-cell">
                        ISBN
                      </th>
                      <th className="px-4 py-3 font-semibold text-[var(--brand-navy)] text-xs uppercase tracking-wide">
                        Copies
                      </th>
                      <th className="px-4 py-3 font-semibold text-[var(--brand-navy)] text-xs uppercase tracking-wide hidden sm:table-cell">
                        Shelf
                      </th>
                      <th className="px-4 py-3 font-semibold text-[var(--brand-navy)] text-xs uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-4 py-3 font-semibold text-[var(--brand-navy)] text-xs uppercase tracking-wide text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {filtered.map((book, i) => (
                      <motion.tr
                        key={book.id}
                        variants={fadeInUp}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-[#f5f5f5]/60 transition-colors"
                      >
                        {/* Book info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-8 rounded-lg bg-[var(--brand-navy)]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {book.cover_image_url ? (
                                <img
                                  src={book.cover_image_url}
                                  alt={book.title}
                                  className="h-full w-full object-cover rounded-lg"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display =
                                      "none";
                                  }}
                                />
                              ) : (
                                <Image className="h-4 w-4 text-[var(--brand-navy)]/40" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate max-w-[180px]">
                                {book.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate max-w-[180px]">
                                {book.author}
                                {book.publication_year
                                  ? ` · ${book.publication_year}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Genre */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          {book.genre ? (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--brand-navy)]/8 text-[var(--brand-navy)] text-xs font-medium">
                              {book.genre}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        {/* ISBN */}
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs font-mono">
                          {book.isbn ?? "—"}
                        </td>

                        {/* Copies */}
                        <td className="px-4 py-3">
                          <span className="font-semibold text-[var(--brand-navy)]">
                            {book.available_copies}
                          </span>
                          <span className="text-gray-400 text-xs">
                            /{book.total_copies}
                          </span>
                        </td>

                        {/* Shelf */}
                        <td className="px-4 py-3 hidden sm:table-cell text-gray-500 text-xs font-mono">
                          {book.shelf_location ?? "—"}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {book.available_copies > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                              <Check className="h-3 w-3" /> Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
                              <AlertCircle className="h-3 w-3" /> Issued Out
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <motion.button
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => openEdit(book)}
                              className="p-1.5 rounded-lg hover:bg-[var(--brand-navy)]/10 text-[var(--brand-navy)] transition-colors"
                              title="Edit book"
                            >
                              <Edit className="h-4 w-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setDeleteBook(book)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                              title="Delete book"
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* ── Modals ── */}
      <BookFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditBook(null);
        }}
        onSave={handleSave}
        initial={
          editBook
            ? {
                title: editBook.title,
                author: editBook.author,
                isbn: editBook.isbn,
                genre: editBook.genre,
                publisher: editBook.publisher,
                publication_year: editBook.publication_year,
                total_copies: editBook.total_copies,
                available_copies: editBook.available_copies,
                shelf_location: editBook.shelf_location,
                description: editBook.description,
                cover_image_url: editBook.cover_image_url,
              }
            : null
        }
        loading={saving}
      />

      <DeleteModal
        book={deleteBook}
        onClose={() => setDeleteBook(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </main>
  );
}