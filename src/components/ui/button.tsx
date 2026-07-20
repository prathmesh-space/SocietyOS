import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  expression?: "full" | "compact"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", expression = "full", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Base styles with micro-animations
    const baseStyles = cn(
      "inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-alabaster transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
      expression === "full" ? "rounded-full duration-300" : "rounded-md duration-150 text-sm"
    )
    
    const variants = {
      default: cn("bg-forest text-white hover:bg-forest/90 shadow-sm hover:shadow", expression === "full" ? "uppercase tracking-widest text-sm" : ""),
      destructive: cn("bg-terracotta text-white hover:bg-terracotta/90 shadow-sm", expression === "full" ? "uppercase tracking-widest text-sm" : ""),
      outline: cn("border border-stone bg-transparent text-forest hover:bg-clay-light", expression === "full" ? "text-sm" : ""),
      secondary: cn("bg-transparent border border-sage text-sage-text hover:bg-sage/10", expression === "full" ? "uppercase tracking-widest text-sm" : ""),
      ghost: cn("hover:bg-clay-light text-forest", expression === "full" ? "text-sm" : ""),
      link: cn("text-forest underline-offset-4 hover:underline", expression === "full" ? "text-sm" : ""),
    }
    
    const sizes = {
      full: {
        default: "h-12 px-6 py-2",
        sm: "h-10 px-4",
        lg: "h-14 px-8",
        icon: "h-12 w-12",
      },
      compact: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      }
    }

    return (
      <Comp
        className={cn(baseStyles, variants[variant], sizes[expression][size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
