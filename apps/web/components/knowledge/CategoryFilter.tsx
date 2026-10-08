import {
  FileText,
  Folder,
  Shield,
  Briefcase,
  BookOpen,
} from "lucide-react";

const categories = [
  {
    name: "All Documents",
    icon: FileText,
    active: true,
  },
  {
    name: "HR",
    icon: Shield,
  },
  {
    name: "Projects",
    icon: Briefcase,
  },
  {
    name: "Policies",
    icon: BookOpen,
  },
  {
    name: "Archives",
    icon: Folder,
  },
];

export default function CategoryFilter() {
  return (
    <div className="flex flex-wrap gap-4">
      {categories.map((category) => {
        const Icon = category.icon;

        return (
          <button
            key={category.name}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 transition ${
              category.active
                ? "bg-cyan-500 text-black"
                : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            <Icon size={18} />

            {category.name}
          </button>
        );
      })}
    </div>
  );
}