import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "@/components/ui/Button.module.scss";
import { classNames } from "@/shared/utils/classNames";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({
  children,
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = classNames(styles.button, styles[variant], className);
  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
