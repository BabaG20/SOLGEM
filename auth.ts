import { supabase } from "@/integrations/supabase/client";

// Username -> synthetic email (no real email required)
const DOMAIN = "solgems.local";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${DOMAIN}`;
}

export async function signUpWithUsername(username: string, password: string) {
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username.trim() } },
  });
  return { data, error };
}

export async function signInWithUsername(username: string, password: string) {
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}
