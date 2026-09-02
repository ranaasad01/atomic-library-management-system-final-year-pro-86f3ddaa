"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Plus, Edit2, Trash2, CheckCircle, XCircle, Shield, User, Mail, Phone, Hash, Calendar, AlertCircle, X, Save, RefreshCw, ChevronDown } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type from "@/lib/data";
type AppUser = any;
const AppUser: any = [];
type UserRole = any;
const UserRole: any = [];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  membership_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EditForm {
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  membership_number: string;
  is_active: boolean;
}

type FilterRole = "all" | "admin" | "member";
type FilterStatus = "all" | "active" | "inactive";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const ROLE_COLORS: Record<string, string> = {
  admin:
    "bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30",
  member:
    "bg-[var(--brand-navy)]/10 text-[var(--brand-navy)] border border-[var(--brand-navy)]/20",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      variants={scaleIn}
      className={cn(
        "rounded-2xl border p-5 flex items-start gap-4",
        accent
          ? "bg-[var(--brand-navy)] border-[var(--brand-navy)] text-white"
          : "bg-white border-[var(--brand-border)] text-[var(--brand-navy)]"
      )}
    >
      <div
        className={cn(
          "rounded-xl p-2.5 shrink-0",
          accent ? "bg-white/15" : "bg-[var(--brand-navy)]/8"
        )}
      >
        <Icon className={cn("h-5 w-5", accent ? "text-white" : "text-[var(--brand-navy)]")} />
      </div>
      <div className="min-w-0">
        <p className={cn("text-xs font-medium uppercase tracking-wide", accent ? "text-white/70" : "text-[var(--brand-muted)]")}>
          {label}
        </p>
        <p className={cn("text-2xl font-bold mt-0.5 leading-none", accent ? "text-white" : "text-[var(--brand-navy)]")}>
          {value}
        </p>
        {sub && (
          <p className={cn("text-xs mt-1", accent ? "text-white/60" : "text-[var(--brand-muted)]")}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600 border border-gray-200"
      )}
    >
      {role === "admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        active
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-red-50 text-red-600 border border-red-200"
      )}
    >
      {active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Edit / Add Modal ─────────────────────────────────────────────────────────

function UserModal({
  user,
  onClose,
  onSave,
  saving,
}: {
  user: ProfileRow | null;
  onClose: () => void;
  onSave: (form: EditForm) => Promise<void>;
  saving: boolean;
}) {
  const isNew = user === null;
  const [form, setForm] = useState<EditForm>({
    full_name: user?.full_name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    role: (user?.role as UserRole) ?? "member",
    membership_number: user?.membership_number ?? "",
    is_active: user?.is_active ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof EditForm>(key: K, val: EditForm[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) { setError("Full name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user.");
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[var(--brand-border)] overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--brand-border)] bg-[var(--brand-surface)]">
          <h2 className="text-base font-semibold text-[var(--brand-navy)]">
            {isNew ? "Add New Member" : "Edit Member"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-[var(--brand-navy)]/8 transition-colors"
          >
            <X className="h-4 w-4 text-[var(--brand-muted)]" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Full Name</label>
              <input
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="e.g. Ahmed Raza"
                className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-[var(--brand-navy)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 focus:border-[var(--brand-navy)] transition"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="user@ncbae.edu.pk"
                className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-[var(--brand-navy)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 focus:border-[var(--brand-navy)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+92 300 0000000"
                className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-[var(--brand-navy)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 focus:border-[var(--brand-navy)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Membership No.</label>
              <input
                value={form.membership_number}
                onChange={(e) => set("membership_number", e.target.value)}
                placeholder="LIB-2024-001"
                className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-[var(--brand-navy)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 focus:border-[var(--brand-navy)] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Role</label>
              <div className="relative">
                <select
                  value={form.role}
                  onChange={(e) => set("role", e.target.value as UserRole)}
                  className="w-full appearance-none rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 pr-8 text-sm text-[var(--brand-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 focus:border-[var(--brand-navy)] transition"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-muted)]" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <button
                type="button"
                onClick={() => set("is_active", !form.is_active)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 transition-colors duration-200",
                  form.is_active
                    ? "bg-[var(--brand-navy)] border-[var(--brand-navy)]"
                    : "bg-gray-200 border-gray-200"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 mt-px",
                    form.is_active ? "translate-x-3.5" : "translate-x-0.5"
                  )}
                />
              </button>
              <span className="text-sm text-[var(--brand-navy)] font-medium">
                {form.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--brand-muted)] hover:bg-[var(--brand-surface)] border border-[var(--brand-border)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--brand-navy)] text-white hover:bg-[var(--brand-navy)]/90 disabled:opacity-60 transition"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : isNew ? "Add Member" : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
  user,
  onClose,
  onConfirm,
  deleting,
}: {
  user: ProfileRow;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  deleting: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[var(--brand-border)] p-6"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-red-50 p-2.5">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <h2 className="text-base font-semibold text-[var(--brand-navy)]">Remove Member</h2>
        </div>
        <p className="text-sm text-[var(--brand-muted)] mb-6">
          Are you sure you want to remove{" "}
          <span className="font-semibold text-[var(--brand-navy)]">{user.full_name}</span>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--brand-muted)] hover:bg-[var(--brand-surface)] border border-[var(--brand-border)] transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition"
          >
            {deleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? "Removing…" : "Remove"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const supabase = createClient();

  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<FilterRole>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const [editTarget, setEditTarget] = useState<ProfileRow | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setFetchError(error.message);
    } else {
      setUsers((data as ProfileRow[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Toast helper ───────────────────────────────────────────────────────────

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalMembers = users.filter((u) => u.role === "member").length;
  const activeUsers = users.filter((u) => u.is_active).length;

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.membership_number ?? "").toLowerCase().includes(q);
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  // ── Save (edit or add) ─────────────────────────────────────────────────────

  async function handleSave(form: EditForm) {
    setSaving(true);
    try {
      if (editTarget === "new") {
        // Insert a new profile row (auth user creation requires server-side; here we insert profile only)
        const { error } = await supabase.from("profiles").insert([
          {
            id: crypto.randomUUID(),
            full_name: form.full_name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || null,
            role: form.role,
            membership_number: form.membership_number.trim() || null,
            is_active: form.is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
        if (error) throw new Error(error.message);
        showToast("Member added successfully.");
      } else if (editTarget) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: form.full_name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || null,
            role: form.role,
            membership_number: form.membership_number.trim() || null,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editTarget.id);
        if (error) throw new Error(error.message);
        showToast("Member updated successfully.");
      }
      setEditTarget(null);
      await fetchUsers();
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw new Error(error.message);
      showToast("Member removed.", true);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove member.", false);
    } finally {
      setDeleting(false);
    }
  }

  // ── Toggle active ──────────────────────────────────────────────────────────

  async function toggleActive(user: ProfileRow) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !user.is_active, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) {
      showToast("Failed to update status.", false);
    } else {
      showToast(`${user.full_name} marked as ${!user.is_active ? "active" : "inactive"}.`);
      await fetchUsers();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--brand-surface)] pb-16">
      {/* ── Page Header ── */}
      <Reveal>
        <div className="bg-[var(--brand-navy)] px-6 py-10 md:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]/80 mb-1">
                  Admin Panel
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  User Management
                </h1>
                <p className="mt-1 text-sm text-white/60">
                  Manage library members, roles, and account status.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setEditTarget("new")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--brand-navy)] text-sm font-semibold shadow hover:brightness-105 transition shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </motion.button>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mx-auto max-w-7xl px-4 md:px-10 mt-8 space-y-8">
        {/* ── Stat Cards ── */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatCard icon={Users} label="Total Users" value={totalUsers} accent />
            <StatCard icon={User} label="Members" value={totalMembers} sub="Library members" />
            <StatCard icon={Shield} label="Admins" value={totalAdmins} sub="Admin accounts" />
            <StatCard
              icon={CheckCircle}
              label="Active"
              value={activeUsers}
              sub={`${totalUsers - activeUsers} inactive`}
            />
          </motion.div>
        </Reveal>

        {/* ── Filters ── */}
        <Reveal>
          <div className="bg-white rounded-2xl border border-[var(--brand-border)] p-4 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or membership no…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--brand-border)] text-sm text-[var(--brand-navy)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/25 focus:border-[var(--brand-navy)] transition bg-[var(--brand-surface)]"
              />
            </div>

            {/* Role filter */}
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as FilterRole)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-[var(--brand-border)] text-sm text-[var(--brand-navy)] bg-[var(--brand-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/25 focus:border-[var(--brand-navy)] transition"
              >
                <option value="all">All Roles</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-muted)]" />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-[var(--brand-border)] text-sm text-[var(--brand-navy)] bg-[var(--brand-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/25 focus:border-[var(--brand-navy)] transition"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-muted)]" />
            </div>

            <button
              onClick={fetchUsers}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--brand-border)] text-sm text-[var(--brand-muted)] hover:bg-[var(--brand-surface)] transition"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </Reveal>

        {/* ── Table ── */}
        <Reveal>
          <div className="bg-white rounded-2xl border border-[var(--brand-border)] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
            {/* Table header */}
            <div className="px-6 py-4 border-b border-[var(--brand-border)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--brand-navy)]">
                {filtered.length} {filtered.length === 1 ? "user" : "users"} found
              </h2>
              {search || filterRole !== "all" || filterStatus !== "all" ? (
                <button
                  onClick={() => { setSearch(""); setFilterRole("all"); setFilterStatus("all"); }}
                  className="text-xs text-[var(--brand-muted)] hover:text-[var(--brand-navy)] transition flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear filters
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="h-6 w-6 text-[var(--brand-navy)]/40 animate-spin" />
                <p className="text-sm text-[var(--brand-muted)]">Loading users…</p>
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <AlertCircle className="h-6 w-6 text-red-400" />
                <p className="text-sm text-red-600">{fetchError}</p>
                <button onClick={fetchUsers} className="text-xs text-[var(--brand-navy)] underline">
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Users className="h-8 w-8 text-[var(--brand-navy)]/20" />
                <p className="text-sm text-[var(--brand-muted)]">No users match your filters.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--brand-surface)] border-b border-[var(--brand-border)]">
                        {["Member", "Email", "Membership No.", "Role", "Status", "Joined", "Actions"].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--brand-border)]">
                      <AnimatePresence initial={false}>
                        {filtered.map((u) => (
                          <motion.tr
                            key={u.id}
                            variants={fadeInUp}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, height: 0 }}
                            className="hover:bg-[var(--brand-surface)]/60 transition-colors"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-[var(--brand-navy)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                  {initials(u.full_name)}
                                </div>
                                <span className="font-medium text-[var(--brand-navy)] truncate max-w-[140px]">
                                  {u.full_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-[var(--brand-muted)] truncate max-w-[180px]">
                              <span className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                {u.email}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-[var(--brand-muted)]">
                              <span className="flex items-center gap-1.5">
                                <Hash className="h-3.5 w-3.5 shrink-0" />
                                {u.membership_number ?? "—"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <RoleBadge role={u.role} />
                            </td>
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() => toggleActive(u)}
                                title="Toggle active status"
                                className="transition hover:opacity-80"
                              >
                                <StatusBadge active={u.is_active} />
                              </button>
                            </td>
                            <td className="px-5 py-3.5 text-[var(--brand-muted)] whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                {formatDate(u.created_at)}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setEditTarget(u)}
                                  className="rounded-lg p-1.5 hover:bg-[var(--brand-navy)]/8 text-[var(--brand-navy)] transition"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setDeleteTarget(u)}
                                  className="rounded-lg p-1.5 hover:bg-red-50 text-red-500 transition"
                                  title="Remove"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-[var(--brand-border)]">
                  {filtered.map((u) => (
                    <div key={u.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[var(--brand-navy)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {initials(u.full_name)}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--brand-navy)] text-sm">{u.full_name}</p>
                            <p className="text-xs text-[var(--brand-muted)]">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setEditTarget(u)}
                            className="rounded-lg p-1.5 hover:bg-[var(--brand-navy)]/8 text-[var(--brand-navy)] transition"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="rounded-lg p-1.5 hover:bg-red-50 text-red-500 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <RoleBadge role={u.role} />
                        <button onClick={() => toggleActive(u)}>
                          <StatusBadge active={u.is_active} />
                        </button>
                        {u.membership_number && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            <Hash className="h-3 w-3" />
                            {u.membership_number}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          <Calendar className="h-3 w-3" />
                          {formatDate(u.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Reveal>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {editTarget !== null && (
          <UserModal
            key="edit-modal"
            user={editTarget === "new" ? null : editTarget}
            onClose={() => setEditTarget(null)}
            onSave={handleSave}
            saving={saving}
          />
        )}
        {deleteTarget !== null && (
          <DeleteModal
            key="delete-modal"
            user={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            deleting={deleting}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium",
              toast.ok
                ? "bg-[var(--brand-navy)] text-white"
                : "bg-red-600 text-white"
            )}
          >
            {toast.ok ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}