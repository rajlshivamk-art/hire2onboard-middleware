import * as React from "react"
import { cn } from "./utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "glass-input flex h-9 w-full rounded-xl px-3 py-1 text-sm text-white/90",
        "placeholder:text-white/35",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
}

export { Input }