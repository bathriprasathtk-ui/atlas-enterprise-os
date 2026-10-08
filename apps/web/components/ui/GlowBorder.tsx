type GlowBorderProps = {
  children: React.ReactNode;
  className?: string;
  glow?: "cyan" | "blue" | "violet";
};

const glowMap = {
  cyan: {
    border: "border-cyan-400/20",
    glow: "bg-cyan-400/10",
  },
  blue: {
    border: "border-blue-500/20",
    glow: "bg-blue-500/10",
  },
  violet: {
    border: "border-violet-500/20",
    glow: "bg-violet-500/10",
  },
};

export default function GlowBorder({
  children,
  className = "",
  glow = "cyan",
}: GlowBorderProps) {
  const colors = glowMap[glow];

  return (
    <div
      className={`
        group
        relative
        rounded-3xl
        p-px
        ${colors.border}
        ${className}
      `}
    >
      {/* Outer glow */}
      <div
        aria-hidden="true"
        className={`
          pointer-events-none
          absolute
          -inset-1
          rounded-[inherit]
          ${colors.glow}
          opacity-40
          blur-xl
          transition-opacity
          duration-500
          group-hover:opacity-80
        `}
      />

      {/* Animated glow line */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          overflow-hidden
          rounded-[inherit]
        "
      >
        <div
          className="
            absolute
            -left-1/2
            top-0
            h-full
            w-1/2
            rotate-12
            bg-gradient-to-r
            from-transparent
            via-white/20
            to-transparent
            blur-md
            transition-transform
            duration-1000
            group-hover:translate-x-[300%]
          "
        />
      </div>

      {/* Content */}
      <div className="relative rounded-[calc(1.5rem-1px)] bg-[#080d1c]">
        {children}
      </div>
    </div>
  );
}