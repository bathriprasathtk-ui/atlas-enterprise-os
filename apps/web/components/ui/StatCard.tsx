import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: string;
  trendPositive?: boolean;
  className?: string;
};

export default function StatCard({
  label,
  value,
  description,
  icon,
  trend,
  trendPositive = true,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`
        group
        relative
        overflow-hidden
        rounded-3xl
        border
        border-white/[0.08]
        bg-white/[0.04]
        p-6
        backdrop-blur-2xl
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-cyan-400/20
        hover:bg-white/[0.06]
        hover:shadow-[0_15px_50px_rgba(0,0,0,0.25)]
        ${className}
      `}
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-12
          -top-12
          h-32
          w-32
          rounded-full
          bg-cyan-400/10
          blur-3xl
          transition-opacity
          duration-300
          group-hover:opacity-100
        "
      />

      {/* Top highlight */}
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

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-medium text-slate-400">
            {label}
          </p>

          {icon && (
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl
                border
                border-cyan-400/10
                bg-cyan-400/10
                text-cyan-300
                transition-all
                duration-300
                group-hover:scale-105
                group-hover:bg-cyan-400/15
              "
            >
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mt-5 flex items-end gap-3">
          <span className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {value}
          </span>

          {trend && (
            <span
              className={`
                mb-1
                rounded-full
                px-2.5
                py-1
                text-xs
                font-semibold
                ${
                  trendPositive
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-red-400/10 text-red-300"
                }
              `}
            >
              {trend}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}