import {
  InputHTMLAttributes,
  forwardRef,
} from "react";

type GlassInputProps =
  InputHTMLAttributes<HTMLInputElement>;

const GlassInput = forwardRef<
  HTMLInputElement,
  GlassInputProps
>(function GlassInput(
  {
    className = "",
    ...props
  },
  ref
) {
  return (
    <input
      ref={ref}
      {...props}
      className={`
        w-full
        rounded-2xl
        border
        border-white/[0.08]
        bg-white/[0.04]
        px-4
        py-3.5
        text-sm
        text-white
        outline-none
        backdrop-blur-xl
        transition-all
        duration-300

        placeholder:text-slate-500

        hover:border-white/[0.14]
        hover:bg-white/[0.06]

        focus:border-cyan-400/40
        focus:bg-white/[0.07]
        focus:ring-4
        focus:ring-cyan-400/10

        disabled:cursor-not-allowed
        disabled:opacity-50

        ${className}
      `}
    />
  );
});

export default GlassInput;