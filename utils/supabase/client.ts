"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function createClient() {
  return createBrowserClient(requiredEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"), requiredEnv(supabaseKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
}

function requiredEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}
