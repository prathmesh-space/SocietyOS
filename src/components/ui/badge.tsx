import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2 tracking-wide uppercase"
  
  const variants = {
    default: "border-transparent bg-forest text-white shadow-soft-sm",
    secondary: "border-transparent bg-clay-light text-forest",
    destructive: "border-transparent bg-terracotta text-white shadow-soft-sm",
    outline: "text-forest border-stone",
    success: "border-transparent bg-sage text-white shadow-soft-sm",
    warning: "border-transparent bg-[#D99A5A] text-white shadow-soft-sm", // using a muted amber/gold
  }

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props} />
  )
}

export { Badge }
