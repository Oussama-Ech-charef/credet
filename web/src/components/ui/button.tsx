import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "success";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: IconName;
  iconPosition?: "start" | "end";
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "start",
      fullWidth = false,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    const leadingIcon = icon && iconPosition === "start" ? icon : null;
    const trailingIcon = icon && iconPosition === "end" ? icon : null;

    return (
      <button
        ref={ref}
        aria-busy={loading || undefined}
        className={cn(
          "btn",
          `btn--${variant}`,
          `btn--${size}`,
          fullWidth && "btn--full",
          !children && "btn--icon-only",
          className,
        )}
        disabled={disabled || loading}
        type={type}
        {...props}
      >
        {loading ? (
          <Icon className="spin" name="loader" size={18} />
        ) : leadingIcon ? (
          <Icon name={leadingIcon} size={18} />
        ) : null}
        {children ? <span className="btn__label">{children}</span> : null}
        {!loading && trailingIcon ? (
          <Icon name={trailingIcon} size={18} />
        ) : null}
      </button>
    );
  },
);

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  icon: IconName;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      icon,
      variant = "ghost",
      size = "md",
      loading = false,
      className,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        aria-busy={loading || undefined}
        aria-label={label}
        className={cn(
          "btn",
          `btn--${variant}`,
          `btn--${size}`,
          "btn--icon-only",
          className,
        )}
        disabled={disabled || loading}
        title={label}
        type={type}
        {...props}
      >
        <Icon
          className={loading ? "spin" : undefined}
          name={loading ? "loader" : icon}
          size={18}
        />
      </button>
    );
  },
);
