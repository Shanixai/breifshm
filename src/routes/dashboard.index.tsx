import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Wand2, Loader2, ArrowLeft, ArrowRight, Video, Megaphone, Palette,
  Sparkles, Download, RotateCcw, CheckCircle2, Save, Library,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { exportElementToPdf } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { callBriefAi } from "@/lib/brief-ai-client";
import { AiThinkingPanel, type ThinkingStage } from "@/components/ai-thinking-panel";
import { ReferenceLibrary } from "@/components/reference-library";
import { BriefEditor } from "@/components/brief-editor";

export const Route = createFileRoute("/dashboard/")({
  component: CreateBrief,
});

type Deliverable = "video" | "social" | "design";
type Step = 1 | 2 | 3 | 4;

function CreateBrief() {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<Step>(1);

  const [name, setName] = useState("");
  const [deliverable, setDeliverable] = useState<Deliverable>("video");
  const [notes, setNotes] = useState("");
  const [refIds, setRefIds] = useState<string[]>([]);

  // Multi-round Q&A
  const [round, setRound] = useState<1 | 2>(1);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [r1Qa, setR1Qa] = useState<{ question: string; answer: string }[]>([]);
  const [busy, setBusy] = useState(false);

  // Thinking
  const [stages, setStages] = useState<ThinkingStage[]>([]);

  // Result
  const [brief, setBrief] = useState("");
  const [savedBriefId, setSavedBriefId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const briefRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setStep(1); setName(""); setNotes(""); setRefIds([]);
    setRound(1); setQuestions([]); setAnswers([]); setR1Qa([]);
    setStages([]); setBrief(""); setSavedBriefId(null);
  };

  const updateStage = (id: string, patch: Partial<ThinkingStage>) =>
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const goToInterview = async () => {
    setBusy(true);
    const initialStages: ThinkingStage[] = [
      { id: "analyze", label: t("stageAnalyze"), status: "active" },
      { id: "gaps", label: t("stageGaps"), status: "pending" },
      { id: "refine", label: t("stageRefine"), status: "pending" },
      { id: "draft", label: t("stageDraft"), status: "pending" },
    ];
    setStages(initialStages);

    try {
      const a = await callBriefAi<{ analysis: string }>({
        action: "analyze", projectName: name, deliverable, notes, language: lang, referenceIds: refIds,
      });
      updateStage("analyze", { status: "done", body: a.analysis });
      updateStage("gaps", { status: "active" });

      const q = await callBriefAi<{ thinking: string; questions: string[] }>({
        action: "questions", projectName: name, deliverable, notes, language: lang, referenceIds: refIds,
      });
      updateStage("gaps", { status: "done", body: q.thinking });
      const qs = (q.questions || []).slice(0, 3);
      while (qs.length < 3) qs.push("");
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
      setRound(1);
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("aiError"));
    } finally {
      setBusy(false);
    }
  };

  const submitRound1 = async () => {
    const qa = questions.map((q, i) => ({ question: q, answer: answers[i] }));
    setR1Qa(qa);
    setBusy(true);
    updateStage("refine", { status: "active" });
    try {
      const r = await callBriefAi<{ thinking: string; needsMore: boolean; questions: string[] }>({
        action: "refine", projectName: name, deliverable, notes, language: lang, referenceIds: refIds, qaHistory: qa,
      });
      updateStage("refine", { status: "done", body: r.thinking || (r.needsMore ? "" : t("noMoreQuestions")) });
      if (r.needsMore && r.questions.length > 0) {
        setQuestions(r.questions);
        setAnswers(r.questions.map(() => ""));
        setRound(2);
      } else {
        await generate(qa);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("aiError"));
    } finally {
      setBusy(false);
    }
  };

  const submitRound2OrGenerate = async () => {
    const r2qa = questions.map((q, i) => ({ question: q, answer: answers[i] }));
    const fullQa = [...r1Qa, ...r2qa];
    await generate(fullQa);
  };

  const generate = async (qa: { question: string; answer: string }[]) => {
    setBusy(true);
    updateStage("draft", { status: "active" });
    try {
      const r = await callBriefAi<{ brief: string }>({
        action: "generate", projectName: name, deliverable, notes, language: lang, referenceIds: refIds, qaHistory: qa,
      });
      updateStage("draft", { status: "done" });
      setBrief(r.brief);
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("aiError"));
    } finally {
      setBusy(false);
    }
  };

  const saveBrief = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    setSaving(true);
    try {
      if (savedBriefId) {
        const { error } = await supabase.from("briefs").update({
          name, deliverable, content_md: brief,
        }).eq("id", savedBriefId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("briefs").insert({
          user_id: uid, name, deliverable, content_md: brief,
        }).select("id").single();
        if (error) throw error;
        setSavedBriefId(data.id);
      }
      toast.success(t("briefSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("aiError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!briefRef.current) return;
    setDownloading(true);
    try {
      const safe = name.trim().replace(/[^\w\u0590-\u05FF\- ]+/g, "").replace(/\s+/g, "_") || "brief";
      await exportElementToPdf(briefRef.current, `${safe}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-xs font-medium text-primary mb-4">
          <Wand2 className="w-3.5 h-3.5" />
          {t("workspace")}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("createTitle")}</h1>
        <p className="mt-3 text-muted-foreground text-lg">{t("createSubtitle")}</p>
      </header>

      <Stepper step={step} />

      {stages.length > 0 && (
        <div className="mt-6">
          <AiThinkingPanel stages={stages} />
        </div>
      )}

      <div className="mt-6">
        {step === 1 && (
          <StepCard>
            <div className="space-y-2">
              <Label htmlFor="project">{t("projectName")}</Label>
              <Input id="project" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("projectPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("deliverableType")}</Label>
              <div className="grid grid-cols-3 gap-3">
                <DeliverableOption active={deliverable === "video"} onClick={() => setDeliverable("video")} icon={Video} label={t("deliverableVideo")} />
                <DeliverableOption active={deliverable === "social"} onClick={() => setDeliverable("social")} icon={Megaphone} label={t("deliverableSocial")} />
                <DeliverableOption active={deliverable === "design"} onClick={() => setDeliverable("design")} icon={Palette} label={t("deliverableDesign")} />
              </div>
            </div>
            <Footer>
              <div />
              <Button onClick={() => setStep(2)} disabled={!name.trim()} className="bg-primary hover:bg-primary/90 gap-2">
                {t("next")}<NextArrow />
              </Button>
            </Footer>
          </StepCard>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <StepCard>
              <div className="space-y-2">
                <Label htmlFor="notes">{t("rawNotes")}</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("rawNotesPlaceholder")} rows={10} className="resize-none" />
              </div>
            </StepCard>

            <StepCard>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Library className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("refAttachTitle")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t("refAttachSubtitle")}</p>
                </div>
              </div>
              <ReferenceLibrary selectable selectedIds={refIds} onSelectionChange={setRefIds} />
            </StepCard>

            <Footer>
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><BackArrow />{t("back")}</Button>
              <Button onClick={goToInterview} disabled={!notes.trim() || busy} className="bg-primary hover:bg-primary/90 gap-2">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" />{t("thinking")}</> : <>{t("next")}<NextArrow /></>}
              </Button>
            </Footer>
          </div>
        )}

        {step === 3 && (
          <StepCard>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <p className="text-muted-foreground leading-relaxed">{t("interviewIntro")}</p>
              </div>
              <div className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full whitespace-nowrap">
                {t("round")} {round}
              </div>
            </div>

            <div className="space-y-5">
              {questions.map((q, i) => (
                <div key={i} className="space-y-2">
                  <Label htmlFor={`q-${i}`} className="flex items-start gap-2 leading-relaxed">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                    <span className="font-medium text-foreground">{q}</span>
                  </Label>
                  <Textarea id={`q-${i}`} value={answers[i] ?? ""} onChange={(e) => {
                    const next = [...answers]; next[i] = e.target.value; setAnswers(next);
                  }} placeholder={t("answerPlaceholder")} rows={3} className="resize-none" />
                </div>
              ))}
            </div>

            <Footer>
              <Button variant="ghost" onClick={() => generate(round === 1 ? r1Qa : [...r1Qa, ...questions.map((q,i)=>({question:q, answer:answers[i]}))])} disabled={busy} className="gap-2">
                {t("skipQuestions")}
              </Button>
              <Button onClick={round === 1 ? submitRound1 : submitRound2OrGenerate} disabled={busy || answers.some((a) => !a.trim())} className="bg-primary hover:bg-primary/90 gap-2">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" />{t("generating")}</> : <><Wand2 className="w-4 h-4" />{round === 1 ? t("next") : t("generateBrief")}</>}
              </Button>
            </Footer>
          </StepCard>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">{t("briefReady")}</h2>
            </div>

            <BriefEditor value={brief} onChange={setBrief} lang={lang} />

            {/* Hidden render for PDF export */}
            <div ref={briefRef} dir={lang === "he" ? "rtl" : "ltr"} lang={lang} className="bg-card border border-border rounded-2xl p-8 shadow-soft brief-content whitespace-pre-wrap">
              <h1 className="text-2xl font-bold mb-2">{name}</h1>
              <p className="text-sm text-muted-foreground mb-6">{t(`deliverable${deliverable.charAt(0).toUpperCase() + deliverable.slice(1)}` as never)}</p>
              <hr className="mb-6 border-border" />
              <div className="leading-relaxed">{brief}</div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Button variant="outline" onClick={reset} className="gap-2">
                <RotateCcw className="w-4 h-4" />{t("startOver")}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={saveBrief} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {t("saveBrief")}
                </Button>
                <Button onClick={handleDownload} disabled={downloading} className="bg-primary hover:bg-primary/90 gap-2">
                  {downloading ? <><Loader2 className="w-4 h-4 animate-spin" />{t("preparingPdf")}</> : <><Download className="w-4 h-4" />{t("downloadPdf")}</>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const { t } = useI18n();
  const labels = [t("stepDetails"), t("stepInput"), t("stepInterview"), t("stepResult")];
  return (
    <div className="flex items-center gap-2 md:gap-4">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2 md:gap-4 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors",
                active && "bg-primary text-primary-foreground",
                done && "bg-primary/15 text-primary",
                !active && !done && "bg-secondary text-muted-foreground")}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : n}
              </div>
              <span className={cn("text-sm font-medium truncate hidden sm:inline", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            </div>
            {i < labels.length - 1 && <div className={cn("h-px flex-1 transition-colors", step > n ? "bg-primary/40" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-soft space-y-6">{children}</div>;
}
function Footer({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between pt-2 gap-3">{children}</div>;
}
function DeliverableOption({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; }) {
  return (
    <button type="button" onClick={onClick} className={cn("p-5 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center",
      active ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-card hover:border-primary/40")}>
      <Icon className={cn("w-6 h-6", active ? "text-primary" : "text-muted-foreground")} />
      <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </button>
  );
}
function NextArrow() { const { lang } = useI18n(); return lang === "he" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />; }
function BackArrow() { const { lang } = useI18n(); return lang === "he" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />; }
