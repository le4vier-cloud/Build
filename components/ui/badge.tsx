import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[#1D1D1F] text-white",
        secondary:   "bg-[#F5F5F7] text-[#1D1D1F]",
        destructive: "bg-[#FF3B30] text-white",
        outline:     "border border-[#E5E5EA] text-[#1D1D1F]",
        accent:      "bg-[#FFF0E6] text-[#F56300]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
