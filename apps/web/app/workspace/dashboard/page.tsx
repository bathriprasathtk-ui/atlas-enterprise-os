import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsGrid from "@/components/dashboard/StatsGrid";
import RevenueChart from "@/components/dashboard/charts/RevenueChart";
import AIInsights from "@/components/dashboard/AIInsights";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import ProjectGrid from "@/components/projects/ProjectGrid";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentDocuments from "@/components/dashboard/RecentDocuments";
import RecentProjects from "@/components/dashboard/RecentProjects";

export default function DashboardPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeader />

      <StatsGrid />

      <div className="grid gap-5 sm:gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-5 sm:space-y-6 xl:col-span-2">
          <RevenueChart />
          <ProjectGrid />
        </div>

        <div className="min-w-0 space-y-5 sm:space-y-6">
          <AIInsights />
          <ActivityFeed />
        </div>
      </div>

      <QuickActions />

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        <RecentDocuments />
        <RecentProjects />
      </div>
    </div>
  );
}