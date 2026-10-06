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
      agent_audit_logs: {
        Row: {
          action: string
          created_at: string
          error: string | null
          id: number
          params: Json | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          error?: string | null
          id?: number
          params?: Json | null
          status: string
        }
        Update: {
          action?: string
          created_at?: string
          error?: string | null
          id?: number
          params?: Json | null
          status?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: number
          row_data: Json | null
          table_name: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          row_data?: Json | null
          table_name: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          row_data?: Json | null
          table_name?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          created_at: string
          id: string
          name: string
          note: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          note?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          note?: string | null
        }
        Relationships: []
      }
      customer_prices: {
        Row: {
          customer_id: string
          id: string
          price: number
          product_id: string
          unit_name: string
        }
        Insert: {
          customer_id: string
          id?: string
          price?: number
          product_id: string
          unit_name: string
        }
        Update: {
          customer_id?: string
          id?: string
          price?: number
          product_id?: string
          unit_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_prices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          note: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          note?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      product_units: {
        Row: {
          created_at: string
          id: string
          product_id: string
          qty_per: number
          retail_price: number
          unit_name: string
          wholesale_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          qty_per?: number
          retail_price?: number
          unit_name: string
          wholesale_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          qty_per?: number
          retail_price?: number
          unit_name?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          price: number
          stock: number
          unit: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          price?: number
          stock?: number
          unit?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          stock?: number
          unit?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          perms: string[]
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          perms?: string[]
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          perms?: string[]
          username?: string
        }
        Relationships: []
      }
      stock_closings: {
        Row: {
          amount: number
          branch_id: string
          counted_qty: number
          created_at: string
          expected_qty: number
          id: string
          month: string
          product_id: string | null
          product_name: string
          sold_qty: number
          unit: string
        }
        Insert: {
          amount?: number
          branch_id: string
          counted_qty?: number
          created_at?: string
          expected_qty?: number
          id?: string
          month: string
          product_id?: string | null
          product_name: string
          sold_qty?: number
          unit?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          counted_qty?: number
          created_at?: string
          expected_qty?: number
          id?: string
          month?: string
          product_id?: string | null
          product_name?: string
          sold_qty?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_closings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_closings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          actual: number
          created_at: string
          expected: number
          id: string
          month: string
          product_id: string
        }
        Insert: {
          actual?: number
          created_at?: string
          expected?: number
          id?: string
          month: string
          product_id: string
        }
        Update: {
          actual?: number
          created_at?: string
          expected?: number
          id?: string
          month?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          id: string
          note: string | null
          price: number
          price_type: string
          product_id: string | null
          product_name: string
          qty: number
          transaction_id: string
          unit_name: string
        }
        Insert: {
          id?: string
          note?: string | null
          price?: number
          price_type?: string
          product_id?: string | null
          product_name: string
          qty?: number
          transaction_id: string
          unit_name: string
        }
        Update: {
          id?: string
          note?: string | null
          price?: number
          price_type?: string
          product_id?: string | null
          product_name?: string
          qty?: number
          transaction_id?: string
          unit_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          branch_id: string | null
          created_at: string
          customer_id: string | null
          deduct_stock: boolean
          id: string
          kind: string
          note: string | null
          to_branch_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          deduct_stock?: boolean
          id?: string
          kind: string
          note?: string | null
          to_branch_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          deduct_stock?: boolean
          id?: string
          kind?: string
          note?: string | null
          to_branch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      is_admin: { Args: never; Returns: boolean }
      item_base_qty: {
        Args: { _product: string; _qty: number; _unit: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "viewer"],
    },
  },
} as const
