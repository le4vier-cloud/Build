import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:   "bg-[#1D1D1F] text-white hover:bg-[#3a3a3c]",
        outline:   "border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]",
        ghost:     "hover:bg-[#F5F5F7] text-[#1D1D1F]",
        secondary: "bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E5E5EA]",
        destructive: "bg-[#FF3B30] text-white hover:bg-[#ff2d20]",
        link:      "text-[#F56300] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm:      "h-8 px-3 text-xs",
        lg:      "h-11 px-8",
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
