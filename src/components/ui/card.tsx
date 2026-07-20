import * as React from "react"
import { cn } from "@/lib/utils"

const CardContext = React.createContext<{ variant: "full" | "compact" }>({ variant: "full" })

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "full" | "compact"
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "full", ...props }, ref) => (
    <CardContext.Provider value={{ variant }}>
      <div
        ref={ref}
        className={cn(
          "bg-white text-forest border border-stone shadow-soft-default",
          variant === "full" 
            ? "rounded-3xl transition-all duration-500 hover:shadow-soft-md hover:-translate-y-1" 
            : "rounded-xl transition-all duration-150 hover:shadow-soft-md",
          className
        )}
        {...props}
      />
    </CardContext.Provider>
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(CardContext)
  return (
    <h3
      ref={ref}
      className={cn(
        "font-semibold leading-none tracking-tight",
        variant === "full" ? "text-xl font-playfair" : "text-lg font-sans",
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-forest/70", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
