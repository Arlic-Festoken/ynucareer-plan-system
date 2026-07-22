import type { ButtonHTMLAttributes, ReactNode } from "react";

type AppleButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export default function AppleButton({
  children,
  className = "",
  variant = "primary",
  ...props
}: AppleButtonProps) {
  return (
    <button className={`apple-button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
