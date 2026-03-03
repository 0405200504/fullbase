export interface PasswordStrength {
  score: number; // 0-5
  label: string;
  color: string;
  criteria: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export const validatePasswordStrength = (password: string): PasswordStrength => {
  const criteria = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const score = Object.values(criteria).filter(Boolean).length;

  const labels = [
    { label: "Muito Fraca", color: "hsl(var(--destructive))" },
    { label: "Fraca", color: "#f97316" },
    { label: "Média", color: "#eab308" },
    { label: "Boa", color: "#22c55e" },
    { label: "Forte", color: "#10b981" },
  ];

  const strengthLabel = score === 0 ? labels[0] : labels[score - 1];

  return {
    score,
    label: strengthLabel.label,
    color: strengthLabel.color,
    criteria,
  };
};
