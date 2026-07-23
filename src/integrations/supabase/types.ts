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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          code: string
          color: string | null
          created_at: string
          criteria: Json | null
          description: string | null
          icon: string | null
          id: string
          title: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          title: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      establishments: {
        Row: {
          city: string | null
          created_at: string
          id: string
          logo_url: string | null
          max_employees: number
          mp_preapproval_id: string | null
          mp_subscription_id: string | null
          name: string
          owner_id: string | null
          plan: string
          subscription_expires_at: string | null
          subscription_status: string
          type: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          max_employees?: number
          mp_preapproval_id?: string | null
          mp_subscription_id?: string | null
          name: string
          owner_id?: string | null
          plan?: string
          subscription_expires_at?: string | null
          subscription_status?: string
          type?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          max_employees?: number
          mp_preapproval_id?: string | null
          mp_subscription_id?: string | null
          name?: string
          owner_id?: string | null
          plan?: string
          subscription_expires_at?: string | null
          subscription_status?: string
          type?: string | null
        }
        Relationships: []
      }
      invitation_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          establishment_id: string
          expires_at: string | null
          id: string
          max_uses: number
          position_hint: string | null
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          establishment_id: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          position_hint?: string | null
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          establishment_id?: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          position_hint?: string | null
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invitation_codes_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          coin_reward: number | null
          content: string | null
          created_at: string
          estimated_minutes: number | null
          id: string
          module_id: string
          order_index: number | null
          quiz_data: Json | null
          title: string
          type: Database["public"]["Enums"]["lesson_type"]
          xp_reward: number | null
        }
        Insert: {
          coin_reward?: number | null
          content?: string | null
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          module_id: string
          order_index?: number | null
          quiz_data?: Json | null
          title: string
          type?: Database["public"]["Enums"]["lesson_type"]
          xp_reward?: number | null
        }
        Update: {
          coin_reward?: number | null
          content?: string | null
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          module_id?: string
          order_index?: number | null
          quiz_data?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["lesson_type"]
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      margincoins_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reason: Database["public"]["Enums"]["coin_reason"]
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reason: Database["public"]["Enums"]["coin_reason"]
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["coin_reason"]
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          establishment_id: string | null
          event_type: string
          external_id: string | null
          id: string
          payload: Json
          provider: string
        }
        Insert: {
          created_at?: string
          establishment_id?: string | null
          event_type: string
          external_id?: string | null
          id?: string
          payload: Json
          provider?: string
        }
        Update: {
          created_at?: string
          establishment_id?: string | null
          event_type?: string
          external_id?: string | null
          id?: string
          payload?: Json
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          establishment_id: string | null
          full_name: string | null
          id: string
          last_activity_date: string | null
          level: number
          margincoins: number
          position: string | null
          streak_days: number
          total_xp: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          establishment_id?: string | null
          full_name?: string | null
          id: string
          last_activity_date?: string | null
          level?: number
          margincoins?: number
          position?: string | null
          streak_days?: number
          total_xp?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          establishment_id?: string | null
          full_name?: string | null
          id?: string
          last_activity_date?: string | null
          level?: number
          margincoins?: number
          position?: string | null
          streak_days?: number
          total_xp?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_establishment_fk"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          cost_coins: number
          id: string
          redeemed_at: string
          reward_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          cost_coins: number
          id?: string
          redeemed_at?: string
          reward_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          cost_coins?: number
          id?: string
          redeemed_at?: string
          reward_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          category: Database["public"]["Enums"]["reward_category"]
          cost_coins: number
          created_at: string
          description: string | null
          establishment_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          stock: number | null
          title: string
        }
        Insert: {
          category: Database["public"]["Enums"]["reward_category"]
          cost_coins: number
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          stock?: number | null
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["reward_category"]
          cost_coins?: number
          created_at?: string
          description?: string | null
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          stock?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          category: string | null
          coin_reward: number | null
          color: string | null
          created_at: string
          description: string | null
          difficulty: number | null
          icon: string | null
          id: string
          is_published: boolean | null
          order_index: number | null
          target_position: string | null
          title: string
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          coin_reward?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          difficulty?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          target_position?: string | null
          title: string
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          coin_reward?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          difficulty?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          target_position?: string | null
          title?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          module_id: string
          score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          module_id: string
          score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          module_id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          establishment_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          establishment_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          establishment_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      plan_max_employees: { Args: { _plan: string }; Returns: number }
      redeem_invitation_code: {
        Args: { _code: string }
        Returns: {
          out_establishment_id: string
          out_position: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "manager" | "employee"
      coin_reason:
        | "lesson_completed"
        | "module_completed"
        | "quiz_passed"
        | "daily_streak"
        | "game_played"
        | "simulator_completed"
        | "reward_redeemed"
        | "admin_adjustment"
        | "signup_bonus"
        | "level_up_bonus"
      lesson_type:
        | "reading"
        | "video"
        | "quiz"
        | "flashcards"
        | "ordering"
        | "interactive"
      reward_category:
        | "internal"
        | "badge"
        | "partner_discount"
        | "premium_content"
    }
    CompositeTypes: {
      [_ in never]: never
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
      app_role: ["admin", "owner", "manager", "employee"],
      coin_reason: [
        "lesson_completed",
        "module_completed",
        "quiz_passed",
        "daily_streak",
        "game_played",
        "simulator_completed",
        "reward_redeemed",
        "admin_adjustment",
        "signup_bonus",
        "level_up_bonus",
      ],
      lesson_type: [
        "reading",
        "video",
        "quiz",
        "flashcards",
        "ordering",
        "interactive",
      ],
      reward_category: [
        "internal",
        "badge",
        "partner_discount",
        "premium_content",
      ],
    },
  },
} as const
