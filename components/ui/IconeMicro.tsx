/**
 * Icône micro dessinée en SVG.
 *
 * Remplace l'emoji 🎤, dont le dessin et la couleur varient selon le système
 * (Windows, Android, iOS) et qui ne peut pas s'accorder à la charte.
 */
export function IconeMicro({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10.5a7 7 0 0 0 14 0" />
      <path d="M12 17.5V21" />
    </svg>
  );
}
