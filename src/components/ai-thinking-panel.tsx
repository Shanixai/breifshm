import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Brain, ChevronDown, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export type ThinkingStage = {
  id: string;
  label: string;
  status: "pending" | "active" | "done";
  body?: string;
};

export function AiThinkingPanel({ stages }: { stages: ThinkingStage[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const anyActive = stages.some((s) => s.status === "active");

  if (stages.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="bg-secondary/40 border border-border rounded-2xl">
      <CollapsibleTrigger className="w-full flex items-center justify-between p-4 text-start">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            {anyActive ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Brain className="w-4 h-4 text-primary" />}
          </div>
          <div>
            <p className="text-sm font-semibold">{t("aiThinking")}</p>
            <p className="text-xs text-muted-foreground">{t("aiThinkingSubtitle")}</p>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="px-4 pb-4 space-y-3">
          {stages.map((s, i) => (
            <li key={s.id} className="flex items-start gap-3">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5",
                  s.status === "done" && "bg-primary/15 text-primary",
                  s.status === "active" && "bg-primary text-primary-foreground",
                  s.status === "pending" && "bg-secondary text-muted-foreground",
                )}
              >
                {s.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.status === "active" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", s.status === "pending" && "text-muted-foreground")}>{s.label}</p>
                {s.body && (
                  <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed bg-card border border-border rounded-lg p-3">
                    {s.body}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
