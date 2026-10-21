import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/presentation/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-start gap-2 uppercase font-semibold cursor-pointer select-none transition-colors duration-300 disabled:opacity-45 disabled:cursor-not-allowed";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-ink hover:bg-accent-hover active:bg-accent-active",
  secondary: "border border-border-strong text-ink hover:border-ink hover:bg-ink/5",
  ghost: "border border-border text-ink-2 hover:text-ink hover:border-ink",
  link: "border-b border-accent pb-1.5 text-ink hover:text-accent",
};
const sizes: Record<Size, string> = {
  sm: "text-label-sm px-4 py-3.5",
  md: "text-label px-[30px] py-[18px]",
  lg: "text-label px-[34px] py-5",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps & Omit<ComponentPropsWithoutRef<"button">, "className" | "children"> & { href?: undefined };
type LinkProps = CommonProps & Omit<ComponentPropsWithoutRef<"a">, "className" | "children" | "href"> & { href: string };

export type ButtonLikeProps = ButtonProps | LinkProps;

function stripCommon<T extends CommonProps>(props: T): Omit<T, keyof CommonProps> {
  const rest: Record<string, unknown> = { ...(props as Record<string, unknown>) };
  delete rest.variant;
  delete rest.size;
  delete rest.className;
  delete rest.children;
  return rest as Omit<T, keyof CommonProps>;
}

export function Button(props: ButtonLikeProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const cls = cn(base, variant === "link" ? "px-0 py-0 text-label" : sizes[size], variants[variant], className);

  if (props.href !== undefined) {
    const { href, ...rest } = stripCommon(props);
    const external = /^(https?:|mailto:|tel:)/.test(href);
    if (external) {
      return (
        <a href={href} className={cls} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  const { type = "button", ...rest } = stripCommon(props);
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
