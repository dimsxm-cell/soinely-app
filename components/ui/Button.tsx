import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-brand-violet to-brand-rose text-white hover:brightness-110",
  secondary: "bg-white text-navy border border-navy/20 hover:border-brand-violet/30 hover:bg-brand-violet/5",
  tertiary: "bg-transparent text-brand-violet hover:underline",
  danger: "bg-danger text-white hover:bg-danger/90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", type = "button", className = "", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-[44px] rounded-full px-5 py-2 font-semibold transition-colors ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
