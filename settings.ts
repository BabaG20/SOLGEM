import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  whatsapp_number: string;
  app_name: string;
  support_message: string;
}

const DEFAULTS: AppSettings = {
  whatsapp_number: "255617194394",
  app_name: "SolGems",
  support_message: "Habari, nahitaji msaada kuhusu SolGems app.",
};

export async function getSettings(): Promise<AppSettings> {
  const { data } = await supabase.from("app_settings").select("key,value");
  const out: AppSettings = { ...DEFAULTS };
  for (const row of data ?? []) {
    const k = row.key as keyof AppSettings;
    if (k in out) (out as unknown as Record<string, string>)[k] = String(row.value).replace(/^"|"$/g, "");
  }
  return out;
}

export function buildWhatsappUrl(s: AppSettings): string {
  return `https://wa.me/${s.whatsapp_number}?text=${encodeURIComponent(s.support_message)}`;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() });
  if (error) throw error;
}
