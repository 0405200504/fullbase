import { ReactNode, useCallback } from "react";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Workflow, Users, Phone, BarChart3, LogOut, UserCog, Package, Settings, User, CreditCard, Menu, X, Moon, Sun, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "./ui/button";
import { NotificationBell } from "./NotificationBell";
import ImpersonateBar from "./ImpersonateBar";
import { SupportChatWidget } from "./SupportChatWidget";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import logoBlack from "@/assets/high-leads-logo.png";
import logoWhite from "@/assets/high-leads-logo-white.png";
import iconBlack from "@/assets/high-leads-icon.png";
import iconWhite from "@/assets/high-leads-logo-white.png";

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
      <div className="flex min-h-screen w-full bg-background font-sans">
        {/* Desktop Floating Pill Navigation */}
        {!isMobile && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
            <TooltipProvider delayDuration={0}>
              <nav className="flex items-center gap-2 px-2 py-2 bg-card/80 backdrop-blur-2xl border border-border/20 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                {/* Logo */}
                <div className="flex items-center justify-center pl-4 pr-6 border-r border-border/20">
                  <img alt="High Leads" className="h-6 w-auto object-contain" src={logoWhite} />
                </div>

                {/* Nav Items */}
                <div className="flex items-center gap-1 px-4 border-r border-border/20">
                  {navItems.map((item) => (
                    <Tooltip key={item.to}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.to}
                          end={item.to === "/"}
                          className="flex items-center justify-center w-11 h-11 rounded-full text-muted-foreground hover:text-foreground transition-all duration-300"
                          activeClassName="bg-primary text-black font-bold shadow-[0_0_20px_rgba(143,255,0,0.4)]"
                          onMouseEnter={() => handlePrefetch(item.to)}
                          onFocus={() => handlePrefetch(item.to)}
                        >
                          <item.icon className="w-[18px] h-[18px]" strokeWidth={2.5} />
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[12px] mt-2 bg-card text-foreground border-border/20 rounded-xl">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                {/* Footer / Actions */}
                <div className="flex items-center gap-1 px-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={toggleTheme}
                        className="flex items-center justify-center w-11 h-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      >
                        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[12px] mt-2 bg-card text-foreground border-border/20 rounded-xl">
                      {isDark ? "Modo claro" : "Modo escuro"}
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center justify-center w-11 h-11">
                    <NotificationBell />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={signOut}
                        className="flex items-center justify-center w-11 h-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[12px] mt-2 bg-card text-foreground border-border/20 rounded-xl">
                      Sair
                    </TooltipContent>
                  </Tooltip>
                </div>
              </nav>
            </TooltipProvider>
          </div>
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative w-[280px] bg-[#1D2125] h-full flex flex-col shadow-2xl border-r border-white/5"
              style={{ animationName: 'none', transform: 'translateX(0)' }}
            >
              <div className="flex items-center justify-between px-6 py-6 border-b border-white/5">
                <img alt="High Leads" className="h-7" src={logoWhite} />
                <button onClick={() => setMobileOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[15px] font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
                    activeClassName="bg-[#8FFF00] text-black font-bold shadow-[0_0_20px_rgba(143,255,0,0.3)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="p-6 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between bg-black/20 p-3 rounded-2xl">
                  <p className="text-xs text-white/60 truncate flex-1 font-medium">{user?.email}</p>
                </div>
                <Button onClick={signOut} variant="outline" size="lg" className="w-full gap-2 rounded-full text-[14px] bg-white/5 border-none text-white hover:bg-red-500 hover:text-white transition-colors">
                  <LogOut className="w-4 h-4" />
                  Sair do Sistema
                </Button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto w-full relative">
          {isMobile && (
            <div
              className="sticky top-0 z-40 bg-card/70 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-5 h-[72px] shadow-sm"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px))' }}
            >
              <button
                onClick={() => setMobileOpen(true)}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center justify-center">
                <img alt="High Leads" className="h-[22px]" src={logoWhite} />
              </div>
              <div className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <NotificationBell />
              </div>
            </div>
          )}

          <div
            className="px-4 pb-32 md:px-12 md:pb-12 max-w-[1600px] mx-auto min-h-screen"
            style={{ paddingTop: isMobile ? '2rem' : '8rem' }}
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
