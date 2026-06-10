import * as React from "react"

import { cn } from "../../utils/cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-voro-lg border border-line bg-card px-[var(--space-control-x)] py-[var(--space-control-y)] text-base text-content transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-content placeholder:text-muted-foreground focus-visible:border-action focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-0 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
