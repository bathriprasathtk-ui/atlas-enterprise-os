import { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export default function Input({
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={`
        w-full
        rounded-xl
        border
        border-white/10
        bg-white/5
        px-4
        py-3
        text-white
        placeholder:text-slate-500
        backdrop-blur-xl
        outline-none
        transition-all
        duration-300
        focus:border-cyan-400
        focus:ring-2
        focus:ring-cyan-400/30
        ${className}
      `}
    />
  );
}