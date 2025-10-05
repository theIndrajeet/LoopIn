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
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          habit_id: string
          id: string
          note: string | null
          xp_earned: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          habit_id: string
          id?: string
          note?: string | null
          xp_earned?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          habit_id?: string
          id?: string
          note?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean | null
          added_from_suggestion: boolean | null
          archived_at: string | null
          created_at: string | null
          deleted_at: string | null
          difficulty: Database["public"]["Enums"]["habit_difficulty"] | null
          id: string
          order_index: number | null
          schedule_days: number[] | null
          suggestion_source: string | null
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          added_from_suggestion?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          difficulty?: Database["public"]["Enums"]["habit_difficulty"] | null
          id?: string
          order_index?: number | null
          schedule_days?: number[] | null
          suggestion_source?: string | null
          title: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          added_from_suggestion?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          difficulty?: Database["public"]["Enums"]["habit_difficulty"] | null
          id?: string
          order_index?: number | null
          schedule_days?: number[] | null
          suggestion_source?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          privacy_level: Database["public"]["Enums"]["privacy_level"] | null
          timezone: string | null
          total_xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          privacy_level?: Database["public"]["Enums"]["privacy_level"] | null
          timezone?: string | null
          total_xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          privacy_level?: Database["public"]["Enums"]["privacy_level"] | null
          timezone?: string | null
          total_xp?: number | null
        }
        Relationships: []
      }
      streaks: {
        Row: {
          best_count: number | null
          created_at: string | null
          current_count: number | null
          freeze_tokens_used: number | null
          freeze_used_on: string | null
          habit_id: string
          id: string
          last_completed_date: string | null
        }
        Insert: {
          best_count?: number | null
          created_at?: string | null
          current_count?: number | null
          freeze_tokens_used?: number | null
          freeze_used_on?: string | null
          habit_id: string
          id?: string
          last_completed_date?: string | null
        }
        Update: {
          best_count?: number | null
          created_at?: string | null
          current_count?: number | null
          freeze_tokens_used?: number | null
          freeze_used_on?: string | null
          habit_id?: string
          id?: string
          last_completed_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "streaks_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: true
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_events: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          suggestion_id: string
          suggestion_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          suggestion_id: string
          suggestion_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          suggestion_id?: string
          suggestion_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          dismissed_progressive_prompts: string[] | null
          energy_level: string | null
          experience_level: string | null
          freeze_tokens_remaining: number | null
          freeze_tokens_reset_at: string | null
          living_situation: string | null
          main_struggles: string[] | null
          onboarding_completed: boolean | null
          preferred_styles: string[] | null
          primary_goals: string[] | null
          schedule_type: string | null
          updated_at: string | null
          user_id: string
          work_environment: string | null
        }
        Insert: {
          created_at?: string | null
          dismissed_progressive_prompts?: string[] | null
          energy_level?: string | null
          experience_level?: string | null
          freeze_tokens_remaining?: number | null
          freeze_tokens_reset_at?: string | null
          living_situation?: string | null
          main_struggles?: string[] | null
          onboarding_completed?: boolean | null
          preferred_styles?: string[] | null
          primary_goals?: string[] | null
          schedule_type?: string | null
          updated_at?: string | null
          user_id: string
          work_environment?: string | null
        }
        Update: {
          created_at?: string | null
          dismissed_progressive_prompts?: string[] | null
          energy_level?: string | null
          experience_level?: string | null
          freeze_tokens_remaining?: number | null
          freeze_tokens_reset_at?: string | null
          living_situation?: string | null
          main_struggles?: string[] | null
          onboarding_completed?: boolean | null
          preferred_styles?: string[] | null
          primary_goals?: string[] | null
          schedule_type?: string | null
          updated_at?: string | null
          user_id?: string
          work_environment?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: {
        Args: { friend_user_id: string }
        Returns: undefined
      }
      reject_friend_request: {
        Args: { friend_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      friendship_status: "pending" | "accepted" | "rejected"
      habit_difficulty: "easy" | "medium" | "hard"
      privacy_level: "public" | "friends" | "private"
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
      friendship_status: ["pending", "accepted", "rejected"],
      habit_difficulty: ["easy", "medium", "hard"],
      privacy_level: ["public", "friends", "private"],
    },
  },
} as const
