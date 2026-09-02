"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BookOpen, Mail, MapPin, Phone } from 'lucide-react';
import { BRAND } from "@/lib/data";
import { fadeInUp } from "@/lib/motion";

const footerLinks = [
  { label: "Dashboard", href: "/dashboard", key: "dashboard" },
  { label: "Books", href: "/books", key: "books" },
  { label: "Transactions", href: "/transactions", key: "transactions" },
  { label: "Fines", href: "/fines", key: "fines" },
  { label: "Sign In", href: "/login", key: "login" },
];

const adminLinks = [
  { label: "Admin Dashboard", href: "/admin", key: "admin" },
  { label: "Manage Books", href: "/admin/books", key: "adminBooks" },
  { label: "Users", href: "/admin/users", key: "adminUsers" },
  { label: "Admin Fines", href: "/admin/fines", key: "adminFines" },
];

export default function Footer() {
  const pathname = usePathname();
  const t = useTranslations();
  const navT = (t.raw("nav") as Record<string, string>) ?? {};

  const renderLink = (link: { label: string; href: string; key: string }) => {
    const label = navT[link.key] ?? link.label;
    const isAnchor = link.href.startsWith("#");

    if (isAnchor) {
      return (
        <Link
          key={link.key}
          href={pathname === "/" ? link.href : "/" + link.href}
          className="text-white/60 hover:text-[var(--accent)] text-sm transition-colors duration-200"
          onClick={(e) => {
            if (pathname === "/") {
              e.preventDefault();
              document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" });
            }
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
        className="text-white/60 hover:text-[var(--accent)] text-sm transition-colors duration-200"
      >
        {label}
      </Link>
    );
  };

  return (
    <footer className="bg-[var(--primary)] border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-[6px] bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
              </div>
              <div>
                <span className="text-white font-semibold text-sm block font-poppins">
                  {BRAND.institution}
                </span>
                <span className="text-white/50 text-xs block">{BRAND.fullName}</span>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              {BRAND.tagline}
            </p>
          </div>

          {/* Member links */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
              Member Portal
            </h3>
            <nav className="flex flex-col gap-2.5" aria-label="Member navigation">
              {footerLinks.map(renderLink)}
            </nav>
          </div>

          {/* Admin links */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
              Admin Panel
            </h3>
            <nav className="flex flex-col gap-2.5" aria-label="Admin navigation">
              {adminLinks.map(renderLink)}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
              Contact
            </h3>
            <div className="flex flex-col gap-3">
              <a
                href={`mailto:${BRAND.contact}`}
                className="flex items-center gap-2 text-white/60 hover:text-[var(--accent)] text-sm transition-colors duration-200"
              >
                <Mail className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {BRAND.contact}
              </a>
              <div className="flex items-start gap-2 text-white/60 text-sm">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                {BRAND.address}
              </div>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Phone className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                Library Desk: Ext. 201
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/40 text-xs">{BRAND.copyright}</p>
          <p className="text-white/30 text-xs">
            FYP Project — NCBA&E Computer Science Department
          </p>
        </div>
      </div>
    </footer>
  );
}