import { ReactNode } from "react";
import { LayoutDashboard, Building2, BarChart3, Settings, LogOut, MessageCircle, ClipboardList, UserCheck, CreditCard, Webhook, Trophy, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "./NavLink";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface SuperAdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/superadmin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/superadmin/accounts", icon: Building2, label: "Contas" },
  { to: "/superadmin/ranking", icon: Trophy, label: "Ranking" },
  { to: "/superadmin/leads", icon: UserCheck, label: "Leads" },
  { to: "/superadmin/onboarding", icon: ClipboardList, label: "Onboarding" },
  { to: "/superadmin/support", icon: MessageCircle, label: "Suporte" },
  { to: "/superadmin/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/superadmin/plans", icon: CreditCard, label: "Planos" },
  { to: "/superadmin/webhook-test", icon: Webhook, label: "Teste Webhook" },
  { to: "/superadmin/settings", icon: Settings, label: "Configurações" },
];

const SuperAdminLayout = ({ children }: SuperAdminLayoutProps) => {
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar — 200px */}
      {!isMobile && (
        <aside className="hidden md:flex flex-col w-[200px] bg-card border-r border-border/40 sticky top-0 h-screen">
          {/* Logo */}
          <div className="px-5 py-5">
            <div className="flex items-center gap-2">
              <img alt="Logo" className="h-8" src="/lovable-uploads/18cf9296-7bab-4bf3-9537-56f621b354fd.png" />
              <div>
                <h2 className="font-bold text-[14px]">Super Admin</h2>
                <p className="text-[10px] text-muted-foreground">HighLeads</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                activeClassName="bg-foreground text-background hover:bg-foreground"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-3 space-y-2">
            <Separator className="mb-2" />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start text-destructive hover:text-destructive rounded-lg text-[12px]"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sair
            </Button>
          </div>
        </aside>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[260px] bg-card h-full flex flex-col apple-shadow-xl">
            <div className="flex items-center justify-between px-5 py-5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <img alt="Logo" className="h-8" src="/lovable-uploads/18cf9296-7bab-4bf3-9537-56f621b354fd.png" />
                <span className="font-bold text-[14px]">Super Admin</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  activeClassName="bg-foreground text-background"
                  onClick={() => setMobileOpen(false)}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-border/40">
              <Button onClick={signOut} variant="outline" size="sm" className="w-full gap-2 rounded-lg text-[12px]">
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        {isMobile && (
          <div className="sticky top-0 z-40 glass flex items-center justify-between px-4 h-16">
            <button onClick={() => setMobileOpen(true)} className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-secondary">
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-[14px]">Super Admin</span>
            <div className="w-11" />
          </div>
        )}
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
