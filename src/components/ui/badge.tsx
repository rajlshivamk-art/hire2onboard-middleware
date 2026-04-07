import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border border-white/20 px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-cyan-400 focus-visible:ring-cyan-400/20 focus-visible:ring-[3px] aria-invalid:ring-rose-400/20 dark:aria-invalid:ring-rose-400/40 aria-invalid:border-rose-400 transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-cyan-500/30 bg-cyan-500/20 text-cyan-300 [a&]:hover:bg-cyan-500/30",
        secondary:
          "border-slate-600/50 bg-slate-600/30 text-slate-300 [a&]:hover:bg-slate-600/50",
        destructive:
          "border-rose-500/30 bg-rose-500/20 text-rose-300 [a&]:hover:bg-rose-500/30 focus-visible:ring-rose-400/20 dark:focus-visible:ring-rose-400/40",
        outline:
          "text-white/80 border-white/30 [a&]:hover:bg-white/10 [a&]:hover:text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
