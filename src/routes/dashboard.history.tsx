import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { History, Loader2, FileText, Trash2, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Brief {
  id: string;
  name: string;
  deliverable: string;
  content_md: string;
  created_at: string;
}

export const Route = createFileRoute("/dashboard/history")({
  component: BriefHistory,
});

function BriefHistory() {
  const { t } = useI18n();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("briefs")
      .select("id, name, deliverable, content_md, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setBriefs((data ?? []) as Brief[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("briefs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(t("historyDeleted")); load(); }
  };

  return (
    <div>
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-xs font-medium text-primary mb-4">
          <History className="w-3.5 h-3.5" />
          {t("workspace")}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("historyTitle")}</h1>
        <p className="mt-3 text-muted-foreground text-lg">{t("historySubtitle")}</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("loading")}
        </div>
      ) : briefs.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-2xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <History className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground">{t("emptyHistory")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {briefs.map((b) => (
            <li key={b.id} className="bg-card border border-border rounded-2xl p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{b.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.deliverable} · {new Date(b.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setOpenId(openId === b.id ? null : b.id)}>
                    {t("historyOpen")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(b.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {openId === b.id && (
                <pre className="mt-4 p-4 bg-secondary/40 rounded-xl whitespace-pre-wrap text-sm font-mono leading-relaxed max-h-96 overflow-auto">
                  {b.content_md}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
