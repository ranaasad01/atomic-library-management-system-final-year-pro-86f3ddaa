"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, Plus, Edit, Trash2, Check, X, AlertCircle, User, Mail, Phone, Shield, ShieldCheck, Eye, EyeOff, ChevronDown, RefreshCw } from 'lucide-react';
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

interface UserFormData {
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  membership_number: string;
  is_active: boolean;
}

type FilterRole = "all" | "admin" | "member";
type FilterStatus = "all" | "active" | "inactive";
type ModalMode = "add" | "edit" | "view" | null;

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: UserFormData = {
  full_name: "",
  email: "",
  phone: "",
  role: "member",
  membership_number: "",
  is_active: true,
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={cn(
        "rounded-2xl border p-5 flex items-center gap-4",
        accent
          ? "bg-[var(--brand-navy)] border-[var(--brand-navy)] text-white"
          : "bg-white border-[var(--brand-border)] text-[var(--brand-navy)]"
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl shrink-0",
          accent ? "bg-white/15" : "bg-[var(--brand-navy)]/8"
        )}
      >
        <Icon className={cn("h-5 w-5", accent ? "text-white" : "text-[var(--brand-navy)]")} />
      </div>
      <div>
        <p className={cn("text-2xl font-bold leading-none", accent ? "text-white" : "text-[var(--brand-navy)]")}>
          {value}
        </p>
        <p className={cn("mt-1 text-xs font-medium", accent ? "text-white/70" : "text-[var(--brand-muted)]")}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        role === "admin"
          ? "bg-[var(--brand-gold)]/15 text-[var(--brand-gold-dark)]"
          : "bg-[var(--brand-navy)]/8 text-[var(--brand-navy)]"
      )}
    >
      {role === "admin" ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {role === "admin" ? "Admin" : "Member"}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-600"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-red-400")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── User Modal ───────────────────────────────────────────────────────────────

