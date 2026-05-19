import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { I18nProvider, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayoutWrapper,
});

function DashboardLayoutWrapper() {
  return (
    <I18nProvider>
      <DashboardLayout />
    </I18nProvider>
  );
}

function DashboardLayout() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate({ to: "/auth" });
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
      } else {
        setUser(data.session.user);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(lang === "he" ? "התנתקת בהצלחה" : "Signed out");
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">{lang === "he" ? "טוען…" : "Loading…"}</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 gap-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t("logout")}</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 px-4 md:px-8 py-8 md:py-10">
            <div className="mx-auto max-w-5xl animate-in fade-in duration-300">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
