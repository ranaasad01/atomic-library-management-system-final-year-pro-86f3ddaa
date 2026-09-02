export const BRAND = {
  name: "NCBA&E LMS",
  fullName: "Library Management System",
  institution: "NCBA&E",
  tagline: "Your gateway to knowledge — search, borrow, and manage books with ease.",
  copyright: "© 2025 NCBA&E Library Management System. All rights reserved.",
  contact: "library@ncbae.edu.pk",
  address: "NCBA&E, Lahore, Pakistan",
} as const;

export interface NavLink {
  label: string;
  href: string;
  key: string;
  adminOnly?: boolean;
  memberOnly?: boolean;
}

export const navLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", key: "dashboard", memberOnly: true },
  { label: "Books", href: "/books", key: "books" },
  { label: "Transactions", href: "/transactions", key: "transactions", memberOnly: true },
  { label: "Fines", href: "/fines", key: "fines", memberOnly: true },
  { label: "Admin", href: "/admin", key: "admin", adminOnly: true },
  { label: "Manage Books", href: "/admin/books", key: "adminBooks", adminOnly: true },
  { label: "Users", href: "/admin/users", key: "adminUsers", adminOnly: true },
  { label: "Admin Fines", href: "/admin/fines", key: "adminFines", adminOnly: true },
  { label: "Sign In", href: "/login", key: "login" },
];

export const publicNavLinks: NavLink[] = [
  { label: "Books", href: "/books", key: "books" },
  { label: "Sign In", href: "/login", key: "login" },
];

export const memberNavLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", key: "dashboard" },
  { label: "Books", href: "/books", key: "books" },
  { label: "Transactions", href: "/transactions", key: "transactions" },
  { label: "Fines", href: "/fines", key: "fines" },
];

export const adminNavLinks: NavLink[] = [
  { label: "Admin Dashboard", href: "/admin", key: "admin" },
  { label: "Manage Books", href: "/admin/books", key: "adminBooks" },
  { label: "Users", href: "/admin/users", key: "adminUsers" },
  { label: "Admin Fines", href: "/admin/fines", key: "adminFines" },
  { label: "Books", href: "/books", key: "books" },
];

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  genre?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  total_copies: number;
  available_copies: number;
  shelf_location?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: "admin" | "member";
  membership_number?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  book_id: string;
  member_id: string;
  issued_by: string;
  status: "issued" | "returned" | "overdue";
  issue_date: string;
  due_date: string;
  return_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Fine {
  id: string;
  transaction_id: string;
  member_id: string;
  overdue_days: number;
  fine_per_day: number;
  total_amount: number;
  is_paid: boolean;
  paid_at?: string | null;
  waived: boolean;
  waived_by?: string | null;
  created_at: string;
  updated_at: string;
}

export const FINE_RATE_PER_DAY = 5;
export const MAX_FINE_DAYS = 150;
export const MAX_BOOKS_PER_MEMBER = 3;
export const LOAN_DURATION_DAYS = 14;
export const HOLD_WINDOW_HOURS = 48;