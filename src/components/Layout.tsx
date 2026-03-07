import { ReactNode, useCallback } from "react";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Workflow, Users, Phone, BarChart3, LogOut, UserCog, Package, Settings, User, CreditCard, Menu, X, Moon, Sun, FileText, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "./ui/button";
import { NotificationBell } from "./NotificationBell";
import ImpersonateBar from "./ImpersonateBar";
import { SupportChatWidget } from "./SupportChatWidget";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const routePrefetchMap: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Dashboard"),
  "/pipeline": () => import("@/pages/Pipeline"),
  "/leads": () => import("@/pages/Leads"),
  "/produtos": () => import("@/pages/Produtos"),
  "/calls": () => import("@/pages/Calls"),
  "/relatorios": () => import("@/pages/Relatorios"),
  "/equipe": () => import("@/pages/Equipe"),
  "/meu-perfil": () => import("@/pages/MyProfile"),
  "/subscription": () => import("@/pages/Subscription"),
  "/configuracoes": () => import("@/pages/Configuracoes"),
  "/forms": () => import("@/pages/FormBuilder"),
};

const prefetchedRoutes = new Set<string>();

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pipeline", label: "Pipeline", icon: Workflow },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/forms", label: "Formulários", icon: FileText },
  { to: "/equipe", label: "Equipe", icon: UserCog },
  { to: "/meu-perfil", label: "Perfil", icon: User },
  { to: "/subscription", label: "Assinatura", icon: CreditCard },
  { to: "/configuracoes", label: "Config", icon: Settings },
];

const Layout = ({ children }: LayoutProps) => {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handlePrefetch = useCallback((route: string) => {
    if (prefetchedRoutes.has(route)) return;
    const prefetchFn = routePrefetchMap[route];
    if (prefetchFn) {
      prefetchedRoutes.add(route);
      prefetchFn();
    }
  }, []);

  const isDark = theme === "dark";

  return (
    <>
      <ImpersonateBar />
      <div className="flex min-h-screen w-full bg-background font-sans transition-colors duration-300">
        {/* Desktop Sidebar Navigation */}
        {!isMobile && (
          <aside className="w-64 border-r border-border bg-card flex flex-col sticky top-0 h-screen shadow-[1px_0_0_rgba(0,0,0,0.02)] transition-colors duration-300">
            {/* Logo Section */}
            <div className="p-8 border-b border-border/60 flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center">
                <img src="/images/fullbase_logo.png" alt="FullBase Logo" className="h-8 w-8 object-contain brightness-0 invert" />
              </div>
              <span className="text-xl font-black tracking-tighter text-foreground uppercase">
                Full<span className="text-primary italic">Base</span>
              </span>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
                  activeClassName="bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary hover:text-white"
                  onMouseEnter={() => handlePrefetch(item.to)}
                  onFocus={() => handlePrefetch(item.to)}
                >
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={2.5} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-6 border-t border-border/60 space-y-5 bg-muted/20">
              <div className="px-1 flex items-center justify-between">
                <button
                  onClick={toggleTheme}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background hover:shadow-sm border border-transparent hover:border-border transition-all"
                  title={isDark ? "Modo claro" : "Modo escuro"}
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  <button
                    onClick={signOut}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 px-1">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xs shadow-md shadow-primary/10">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-foreground truncate uppercase tracking-tight">{user?.email?.split('@')[0]}</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Acesso Master</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Mobile Sidebar */}
        {isMobile && (
          <div className="fixed inset-0 z-50 flex pointer-events-none">
            {mobileOpen && (
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity pointer-events-auto"
                onClick={() => setMobileOpen(false)}
              />
            )}
            <aside
              className={cn(
                "relative w-[300px] bg-background h-full flex flex-col shadow-2xl transition-transform duration-300 pointer-events-auto",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
              )}
            >
              <div className="flex items-center justify-between px-8 py-8 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <img src="/images/fullbase_logo.png" alt="FullBase Logo" className="h-7 w-7 object-contain brightness-0 invert" />
                  </div>
                  <span className="text-xl font-black tracking-tighter text-foreground uppercase">
                    Full<span className="text-primary italic">Base</span>
                  </span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/30 hover:bg-muted text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-6 py-8 space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-[15px] font-bold text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
                    activeClassName="bg-primary text-white shadow-xl shadow-primary/20"
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon className="w-5 h-5" strokeWidth={2.5} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="p-8 border-t border-border/60 space-y-4 bg-muted/10">
                <Button onClick={signOut} variant="outline" className="w-full h-12 rounded-xl gap-2 text-danger border-danger/20 hover:bg-danger/10 hover:text-danger font-bold">
                  <LogOut className="w-4 h-4" />
                  Sair do FullBase
                </Button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Top Bar for Mobile */}
          {isMobile && (
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/60 flex items-center justify-between px-6 h-18 shadow-sm">
              <button
                onClick={() => setMobileOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted text-foreground transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center">
                  <img src="/images/fullbase_logo.png" alt="FullBase Logo" className="h-6 w-6 object-contain brightness-0 invert" />
                </div>
                <span className="text-lg font-black tracking-tighter text-foreground uppercase">
                  Full<span className="text-primary italic">Base</span>
                </span>
              </div>
              <div className="w-10 h-10 flex items-center justify-center">
                <NotificationBell />
              </div>
            </header>
          )}

          <div
            className={cn(
              "flex-1 px-4 pb-20 md:px-10 md:pb-12 max-w-7xl mx-auto w-full",
              !isMobile && "pt-12"
            )}
          >
            {children}
          </div>
        </main>
      </div>

      <SupportChatWidget />
    </>
  );
};

export default Layout;
