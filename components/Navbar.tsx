"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Menu, X, BookOpen, User, LogOut, ChevronDown } from 'lucide-react';
import { memberNavLinks, adminNavLinks, publicNavLinks, BRAND, type NavLink } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const navT = (t.raw("nav") as Record<string, string>) ?? {};

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "member" | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();
        if (profile) {
          setUserName(profile.full_name);
          setUserRole(profile.role as "admin" | "member");
        }
      }
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUserRole(null);
        setUserName(null);
      } else {
        loadUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  const getNavLinks = (): NavLink[] => {
    if (!mounted || !userRole) return publicNavLinks;
    if (userRole === "admin") return adminNavLinks;
    return memberNavLinks;
  };

  const links = getNavLinks();

  const renderLink = (link: NavLink, mobile = false) => {
    const label = navT[link.key] ?? link.label;
    const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
    const isAnchor = link.href.startsWith("#");

    const baseClass = mobile
      ? `block px-4 py-3 rounded-[6px] text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-[var(--accent)] text-[var(--primary)]"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        }`
      : `px-3 py-1.5 rounded-[6px] text-sm font-medium transition-all duration-200 ${
          isActive
            ? "bg-[var(--accent)] text-[var(--primary)]"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        }`;

    if (isAnchor) {
      return (
        <Link
          key={link.key}
          href={pathname === "/" ? link.href : "/" + link.href}
          className={baseClass}
          onClick={(e) => {
            if (pathname === "/") {
              e.preventDefault();
              document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" });
            }
            if (mobile) setMobileOpen(false);
          }}
        >
          {label}
        </Link>
      );
    }

    return (
      <Link
        key={link.key}
        href={link.href}
        className={baseClass}
        onClick={() => { if (mobile) setMobileOpen(false); }}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav
      className="sticky top-0 z-50 bg-[var(--primary)] border-b border-white/10"
      style={{ boxShadow: "0 2px 8px 0 rgba(30,58,95,0.18)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={userRole === "admin" ? "/admin" : userRole === "member" ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4.5 h-4.5 text-[var(--primary)]" aria-hidden="true" />
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-semibold text-sm leading-tight block font-poppins">
                {BRAND.institution}
              </span>
              <span className="text-white/60 text-xs leading-tight block">
                {BRAND.fullName}
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => renderLink(link))}
          </div>

          {/* User menu / auth */}
          <div className="hidden md:flex items-center gap-3">
            {mounted && userName ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 text-sm font-medium"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-[var(--primary)]" aria-hidden="true" />
                  </div>
                  <span className="max-w-[120px] truncate">{userName}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/70 capitalize">
                    {userRole}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-[6px] shadow-[var(--shadow-elevated)] py-1 z-50"
                    >
                      <div className="px-3 py-2 border-b border-[var(--border)]">
                        <p className="text-xs font-medium text-[var(--foreground)] truncate">{userName}</p>
                        <p className="text-xs text-[var(--muted-foreground)] capitalize">{userRole}</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--destructive)] hover:bg-red-50 transition-colors duration-150"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              mounted && (
                <Link
                  href="/login"
                  className="px-4 py-1.5 rounded-[6px] bg-[var(--accent)] text-[var(--primary)] text-sm font-semibold hover:bg-[var(--accent-hover)] transition-all duration-200"
                >
                  Sign In
                </Link>
              )
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-[6px] text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden overflow-hidden border-t border-white/10"
          >
            <div className="px-4 py-3 space-y-1 bg-[var(--primary)]">
              {links.map((link) => renderLink(link, true))}

              {mounted && userName ? (
                <div className="pt-2 border-t border-white/10 mt-2">
                  <div className="px-4 py-2 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center">
                      <User className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{userName}</p>
                      <p className="text-white/60 text-xs capitalize">{userRole}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-[6px] text-sm font-medium text-red-300 hover:bg-white/10 transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    Sign Out
                  </button>
                </div>
              ) : (
                mounted && (
                  <Link
                    href="/login"
                    className="block px-4 py-3 rounded-[6px] text-sm font-semibold bg-[var(--accent)] text-[var(--primary)] text-center mt-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}