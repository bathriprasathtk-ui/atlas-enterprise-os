"use client";

import { Trash2 } from "lucide-react";
import { deleteDocument } from "@/lib/documents";

type Props = {
  id: string;
  fileName: string;
};

export default function DeleteDocumentButton({
  id,
  fileName,
}: Props) {
  async function handleDelete() {
    const confirmed = confirm(
      "Are you sure you want to delete this document?"
    );

    if (!confirmed) return;

    try {
      await deleteDocument(id, fileName);

      window.location.reload();
    } catch (error) {
      console.error(error);

      alert("Failed to delete document.");
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-400 transition hover:bg-red-500 hover:text-white"
    >
      <Trash2 size={18} />
    </button>
  );
}