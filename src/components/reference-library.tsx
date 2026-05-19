import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, X, FileText, Image as ImageIcon, Link as LinkIcon, Type, FileType, Plus } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { callBriefAi } from "@/lib/brief-ai-client";
import { extractPdfText, extractDocxText, readTextFile } from "@/lib/reference-parsers";
import { cn } from "@/lib/utils";

export interface RefRow {
  id: string;
  user_id: string;
  brief_id: string | null;
  kind: "pdf" | "docx" | "image" | "text" | "url";
  name: string;
  storage_path: string | null;
  url: string | null;
  extracted_text: string | null;
  vision_summary: string | null;
  created_at: string;
}

interface Props {
  /** When provided, shows checkboxes to attach/detach references for a specific brief draft */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  /** Limit visible refs to global library only (brief_id IS NULL). Default true. */
  globalOnly?: boolean;
}

export function ReferenceLibrary({ selectable, selectedIds, onSelectionChange, globalOnly = true }: Props) {
  const { t, lang } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<RefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [textVal, setTextVal] = useState("");
  const [textName, setTextName] = useState("");
  const [urlVal, setUrlVal] = useState("");
  const [urlName, setUrlName] = useState("");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) {
        if (active) setLoading(false);
        return;
      }
      if (active) setUserId(uid);
      await loadItems(uid, active);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadItems = async (uid: string, active = true) => {
    let q = supabase
      .from("references")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (globalOnly) q = q.is("brief_id", null);
    const { data, error } = await q;
    if (!active) return;
    if (error) {
      toast.error(error.message);
    } else {
      const rows = (data ?? []) as RefRow[];
      setItems(rows);
      // generate signed URLs for image thumbnails
      const map: Record<string, string> = {};
      for (const r of rows) {
        if (r.kind === "image" && r.storage_path) {
          const { data: signed } = await supabase.storage
            .from("references")
            .createSignedUrl(r.storage_path, 60 * 60);
          if (signed?.signedUrl) map[r.id] = signed.signedUrl;
        }
      }
      if (active) setThumbs(map);
    }
    setLoading(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !userId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadOne(file);
      }
      await loadItems(userId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const uploadOne = async (file: File) => {
    if (!userId) return;
    if (file.size > 20 * 1024 * 1024) {
      throw new Error(`${file.name}: ${t("refTooLarge")}`);
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    let kind: RefRow["kind"];
    if (file.type.startsWith("image/")) kind = "image";
    else if (ext === "pdf" || file.type === "application/pdf") kind = "pdf";
    else if (ext === "docx" || file.type.includes("officedocument.wordprocessingml")) kind = "docx";
    else kind = "text";

    let storagePath: string | null = null;
    let extractedText: string | null = null;
    let visionSummary: string | null = null;

    if (kind === "image") {
      storagePath = `${userId}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("references").upload(storagePath, file, { upsert: false });
      if (upErr) throw upErr;
      // generate signed URL, call vision analyzer
      const { data: signed } = await supabase.storage.from("references").createSignedUrl(storagePath, 60 * 10);
      if (signed?.signedUrl) {
        try {
          const r = await callBriefAi<{ summary: string }>({ action: "analyze_image", imageUrl: signed.signedUrl, language: lang });
          visionSummary = r.summary;
        } catch (e) {
          console.warn("vision analysis failed", e);
        }
      }
    } else if (kind === "pdf") {
      extractedText = await extractPdfText(file);
      storagePath = `${userId}/${crypto.randomUUID()}-${file.name}`;
      await supabase.storage.from("references").upload(storagePath, file, { upsert: false });
    } else if (kind === "docx") {
      extractedText = await extractDocxText(file);
      storagePath = `${userId}/${crypto.randomUUID()}-${file.name}`;
      await supabase.storage.from("references").upload(storagePath, file, { upsert: false });
    } else {
      extractedText = await readTextFile(file);
    }

    const { error: dbErr } = await supabase.from("references").insert({
      user_id: userId,
      brief_id: null,
      kind,
      name: file.name,
      storage_path: storagePath,
      url: null,
      extracted_text: extractedText,
      vision_summary: visionSummary,
    });
    if (dbErr) throw dbErr;
  };

  const addText = async () => {
    if (!userId || !textVal.trim()) return;
    setUploading(true);
    try {
      const { error } = await supabase.from("references").insert({
        user_id: userId,
        brief_id: null,
        kind: "text",
        name: textName.trim() || t("refTextDefault"),
        extracted_text: textVal.trim().slice(0, 50_000),
      });
      if (error) throw error;
      setTextVal("");
      setTextName("");
      setShowText(false);
      await loadItems(userId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setUploading(false);
    }
  };

  const addUrl = async () => {
    if (!userId || !urlVal.trim()) return;
    setUploading(true);
    try {
      const { error } = await supabase.from("references").insert({
        user_id: userId,
        brief_id: null,
        kind: "url",
        name: urlName.trim() || urlVal.trim(),
        url: urlVal.trim(),
      });
      if (error) throw error;
      setUrlVal("");
      setUrlName("");
      setShowUrl(false);
      await loadItems(userId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setUploading(false);
    }
  };

  const removeItem = async (id: string, storagePath: string | null) => {
    if (!userId) return;
    if (storagePath) {
      await supabase.storage.from("references").remove([storagePath]);
    }
    const { error } = await supabase.from("references").delete().eq("id", id);
    if (error) toast.error(error.message);
    else await loadItems(userId);
  };

  const toggleSelect = (id: string) => {
    if (!onSelectionChange) return;
    const set = new Set(selectedIds ?? []);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onSelectionChange(Array.from(set));
  };

  const iconFor = (kind: RefRow["kind"]) => {
    if (kind === "image") return ImageIcon;
    if (kind === "pdf") return FileType;
    if (kind === "docx") return FileText;
    if (kind === "url") return LinkIcon;
    return Type;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {t("refUpload")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowText((v) => !v)} className="gap-2">
          <Type className="w-4 h-4" />
          {t("refAddText")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowUrl((v) => !v)} className="gap-2">
          <LinkIcon className="w-4 h-4" />
          {t("refAddUrl")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {showText && (
        <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
          <Input value={textName} onChange={(e) => setTextName(e.target.value)} placeholder={t("refTextNamePlaceholder")} />
          <Textarea value={textVal} onChange={(e) => setTextVal(e.target.value)} placeholder={t("refTextPlaceholder")} rows={5} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowText(false)}>{t("cancel")}</Button>
            <Button type="button" onClick={addText} disabled={uploading || !textVal.trim()} className="gap-2">
              <Plus className="w-4 h-4" />{t("add")}
            </Button>
          </div>
        </div>
      )}

      {showUrl && (
        <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
          <Input value={urlName} onChange={(e) => setUrlName(e.target.value)} placeholder={t("refUrlNamePlaceholder")} />
          <Input value={urlVal} onChange={(e) => setUrlVal(e.target.value)} placeholder="https://…" type="url" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowUrl(false)}>{t("cancel")}</Button>
            <Button type="button" onClick={addUrl} disabled={uploading || !urlVal.trim()} className="gap-2">
              <Plus className="w-4 h-4" />{t("add")}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("loading")}
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
          {t("refEmpty")}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((r) => {
            const Icon = iconFor(r.kind);
            const isSelected = selectedIds?.includes(r.id);
            return (
              <li
                key={r.id}
                className={cn(
                  "group relative flex items-start gap-3 p-3 rounded-xl border bg-card",
                  isSelected ? "border-primary ring-1 ring-primary/30" : "border-border",
                )}
              >
                {selectable && (
                  <Checkbox
                    checked={!!isSelected}
                    onCheckedChange={() => toggleSelect(r.id)}
                    className="mt-1"
                  />
                )}
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                  {r.kind === "image" && thumbs[r.id] ? (
                    <img src={thumbs[r.id]} alt={r.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground uppercase">{r.kind}</p>
                  {r.vision_summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.vision_summary}</p>
                  )}
                  {r.extracted_text && !r.vision_summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.extracted_text}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(r.id, r.storage_path)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  aria-label="remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
