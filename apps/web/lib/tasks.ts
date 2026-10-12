/* =========================================================
   TASKS (client data layer)

   Every query is explicitly scoped to the authenticated
   user on top of the owner-only RLS policies in
   supabase/migrations/0003_core.sql.
========================================================= */

import { logAuditClient } from "./audit.ts";
import { supabase } from "./supabaseClient.ts";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  assigned_to: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  project_id?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
};

export type UpdateTaskInput = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "project_id"
    | "priority"
    | "status"
    | "due_date"
  >
>;

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

/**
 * Pure validation shared by the UI and unit tests.
 * Returns an error message, or null when valid.
 */
export function validateTaskInput(input: {
  title: string;
  due_date?: string | null;
}): string | null {
  const title = input.title.trim();

  if (!title) {
    return "A task title is required.";
  }

  if (title.length > 200) {
    return "The task title must be 200 characters or fewer.";
  }

  if (input.due_date) {
    const parsed = Date.parse(input.due_date);

    if (Number.isNaN(parsed)) {
      return "The due date must be a valid date.";
    }
  }

  return null;
}

/* =========================================================
   GET TASKS
========================================================= */

export async function getTasks(): Promise<Task[]> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

/* =========================================================
   CREATE
========================================================= */

export async function createTask(
  input: CreateTaskInput
): Promise<Task> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("You must be signed in to create a task.");
  }

  const validation = validateTaskInput(input);

  if (validation) {
    throw new Error(validation);
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      project_id: input.project_id || null,
      assigned_to: userId,
      priority: input.priority ?? "medium",
      due_date: input.due_date || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await logAuditClient({
    action: "task.create",
    entity: "task",
    entityId: data.id,
  });

  return data as Task;
}

/* =========================================================
   UPDATE
========================================================= */

export async function updateTask(
  id: string,
  patch: UpdateTaskInput
): Promise<void> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("You must be signed in to update a task.");
  }

  if (patch.title !== undefined) {
    const validation = validateTaskInput({
      title: patch.title,
      due_date: patch.due_date,
    });

    if (validation) {
      throw new Error(validation);
    }
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      ...(patch.title !== undefined
        ? { title: patch.title.trim() }
        : {}),
      ...(patch.description !== undefined
        ? { description: patch.description?.trim() || null }
        : {}),
      ...(patch.project_id !== undefined
        ? { project_id: patch.project_id || null }
        : {}),
      ...(patch.priority !== undefined
        ? { priority: patch.priority }
        : {}),
      ...(patch.status !== undefined
        ? { status: patch.status }
        : {}),
      ...(patch.due_date !== undefined
        ? { due_date: patch.due_date || null }
        : {}),
    })
    .eq("id", id)
    .eq("created_by", userId);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditClient({
    action: "task.update",
    entity: "task",
    entityId: id,
  });
}

/* =========================================================
   DELETE
========================================================= */

export async function deleteTask(id: string): Promise<void> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("You must be signed in to delete a task.");
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("created_by", userId);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditClient({
    action: "task.delete",
    entity: "task",
    entityId: id,
  });
}

/* =========================================================
   STATS (derived client-side from owned tasks)
========================================================= */

export type TaskStats = {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  dueSoon: number;
};

export function computeTaskStats(tasks: Task[]): TaskStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const soon = new Date(today);
  soon.setDate(soon.getDate() + 3);

  return {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === "todo").length,
    inProgress: tasks.filter(
      (task) => task.status === "in_progress"
    ).length,
    done: tasks.filter((task) => task.status === "done").length,
    dueSoon: tasks.filter((task) => {
      if (!task.due_date || task.status === "done") {
        return false;
      }

      const due = new Date(`${task.due_date}T00:00:00`);

      return due >= today && due <= soon;
    }).length,
  };
}
