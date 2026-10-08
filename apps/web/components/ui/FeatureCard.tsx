import type { ReactNode } from "react";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
};

export default function FeatureCard({
  icon,
  title,
  description,
  className = "",
}: FeatureCardProps) {
  return (
    <div
      className={`
        group
        relative
        overflow-hidden
        rounded-3xl
        border
        border-white/[0.08]
        bg-white/[0.035]
        p-6
        backdrop-blur-2xl
        transition-all
        duration-500
        hover:-translate-y-1
        hover:border-cyan-400/20
        hover:bg-white/[0.06]
        hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)]
        ${className}
      `}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-16
          -top-16
          h-40
          w-40
          rounded-full
          bg-cyan-400/10
          blur-3xl
          opacity-0
          transition-opacity
          duration-500
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
        {/* Icon */}
        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-2xl
            border
            border-cyan-400/10
            bg-gradient-to-br
            from-cyan-400/15
            to-violet-500/10
            text-cyan-300
            shadow-[0_0_25px_rgba(34,211,238,0.08)]
            transition-all
            duration-300
            group-hover:scale-105
            group-hover:border-cyan-400/20
            group-hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]
          "
        >
          {icon}
        </div>

        {/* Content */}
        <h3 className="mt-6 text-xl font-semibold tracking-tight text-white">
          {title}
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-400">
          {description}
        </p>

        {/* Learn more */}
        <div
          className="
            mt-6
            inline-flex
            items-center
            gap-2
            text-sm
            font-medium
            text-cyan-300
            transition-all
            duration-300
            group-hover:gap-3
          "
        >
          Explore
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </div>
  );
}