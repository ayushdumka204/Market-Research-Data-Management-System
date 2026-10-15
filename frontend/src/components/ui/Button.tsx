import type { ButtonHTMLAttributes, ReactNode } from "react";
export default function Button({
  children,
  variant = "primary",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button ${variant}`} {...props}>
      {children}
    </button>
  );
}
