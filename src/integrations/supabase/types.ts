export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_days_off: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          reason: string | null
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          reason?: string | null
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          start_date?: string
        }
        Relationships: []
      }
      availability_rules: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          weekday: number | null
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          weekday?: number | null
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          weekday?: number | null
        }
        Relationships: []
      }
      blackout_dates: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          is_active: boolean
          reason: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          is_active?: boolean
          reason?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          starts_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          currency_snapshot: string | null
          duration_minutes_snapshot: number | null
          ends_at: string | null
          hidden_from_admin: boolean | null
          hidden_from_client: boolean | null
          id: string
          price_eur_snapshot: number | null
          service_id: string
          service_name_snapshot: string | null
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_snapshot?: string | null
          duration_minutes_snapshot?: number | null
          ends_at?: string | null
          hidden_from_admin?: boolean | null
          hidden_from_client?: boolean | null
          id?: string
          price_eur_snapshot?: number | null
          service_id: string
          service_name_snapshot?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_snapshot?: string | null
          duration_minutes_snapshot?: number | null
          ends_at?: string | null
          hidden_from_admin?: boolean | null
          hidden_from_client?: boolean | null
          id?: string
          price_eur_snapshot?: number | null
          service_id?: string
          service_name_snapshot?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_active_services"
            referencedColumns: ["id"]
          },
        ]
      }
      emails_log: {
        Row: {
          body: string
          id: string
          sent_at: string
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          id?: string
          sent_at?: string
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          id?: string
          sent_at?: string
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      friend_code_uses: {
        Row: {
          code: string
          id: string
          payment_request_id: string | null
          used_at: string
          used_by: string
          used_in_payment: boolean | null
        }
        Insert: {
          code: string
          id?: string
          payment_request_id?: string | null
          used_at?: string
          used_by: string
          used_in_payment?: boolean | null
        }
        Update: {
          code?: string
          id?: string
          payment_request_id?: string | null
          used_at?: string
          used_by?: string
          used_in_payment?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_code_uses_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "friend_code_uses_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          discount_percent: number
          expires_at: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          discount_percent?: number
          expires_at?: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          discount_percent?: number
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      info: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          booking_id: string
          earned_at: string
          id: string
          points_earned: number
          user_id: string
        }
        Insert: {
          booking_id: string
          earned_at?: string
          id?: string
          points_earned?: number
          user_id: string
        }
        Update: {
          booking_id?: string
          earned_at?: string
          id?: string
          points_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          id: string
          is_read: boolean
          message: string
          receiver_id: string
          sender_id: string
          thread_id: string
          timestamp: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          id?: string
          is_read?: boolean
          message: string
          receiver_id: string
          sender_id: string
          thread_id: string
          timestamp?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          id?: string
          is_read?: boolean
          message?: string
          receiver_id?: string
          sender_id?: string
          thread_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          role: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          role?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          role?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          created_at: string
          description: string | null
          duration_free_min: number
          duration_paid_min: number
          id: string
          is_active: boolean
          limit_per_month: number
          name: string
          price_eur: number
          total_duration_min: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_free_min: number
          duration_paid_min: number
          id?: string
          is_active?: boolean
          limit_per_month?: number
          name: string
          price_eur: number
          total_duration_min?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_free_min?: number
          duration_paid_min?: number
          id?: string
          is_active?: boolean
          limit_per_month?: number
          name?: string
          price_eur?: number
          total_duration_min?: number | null
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount_eur: number
          client_id: string | null
          created_at: string
          currency: string
          decided_at: string | null
          decided_by: string | null
          friend_code: string | null
          hidden_from_admin: boolean | null
          hidden_from_client: boolean | null
          id: string
          note: string | null
          payment_method: string | null
          plan_type: string | null
          points_used: number | null
          proof_url: string | null
          referral_reward_id: string | null
          reservation_id: string | null
          status: string
          subscription_id: string | null
          transfer_link: string | null
          type: string | null
          updated_at: string
          user_id: string
          voucher_id: string | null
        }
        Insert: {
          amount_eur: number
          client_id?: string | null
          created_at?: string
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          friend_code?: string | null
          hidden_from_admin?: boolean | null
          hidden_from_client?: boolean | null
          id?: string
          note?: string | null
          payment_method?: string | null
          plan_type?: string | null
          points_used?: number | null
          proof_url?: string | null
          referral_reward_id?: string | null
          reservation_id?: string | null
          status?: string
          subscription_id?: string | null
          transfer_link?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
          voucher_id?: string | null
        }
        Update: {
          amount_eur?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          decided_at?: string | null
          decided_by?: string | null
          friend_code?: string | null
          hidden_from_admin?: boolean | null
          hidden_from_client?: boolean | null
          id?: string
          note?: string | null
          payment_method?: string | null
          plan_type?: string | null
          points_used?: number | null
          proof_url?: string | null
          referral_reward_id?: string | null
          reservation_id?: string | null
          status?: string
          subscription_id?: string | null
          transfer_link?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_referral_reward_id_fkey"
            columns: ["referral_reward_id"]
            isOneToOne: false
            referencedRelation: "referral_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_eur: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          method: string | null
          payment_request_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount_eur: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          payment_request_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount_eur?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          payment_request_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_180day_offers: {
        Row: {
          claimed_at: string | null
          created_at: string
          id: string
          is_claimed: boolean
          offer_type: string
          plan_type: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_claimed?: boolean
          offer_type: string
          plan_type: string
          subscription_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          is_claimed?: boolean
          offer_type?: string
          plan_type?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_180day_offers_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_discounts: {
        Row: {
          created_at: string
          discount_pct: number
          id: string
          month_num: number
          subscription_id: string
        }
        Insert: {
          created_at?: string
          discount_pct: number
          id?: string
          month_num: number
          subscription_id: string
        }
        Update: {
          created_at?: string
          discount_pct?: number
          id?: string
          month_num?: number
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_discounts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_offers: {
        Row: {
          created_at: string
          id: string
          is_claimed: boolean
          offer_type: string
          subscription_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_claimed?: boolean
          offer_type: string
          subscription_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_claimed?: boolean
          offer_type?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_offers_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string | null
          expires_at: string | null
          friend_code_use_id: string | null
          id: string
          is_expired: boolean | null
          notes: string | null
          payment_request_id: string | null
          referral_reward_id: string | null
          transaction_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          expires_at?: string | null
          friend_code_use_id?: string | null
          id?: string
          is_expired?: boolean | null
          notes?: string | null
          payment_request_id?: string | null
          referral_reward_id?: string | null
          transaction_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          expires_at?: string | null
          friend_code_use_id?: string | null
          id?: string
          is_expired?: boolean | null
          notes?: string | null
          payment_request_id?: string | null
          referral_reward_id?: string | null
          transaction_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_friend_code_use_id_fkey"
            columns: ["friend_code_use_id"]
            isOneToOne: false
            referencedRelation: "friend_code_uses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_referral_reward_id_fkey"
            columns: ["referral_reward_id"]
            isOneToOne: false
            referencedRelation: "referral_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          last_voucher_at: string | null
          penalty_until: string | null
          phone: string | null
          points_balance: number | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          last_voucher_at?: string | null
          penalty_until?: string | null
          phone?: string | null
          points_balance?: number | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_voucher_at?: string | null
          penalty_until?: string | null
          phone?: string | null
          points_balance?: number | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string
          booking_id: string
          created_at: string
          date_day: string
          description: string | null
          end_time: string
          id: string
          start_time: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          address?: string
          booking_id: string
          created_at?: string
          date_day: string
          description?: string | null
          end_time: string
          id?: string
          start_time: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          address?: string
          booking_id?: string
          created_at?: string
          date_day?: string
          description?: string | null
          end_time?: string
          id?: string
          start_time?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          generated_at: string
          id: string
          is_active: boolean
          times_used: number | null
          user_id: string
        }
        Insert: {
          code: string
          generated_at?: string
          id?: string
          is_active?: boolean
          times_used?: number | null
          user_id: string
        }
        Update: {
          code?: string
          generated_at?: string
          id?: string
          is_active?: boolean
          times_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string | null
          created_from_friend_code_use_id: string | null
          discount_percent: number
          expires_at: string
          id: string
          is_used: boolean | null
          points_amount: number | null
          updated_at: string | null
          used_in_payment_request_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_from_friend_code_use_id?: string | null
          discount_percent?: number
          expires_at: string
          id?: string
          is_used?: boolean | null
          points_amount?: number | null
          updated_at?: string | null
          used_in_payment_request_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_from_friend_code_use_id?: string | null
          discount_percent?: number
          expires_at?: string
          id?: string
          is_used?: boolean | null
          points_amount?: number | null
          updated_at?: string | null
          used_in_payment_request_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_created_from_friend_code_use_id_fkey"
            columns: ["created_from_friend_code_use_id"]
            isOneToOne: false
            referencedRelation: "friend_code_uses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_used_in_payment_request_id_fkey"
            columns: ["used_in_payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          currency_snapshot: string | null
          duration_minutes_snapshot: number | null
          ends_at: string | null
          id: string
          offer_id: string | null
          price_eur_snapshot: number | null
          service_id: string
          service_name_snapshot: string | null
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency_snapshot?: string | null
          duration_minutes_snapshot?: number | null
          ends_at?: string | null
          id?: string
          offer_id?: string | null
          price_eur_snapshot?: number | null
          service_id: string
          service_name_snapshot?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency_snapshot?: string | null
          duration_minutes_snapshot?: number | null
          ends_at?: string | null
          id?: string
          offer_id?: string | null
          price_eur_snapshot?: number | null
          service_id?: string
          service_name_snapshot?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "v_active_services"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price: number | null
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deposit_eur: number | null
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean
          max_capacity: number
          name: string
          price_eur: number | null
          requires_deposit: boolean
          slug: string
          sort_order: number
          type: string | null
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit_eur?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_capacity?: number
          name: string
          price_eur?: number | null
          requires_deposit?: boolean
          slug: string
          sort_order?: number
          type?: string | null
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit_eur?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_capacity?: number
          name?: string
          price_eur?: number | null
          requires_deposit?: boolean
          slug?: string
          sort_order?: number
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          monthly_free_hours: number | null
          payment_status: string
          plan_type: string
          price_eur: number
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          monthly_free_hours?: number | null
          payment_status?: string
          plan_type: string
          price_eur?: number
          start_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          monthly_free_hours?: number | null
          payment_status?: string
          plan_type?: string
          price_eur?: number
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      temporary_time_blocks: {
        Row: {
          blocked_end_time: string
          blocked_start_time: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          reason: string | null
          start_date: string
        }
        Insert: {
          blocked_end_time: string
          blocked_start_time: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          reason?: string | null
          start_date: string
        }
        Update: {
          blocked_end_time?: string
          blocked_start_time?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          start_date?: string
        }
        Relationships: []
      }
      unavailable_slots: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          reason: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          reason?: string
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          reason?: string
          starts_at?: string
        }
        Relationships: []
      }
      user_offers: {
        Row: {
          created_at: string
          id: string
          month_year: string
          offer_id: string
          used_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_year: string
          offer_id: string
          used_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_year?: string
          offer_id?: string
          used_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          amount_eur: number
          client_id: string
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_used: boolean
        }
        Insert: {
          amount_eur: number
          client_id: string
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
        }
        Update: {
          amount_eur?: number
          client_id?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      v_active_services: {
        Row: {
          currency: string | null
          description: string | null
          duration_minutes: number | null
          id: string | null
          image_url: string | null
          name: string | null
          price_eur: number | null
          sort_order: number | null
        }
        Insert: {
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          price_eur?: number | null
          sort_order?: number | null
        }
        Update: {
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          price_eur?: number | null
          sort_order?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      abandon_offer: { Args: { p_reservation_id: string }; Returns: boolean }
      admin_approve_payment: { Args: { p_payment_id: string }; Returns: string }
      admin_create_time_block: {
        Args: {
          p_blocked_end_time: string
          p_blocked_start_time: string
          p_end_date: string
          p_reason?: string
          p_start_date: string
        }
        Returns: string
      }
      admin_delete_test_user: { Args: { p_user_id: string }; Returns: boolean }
      admin_delete_time_block: { Args: { p_id: string }; Returns: undefined }
      admin_hide_project: {
        Args: { p_project_id: string; p_project_type: string }
        Returns: boolean
      }
      admin_mark_day_off: {
        Args: { p_end_date: string; p_reason?: string; p_start_date: string }
        Returns: string
      }
      admin_receive_payment: {
        Args: { p_payment_id: string }
        Returns: boolean
      }
      admin_reject_payment: {
        Args: { p_payment_id: string; p_reason?: string }
        Returns: boolean
      }
      admin_renew_subscription: {
        Args: { p_action: string; p_subscription_id: string }
        Returns: boolean
      }
      admin_revert_day_off: { Args: { p_id: string }; Returns: boolean }
      apply_friend_code_with_points: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      apply_offer: {
        Args: { p_offer_id: string; p_starts_at?: string; p_user_id: string }
        Returns: string
      }
      award_points: {
        Args: {
          p_amount: number
          p_expires_at?: string
          p_friend_code_use_id?: string
          p_referral_reward_id?: string
          p_transaction_type: string
          p_user_id: string
        }
        Returns: string
      }
      backfill_referral_codes: { Args: never; Returns: undefined }
      backfill_welcome_messages: { Args: never; Returns: undefined }
      bytea_to_text: { Args: { data: string }; Returns: string }
      captacao_mixmaster_options: {
        Args: never
        Returns: {
          currency: string
          duration_minutes: number
          hours: number
          price_eur: number
          service_id: string
          service_name: string
        }[]
      }
      captacao_mixmaster_service_by_hours: {
        Args: { p_hours: number }
        Returns: string
      }
      captacao_options: {
        Args: never
        Returns: {
          currency: string
          duration_minutes: number
          hours: number
          price_eur: number
          service_id: string
          service_name: string
        }[]
      }
      captacao_service_by_hours: { Args: { p_hours: number }; Returns: string }
      check_180day_offer_eligibility: {
        Args: { p_offer_type: string; p_user_id: string }
        Returns: Json
      }
      check_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      claim_180day_offer: {
        Args: { p_offer_type: string; p_user_id: string }
        Returns: string
      }
      claim_plan_offer: {
        Args: { p_offer_type: string; p_user_id: string }
        Returns: boolean
      }
      claim_voucher: { Args: { p_user_id: string }; Returns: string }
      client_delete_project: {
        Args: { p_booking_id: string }
        Returns: boolean
      }
      create_booking_captacao: {
        Args: { p_hours: number; p_starts_at: string; p_user_id: string }
        Returns: string
      }
      create_reservation_mixmaster:
        | {
            Args: { p_hours: number; p_starts_at: string; p_user_id: string }
            Returns: string
          }
        | { Args: { p_starts_at: string; p_user_id: string }; Returns: string }
      create_subscription_payment_request:
        | {
            Args: {
              p_amount_eur: number
              p_plan_type: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount_eur: number
              p_friend_code?: string
              p_plan_type: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount_eur: number
              p_friend_code?: string
              p_payment_method?: string
              p_plan_type: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount_eur: number
              p_friend_code?: string
              p_payment_method?: string
              p_plan_type: string
              p_points_used?: number
              p_user_id: string
            }
            Returns: string
          }
      delete_mixmaster_project: {
        Args: { p_payment_id: string }
        Returns: boolean
      }
      delete_own_account: { Args: never; Returns: Json }
      generate_referral_code: { Args: { p_user_id: string }; Returns: string }
      get_active_bookings_count: { Args: never; Returns: number }
      get_active_reservations: {
        Args: never
        Returns: {
          booking_id: string
          client_name: string
          end_time: string
          service_name: string
          start_time: string
        }[]
      }
      get_active_users_count: { Args: never; Returns: number }
      get_admin_subscriptions: {
        Args: never
        Returns: {
          client_email: string
          client_name: string
          end_date: string
          id: string
          is_active: boolean
          payment_status: string
          plan_type: string
        }[]
      }
      get_available_points: { Args: { p_user_id: string }; Returns: number }
      get_booking_min_datetime: { Args: never; Returns: string }
      get_client_mixmaster_projects: {
        Args: { p_user_id: string }
        Returns: {
          amount_eur: number
          created_at: string
          ends_at: string
          id: string
          is_booking: boolean
          note: string
          service_name: string
          starts_at: string
          status: string
          transfer_link: string
        }[]
      }
      get_loyalty_points: { Args: { p_user_id: string }; Returns: number }
      get_mixmaster_projects: {
        Args: never
        Returns: {
          amount_eur: number
          client_id: string
          client_name: string
          created_at: string
          id: string
          note: string
          service_name: string
          status: string
          transfer_link: string
        }[]
      }
      get_monthly_revenue: { Args: never; Returns: number }
      get_subscription_renewal_date: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_unavailable_days: {
        Args: { p_month: number; p_year: number }
        Returns: {
          day: number
        }[]
      }
      get_unavailable_times: {
        Args: { p_date: string }
        Returns: {
          ends_at: string
          reason: string
          starts_at: string
        }[]
      }
      get_unread_count: { Args: { p_user_id: string }; Returns: number }
      get_user_role: { Args: { p_user_id: string }; Returns: string }
      get_voucher_status: { Args: { p_user_id: string }; Returns: Json }
      has_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      insert_booking_buffer: {
        Args: { p_ends_at: string; p_starts_at: string }
        Returns: undefined
      }
      is_admin:
        | { Args: { uid: string }; Returns: boolean }
        | { Args: never; Returns: boolean }
      list_active_services: {
        Args: never
        Returns: {
          base_price: number | null
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deposit_eur: number | null
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean
          max_capacity: number
          name: string
          price_eur: number | null
          requires_deposit: boolean
          slug: string
          sort_order: number
          type: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "services"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_admin_payment_requests: {
        Args: { p_status?: string }
        Returns: {
          amount_eur: number
          client_email: string
          client_id: string
          client_name: string
          created_at: string
          currency: string
          note: string
          payment_id: string
          proof_url: string
          reservation_id: string
          service_id: string
          service_name: string
          starts_at: string
          status: string
        }[]
      }
      mark_notifications_as_read: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      redeem_loyalty_offer: { Args: { p_user_id: string }; Returns: boolean }
      request_payment:
        | {
            Args: {
              p_amount_eur: number
              p_currency?: string
              p_note?: string
              p_proof_url?: string
              p_reservation_id: string
              p_voucher_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount_eur: number
              p_currency?: string
              p_friend_code?: string
              p_note?: string
              p_proof_url?: string
              p_reservation_id: string
              p_voucher_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount_eur: number
              p_currency?: string
              p_friend_code?: string
              p_note?: string
              p_payment_method?: string
              p_proof_url?: string
              p_reservation_id: string
              p_voucher_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount_eur: number
              p_currency?: string
              p_friend_code?: string
              p_note?: string
              p_payment_method?: string
              p_points_used?: number
              p_proof_url?: string
              p_reservation_id: string
              p_voucher_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount_eur: number
              p_currency?: string
              p_note?: string
              p_proof_url?: string
              p_reservation_id: string
            }
            Returns: string
          }
      send_renewal_alerts: { Args: never; Returns: undefined }
      slugify: { Args: { txt: string }; Returns: string }
      subscribe_payment_request: {
        Args: { p_amount_eur: number; p_plan_type: string; p_user_id: string }
        Returns: string
      }
      subscribe_plan: {
        Args: { p_plan_type: string; p_user_id: string }
        Returns: string
      }
      subscribe_request: {
        Args: { p_amount_eur: number; p_plan_type: string; p_user_id: string }
        Returns: string
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      use_points: {
        Args: {
          p_amount: number
          p_payment_request_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      validate_referral_on_signup: {
        Args: { p_code: string; p_friend_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
