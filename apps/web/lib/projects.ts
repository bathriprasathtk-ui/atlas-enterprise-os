import { logAuditClient } from "./audit.ts";
import {
  getCurrentOrgId,
  requireOrgId,
} from "./orgContext.ts";
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

export async function getProjects(): Promise<Project[]> {
  const orgId = await getCurrentOrgId();

  /* Signed out or no organization yet: empty list. */
  if (!orgId) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from("projects")
    .select("*")
    /* Explicit org scoping (defense in depth on top of RLS). */
    .eq("organization_id", orgId)
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

  const orgId = await requireOrgId();

  const {
    data,
    error,
  } = await supabase
    .from("projects")
    .insert({
      organization_id: orgId,
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
  const orgId = await requireOrgId();

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
    /* Explicit org scoping (defense in depth on top of RLS). */
    .eq("organization_id", orgId)
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
  const orgId = await requireOrgId();

  const { data: deleted, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    /* Explicit org scoping (defense in depth on top of RLS). */
    .eq("organization_id", orgId)
    .select("id");

  if (error) {
    throw error;
  }

  /* A 0-row delete means RLS denied it (creator-or-admin). */
  if (!deleted || deleted.length === 0) {
    throw new Error(
      "Only the creator or an organization administrator can delete this project."
    );
  }

  await logAuditClient({
    action: "project.delete",
    entity: "project",
    entityId: id,
  });
}