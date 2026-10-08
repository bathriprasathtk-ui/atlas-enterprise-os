import { FolderOpen } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center">

      <FolderOpen
        size={60}
        className="mx-auto text-slate-500"
      />

      <h2 className="mt-6 text-2xl font-semibold text-white">
        No Documents Found
      </h2>

      <p className="mt-3 text-slate-400">
        Upload your first document to start building your AI knowledge base.
      </p>

    </div>
  );
}