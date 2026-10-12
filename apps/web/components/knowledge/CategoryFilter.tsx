"use client";

import {
  FileText,
  Folder,
  Shield,
  Briefcase,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  All: FileText,
  General: FileText,
  HR: Shield,
  Projects: Briefcase,
  Policies: BookOpen,
  Archives: Folder,
};

type CategoryFilterProps = {
  /** Distinct categories present in the user's documents. */
  categories: string[];
  /** "All Documents" or a specific category name. */
  active: string;
  onSelect: (category: string) => void;
};

export default function CategoryFilter({
  categories,
  active,
  onSelect,
}: CategoryFilterProps) {
  const chips = ["All", ...categories];

  return (
    <div className="flex flex-wrap gap-4" role="group" aria-label="Filter by category">
      {chips.map((category) => {
        const Icon = ICONS[category] ?? FileText;
        const isActive =
          category === "All"
            ? active === "All"
            : active === category;

        return (
          <button
            key={category}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(category)}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 transition ${
              isActive
                ? "bg-cyan-500 text-black"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            <Icon size={18} />

            {category === "All" ? "All Documents" : category}
          </button>
        );
      })}
    </div>
  );
}
