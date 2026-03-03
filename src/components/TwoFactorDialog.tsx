import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TwoFactorDialogProps {
  open: boolean;
  userId: string;
  email: string;
  nome: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorDialog = ({ open, userId, email, nome, onSuccess, onCancel }: TwoFactorDialogProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const sendCode = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-2fa-code', {
        body: { userId, email, nome }
      });

      if (error) throw error;
      toast.success("Código enviado para seu email!");
    } catch (error: any) {
      console.error('Erro ao enviar código 2FA:', error);
      toast.error("Erro ao enviar código. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (!code || code.length !== 6) {
      toast.error("Digite um código de 6 dígitos");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { userId, code }
      });

      if (error) throw error;

      if (data.valid) {
        toast.success("Código verificado com sucesso!");
        onSuccess();
      } else {
        toast.error(data.error || "Código inválido ou expirado");
        setCode("");
      }
    } catch (error: any) {
      console.error('Erro ao verificar código 2FA:', error);
      toast.error("Erro ao verificar código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // Enviar código automaticamente quando o dialog abrir
  useState(() => {
    if (open) {
      sendCode();
    }
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verificação em Duas Etapas 🔐</DialogTitle>
          <DialogDescription>
            Enviamos um código de 6 dígitos para <strong>{email}</strong>. Digite-o abaixo para completar seu login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código de Verificação</Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              disabled={loading || sending}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={verifyCode} 
              disabled={loading || sending || code.length !== 6}
              className="w-full"
            >
              {loading ? "Verificando..." : "Verificar Código"}
            </Button>

            <Button 
              variant="outline" 
              onClick={sendCode}
              disabled={loading || sending}
              className="w-full"
            >
              {sending ? "Enviando..." : "Reenviar Código"}
            </Button>

            <Button 
              variant="ghost" 
              onClick={onCancel}
              disabled={loading || sending}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            O código expira em 10 minutos
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
