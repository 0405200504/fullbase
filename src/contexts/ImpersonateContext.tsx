import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface ImpersonateContextType {
  isImpersonating: boolean;
  impersonatedAccountId: string | null;
  impersonatedAccountName: string | null;
  effectiveAccountId: string | null;
  exitImpersonate: () => Promise<void>;
}

const ImpersonateContext = createContext<ImpersonateContextType | undefined>(undefined);

export const useImpersonate = () => {
  const context = useContext(ImpersonateContext);
  if (!context) {
    throw new Error("useImpersonate must be used within ImpersonateProvider");
  }
  return context;
};

export const ImpersonateProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedAccountId, setImpersonatedAccountId] = useState<string | null>(null);
  const [impersonatedAccountName, setImpersonatedAccountName] = useState<string | null>(null);
  const [userRealAccountId, setUserRealAccountId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Validate UUID format
  const isValidUUID = useCallback((id: string | null): boolean => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }, []);

  // Check if user is super_admin via server-side query
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        return;
      }

      try {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const hasSuperAdminRole = roles?.some(r => r.role === "super_admin") || false;
        setIsSuperAdmin(hasSuperAdminRole);
      } catch (error) {
        console.error("Error checking super admin status:", error);
        setIsSuperAdmin(false);
      }
    };

    checkSuperAdmin();
  }, [user]);

  // Validate impersonation state against server
  const validateImpersonation = useCallback(async (accountId: string): Promise<boolean> => {
    if (!user || !isSuperAdmin) return false;
    if (!isValidUUID(accountId)) return false;

    try {
      // Check if there's an active impersonate session in the database
      const { data: session, error } = await supabase
        .from("impersonate_sessions")
        .select("id, account_id")
        .eq("super_admin_id", user.id)
        .eq("account_id", accountId)
        .is("ended_at", null)
        .maybeSingle();

      if (error) {
        console.error("Error validating impersonation:", error);
        return false;
      }

      return !!session;
    } catch (error) {
      console.error("Error validating impersonation:", error);
      return false;
    }
  }, [user, isSuperAdmin, isValidUUID]);

  // Clear impersonation state
  const clearImpersonationState = useCallback(() => {
    localStorage.removeItem("impersonate_mode");
    localStorage.removeItem("impersonate_account");
    setIsImpersonating(false);
    setImpersonatedAccountId(null);
    setImpersonatedAccountName(null);
  }, []);

  useEffect(() => {
    const checkImpersonateMode = async () => {
      const impersonateMode = localStorage.getItem("impersonate_mode");
      const accountId = localStorage.getItem("impersonate_account");

      // Early exit if no impersonation is set or user not loaded
      if (impersonateMode !== "true" || !accountId || !user) {
        clearImpersonationState();
        return;
      }

      // Validate UUID format
      if (!isValidUUID(accountId)) {
        console.warn("Invalid account ID format in localStorage, clearing impersonation");
        clearImpersonationState();
        return;
      }

      // Only allow impersonation for super_admins
      if (!isSuperAdmin) {
        console.warn("Non-super_admin attempted to use impersonation, clearing state");
        clearImpersonationState();
        return;
      }

      // Validate impersonation session exists in database
      const isValid = await validateImpersonation(accountId);
      if (!isValid) {
        console.warn("No valid impersonation session found, clearing state");
        clearImpersonationState();
        return;
      }

      // Impersonation is valid, set state
      setIsImpersonating(true);
      setImpersonatedAccountId(accountId);

      // Fetch account name
      const { data: account } = await supabase
        .from("accounts")
        .select("nome_empresa")
        .eq("id", accountId)
        .single();

      if (account) {
        setImpersonatedAccountName(account.nome_empresa);
      }
    };

    // Only run check when we know the super admin status
    if (user) {
      checkImpersonateMode();
    }
    
    // Listener for localStorage changes (sync between tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "impersonate_mode" || e.key === "impersonate_account") {
        checkImpersonateMode();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user, isSuperAdmin, isValidUUID, validateImpersonation, clearImpersonationState]);

  // Fetch user's real account_id
  useEffect(() => {
    const fetchUserAccountId = async () => {
      if (!user) {
        setUserRealAccountId(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserRealAccountId(profile.account_id);
      }
    };

    fetchUserAccountId();
  }, [user]);

  const exitImpersonate = async () => {
    // Clear localStorage first
    localStorage.removeItem("impersonate_mode");
    localStorage.removeItem("impersonate_account");

    // End impersonate session in database
    if (user) {
      await supabase
        .from("impersonate_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("super_admin_id", user.id)
        .is("ended_at", null);
    }

    setIsImpersonating(false);
    setImpersonatedAccountId(null);
    setImpersonatedAccountName(null);
  };

  // Effective account_id is the impersonated account if in impersonate mode,
  // otherwise it's the user's real account_id
  // Only allow impersonation for super_admins
  const effectiveAccountId = (isImpersonating && isSuperAdmin) ? impersonatedAccountId : userRealAccountId;

  const value = {
    isImpersonating: isImpersonating && isSuperAdmin,
    impersonatedAccountId,
    impersonatedAccountName,
    effectiveAccountId,
    exitImpersonate,
  };

  return (
    <ImpersonateContext.Provider value={value}>
      {children}
    </ImpersonateContext.Provider>
  );
};
