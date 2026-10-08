type GlowProps = {
  className?: string;
  color?: "cyan" | "blue" | "violet" | "purple";
  size?: number;
  blur?: number;
  opacity?: number;
};

const colorMap = {
  cyan: "bg-cyan-400",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
};

export default function Glow({
  className = "",
  color = "cyan",
  size = 300,
  blur = 120,
  opacity = 0.2,
}: GlowProps) {
  return (
    <div
      aria-hidden="true"
      className={`
        pointer-events-none
        absolute
        rounded-full
        ${colorMap[color]}
        ${className}
      `}
      style={{
        width: size,
        height: size,
        filter: `blur(${blur}px)`,
        opacity,
      }}
    />
  );
}