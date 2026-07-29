import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "danger";

// Le style « verre liquide » se décline selon le fond du bouton : reflet
// blanc sur les fonds colorés, reflet violet sur les fonds clairs (où un
// reflet blanc serait invisible). La variante « tertiary » en est exclue :
// c'est un bouton-lien sans fond, sur lequel un effet de verre n'aurait
// rien à accrocher.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "btn-glace bg-gradient-to-r from-brand-violet to-brand-rose text-white",
  secondary: "btn-glace-clair bg-white text-navy border border-navy/20 hover:border-brand-violet/30",
  tertiary: "bg-transparent text-brand-violet transition-colors hover:underline",
  danger: "btn-glace bg-danger text-white",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", type = "button", className = "", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-[44px] rounded-full px-5 py-2 font-semibold ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
