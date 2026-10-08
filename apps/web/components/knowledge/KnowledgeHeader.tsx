export default function KnowledgeHeader() {
  return (
    <div className="flex items-center justify-between">

      <div>
        <h1 className="text-4xl font-bold text-white">
          Knowledge Hub
        </h1>

        <p className="mt-2 text-slate-400">
          Store, organize and search your organization's knowledge.
        </p>
      </div>

      <button className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3 font-semibold text-white transition hover:scale-105">
        + Upload Document
      </button>

    </div>
  );
}