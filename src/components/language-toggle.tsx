import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLang(lang === "he" ? "en" : "he")}
      className="gap-2"
      aria-label="Toggle language"
    >
      <Languages className="w-4 h-4" />
      <span className="font-medium tracking-wide">{lang === "he" ? "EN" : "עב"}</span>
    </Button>
  );
}
