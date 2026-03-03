import { Check, X } from "lucide-react";
import { validatePasswordStrength } from "@/lib/passwordValidation";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  if (!password) return null;

  const strength = validatePasswordStrength(password);

  return (
    <div className="mt-3 space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor:
                  level <= strength.score
                    ? strength.color
                    : "hsl(var(--border))",
              }}
            />
          ))}
        </div>
        <p
          className="text-xs font-medium"
          style={{ color: strength.color }}
        >
          Força da senha: {strength.label}
        </p>
      </div>

      {/* Criteria List */}
      <div className="space-y-1.5 text-xs">
        <CriteriaItem
          met={strength.criteria.minLength}
          text="Mínimo de 8 caracteres"
        />
        <CriteriaItem
          met={strength.criteria.hasUppercase}
          text="Pelo menos uma letra maiúscula"
        />
        <CriteriaItem
          met={strength.criteria.hasLowercase}
          text="Pelo menos uma letra minúscula"
        />
        <CriteriaItem
          met={strength.criteria.hasNumber}
          text="Pelo menos um número"
        />
        <CriteriaItem
          met={strength.criteria.hasSpecial}
          text="Pelo menos um caractere especial (!@#$%^&*)"
        />
      </div>
    </div>
  );
};

const CriteriaItem = ({ met, text }: { met: boolean; text: string }) => (
  <div className="flex items-center gap-2">
    {met ? (
      <Check className="h-3.5 w-3.5 text-green-500" />
    ) : (
      <X className="h-3.5 w-3.5 text-muted-foreground" />
    )}
    <span className={met ? "text-foreground" : "text-muted-foreground"}>
      {text}
    </span>
  </div>
);
