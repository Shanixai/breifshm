import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "he" | "en";

type Dict = Record<string, { he: string; en: string }>;

const DICT: Dict = {
  appName: { he: "StudioBrief Pro", en: "StudioBrief Pro" },
  navCreate: { he: "בריף חדש", en: "Create New Brief" },
  navStyle: { he: "פרופיל הסגנון שלי", en: "My Style Profile" },
  navHistory: { he: "היסטוריית בריפים", en: "Brief History" },
  workspace: { he: "סביבת עבודה", en: "Workspace" },
  logout: { he: "התנתקות", en: "Sign out" },
  language: { he: "שפה", en: "Language" },

  createTitle: { he: "בריף חדש", en: "Create New Brief" },
  createSubtitle: {
    he: "הזרימו רעיונות, הערות ובלגן — נחזיר לכם בריף מובנה ומוכן לסטודיו.",
    en: "Drop in your raw notes — get a polished, studio-ready brief in seconds.",
  },
  projectName: { he: "שם הפרויקט", en: "Project name" },
  projectPlaceholder: { he: "קמפיין השקה לקיץ 2026", en: "Summer 2026 Launch Campaign" },
  rawNotes: { he: "הערות גולמיות", en: "Raw notes" },
  rawNotesPlaceholder: {
    he: "הדביקו כאן הכל — מיילים, סיכומי שיחה, רעיונות בודדים…",
    en: "Paste anything — emails, meeting notes, half-formed ideas…",
  },
  generate: { he: "צרו בריף", en: "Generate brief" },

  // Wizard
  step: { he: "שלב", en: "Step" },
  of: { he: "מתוך", en: "of" },
  stepDetails: { he: "פרטים", en: "Details" },
  stepInput: { he: "קלט", en: "Input" },
  stepInterview: { he: "ראיון AI", en: "AI Interview" },
  stepResult: { he: "הבריף", en: "Brief" },
  deliverableType: { he: "סוג התוצר", en: "Deliverable type" },
  deliverableVideo: { he: "וידאו", en: "Video" },
  deliverableSocial: { he: "סושיאל", en: "Social" },
  deliverableDesign: { he: "דיזיין", en: "Design" },
  next: { he: "המשך", en: "Next" },
  back: { he: "חזרה", en: "Back" },
  startOver: { he: "התחלה מחדש", en: "Start over" },
  thinking: { he: "ה-AI חושב…", en: "AI is thinking…" },
  generating: { he: "יוצר את הבריף…", en: "Generating brief…" },
  interviewIntro: {
    he: "ה-AI עיין בפרופיל הסגנון שלך ובדוגמאות הזהב — וגיבש 3 שאלות הבהרה.",
    en: "The AI reviewed your style profile and gold standard examples — here are 3 clarifying questions.",
  },
  answerPlaceholder: { he: "התשובה שלך…", en: "Your answer…" },
  generateBrief: { he: "צרו את הבריף", en: "Generate Brief" },
  briefReady: { he: "הבריף מוכן ✨", en: "Your brief is ready ✨" },
  downloadPdf: { he: "הורידו PDF", en: "Download PDF" },
  preparingPdf: { he: "מכין PDF…", en: "Preparing PDF…" },
  aiError: { he: "שגיאה ביצירה. נסו שוב.", en: "Generation failed. Please try again." },

  styleTitle: { he: "פרופיל הסגנון שלי", en: "My Style Profile" },
  styleSubtitle: {
    he: "ככל שתעדכנו את הפרופיל, הבריפים שייווצרו יתאימו יותר לטון ולקוד הוויזואלי שלכם.",
    en: "The more you tune your profile, the more every brief sounds like you.",
  },
  brandVoice: { he: "קול וסגנון המותג", en: "Brand Voice & Style" },
  brandVoiceHint: {
    he: 'הוראות סגנון לדוגמה: "תמיד להשתמש ב-bullet points", "טון אנרגטי וצעיר".',
    en: 'Style instructions, e.g. "Always use bullet points", "Tone is edgy and young".',
  },
  brandVoicePlaceholder: {
    he: "תארו את הטון, הפורמט, הביטויים האהובים והאיסורים…",
    en: "Describe tone, format, favourite phrases, things to avoid…",
  },
  goldStandard: { he: "דוגמאות זהב", en: "Gold Standard Examples" },
  goldStandardHint: {
    he: "הדביקו עד שלושה מהבריפים הטובים ביותר שלכם — הם ישמשו כעוגן סגנוני.",
    en: "Paste up to three of your best previous briefs — they anchor the AI's style.",
  },
  example: { he: "דוגמה", en: "Example" },
  examplePlaceholder: {
    he: "הדביקו כאן בריף איכותי לדוגמה…",
    en: "Paste a high-quality reference brief here…",
  },
  saveProfile: { he: "שמרו פרופיל", en: "Save Profile" },
  profileSaved: { he: "הפרופיל נשמר בהצלחה!", en: "Profile saved successfully!" },
  loadingProfile: { he: "טוען פרופיל…", en: "Loading profile…" },

  historyTitle: { he: "היסטוריית בריפים", en: "Brief History" },
  historySubtitle: {
    he: "כל הבריפים שייצרתם יופיעו כאן.",
    en: "Every brief you generate will live here.",
  },
  emptyHistory: { he: "עדיין אין בריפים. צרו את הראשון בלשונית 'בריף חדש'.", en: "No briefs yet. Create your first one from 'Create New Brief'." },

  // References library
  refLibTitle: { he: "ספריית רפרנסים", en: "Reference Library" },
  refLibSubtitle: {
    he: "העלו תבניות, בריפים קודמים, תמונות השראה וקישורים — ה-AI ישתמש בהם בכל בריף.",
    en: "Upload templates, past briefs, inspiration images, and links — the AI will use them in every brief.",
  },
  refUpload: { he: "העלאת קבצים", en: "Upload files" },
  refAddText: { he: "הוספת טקסט", en: "Add text" },
  refAddUrl: { he: "הוספת קישור", en: "Add link" },
  refEmpty: { he: "אין רפרנסים עדיין. העלו את הראשון.", en: "No references yet. Upload your first." },
  refTooLarge: { he: "הקובץ גדול מ-20MB", en: "File exceeds 20MB" },
  refTextDefault: { he: "טקסט רפרנס", en: "Reference text" },
  refTextNamePlaceholder: { he: "שם הרפרנס…", en: "Reference name…" },
  refTextPlaceholder: { he: "הדביקו טקסט להשראה…", en: "Paste reference text…" },
  refUrlNamePlaceholder: { he: "תיאור הקישור…", en: "Link description…" },
  refAttachTitle: { he: "צירוף רפרנסים לבריף הזה", en: "Attach references to this brief" },
  refAttachSubtitle: {
    he: "סמנו רפרנסים מהספרייה שישפיעו על הבריף הנוכחי.",
    en: "Pick references from your library to inform this brief.",
  },
  cancel: { he: "ביטול", en: "Cancel" },
  add: { he: "הוספה", en: "Add" },
  loading: { he: "טוען…", en: "Loading…" },

  // AI thinking panel
  aiThinking: { he: "תהליך החשיבה של ה-AI", en: "AI thinking process" },
  aiThinkingSubtitle: {
    he: "צפו בשלבים שה-AI עובר כדי לבנות את הבריף שלכם.",
    en: "Watch the stages the AI works through to build your brief.",
  },
  stageAnalyze: { he: "ניתוח החומר", en: "Analyzing material" },
  stageGaps: { he: "זיהוי פערים ושאלות הבהרה", en: "Identifying gaps & questions" },
  stageRefine: { he: "חידוד ושאלות המשך", en: "Refining & follow-up" },
  stageDraft: { he: "כתיבת הבריף", en: "Drafting the brief" },
  round: { he: "סבב", en: "Round" },
  skipQuestions: { he: "דלגו וצרו בריף", en: "Skip & generate brief" },
  noMoreQuestions: { he: "אין שאלות נוספות — מוכנים ליצירה.", en: "No more questions — ready to generate." },

  // Editor
  saveBrief: { he: "שמירת הבריף", en: "Save brief" },
  briefSaved: { he: "הבריף נשמר בהצלחה!", en: "Brief saved successfully!" },
  askAiOnSelection: { he: "ערוך עם AI", en: "Ask AI" },
  askAiOnFull: { he: "ערוך את כל הבריף", en: "Ask AI to edit whole brief" },
  askAiHint: { he: "בחרו פעולה מהירה או הזינו הוראה משלכם.", en: "Pick a quick action or write your own instruction." },
  selectionHint: { he: "סמנו טקסט בעורך כדי לערוך אותו עם AI.", en: "Select text in the editor to edit it with AI." },
  selectionActive: { he: "טקסט נבחר — מוכן לעריכה.", en: "Selection captured — ready to edit." },
  quickShorten: { he: "קצרו", en: "Shorten" },
  quickFormal: { he: "פורמלי יותר", en: "More formal" },
  quickPunchier: { he: "חד יותר", en: "Punchier" },
  quickExpand: { he: "הרחיבו", en: "Expand" },
  customInstructionPlaceholder: { he: "הוראה משלכם…", en: "Your own instruction…" },
  applyEdit: { he: "החל", en: "Apply" },
  fullEditPlaceholder: {
    he: "למשל: הוסיפו סעיף תקציב, החליפו את הטון לחגיגי יותר…",
    en: "e.g. add a budget section, change the tone to more celebratory…",
  },
  aiEditApplied: { he: "העריכה הוחלה.", en: "Edit applied." },

  // History
  historyOpen: { he: "פתח", en: "Open" },
  historyDelete: { he: "מחק", en: "Delete" },
  historyDeleted: { he: "הבריף נמחק.", en: "Brief deleted." },
};


interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("he");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (saved === "he" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (key: keyof typeof DICT) => DICT[key]?.[lang] ?? String(key);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used within I18nProvider");
  return v;
}
