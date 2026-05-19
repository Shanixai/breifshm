// Lovable AI brief generator — multi-stage CoT, references, and editing
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | "analyze"
  | "questions"
  | "refine"
  | "generate"
  | "edit_selection"
  | "edit_full"
  | "analyze_image";

interface RequestBody {
  action: Action;
  projectName?: string;
  deliverable?: "video" | "social" | "design";
  notes?: string;
  language?: "he" | "en";
  // Q&A
  round?: number;
  qaHistory?: { question: string; answer: string }[];
  // refs
  referenceIds?: string[];
  // editing
  briefMd?: string;
  selection?: string;
  instruction?: string;
  // image
  imageUrl?: string;
}

async function callLovableAI(
  messages: Array<{ role: string; content: unknown }>,
  model = "google/gemini-2.5-flash",
) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (res.status === 429) {
    return { error: "rate_limit", status: 429, message: "Rate limit reached. Please try again shortly." };
  }
  if (res.status === 402) {
    return { error: "credits", status: 402, message: "AI credits exhausted. Please add credits to continue." };
  }
  if (!res.ok) {
    const text = await res.text();
    return { error: "ai_error", status: res.status, message: text };
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  return { content };
}

function tryParseJson<T = unknown>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const supa = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supa.auth.getUser();
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    const lang = body.language === "en" ? "en" : "he";
    const langInstruction =
      lang === "he"
        ? "Respond in Hebrew (עברית). Use natural, professional Israeli marketing Hebrew."
        : "Respond in English.";

    // ===== Standalone image vision analyzer =====
    if (body.action === "analyze_image") {
      if (!body.imageUrl) {
        return new Response(JSON.stringify({ error: "missing_image" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await callLovableAI(
        [
          {
            role: "system",
            content:
              "You are a senior creative director. Analyze the uploaded design reference image. Describe in 3–6 short bullets: visual style/mood, color palette (named colors), typography feel, layout/composition, and what makes it work as a creative reference. Be concrete and useful for a brief writer. " +
              langInstruction,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this reference image for use as inspiration in a creative brief." },
              { type: "image_url", image_url: { url: body.imageUrl } },
            ],
          },
        ],
        "google/gemini-2.5-flash",
      );
      if ("error" in result) {
        return new Response(JSON.stringify(result), {
          status: result.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ summary: result.content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Load profile + references for brief-related actions =====
    const { data: profile } = await supa
      .from("user_profiles")
      .select("brand_voice, example_1, example_2, example_3")
      .eq("user_id", user.id)
      .maybeSingle();

    let refsBlock = "(no references attached)";
    if (body.referenceIds && body.referenceIds.length > 0) {
      const { data: refs } = await supa
        .from("references")
        .select("kind, name, url, extracted_text, vision_summary")
        .in("id", body.referenceIds);
      if (refs && refs.length > 0) {
        refsBlock = refs
          .map((r, i) => {
            const head = `### Reference ${i + 1} — ${r.kind.toUpperCase()}: ${r.name || "(untitled)"}`;
            const parts = [head];
            if (r.url) parts.push(`URL: ${r.url}`);
            if (r.vision_summary) parts.push(`Visual analysis:\n${r.vision_summary}`);
            if (r.extracted_text) {
              const text = r.extracted_text.length > 4000 ? r.extracted_text.slice(0, 4000) + "…[truncated]" : r.extracted_text;
              parts.push(`Content:\n${text}`);
            }
            return parts.join("\n");
          })
          .join("\n\n");
      }
    }

    const styleBlock = `
## Brand Voice & Style
${profile?.brand_voice?.trim() || "(not provided)"}

## Gold Standard Example 1
${profile?.example_1?.trim() || "(not provided)"}

## Gold Standard Example 2
${profile?.example_2?.trim() || "(not provided)"}

## Gold Standard Example 3
${profile?.example_3?.trim() || "(not provided)"}

## Reference Materials Attached
${refsBlock}
`.trim();

    const projectBlock = `
## Project Details
- Name: ${body.projectName ?? "(unnamed)"}
- Deliverable type: ${body.deliverable ?? "(unspecified)"}

## Raw notes from the user
${body.notes ?? "(none)"}
`.trim();

    const qaBlock = (body.qaHistory ?? [])
      .map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
      .join("\n\n");

    // ===== STAGE 1: ANALYZE =====
    if (body.action === "analyze") {
      const sys = `You are StudioBrief Pro's reasoning engine — Stage 1: ANALYZE.
Review the user's brand voice, gold standard examples, attached references, and raw notes. Then output a concise analysis with these labeled sections:
- Summary: what the user wants in 1–2 sentences.
- Known facts: 3–6 bullets of concrete facts already present in the notes.
- Style signals: 2–4 bullets — what we know about their voice/format from profile + references.
- Initial direction: 1–2 sentences on the angle that will likely fit.
Keep it tight. ${langInstruction}`;
      const result = await callLovableAI([
        { role: "system", content: sys },
        { role: "user", content: `${styleBlock}\n\n${projectBlock}` },
      ]);
      if ("error" in result) {
        return new Response(JSON.stringify(result), { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ analysis: result.content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== STAGE 2: QUESTIONS (round 1) =====
    if (body.action === "questions") {
      const sys = `You are StudioBrief Pro — Stage 2: GAPS.
Identify the most important missing information and ask exactly 3 short, specific clarifying questions tailored to this brand voice and these references.
${langInstruction}
Output strictly as JSON: {"thinking": "1-2 sentence rationale for what's missing", "questions": ["...","...","..."]}. No markdown.`;
      const result = await callLovableAI([
        { role: "system", content: sys },
        { role: "user", content: `${styleBlock}\n\n${projectBlock}\n\nReturn JSON now.` },
      ]);
      if ("error" in result) {
        return new Response(JSON.stringify(result), { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const parsed = tryParseJson<{ thinking?: string; questions?: string[] }>(result.content);
      let questions: string[] = parsed?.questions?.slice(0, 3) ?? [];
      if (questions.length === 0) {
        questions = result.content.split("\n").map((l) => l.replace(/^\s*[\d\-\*\.\)]+\s*/, "").trim()).filter(Boolean).slice(0, 3);
      }
      return new Response(JSON.stringify({ thinking: parsed?.thinking ?? "", questions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== STAGE 3: REFINE (round 2 — optional follow-up) =====
    if (body.action === "refine") {
      const sys = `You are StudioBrief Pro — Stage 3: REFINE.
You've already received answers to round 1 questions. Decide if there are still critical gaps that would meaningfully change the final brief.
${langInstruction}
Output strictly as JSON:
{"thinking":"1-2 sentence assessment","needsMore":true|false,"questions":["q1","q2"]}
- If needsMore is false, set questions to [].
- If needsMore is true, return 1–2 highly targeted follow-up questions only (no filler).`;
      const result = await callLovableAI([
        { role: "system", content: sys },
        { role: "user", content: `${styleBlock}\n\n${projectBlock}\n\n## Round 1 Q&A\n${qaBlock}\n\nReturn JSON now.` },
      ]);
      if ("error" in result) {
        return new Response(JSON.stringify(result), { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const parsed = tryParseJson<{ thinking?: string; needsMore?: boolean; questions?: string[] }>(result.content) ?? {};
      return new Response(
        JSON.stringify({
          thinking: parsed.thinking ?? "",
          needsMore: !!parsed.needsMore,
          questions: (parsed.questions ?? []).slice(0, 2),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ===== STAGE 4+5: GENERATE (draft + polish in one) =====
    if (body.action === "generate") {
      const sys = `You are StudioBrief Pro — final stage: write a polished, studio-ready creative brief.
Match the user's brand voice precisely. Mirror the structure/quality of their gold standard examples. Weave in concrete cues from the attached references where relevant (mention which reference inspired which decision when natural).
${langInstruction}
Format as clean Markdown with section headings (##), short paragraphs, and bullet lists. Include: Background, Objective, Target Audience, Key Message, Deliverables, Tone & Style, References & Inspiration, Success Metrics — adapt if the gold standards differ.
First think silently about structure, then output ONLY the final brief (no preface, no explanation).`;
      const result = await callLovableAI([
        { role: "system", content: sys },
        { role: "user", content: `${styleBlock}\n\n${projectBlock}\n\n## Clarifying Q&A\n${qaBlock}\n\nWrite the full brief now.` },
      ]);
      if ("error" in result) {
        return new Response(JSON.stringify(result), { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ brief: result.content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== EDIT SELECTION =====
    if (body.action === "edit_selection") {
      if (!body.selection || !body.instruction) {
        return new Response(JSON.stringify({ error: "missing_fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sys = `You are StudioBrief Pro's inline editor. Rewrite the SELECTED passage according to the user's instruction, while preserving the surrounding brief's voice and the user's brand style.
${langInstruction}
Return ONLY the rewritten passage — no preface, no quotes, no markdown fences. Keep length similar unless the instruction asks otherwise. Preserve any markdown formatting in the selection.`;
      const userMsg = `## Full brief (for context)\n${body.briefMd ?? ""}\n\n## Selected passage\n${body.selection}\n\n## Instruction\n${body.instruction}\n\n## Brand voice\n${profile?.brand_voice ?? "(none)"}\n\nRewrite the selection now.`;
      const result = await callLovableAI([
        { role: "system", content: sys },
        { role: "user", content: userMsg },
      ]);
      if ("error" in result) {
        return new Response(JSON.stringify(result), { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ rewritten: result.content.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== EDIT FULL BRIEF =====
    if (body.action === "edit_full") {
      if (!body.briefMd || !body.instruction) {
        return new Response(JSON.stringify({ error: "missing_fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sys = `You are StudioBrief Pro's revision editor. Rewrite the ENTIRE brief according to the user's instruction, while preserving the user's brand voice and overall structure unless explicitly told otherwise.
${langInstruction}
Return ONLY the revised brief as clean Markdown — no preface, no explanation.`;
      const userMsg = `## Brand voice\n${profile?.brand_voice ?? "(none)"}\n\n## Current brief\n${body.briefMd}\n\n## Instruction\n${body.instruction}\n\nRewrite the brief now.`;
      const result = await callLovableAI([
        { role: "system", content: sys },
        { role: "user", content: userMsg },
      ]);
      if ("error" in result) {
        return new Response(JSON.stringify(result), { status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ brief: result.content.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "invalid_action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("brief-ai error:", err);
    return new Response(
      JSON.stringify({ error: "server_error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
