import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-500 text-white border border-cyan-400/30 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30",
        destructive:
          "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 hover:text-rose-200",
        outline:
          "bg-white/5 text-white/80 border border-white/20 hover:bg-white/10 hover:text-white hover:border-white/30",
        secondary:
          "bg-slate-600/30 text-white/80 border border-slate-500/30 hover:bg-slate-600/50 hover:text-white",
        ghost:
          "text-white/70 hover:bg-white/10 hover:text-white/90",
        link:
          "text-cyan-400 underline-offset-4 hover:underline hover:text-cyan-300",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 rounded-lg px-3 text-xs",
        lg:      "h-11 rounded-xl px-8",
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
} & VariantProps<typeof buttonVariants>) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }