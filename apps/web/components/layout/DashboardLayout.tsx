"use client";

import { ReactNode } from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileSidebar from "./MobileSidebar";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#050816] text-white lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden h-screen w-[280px] shrink-0 border-r border-white/[0.06] bg-[#050816] lg:flex lg:flex-col">
        <Sidebar />
      </aside>

      {/* Mobile Navigation */}
      <MobileSidebar />

      {/* Main Application */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Desktop Topbar */}
        <header className="sticky top-0 z-30 hidden h-[76px] shrink-0 border-b border-white/[0.06] bg-[#050816]/80 backdrop-blur-xl lg:flex">
          <Topbar />
        </header>

        {/* Page Content */}
        <main className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {/* Background glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.035] blur-[130px]" />

            <div className="absolute left-1/3 top-1/2 h-[360px] w-[360px] rounded-full bg-violet-600/[0.025] blur-[130px]" />
          </div>

          {/* Content */}
          <div className="relative mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}