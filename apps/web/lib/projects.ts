import { logAuditClient } from "./audit.ts";
import { supabase } from "./supabaseClient.ts";

export type ProjectStatus =
  | "Active"
  | "In Review"
  | "Completed";

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateProjectInput = {
  name: string;
  description?: string;
  status?: ProjectStatus;
  progress?: number;
};

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function getProjects(): Promise<Project[]> {
  const userId = await getCurrentUserId();

  /* Signed out: return an empty list instead of erroring. */
  if (!userId) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from("projects")
    .select("*")
    /* Explicit per-user scoping (defense in depth on top of RLS). */
    .eq("created_by", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createProject(
  project: CreateProjectInput
): Promise<Project> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error(
      "You must be logged in to create a project."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("projects")
    .insert({
      name: project.name.trim(),
      description:
        project.description?.trim() || null,
      status: project.status ?? "Active",
      progress: project.progress ?? 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  await logAuditClient({
    action: "project.create",
    entity: "project",
    entityId: data.id,
  });

  return data;
}

export async function updateProject(
  id: string,
  updates: Partial<CreateProjectInput>
): Promise<Project> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("You must be logged in to update a project.");
  }

  const {
    data,
    error,
  } = await supabase
    .from("projects")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    /* Explicit per-user scoping (defense in depth on top of RLS). */
    .eq("created_by", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  await logAuditClient({
    action: "project.update",
    entity: "project",
    entityId: data.id,
  });

  return data;
}

export async function deleteProject(
  id: string
): Promise<void> {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("You must be logged in to delete a project.");
  }

  const {
    error,
  } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    /* Explicit per-user scoping (defense in depth on top of RLS). */
    .eq("created_by", userId);

  if (error) {
    throw error;
  }

  await logAuditClient({
    action: "project.delete",
    entity: "project",
    entityId: id,
  });
}