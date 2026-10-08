import {
  Users,
  Sparkles,
  FileText,
  FolderKanban,
  TrendingUp,
} from "lucide-react";

type StatsCardProps = {
  title: string;
  value: string;
  change: string;
};

const icons = {
  Users,
  "AI Requests": Sparkles,
  "Knowledge Docs": FileText,
  "Active Projects": FolderKanban,
};

export default function StatsCard({
  title,
  value,
  change,
}: StatsCardProps) {
  const Icon = icons[title as keyof typeof icons] ?? TrendingUp;

  return (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-white/[0.035] hover:shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-cyan-400/[0.035] blur-3xl transition-all duration-500 group-hover:bg-cyan-400/[0.07]" />

      <div className="relative flex h-full flex-col">
        {/* Top */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] transition-colors duration-300 group-hover:border-cyan-400/15 group-hover:bg-cyan-400/[0.06]">
            <Icon
              size={17}
              strokeWidth={1.7}
              className="text-slate-400 transition-colors duration-300 group-hover:text-cyan-400"
            />
          </div>

          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/10 bg-emerald-400/[0.06] px-2 py-1 text-[10px] font-medium text-emerald-400">
            <TrendingUp size={11} />
            {change}
          </span>
        </div>

        {/* Value */}
        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
            {title}
          </p>

          <h2 className="mt-2 text-[30px] font-semibold leading-none tracking-tight text-white">
            {value}
          </h2>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4">
          <div className="h-px w-full bg-white/[0.05]" />

          <p className="mt-3 text-[11px] text-slate-600">
            Compared with last month
          </p>
        </div>
      </div>
    </div>
  );
}