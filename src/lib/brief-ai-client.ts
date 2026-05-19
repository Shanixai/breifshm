import { supabase } from "@/integrations/supabase/client";

export type BriefAiAction =
  | "analyze"
  | "questions"
  | "refine"
  | "generate"
  | "edit_selection"
  | "edit_full"
  | "analyze_image";

export interface BriefAiPayload {
  action: BriefAiAction;
  projectName?: string;
  deliverable?: "video" | "social" | "design";
  notes?: string;
  language?: "he" | "en";
  qaHistory?: { question: string; answer: string }[];
  referenceIds?: string[];
  briefMd?: string;
  selection?: string;
  instruction?: string;
  imageUrl?: string;
}

export async function callBriefAi<T = Record<string, unknown>>(payload: BriefAiPayload): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brief-ai`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || json?.error || "AI request failed");
  }
  return json as T;
}
