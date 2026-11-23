import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CategoriesManager } from "@/components/categories/categories-manager";
import { createClient } from "@/lib/supabase/server";
import { listCategories } from "@/services/categories";

export const metadata: Metadata = { title: "Categorías | FinTrack" };

export default function CategoriesPage() {
  return (
    <Suspense fallback={null}>
      <CategoriesContent />
    </Suspense>
  );
}

async function CategoriesContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await listCategories(supabase, user.id);
  if (!result.ok) throw new Error("categories_load_failed"); // handled by error.tsx (generic UI)
  return <CategoriesManager categories={result.data} />;
}
