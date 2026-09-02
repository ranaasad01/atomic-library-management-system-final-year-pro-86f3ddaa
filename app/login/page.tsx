"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, BookOpen, AlertCircle, ArrowRight } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
type APP_FULL_NAME = any;
const APP_FULL_NAME: any = [];
type APP_INSTITUTION = any;
const APP_INSTITUTION: any = [];
type APP_TAGLINE = any;
const APP_TAGLINE: any = [];
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message ?? "Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Fetch role from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--brand-navy)] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, var(--brand-gold) 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3a6fa8 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-gold)] flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 text-[var(--brand-navy)]" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">LMS</p>
              <p className="text-white/60 text-xs">{APP_INSTITUTION}</p>
            </div>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.h1
              variants={fadeInUp}
              className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight"
            >
              {APP_FULL_NAME}
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-white/70 text-lg leading-relaxed max-w-sm">
              {APP_TAGLINE} Manage books, track issues, and stay on top of your library activity.
            </motion.p>
          </motion.div>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-4">
          {[
            { icon: "📚", label: "Browse thousands of books across all departments" },
            { icon: "🔄", label: "Track issue and return history in real time" },
            { icon: "💳", label: "View and pay fines from your dashboard" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.12, duration: 0.5, ease: "easeOut" }}
              className="flex items-start gap-3"
            >
              <span className="text-xl mt-0.5">{item.icon}</span>
              <p className="text-white/70 text-sm leading-relaxed">{item.label}</p>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="pt-6 border-t border-white/10"
          >
            <p className="text-white/40 text-xs">
              NCBA&E Library Management System. For students and faculty.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-navy)] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[var(--brand-gold)]" />
            </div>
            <div>
              <p className="font-bold text-[var(--brand-navy)] text-base leading-none">{APP_FULL_NAME}</p>
              <p className="text-[hsl(var(--muted-foreground))] text-xs">{APP_INSTITUTION}</p>
            </div>
          </div>

          <Reveal>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--brand-navy)] tracking-tight">
                Sign in to your account
              </h1>
              <p className="mt-2 text-[hsl(var(--muted-foreground))] text-sm leading-relaxed">
                Enter your registered email and password to access the library portal.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Error alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </motion.div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--brand-navy)]"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@ncbae.edu.pk"
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-10 pr-4 py-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 focus:border-[var(--brand-navy)] transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[var(--brand-navy)]"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[var(--brand-gold)] hover:underline font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-10 pr-11 py-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]/30 focus:border-[var(--brand-navy)] transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[var(--brand-navy)] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-navy)] text-white font-semibold py-3 px-6 text-sm shadow-[0_2px_8px_rgba(30,58,95,0.25)] hover:bg-[var(--brand-navy)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-navy)] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>

              {/* Divider */}
              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-[hsl(var(--border))]" />
                <span className="text-xs text-[hsl(var(--muted-foreground))]">or</span>
                <div className="flex-1 h-px bg-[hsl(var(--border))]" />
              </div>

              {/* Demo credentials */}
              <div className="rounded-xl border border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/5 p-4 space-y-3">
                <p className="text-xs font-semibold text-[var(--brand-navy)] uppercase tracking-wide">
                  Demo credentials
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@ncbae.edu.pk");
                      setPassword("admin123456");
                    }}
                    className="rounded-lg border border-[var(--brand-gold)]/40 bg-white px-3 py-2 text-left hover:border-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/10 transition-all duration-200"
                  >
                    <p className="text-xs font-semibold text-[var(--brand-navy)]">Admin</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                      admin@ncbae.edu.pk
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("member@ncbae.edu.pk");
                      setPassword("member123456");
                    }}
                    className="rounded-lg border border-[var(--brand-gold)]/40 bg-white px-3 py-2 text-left hover:border-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/10 transition-all duration-200"
                  >
                    <p className="text-xs font-semibold text-[var(--brand-navy)]">Member</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                      member@ncbae.edu.pk
                    </p>
                  </button>
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Click a card to auto-fill credentials, then sign in.
                </p>
              </div>
            </form>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="mt-8 text-center">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Need access?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[var(--brand-navy)] hover:text-[var(--brand-gold)] transition-colors"
                >
                  Request membership
                </Link>
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.22}>
            <div className="mt-10 pt-6 border-t border-[hsl(var(--border))]">
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { value: "10,000+", label: "Books" },
                  { value: "2,400+", label: "Members" },
                  { value: "99.9%", label: "Uptime" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-base font-bold text-[var(--brand-navy)]">{stat.value}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}