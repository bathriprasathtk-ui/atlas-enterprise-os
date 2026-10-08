type DividerProps = {
  className?: string;
  label?: string;
};

export default function Divider({
  className = "",
  label,
}: DividerProps) {
  if (label) {
    return (
      <div
        className={`
          flex
          items-center
          gap-4
          ${className}
        `}
      >
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />

        <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          {label}
        </span>

        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`
        h-px
        w-full
        bg-gradient-to-r
        from-transparent
        via-white/10
        to-transparent
        ${className}
      `}
    />
  );
}