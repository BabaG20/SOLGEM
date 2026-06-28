import { supabase } from "@/integrations/supabase/client";

const KEY = "solgems_visitor_key";

function getVisitorKey(): string {
  if (typeof window === "undefined") return "";
  let v = window.localStorage.getItem(KEY);
  if (!v) {
    v = crypto.randomUUID();
    window.localStorage.setItem(KEY, v);
  }
  return v;
}

export async function recordVisit(): Promise<void> {
  const visitor_key = getVisitorKey();
  if (!visitor_key) return;
  // ignore conflict (unique key) — first insert per device counts
  await supabase.from("app_visits").insert({ visitor_key });
}

export async function getVisitCount(): Promise<number> {
  const { count } = await supabase
    .from("app_visits")
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}