function UserModal({
  mode,
  user,
  onClose,
  onSave,
  saving,
}: {
  mode: ModalMode;
  user: ProfileRow | null;
  onClose: () => void;
  onSave: (data: UserFormData) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  useEffect(() => {
    if (mode === "edit" && user) {
      setForm({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone ?? "",
        role: (user.role as UserRole) ?? "member",
        membership_number: user.membership_number ?? "",
        is_active: user.is_active,
      });
    } else if (mode === "add") {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [mode, user]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof UserFormData, string>> = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    await onSave(form);
  };

  const isView = mode === "view";

  return (
    <AnimatePresence>
      {mode && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-[var(--brand-border)]"
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-6 py-4">
                <h2 className="text-lg font-bold text-[var(--brand-navy)]">
                  {mode === "add" ? "Add New User" : mode === "edit" ? "Edit User" : "User Details"}
                </h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-[var(--brand-muted)] hover:bg-[var(--brand-surface)] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-navy)] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                    disabled={isView}
                    placeholder="e.g. Ali Hassan"
                    className={cn(
                      "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all",
                      "border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-navy)]",
                      "focus:border-[var(--brand-navy)] focus:ring-2 focus:ring-[var(--brand-navy)]/10",
                      isView && "opacity-70 cursor-not-allowed",
                      errors.full_name && "border-red-400"
                    )}
                  />
                  {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-[var(--brand-navy)] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    disabled={isView || mode === "edit"}
                    placeholder="user@ncbae.edu.pk"
                    className={cn(
                      "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all",
                      "border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-navy)]",
                      "focus:border-[var(--brand-navy)] focus:ring-2 focus:ring-[var(--brand-navy)]/10",
                      (isView || mode === "edit") && "opacity-70 cursor-not-allowed",
                      errors.email && "border-red-400"
                    )}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>

                {/* Phone + Membership */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-navy)] mb-1">Phone</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      disabled={isView}
                      placeholder="+92 300 0000000"
                      className={cn(
                        "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all",
                        "border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-navy)]",
                        "focus:border-[var(--brand-navy)] focus:ring-2 focus:ring-[var(--brand-navy)]/10",
                        isView && "opacity-70 cursor-not-allowed"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-navy)] mb-1">Membership No.</label>
                    <input
                      type="text"
                      value={form.membership_number}
                      onChange={(e) => setForm((p) => ({ ...p, membership_number: e.target.value }))}
                      disabled={isView}
                      placeholder="LIB-2024-001"
                      className={cn(
                        "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all",
                        "border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-navy)]",
                        "focus:border-[var(--brand-navy)] focus:ring-2 focus:ring-[var(--brand-navy)]/10",
                        isView && "opacity-70 cursor-not-allowed"
                      )}
                    />
                  </div>
                </div>

                {/* Role + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-navy)] mb-1">Role</label>
                    <div className="relative">
                      <select
                        value={form.role}
                        onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                        disabled={isView}
                        className={cn(
                          "w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all pr-8",
                          "border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-navy)]",
                          "focus:border-[var(--brand-navy)] focus:ring-2 focus:ring-[var(--brand-navy)]/10",
                          isView && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-muted)]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--brand-navy)] mb-1">Status</label>
                    <div className="relative">
                      <select
                        value={form.is_active ? "active" : "inactive"}
                        onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === "active" }))}
                        disabled={isView}
                        className={cn(
                          "w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all pr-8",
                          "border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-navy)]",
                          "focus:border-[var(--brand-navy)] focus:ring-2 focus:ring-[var(--brand-navy)]/10",
                          isView && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-muted)]" />
                    </div>
                  </div>
                </div>

                {/* View-mode extra info */}
                {isView && user && (
                  <div className="rounded-xl bg-[var(--brand-surface)] border border-[var(--brand-border)] p-4 space-y-2">
                    <p className="text-xs text-[var(--brand-muted)]">
                      <span className="font-semibold text-[var(--brand-navy)]">User ID:</span> {user.id}
                    </p>
                    <p className="text-xs text-[var(--brand-muted)]">
                      <span className="font-semibold text-[var(--brand-navy)]">Joined:</span>{" "}
                      {new Date(user.created_at).toLocaleDateString("en-PK", { dateStyle: "medium" })}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {!isView && (
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-[var(--brand-navy)] hover:bg-[var(--brand-surface)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-[var(--brand-navy)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-navy-light)] transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                      {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                      {mode === "add" ? "Create User" : "Save Changes"}
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
  user,
  onClose,
  onConfirm,
  deleting,
}: {
  user: ProfileRow | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  deleting: boolean;
}) {
  return (
    <AnimatePresence>
      {user && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-[var(--brand-border)] p-6"
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-4">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-[var(--brand-navy)]">Delete User</h3>
              <p className="mt-2 text-sm text-[var(--brand-muted)]">
                Are you sure you want to remove{" "}
                <span className="font-semibold text-[var(--brand-navy)]">{user.full_name}</span>? This action cannot be
                undone.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-[var(--brand-border)] py-2 text-sm font-medium text-[var(--brand-navy)] hover:bg-[var(--brand-surface)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {deleting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      className={cn(
        "fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium",
        type === "success" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"
      )}
    >
      {type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {message}
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const supabase = createClient();

  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<FilterRole>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProfileRow | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setToast({ message: "Failed to load users.", type: "error" });
    } else {
      setUsers((data as ProfileRow[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalMembers = users.filter((u) => u.role === "member").length;
  const activeUsers = users.filter((u) => u.is_active).length;

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.membership_number ?? "").toLowerCase().includes(q);
    const matchesRole = filterRole === "all" || u.role === filterRole;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && u.is_active) ||
      (filterStatus === "inactive" && !u.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // ── Save (add / edit) ──────────────────────────────────────────────────────

  const handleSave = async (formData: UserFormData) => {
    setSaving(true);
    try {
      if (modalMode === "edit" && selectedUser) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            phone: formData.phone || null,
            role: formData.role,
            membership_number: formData.membership_number || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedUser.id);

        if (error) throw error;
        setToast({ message: "User updated successfully.", type: "success" });
      } else if (modalMode === "add") {
        // For add, we insert a profile row (assumes auth user already exists or admin flow)
        const { error } = await supabase.from("profiles").insert({
          id: crypto.randomUUID(),
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          role: formData.role,
          membership_number: formData.membership_number || null,
          is_active: formData.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        setToast({ message: "User created successfully.", type: "success" });
      }

      setModalMode(null);
      setSelectedUser(null);
      await fetchUsers();
    } catch {
      setToast({ message: "Operation failed. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setToast({ message: "User removed successfully.", type: "success" });
      setDeleteTarget(null);
      await fetchUsers();
    } catch {
      setToast({ message: "Failed to delete user.", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────

  const toggleActive = async (user: ProfileRow) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !user.is_active, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      setToast({ message: "Failed to update status.", type: "error" });
    } else {
      setToast({
        message: `${user.full_name} marked as ${!user.is_active ? "active" : "inactive"}.`,
        type: "success",
      });
      await fetchUsers();
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] pb-16">
      {/* Page Header */}
      <Reveal>
        <div className="bg-[var(--brand-navy)] px-4 py-10 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-5 w-5 text-[var(--brand-gold)]" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-gold)]">
                    Administration
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">User Management</h1>
                <p className="mt-1 text-sm text-white/60">
                  Manage library members and administrators across NCBA&amp;E.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setModalMode("add");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--brand-navy)] hover:bg-[var(--brand-gold-light)] transition-colors shadow-md"
              >
                <Plus className="h-4 w-4" />
                Add User
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mx-auto max-w-7xl px-4 sm:px-8 mt-8 space-y-8">
        {/* Stats */}
        <Reveal>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            <StatCard label="Total Users" value={totalUsers} icon={Users} accent />
            <StatCard label="Admins" value={totalAdmins} icon={ShieldCheck} />
            <StatCard label="Members" value={totalMembers} icon={User} />
            <StatCard label="Active" value={activeUsers} icon={Check} />
          </motion.div>
        </Reveal>

        {/* Filters */}
        <Reveal>
          <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or membership no."
                className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] pl-9 pr-4 py-2.5 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-navy)] focus:ring-2 focus:ring-[var(--brand-navy)]/10 transition-all"
              />
            </div>

            {/* Role filter */}
            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as FilterRole)}
                className="appearance-none rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] pl-3.5 pr-8 py-2.5 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-navy)] transition-all"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-muted)]" />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="appearance-none rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] pl-3.5 pr-8 py-2.5 text-sm text-[var(--brand-navy)] outline-none focus:border-[var(--brand-navy)] transition-all"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-muted)]" />
            </div>

            {/* Refresh */}
            <button
              onClick={fetchUsers}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-border)] px-3.5 py-2.5 text-sm font-medium text-[var(--brand-navy)] hover:bg-[var(--brand-surface)] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </Reveal>

        {/* Table */}
        <Reveal>
          <div className="rounded-2xl border border-[var(--brand-border)] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
            {/* Table header */}
            <div className="border-b border-[var(--brand-border)] px-6 py-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--brand-navy)]">
                {loading ? "Loading..." : `${filtered.length} user${filtered.length !== 1 ? "s" : ""} found`}
              </p>
              {searchQuery || filterRole !== "all" || filterStatus !== "all" ? (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterRole("all");
                    setFilterStatus("all");
                  }}
                  className="text-xs text-[var(--brand-muted)] hover:text-[var(--brand-navy)] transition-colors"
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="h-7 w-7 text-[var(--brand-navy)] animate-spin" />
                <p className="text-sm text-[var(--brand-muted)]">Loading users...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Users className="h-10 w-10 text-[var(--brand-border)]" />
                <p className="text-sm font-medium text-[var(--brand-navy)]">No users found</p>
                <p className="text-xs text-[var(--brand-muted)]">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)] hidden md:table-cell">
                        Membership No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)] hidden lg:table-cell">
                        Joined
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--brand-border)]">
                    <AnimatePresence>
                      {filtered.map((user, i) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.25 }}
                          className="hover:bg-[var(--brand-surface)] transition-colors"
                        >
                          {/* User info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-navy)]/10 text-[var(--brand-navy)] font-bold text-sm">
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-[var(--brand-navy)] leading-tight">
                                  {user.full_name}
                                </p>
                                <p className="text-xs text-[var(--brand-muted)] flex items-center gap-1 mt-0.5">
                                  <Mail className="h-3 w-3" />
                                  {user.email}
                                </p>
                                {user.phone && (
                                  <p className="text-xs text-[var(--brand-muted)] flex items-center gap-1 mt-0.5">
                                    <Phone className="h-3 w-3" />
                                    {user.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Membership */}
                          <td className="px-4 py-4 hidden md:table-cell">
                            <span className="text-xs font-mono text-[var(--brand-muted)]">
                              {user.membership_number ?? "—"}
                            </span>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-4">
                            <RoleBadge role={user.role} />
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <StatusBadge active={user.is_active} />
                          </td>

                          {/* Joined */}
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <span className="text-xs text-[var(--brand-muted)]">
                              {new Date(user.created_at).toLocaleDateString("en-PK", { dateStyle: "medium" })}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {/* View */}
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setSelectedUser(user);
                                  setModalMode("view");
                                }}
                                title="View details"
                                className="rounded-lg p-1.5 text-[var(--brand-muted)] hover:bg-[var(--brand-navy)]/8 hover:text-[var(--brand-navy)] transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </motion.button>

                              {/* Edit */}
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setSelectedUser(user);
                                  setModalMode("edit");
                                }}
                                title="Edit user"
                                className="rounded-lg p-1.5 text-[var(--brand-muted)] hover:bg-[var(--brand-navy)]/8 hover:text-[var(--brand-navy)] transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </motion.button>

                              {/* Toggle active */}
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => toggleActive(user)}
                                title={user.is_active ? "Deactivate" : "Activate"}
                                className={cn(
                                  "rounded-lg p-1.5 transition-colors",
                                  user.is_active
                                    ? "text-[var(--brand-muted)] hover:bg-amber-50 hover:text-amber-600"
                                    : "text-[var(--brand-muted)] hover:bg-emerald-50 hover:text-emerald-600"
                                )}
                              >
                                {user.is_active ? <EyeOff className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                              </motion.button>

                              {/* Delete */}
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDeleteTarget(user)}
                                title="Delete user"
                                className="rounded-lg p-1.5 text-[var(--brand-muted)] hover:bg-red-50 hover:text-red-500 transition-colors"
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
            )}

            {/* Footer count */}
            {!loading && filtered.length > 0 && (
              <div className="border-t border-[var(--brand-border)] px-6 py-3 bg-[var(--brand-surface)]">
                <p className="text-xs text-[var(--brand-muted)]">
                  Showing {filtered.length} of {totalUsers} users
                </p>
              </div>
            )}
          </div>
        </Reveal>

        {/* Role legend */}
        <Reveal>
          <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-5">
            <h3 className="text-sm font-semibold text-[var(--brand-navy)] mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--brand-gold)]" />
              Role Permissions
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--brand-surface)] border border-[var(--brand-border)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-[var(--brand-gold-dark)]" />
                  <span className="text-sm font-semibold text-[var(--brand-navy)]">Admin</span>
                </div>
                <ul className="space-y-1">
                  {[
                    "Full access to all modules",
                    "Manage users, books, and fines",
                    "Issue and return books",
                    "View all transactions and reports",
                    "Waive or mark fines as paid",
                  ].map((perm) => (
                    <li key={perm} className="flex items-center gap-2 text-xs text-[var(--brand-muted)]">
                      <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-[var(--brand-surface)] border border-[var(--brand-border)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-[var(--brand-navy)]" />
                  <span className="text-sm font-semibold text-[var(--brand-navy)]">Member</span>
                </div>
                <ul className="space-y-1">
                  {[
                    "Browse and search the book catalogue",
                    "View personal transaction history",
                    "Check own fine status",
                    "View book availability",
                    "Update personal profile",
                  ].map((perm) => (
                    <li key={perm} className="flex items-center gap-2 text-xs text-[var(--brand-muted)]">
                      <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Modals */}
      <UserModal
        mode={modalMode}
        user={selectedUser}
        onClose={() => {
          setModalMode(null);
          setSelectedUser(null);
        }}
        onSave={handleSave}
        saving={saving}
      />

      <DeleteModal
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}