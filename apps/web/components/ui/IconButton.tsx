import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ghost" | "glow";
};

const sizeMap = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

const variantMap = {
  default: `
    border
    border-white/[0.08]
    bg-white/[0.05]
    text-slate-300
    hover:border-white/[0.15]
    hover:bg-white/[0.09]
    hover:text-white
  `,
  ghost: `
    border
    border-transparent
    bg-transparent
    text-slate-400
    hover:border-white/[0.08]
    hover:bg-white/[0.05]
    hover:text-white
  `,
  glow: `
    border
    border-cyan-400/15
    bg-cyan-400/10
    text-cyan-300
    shadow-[0_0_20px_rgba(34,211,238,0.08)]
    hover:border-cyan-400/30
    hover:bg-cyan-400/15
    hover:text-cyan-200
    hover:shadow-[0_0_25px_rgba(34,211,238,0.15)]
  `,
};

export default function IconButton({
  icon,
  label,
  size = "md",
  variant = "default",
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      title={label}
      className={`
        inline-flex
        shrink-0
        items-center
        justify-center
        rounded-xl
        backdrop-blur-xl
        outline-none
        transition-all
        duration-300
        active:scale-95
        focus-visible:ring-2
        focus-visible:ring-cyan-400/40
        disabled:pointer-events-none
        disabled:opacity-40
        ${sizeMap[size]}
        ${variantMap[variant]}
        ${className}
      `}
    >
      {icon}
    </button>
  );
}