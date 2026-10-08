type FloatingOrbProps = {
  size?: number;
  color?: "cyan" | "blue" | "violet" | "purple";
  className?: string;
  duration?: number;
  delay?: number;
};

const colorMap = {
  cyan: "from-cyan-300/30 via-cyan-400/10 to-transparent",
  blue: "from-blue-400/30 via-blue-500/10 to-transparent",
  violet: "from-violet-400/30 via-violet-500/10 to-transparent",
  purple: "from-purple-400/30 via-purple-500/10 to-transparent",
};

export default function FloatingOrb({
  size = 180,
  color = "cyan",
  className = "",
  duration = 6,
  delay = 0,
}: FloatingOrbProps) {
  return (
    <div
      aria-hidden="true"
      className={`
        pointer-events-none
        absolute
        rounded-full
        bg-gradient-to-br
        ${colorMap[color]}
        blur-[2px]
        opacity-80
        animate-[atlas-float_var(--duration)_ease-in-out_infinite]
        ${className}
      `}
      style={{
        width: size,
        height: size,
        "--duration": `${duration}s`,
        animationDelay: `${delay}s`,
      } as React.CSSProperties}
    >
      <div className="absolute inset-[12%] rounded-full bg-white/[0.03] blur-xl" />
      <div className="absolute inset-[25%] rounded-full bg-white/[0.04] blur-2xl" />
    </div>
  );
}