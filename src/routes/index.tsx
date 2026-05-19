import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Wand2, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">StudioBrief Pro</span>
          </div>
          <Link to="/auth">
            <Button variant="default" className="bg-primary hover:bg-primary/90">
              הרשמה / התחברות
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section
          className="relative overflow-hidden"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="mx-auto max-w-5xl px-6 py-24 md:py-36 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 border border-border text-sm text-slate-deep mb-8 shadow-soft">
              <Wand2 className="w-3.5 h-3.5" />
              <span>AI לצוותי שיווק וקריאייטיב</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              הופכים הערות מבולבלות
              <br />
              <span className="text-primary">לבריפים מקצועיים בשניות</span>
            </h1>
            <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              כלי חכם לצוותי שיווק שמשתמש בסגנון הייחודי שלך כדי לייצר בריפים מושלמים לסטודיו.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base shadow-elegant"
                >
                  התחילו בחינם
                </Button>
              </Link>
              <a href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 h-12 text-base border-border"
                >
                  גלו עוד
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-background">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                בריף מושלם, בלי הכאב ראש
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">
                שלוש סיבות מדוע צוותי שיווק עוברים ל-StudioBrief Pro
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: FileText,
                  title: "סגנון אישי",
                  desc: "המערכת לומדת את הטון, הפורמט והשפה הייחודית של הצוות שלך.",
                },
                {
                  icon: Zap,
                  title: "מהירות שלא הכרת",
                  desc: "מהזרקת רעיונות גולמית לבריף מובנה ומקצועי תוך פחות מדקה.",
                },
                {
                  icon: Sparkles,
                  title: "מוכן לסטודיו",
                  desc: "פלט מובנה, ברור ומדויק שהמעצבים יודעים לרוץ איתו ישר.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="p-8 rounded-2xl bg-card border border-border shadow-soft hover:shadow-elegant transition-shadow"
                >
                  <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center mb-5">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              מוכנים לייצר בריף ראשון?
            </h2>
            <p className="mt-4 text-primary-foreground/80 text-lg">
              הצטרפו לצוותים שכבר חוסכים שעות עבודה בכל שבוע.
            </p>
            <Link to="/auth" className="inline-block mt-8">
              <Button
                size="lg"
                variant="secondary"
                className="px-8 h-12 text-base bg-background text-foreground hover:bg-background/90"
              >
                צרו חשבון עכשיו
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} StudioBrief Pro. כל הזכויות שמורות.
        </div>
      </footer>
    </div>
  );
}
