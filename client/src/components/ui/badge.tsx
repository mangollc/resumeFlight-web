import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        language:
          "border-transparent bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm hover:from-blue-600 hover:to-indigo-700",
        framework:
          "border-transparent bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm hover:from-purple-600 hover:to-pink-600",
        database:
          "border-transparent bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:from-emerald-600 hover:to-teal-700",
        cloud:
          "border-transparent bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-sm hover:from-orange-500 hover:to-pink-600",
        tool:
          "border-transparent bg-gradient-to-r from-slate-500 to-slate-700 text-white shadow-sm hover:from-slate-600 hover:to-slate-800",
        soft:
          "border-transparent bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm hover:from-cyan-600 hover:to-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }