// Auto-generated from the connected Supabase schema. Do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          role: string
          membership_number: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
      }
      books: {
        Row: {
          id: string
          title: string
          author: string
          isbn: string | null
          genre: string | null
          publisher: string | null
          publication_year: number | null
          total_copies: number
          available_copies: number
          shelf_location: string | null
          description: string | null
          cover_image_url: string | null
          created_at: string
          updated_at: string
        }
      }
      transactions: {
        Row: {
          id: string
          book_id: string
          member_id: string
          issued_by: string
          status: string
          issue_date: string
          due_date: string
          return_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
      }
      fines: {
        Row: {
          id: string
          transaction_id: string
          member_id: string
          overdue_days: number
          fine_per_day: number
          total_amount: number
          is_paid: boolean
          paid_at: string | null
          waived: boolean
          waived_by: string | null
          created_at: string
          updated_at: string
        }
      }
    }
  }
}