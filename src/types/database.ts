// Hand-written to match supabase/migrations. Keep in sync when the schema changes.
// NUMERIC columns are typed `number` here (PostgREST returns JSON numbers);
// app code must still do money math in integer cents.

export type TransactionType = "INCOME" | "EXPENSE";

type ProfileRow = {
  id: string;
  full_name: string;
  created_at: string;
  updated_at: string;
};

type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  color: string;
  created_at: string;
};

type TransactionRow = {
  id: string;
  user_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  transaction_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
};

type BudgetRow = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: { id: string; full_name?: string; created_at?: string; updated_at?: string };
        Update: { full_name?: string };
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: TransactionType;
          color?: string;
          created_at?: string;
        };
        Update: { name?: string; type?: TransactionType; color?: string };
        Relationships: [];
      };
      transactions: {
        Row: TransactionRow;
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          type: TransactionType;
          amount: number;
          description?: string;
          transaction_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          type?: TransactionType;
          amount?: number;
          description?: string;
          transaction_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_fk";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: BudgetRow;
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          amount: number;
          month: number;
          year: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: { category_id?: string; amount?: number; month?: number; year?: number };
        Relationships: [
          {
            foreignKeyName: "budgets_category_fk";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
