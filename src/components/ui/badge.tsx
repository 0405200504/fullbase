import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary shadow-[0_0_10px_rgba(143,255,0,0.15)] rounded-full",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full",
        destructive: "border-transparent bg-[var(--destructive)]/20 text-[#FD7570] rounded-full",
        outline: "text-foreground rounded-full",
        success: "bg-success text-success-foreground border-transparent shadow-[0_0_10px_rgba(143,255,0,0.2)]",
        warning: "bg-warning text-warning-foreground border-transparent",
        danger: "bg-danger text-danger-foreground border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
