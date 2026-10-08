type Props = {
  status: "Active" | "In Review" | "Completed";
};

const colors = {
  Active: "bg-emerald-500/20 text-emerald-400",
  "In Review": "bg-yellow-500/20 text-yellow-400",
  Completed: "bg-blue-500/20 text-blue-400",
};

export default function ProjectStatusBadge({ status }: Props) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${colors[status]}`}
    >
      {status}
    </span>
  );
}