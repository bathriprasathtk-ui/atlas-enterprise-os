type AuroraBackgroundProps = {
  children?: React.ReactNode;
  className?: string;
};

export default function AuroraBackground({
  children,
  className = "",
}: AuroraBackgroundProps) {
  return (
    <div
      className={`
        relative
        min-h-screen
        overflow-hidden
        bg-[#050816]
        ${className}
      `}
    >
      {/* Base gradient */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.18),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(6,182,212,0.14),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(124,58,237,0.16),transparent_40%)]
        "
      />

      {/* Aurora glow 1 */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-40
          -top-40
          h-[500px]
          w-[500px]
          rounded-full
          bg-blue-600/20
          blur-[140px]
          animate-pulse
        "
      />

      {/* Aurora glow 2 */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-40
          top-1/4
          h-[500px]
          w-[500px]
          rounded-full
          bg-cyan-500/15
          blur-[150px]
          animate-pulse
        "
        style={{
          animationDelay: "1.5s",
        }}
      />

      {/* Aurora glow 3 */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          bottom-[-200px]
          left-1/3
          h-[550px]
          w-[550px]
          rounded-full
          bg-violet-600/15
          blur-[160px]
          animate-pulse
        "
        style={{
          animationDelay: "3s",
        }}
      />

      {/* Fine overlay */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_center,transparent_20%,rgba(5,8,22,0.45)_100%)]
        "
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}