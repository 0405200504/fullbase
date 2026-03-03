import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ImpersonateProvider } from "./contexts/ImpersonateContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";
import Layout from "./components/Layout";
import SuperAdminLayout from "./components/SuperAdminLayout";
import { useCallNotifications } from "@/hooks/useCallNotifications";
import { useLeadStagnationNotifications } from "@/hooks/useLeadStagnationNotifications";
import { lazy, Suspense, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  DashboardSkeleton, 
  PipelineSkeleton, 
  TableSkeleton, 
  ProfileSkeleton, 
  PerformanceSkeleton,
  CardGridSkeleton 
} from "@/components/skeletons";

// Lazy load all pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Leads = lazy(() => import("./pages/Leads"));
const Calls = lazy(() => import("./pages/Calls"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const FormBuilder = lazy(() => import("./pages/FormBuilder"));
const FormRunner = lazy(() => import("./pages/FormRunner"));
const ClosersPerformance = lazy(() => import("./pages/ClosersPerformance"));
const Produtos = lazy(() => import("./pages/Produtos"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const ConfigEtapas = lazy(() => import("./pages/ConfigEtapas"));
const Equipe = lazy(() => import("./pages/Equipe"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SuperAdminLogin = lazy(() => import("./pages/superadmin/SuperAdminLogin"));
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/SuperAdminDashboard"));
const SuperAdminAccounts = lazy(() => import("./pages/superadmin/SuperAdminAccounts"));
const SuperAdminLeads = lazy(() => import("./pages/superadmin/SuperAdminLeads"));
const Onboarding = lazy(() => import("./pages/superadmin/Onboarding"));
const Support = lazy(() => import("./pages/superadmin/Support"));
const TestAccounts = lazy(() => import("./pages/superadmin/TestAccounts"));
const SuperAdminAnalytics = lazy(() => import("./pages/superadmin/SuperAdminAnalytics"));
const SuperAdminSettings = lazy(() => import("./pages/superadmin/SuperAdminSettings"));
const SuperAdminPlans = lazy(() => import("./pages/superadmin/SuperAdminPlans"));
const StripeWebhookTest = lazy(() => import("./pages/superadmin/StripeWebhookTest"));
const RevenueRanking = lazy(() => import("./pages/superadmin/RevenueRanking"));
const Pricing = lazy(() => import("./pages/Pricing"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const Subscription = lazy(() => import("./pages/Subscription"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: "tween" as const,
  ease: [0.25, 0.1, 0.25, 1] as const,
  duration: 0.2,
};

const AnimatedPage = ({ children, skeleton }: { children: ReactNode; skeleton: ReactNode }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
        <Suspense fallback={skeleton}>{children}</Suspense>
      </motion.div>
    </AnimatePresence>
  );
};

const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  useCallNotifications();
  useLeadStagnationNotifications();
  return <>{children}</>;
};

const AppRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/pricing" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Suspense fallback={<CardGridSkeleton cards={3} />}><Pricing /></Suspense></motion.div>} />
        <Route path="/checkout/success" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Suspense fallback={<DashboardSkeleton />}><CheckoutSuccess /></Suspense></motion.div>} />
        
        {/* Form Runner (public) */}
        <Route path="/f/:slug" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Suspense fallback={<div className="min-h-screen" />}><FormRunner /></Suspense></motion.div>} />
        
        {/* Subscription */}
        <Route path="/subscription" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<CardGridSkeleton cards={3} />}><Subscription /></AnimatedPage></Layout></ProtectedRoute>} />
        
        {/* Auth Routes */}
        <Route path="/auth" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Suspense fallback={<div className="min-h-screen flex items-center justify-center"><DashboardSkeleton /></div>}><Auth /></Suspense></motion.div>} />
        <Route path="/reset-password" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Suspense fallback={<div className="min-h-screen flex items-center justify-center"><DashboardSkeleton /></div>}><ResetPassword /></Suspense></motion.div>} />
        
        {/* Super Admin Routes */}
        <Route path="/superadmin/login" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Suspense fallback={<DashboardSkeleton />}><SuperAdminLogin /></Suspense></motion.div>} />
        <Route path="/superadmin/dashboard" element={<SuperAdminRoute><SuperAdminLayout><AnimatedPage skeleton={<DashboardSkeleton />}><SuperAdminDashboard /></AnimatedPage></SuperAdminLayout></SuperAdminRoute>} />
        <Route path="/superadmin/accounts" element={<SuperAdminRoute><SuperAdminLayout><AnimatedPage skeleton={<TableSkeleton columns={6} />}><SuperAdminAccounts /></AnimatedPage></SuperAdminLayout></SuperAdminRoute>} />
        <Route path="/superadmin/leads" element={<SuperAdminRoute><SuperAdminLayout><AnimatedPage skeleton={<TableSkeleton columns={5} />}><SuperAdminLeads /></AnimatedPage></SuperAdminLayout></SuperAdminRoute>} />
        <Route path="/superadmin/onboarding" element={<SuperAdminRoute><SuperAdminLayout><AnimatedPage skeleton={<TableSkeleton columns={4} />}><Onboarding /></AnimatedPage></SuperAdminLayout></SuperAdminRoute>} />
        <Route path="/superadmin/support" element={<SuperAdminRoute><SuperAdminLayout><AnimatedPage skeleton={<TableSkeleton columns={4} />}><Support /></AnimatedPage></SuperAdminLayout></SuperAdminRoute>} />
        <Route path="/superadmin/test-accounts" element={<SuperAdminRoute><SuperAdminLayout><AnimatedPage skeleton={<TableSkeleton columns={4} />}><TestAccounts /></AnimatedPage></SuperAdminLayout></SuperAdminRoute>} />
        <Route path="/superadmin/analytics" element={<SuperAdminRoute><SuperAdminLayout><AnimatedPage skeleton={<PerformanceSkeleton />}><SuperAdminAnalytics /></AnimatedPage></SuperAdminLayout></SuperAdminRoute>} />
        <Route path="/superadmin/settings" element={<SuperAdminRoute><SuperAdminLayout><AnimatedPage skeleton={<CardGridSkeleton cards={4} />}><SuperAdminSettings /></AnimatedPage></SuperAdminLayout></SuperAdminRoute>} />
        <Route path="/superadmin/plans" element={<SuperAdminRoute><SuperAdminLayout><AnimatedPage skeleton={<CardGridSkeleton cards={3} />}><SuperAdminPlans /></AnimatedPage></SuperAdminLayout></SuperAdminRoute>} />
        <Route path="/superadmin/webhook-test" element={<SuperAdminRoute><SuperAdminLayout><AnimatedPage skeleton={<TableSkeleton columns={4} />}><StripeWebhookTest /></AnimatedPage></SuperAdminLayout></SuperAdminRoute>} />
        <Route path="/superadmin/ranking" element={<SuperAdminRoute><SuperAdminLayout><AnimatedPage skeleton={<TableSkeleton columns={6} />}><RevenueRanking /></AnimatedPage></SuperAdminLayout></SuperAdminRoute>} />

        {/* Regular Routes */}
        <Route path="/" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<DashboardSkeleton />}><Dashboard /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<PipelineSkeleton />}><Pipeline /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<TableSkeleton columns={6} />}><Leads /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/calls" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<TableSkeleton columns={5} />}><Calls /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<PerformanceSkeleton />}><Relatorios /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/forms" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<CardGridSkeleton cards={4} />}><FormBuilder /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/closers-performance" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<PerformanceSkeleton />}><ClosersPerformance /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/profile/:id" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<ProfileSkeleton />}><MemberProfile /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/meu-perfil" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<ProfileSkeleton />}><MyProfile /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/config-etapas" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<CardGridSkeleton cards={6} />}><ConfigEtapas /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/equipe" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<CardGridSkeleton cards={6} />}><Equipe /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/produtos" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<CardGridSkeleton cards={6} />}><Produtos /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<CardGridSkeleton cards={4} />}><Configuracoes /></AnimatedPage></Layout></ProtectedRoute>} />
        
        {/* Legacy redirects */}
        <Route path="/sales" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<PerformanceSkeleton />}><Relatorios /></AnimatedPage></Layout></ProtectedRoute>} />
        <Route path="/performance" element={<ProtectedRoute><Layout><AnimatedPage skeleton={<PerformanceSkeleton />}><Relatorios /></AnimatedPage></Layout></ProtectedRoute>} />
        
        <Route path="*" element={<motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}><Suspense fallback={<DashboardSkeleton />}><NotFound /></Suspense></motion.div>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ImpersonateProvider>
              <NotificationsProvider>
                <AppRoutes />
              </NotificationsProvider>
            </ImpersonateProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
