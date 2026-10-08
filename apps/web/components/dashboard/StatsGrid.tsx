import StatsCard from "./StatsCard";
import FadeIn from "@/components/animations/FadeIn";

export default function StatsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <FadeIn delay={0.1} className="h-full">
        <StatsCard
          title="Users"
          value="18"
          change="+12.4%"
        />
      </FadeIn>

      <FadeIn delay={0.2} className="h-full">
        <StatsCard
          title="AI Requests"
          value="145"
          change="+18.7%"
        />
      </FadeIn>

      <FadeIn delay={0.3} className="h-full">
        <StatsCard
          title="Knowledge Docs"
          value="321"
          change="+8.2%"
        />
      </FadeIn>

      <FadeIn delay={0.4} className="h-full">
        <StatsCard
          title="Active Projects"
          value="24"
          change="+5.4%"
        />
      </FadeIn>
    </div>
  );
}