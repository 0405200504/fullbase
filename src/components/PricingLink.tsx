import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { CreditCard } from "lucide-react";

export const PricingLink = () => {
  return (
    <Link to="/pricing">
      <Button variant="outline" size="sm" className="gap-2">
        <CreditCard className="h-4 w-4" />
        Ver Planos
      </Button>
    </Link>
  );
};
