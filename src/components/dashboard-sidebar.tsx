import { Link, useRouterState } from "@tanstack/react-router";
import { FileText, Sparkles, Wand2, History } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n";

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { t, lang } = useI18n();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const items = [
    { title: t("navCreate"), url: "/dashboard", icon: Wand2, exact: true },
    { title: t("navStyle"), url: "/dashboard/style", icon: FileText, exact: false },
    { title: t("navHistory"), url: "/dashboard/history", icon: History, exact: false },
  ] as const;

  const isActive = (url: string, exact: boolean) =>
    exact ? currentPath === url : currentPath.startsWith(url);

  return (
    <Sidebar side={lang === "he" ? "right" : "left"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-base tracking-tight">{t("appName")}</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("workspace")}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url, item.exact)}
                    tooltip={item.title}
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
