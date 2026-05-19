import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2, Sparkles, Save, Library } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ReferenceLibrary } from "@/components/reference-library";

export const Route = createFileRoute("/dashboard/style")({
  component: StyleProfile,
});

function StyleProfile() {
  const { t, lang } = useI18n();
  const [brandVoice, setBrandVoice] = useState("");
  const [ex1, setEx1] = useState("");
  const [ex2, setEx2] = useState("");
  const [ex3, setEx3] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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

      const { data, error } = await supabase
        .from("user_profiles")
        .select("brand_voice, example_1, example_2, example_3")
        .eq("user_id", uid)
        .maybeSingle();

      if (!active) return;
      if (error) {
        toast.error(error.message);
      } else if (data) {
        setBrandVoice(data.brand_voice ?? "");
        setEx1(data.example_1 ?? "");
        setEx2(data.example_2 ?? "");
        setEx3(data.example_3 ?? "");
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);

    const { error } = await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        brand_voice: brandVoice,
        example_1: ex1,
        example_2: ex2,
        example_3: ex3,
      },
      { onConflict: "user_id" },
    );

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("profileSaved"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t("loadingProfile")}
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-xs font-medium text-primary mb-4">
          <FileText className="w-3.5 h-3.5" />
          {t("workspace")}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("styleTitle")}</h1>
        <p className="mt-3 text-muted-foreground text-lg">{t("styleSubtitle")}</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand voice */}
        <section className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-soft">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{t("brandVoice")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("brandVoiceHint")}</p>
            </div>
          </div>
          <Label htmlFor="brand-voice" className="sr-only">
            {t("brandVoice")}
          </Label>
          <Textarea
            id="brand-voice"
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            placeholder={t("brandVoicePlaceholder")}
            rows={6}
            className="resize-none"
          />
        </section>

        {/* Gold standard examples */}
        <section className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-soft">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{t("goldStandard")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("goldStandardHint")}</p>
            </div>
          </div>

          <div className="space-y-5">
            {[
              { id: "ex1", val: ex1, set: setEx1, n: 1 },
              { id: "ex2", val: ex2, set: setEx2, n: 2 },
              { id: "ex3", val: ex3, set: setEx3, n: 3 },
            ].map((row) => (
              <div key={row.id} className="space-y-2">
                <Label htmlFor={row.id} className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground text-xs font-bold">
                    {row.n}
                  </span>
                  {t("example")} {row.n}
                </Label>
                <Textarea
                  id={row.id}
                  value={row.val}
                  onChange={(e) => row.set(e.target.value)}
                  placeholder={t("examplePlaceholder")}
                  rows={5}
                  className="resize-none font-mono text-sm"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Reference Library */}
        <section className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-soft">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Library className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{t("refLibTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("refLibSubtitle")}</p>
            </div>
          </div>
          <ReferenceLibrary />
        </section>

        <div className="flex justify-end sticky bottom-4">
          <Button
            type="submit"
            disabled={saving}
            size="lg"
            className="bg-primary hover:bg-primary/90 px-8 h-11 gap-2 shadow-elegant"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {t("saveProfile")}
          </Button>
        </div>
      </form>
    </div>
  );
}
