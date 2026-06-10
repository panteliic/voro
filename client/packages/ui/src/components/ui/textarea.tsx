import * as React from "react"

import { cn } from "../../utils/cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-voro-lg border border-line bg-card px-[var(--space-control-x)] py-[var(--space-control-y)] text-base text-content transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-action focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-0 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
