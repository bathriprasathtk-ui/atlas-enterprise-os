import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`
        w-full
        rounded-xl
        bg-gradient-to-r
        from-blue-600
        to-cyan-500
        px-6
        py-3
        font-semibold
        text-white
        shadow-lg
        shadow-blue-500/20
        transition-all
        duration-300
        hover:-translate-y-0.5
        hover:shadow-xl
        hover:shadow-cyan-500/30
        active:scale-95
        ${className}
      `}
    >
      {children}
    </button>
  );
}