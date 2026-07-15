import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
  
  const variants = {
    default: "border-transparent bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200",
    destructive: "border-transparent bg-red-500 text-white hover:bg-red-600 shadow-sm",
    outline: "text-slate-950",
    success: "border-transparent bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
    warning: "border-transparent bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
  }

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props} />
  )
}

export { Badge }
