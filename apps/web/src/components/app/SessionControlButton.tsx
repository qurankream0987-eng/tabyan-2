import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export default function SessionControlButton({ className, variant = "default", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "active" | "danger" }) {
  return (
    <button {...props} className={cn(
      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-40",
      variant === "default" && "bg-white/10 text-white hover:bg-white/20",
      variant === "active" && "bg-burgundy-light text-white hover:bg-burgundy",
      variant === "danger" && "bg-red-600 text-white hover:bg-red-500",
      className
    )} />
  );
}
