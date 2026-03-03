import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";
import { useImpersonate } from "@/contexts/ImpersonateContext";

const ImpersonateBar = () => {
  const navigate = useNavigate();
  const { isImpersonating, impersonatedAccountName, exitImpersonate } = useImpersonate();

  const handleExit = async () => {
    await exitImpersonate();
    navigate("/superadmin/accounts");
  };

  if (!isImpersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <span className="font-medium">
          Você está visualizando como <strong>{impersonatedAccountName}</strong>
        </span>
      </div>
      <Button
        onClick={handleExit}
        variant="secondary"
        size="sm"
        className="bg-yellow-900 text-yellow-100 hover:bg-yellow-800"
      >
        Voltar ao Painel Super Admin
      </Button>
    </div>
  );
};

export default ImpersonateBar;
