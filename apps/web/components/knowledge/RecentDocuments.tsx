import {
  Clock3,
  FileText,
} from "lucide-react";

const recent = [
  "Employee Handbook.pdf",
  "Financial Report Q2.pdf",
  "Company Policy.docx",
  "Project Atlas Roadmap.pdf",
];

export default function RecentDocuments() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">

      <div className="mb-6 flex items-center gap-2">

        <Clock3
          className="text-cyan-400"
          size={22}
        />

        <h2 className="text-xl font-bold text-white">
          Recent Documents
        </h2>

      </div>

      <div className="space-y-4">

        {recent.map((doc) => (
          <div
            key={doc}
            className="flex items-center gap-4 rounded-xl bg-white/5 p-4 transition hover:bg-white/10"
          >
            <FileText
              className="text-cyan-400"
              size={20}
            />

            <div>

              <p className="font-medium text-white">
                {doc}
              </p>

              <p className="text-sm text-slate-400">
                Updated Today
              </p>

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}