
## Goal

Three upgrades to StudioBrief Pro:
1. **Deeper Chain-of-Thought** — show AI reasoning stages live + support multiple Q&A rounds
2. **Reference file library** — global library in Style Profile + per-brief attachments (PDFs, DOCX, images, text, URLs), with vision analysis on images
3. **Brief editing** — inline rich-text editing + select-any-passage and ask AI to rewrite

## 1. Reference Library

### Storage
- New Lovable Cloud storage bucket `references` (private, RLS scoped to `user_id` folder prefix).
- New table `references`:
  - `id`, `user_id`, `brief_id` (nullable — null = global library item), `kind` (`pdf` | `docx` | `image` | `text` | `url`), `name`, `storage_path` (nullable), `url` (nullable), `extracted_text` (nullable), `vision_summary` (nullable), `created_at`.
  - RLS: user can CRUD only own rows.

### Upload + Parsing
- New server fn `uploadReference` (`src/lib/references.functions.ts`):
  - Accepts base64 file + metadata.
  - For PDFs: parse with `pdf-parse` (server) → `extracted_text`.
  - For DOCX: parse with `mammoth` → `extracted_text`.
  - For text/markdown: store raw text.
  - For images: upload to storage, then call Lovable AI Gateway (Gemini 2.5 Pro vision) with the image to generate `vision_summary` (layout, mood, color palette, typography cues).
  - For URLs: optional fetch + readability extraction → `extracted_text`.
- New server fn `listReferences({ briefId? })`, `deleteReference`.

### UI
- **Style Profile page** — add a "Reference Library" section with drag-and-drop uploader, list of saved references with thumbnails (images), kind badges, delete button.
- **Wizard Step 2** — add an "Attach references to this brief" panel: shows global library items as checkboxes ("use for this brief") + an uploader for one-off attachments (stored with `brief_id` set).

## 2. Enhanced Chain-of-Thought

Refactor `supabase/functions/brief-ai/index.ts` (or migrate to a TanStack server fn) into 5 explicit stages, streamed back to the client via SSE so each stage appears live:

```
Stage 1: ANALYZE     → summarize notes, list known facts
Stage 2: GAPS        → identify missing info, propose Q&A round 1 (3 questions)
        [user answers]
Stage 3: REFINE      → review answers, decide if more clarification needed
                       → if yes, propose Q&A round 2 (up to 2 more questions)
        [user answers, or skips]
Stage 4: DRAFT       → write first brief draft using profile + references
Stage 5: POLISH      → self-critique + final polished brief
```

Each stage's reasoning is shown in a collapsible "AI Thinking" panel above the wizard. References (extracted_text + vision_summary) are injected into the system context for every stage.

### Wizard changes
- Step 3 ("Interview") becomes **multi-round**: after answering round 1, AI decides whether to ask round 2. UI shows round indicator.
- Add a "Skip remaining questions" button so users can short-circuit to generation.
- Live thinking panel uses a streaming endpoint; collapses by default but expands to show each stage's reasoning summary.

## 3. Brief Editing

### Inline editor
- Replace the read-only `<Markdown>` render in Step 4 with **TipTap** rich-text editor (already RTL-friendly, supports markdown import/export).
- Add toolbar: bold, italic, headings, lists, undo/redo.
- Edits autosave to local state; "Save changes" persists to a new `briefs` table.

### New `briefs` table
- `id`, `user_id`, `name`, `deliverable`, `content_md`, `created_at`, `updated_at`.
- Powers Brief History (currently empty page).

### Select-to-ask-AI
- When user selects text in the editor, a floating toolbar appears with "Ask AI" button + quick actions ("Shorten", "Make more formal", "Translate to English", "Custom…").
- Calls server fn `editBriefSelection({ briefId, selection, instruction })` → returns rewritten passage → replaces selection in editor.
- Custom prompt opens a small input popover.

### Full-brief AI edits
- Separate "Ask AI to edit entire brief" button opens a chat-style sidebar; each AI turn returns a full new draft + diff preview the user accepts or rejects.

## Technical Details

**Files to add/edit:**
- `supabase/migrations/<ts>_references_and_briefs.sql` — new tables, storage bucket, RLS, policies.
- `src/lib/references.functions.ts` — server fns for upload/list/delete + parsing.
- `src/lib/brief.functions.ts` — migrate AI logic to TanStack server fns (`generateBriefStream`, `editBriefSelection`, `saveBrief`, `listBriefs`).
- `src/components/reference-library.tsx` — uploader + list, reused in Style Profile and wizard.
- `src/components/brief-editor.tsx` — TipTap editor with floating AI toolbar.
- `src/components/ai-thinking-panel.tsx` — streaming reasoning display.
- Edit `src/routes/dashboard.style.tsx` — embed reference library.
- Edit `src/routes/dashboard.index.tsx` — multi-round wizard, attach panel, replace result view with `brief-editor.tsx`.
- Edit `src/routes/dashboard.history.tsx` — list saved briefs from `briefs` table.
- Edit `src/lib/i18n.tsx` — new keys for references, rounds, editor, AI actions.

**Dependencies:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `pdf-parse`, `mammoth`.

**Server vs Edge:** Migrate AI calls from the existing Supabase Edge Function into TanStack `createServerFn` per stack convention (keeps streaming, auth, and reference loading in one place). Keep the existing `brief-ai` edge function deployed for backward compatibility until migration is verified, then delete.

**AI model:** Keep Gemini 2.5 Flash for text stages; use Gemini 2.5 Pro for image vision analysis (better visual reasoning).

**Limits:** 20 MB per file, max 20 references per user globally + 10 per brief. Validate server-side.

## Out of Scope

- Sharing briefs between users / team workspaces.
- Versioning history for edits (only latest saved).
- Realtime collaboration on the editor.
- OCR for image references (vision summary covers it).
