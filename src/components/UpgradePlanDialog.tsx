import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Zap } from "lucide-react";

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan?: string;
  maxLeads?: number;
}

export const UpgradePlanDialog = ({ 
  open, 
  onOpenChange,
  currentPlan = "Free",
  maxLeads = 25
}: UpgradePlanDialogProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">Limite de Leads Atingido</DialogTitle>
          </div>
          <DialogDescription className="text-base space-y-3 pt-2">
            <p>
              Você atingiu o limite de <strong>{maxLeads} leads</strong> do plano <strong>{currentPlan}</strong>.
            </p>
            <p className="text-muted-foreground">
              Faça upgrade para desbloquear mais leads e continuar crescendo seu negócio!
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-2 pt-4">
          <Button onClick={handleUpgrade} className="w-full btn-premium gap-2">
            <TrendingUp className="h-4 w-4" />
            Ver Planos e Fazer Upgrade
          </Button>
          <Button 
            onClick={() => onOpenChange(false)} 
            variant="outline" 
            className="w-full"
          >
            Agora Não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
