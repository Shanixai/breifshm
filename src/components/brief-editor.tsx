import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Sparkles, Wand2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { callBriefAi } from "@/lib/brief-ai-client";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  lang: "he" | "en";
}

export function BriefEditor({ value, onChange, lang }: Props) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selRange, setSelRange] = useState<{ start: number; end: number } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [editing, setEditing] = useState(false);

  // Full-brief AI chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInstruction, setChatInstruction] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  const captureSelection = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (end > start) {
      setSelRange({ start, end });
    } else {
      setSelRange(null);
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handler = () => captureSelection();
    el.addEventListener("mouseup", handler);
    el.addEventListener("keyup", handler);
    return () => {
      el.removeEventListener("mouseup", handler);
      el.removeEventListener("keyup", handler);
    };
  }, []);

  const runSelectionEdit = async (instruction: string) => {
    if (!selRange) return;
    const selection = value.slice(selRange.start, selRange.end);
    if (!selection.trim()) return;
    setEditing(true);
    try {
      const r = await callBriefAi<{ rewritten: string }>({
        action: "edit_selection",
        briefMd: value,
        selection,
        instruction,
        language: lang,
      });
      const next = value.slice(0, selRange.start) + r.rewritten + value.slice(selRange.end);
      onChange(next);
      setPopoverOpen(false);
      setCustomInstruction("");
      toast.success(t("aiEditApplied"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("aiError"));
    } finally {
      setEditing(false);
    }
  };

  const runFullEdit = async () => {
    if (!chatInstruction.trim()) return;
    setChatBusy(true);
    try {
      const r = await callBriefAi<{ brief: string }>({
        action: "edit_full",
        briefMd: value,
        instruction: chatInstruction.trim(),
        language: lang,
      });
      onChange(r.brief);
      setChatInstruction("");
      toast.success(t("aiEditApplied"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("aiError"));
    } finally {
      setChatBusy(false);
    }
  };

  const hasSelection = selRange !== null && selRange.end > selRange.start;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasSelection || editing}
              className="gap-2"
              onClick={() => hasSelection && setPopoverOpen(true)}
            >
              {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {t("askAiOnSelection")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t("askAiHint")}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" onClick={() => runSelectionEdit(t("quickShorten"))} disabled={editing}>
                  {t("quickShorten")}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => runSelectionEdit(t("quickFormal"))} disabled={editing}>
                  {t("quickFormal")}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => runSelectionEdit(t("quickPunchier"))} disabled={editing}>
                  {t("quickPunchier")}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => runSelectionEdit(t("quickExpand"))} disabled={editing}>
                  {t("quickExpand")}
                </Button>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-border">
                <Input
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder={t("customInstructionPlaceholder")}
                />
                <Button
                  size="sm"
                  className="w-full gap-2"
                  disabled={!customInstruction.trim() || editing}
                  onClick={() => runSelectionEdit(customInstruction.trim())}
                >
                  <Wand2 className="w-4 h-4" />
                  {t("applyEdit")}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setChatOpen((v) => !v)}
          className="gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          {t("askAiOnFull")}
        </Button>

        <p className="text-xs text-muted-foreground">
          {hasSelection ? t("selectionActive") : t("selectionHint")}
        </p>
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={lang === "he" ? "rtl" : "ltr"}
        lang={lang}
        rows={22}
        className={cn(
          "font-mono text-sm leading-relaxed resize-y min-h-[400px]",
          "bg-card border border-border rounded-2xl p-6 shadow-soft",
        )}
      />

      {chatOpen && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-soft space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">{t("askAiOnFull")}</p>
          </div>
          <Textarea
            value={chatInstruction}
            onChange={(e) => setChatInstruction(e.target.value)}
            placeholder={t("fullEditPlaceholder")}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)}>{t("cancel")}</Button>
            <Button
              size="sm"
              onClick={runFullEdit}
              disabled={!chatInstruction.trim() || chatBusy}
              className="gap-2"
            >
              {chatBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t("applyEdit")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
