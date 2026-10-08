type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
};

export default function GlassCard({
  children,
  className = "",
  hover = true,
}: GlassCardProps) {
  return (
    <div
      className={`
        relative
        overflow-hidden
        rounded-3xl
        border
        border-white/[0.08]
        bg-white/[0.04]
        backdrop-blur-2xl
        shadow-[0_8px_40px_rgba(0,0,0,0.25)]
        transition-all
        duration-300

        ${hover ? `
          hover:-translate-y-1
          hover:border-cyan-400/20
          hover:bg-white/[0.06]
          hover:shadow-[0_12px_50px_rgba(0,0,0,0.35)]
        ` : ""}

        ${className}
      `}
    >
      {/* Subtle top highlight */}
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

      {children}
    </div>
  );
}