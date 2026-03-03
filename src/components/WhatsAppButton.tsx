import { MessageCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatWhatsAppUrl } from "@/lib/whatsappUtils";

interface WhatsAppButtonProps {
  telefone: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const WhatsAppButton = ({ telefone, size = "md", className = "" }: WhatsAppButtonProps) => {
  const whatsappUrl = formatWhatsAppUrl(telefone);
  
  if (!whatsappUrl) return null;
  
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };
  
  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className={`inline-flex items-center justify-center rounded-full bg-[#25D366] text-white hover:bg-[#1fb855] transition-colors ${sizeClasses[size]} ${className}`}
          >
            <MessageCircle size={iconSizes[size]} />
          </a>
        </TooltipTrigger>
        <TooltipContent>
          <p>Conversar no WhatsApp</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
