"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, TrendingUp } from "lucide-react";

const data = [
  { month: "Jan", revenue: 12000 },
  { month: "Feb", revenue: 18000 },
  { month: "Mar", revenue: 15000 },
  { month: "Apr", revenue: 24000 },
  { month: "May", revenue: 21000 },
  { month: "Jun", revenue: 30000 },
];

function formatRevenue(value: number) {
  return `$${(value / 1000).toFixed(0)}k`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0b1220]/95 px-3.5 py-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-1 text-xs text-slate-500">{label}</p>

      <p className="text-sm font-semibold text-white">
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

export default function RevenueChart() {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.06]">
              <TrendingUp
                size={15}
                strokeWidth={1.8}
                className="text-cyan-400"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-white">
                Revenue Overview
              </p>

              <p className="mt-0.5 text-xs text-slate-600">
                Organization performance
              </p>
            </div>
          </div>
        </div>

        {/* Current period */}
        <div className="text-right">
          <p className="text-xl font-semibold tracking-tight text-white">
            $30.0k
          </p>

          <div className="mt-1 flex items-center justify-end gap-1 text-xs text-emerald-400">
            <ArrowUpRight size={13} />

            <span>18.4%</span>

            <span className="text-slate-600">
              vs last period
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[290px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 8,
              right: 8,
              left: -12,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient
                id="atlasRevenueGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#22d3ee"
                  stopOpacity={0.22}
                />

                <stop
                  offset="100%"
                  stopColor="#22d3ee"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="rgba(255,255,255,0.045)"
            />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#64748b",
                fontSize: 11,
              }}
              dy={10}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#475569",
                fontSize: 10,
              }}
              tickFormatter={formatRevenue}
              width={42}
            />

            <Tooltip
              cursor={{
                stroke: "rgba(34,211,238,0.15)",
              }}
              content={<CustomTooltip />}
            />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#atlasRevenueGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#22d3ee",
                stroke: "#07111d",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom summary */}
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-600">
            Average monthly
          </p>

          <p className="mt-1 text-sm font-medium text-slate-300">
            $21.7k
          </p>
        </div>

        <div className="h-8 w-px bg-white/[0.06]" />

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-600">
            Peak month
          </p>

          <p className="mt-1 text-sm font-medium text-slate-300">
            June
          </p>
        </div>
      </div>
    </section>
  );
}