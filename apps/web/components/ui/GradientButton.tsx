import {
  ButtonHTMLAttributes,
  forwardRef,
} from "react";

type GradientButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary";
  };

const GradientButton = forwardRef<
  HTMLButtonElement,
  GradientButtonProps
>(function GradientButton(
  {
    children,
    className = "",
    variant = "primary",
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      {...props}
      className={`
        group
        relative
        inline-flex
        items-center
        justify-center
        overflow-hidden
        rounded-2xl
        px-6
        py-3.5
        text-sm
        font-semibold
        transition-all
        duration-300
        disabled:pointer-events-none
        disabled:opacity-50

        ${
          variant === "primary"
            ? `
              bg-gradient-to-r
              from-blue-600
              via-cyan-500
              to-violet-500
              text-white
              shadow-[0_8px_30px_rgba(6,182,212,0.2)]
              hover:-translate-y-0.5
              hover:shadow-[0_12px_40px_rgba(6,182,212,0.3)]
            `
            : `
              border
              border-white/10
              bg-white/[0.05]
              text-white
              backdrop-blur-xl
              hover:border-white/20
              hover:bg-white/[0.08]
            `
        }

        ${className}
      `}
    >
      {/* Shine */}
      <span
        aria-hidden="true"
        className="
          absolute
          inset-0
          -translate-x-full
          bg-gradient-to-r
          from-transparent
          via-white/20
          to-transparent
          transition-transform
          duration-700
          group-hover:translate-x-full
        "
      />

      <span className="relative z-10">
        {children}
      </span>
    </button>
  );
});

export default GradientButton;