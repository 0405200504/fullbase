import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null; userId?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      // Registrar login bem-sucedido
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await supabase.functions.invoke('log-login', {
            body: {
              userId: user.id,
              email: email,
              userAgent: navigator.userAgent,
              success: true,
            }
          });
        } catch (logError) {
          console.error('Erro ao registrar login:', logError);
          // Não falhar o login se o registro falhar
        }
      }
      
      return { error: null };
    } catch (error) {
      // Registrar tentativa de login falhada usando email como identificador
      try {
        await supabase.functions.invoke('log-login', {
          body: {
            email: email,
            userAgent: navigator.userAgent,
            success: false,
            failureReason: (error as Error).message,
          }
        });
      } catch (logError) {
        console.error('Erro ao registrar login falhado:', logError);
      }
      
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, nome: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome: nome,
          }
        }
      });
      
      if (error) throw error;
      
      // Enviar email de boas-vindas
      if (data.user) {
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: { nome, email }
          });
          console.log('Email de boas-vindas enviado com sucesso');
        } catch (emailError) {
          console.error('Erro ao enviar email de boas-vindas:', emailError);
          // Não falhar o signup se o email falhar
        }
      }
      
      return { error: null, userId: data.user?.id };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
