type GlassPanelProps = {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingMap = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function GlassPanel({
  children,
  className = "",
  padding = "md",
}: GlassPanelProps) {
  return (
    <div
      className={`
        relative
        overflow-hidden
        rounded-3xl
        border
        border-white/[0.08]
        bg-white/[0.035]
        backdrop-blur-2xl
        shadow-[0_8px_40px_rgba(0,0,0,0.2)]
        ${paddingMap[padding]}
        ${className}
      `}
    >
      {/* Subtle top reflection */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-white/20
          to-transparent
        "
      />

      {/* Soft inner glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-20
          -top-20
          h-40
          w-40
          rounded-full
          bg-cyan-400/[0.04]
          blur-3xl
        "
      />

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}