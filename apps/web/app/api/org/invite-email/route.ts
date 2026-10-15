/* =========================================================
   POST /api/org/invite-email

   Sends the invitation email for an invitation that
   actually exists in the caller's organization (admins
   only). The existence check is the anti-abuse control:
   the endpoint cannot be used to mail arbitrary addresses.

   Returns an honest status — "not_configured" when no
   provider key is set. Nothing is ever faked.
========================================================= */

import { NextResponse } from "next/server";

import { logAudit } from "@/lib/auditServer";
import { isMailConfigured, sendInvitationEmail } from "@/lib/mail";
import { getRouteAuth } from "@/lib/routeAuth";

export async function POST(request: Request) {
  const { supabase, user } = await getRouteAuth();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 }
    );
  }

  let email = "";

  try {
    const body = await request.json();
    email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
  } catch {
    /* handled below */
  }

  if (!email || email.length > 254) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400 }
    );
  }

  /* Caller must be an org administrator. */
  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    !membership ||
    (membership.role !== "owner" && membership.role !== "admin")
  ) {
    return NextResponse.json(
      { error: "Only administrators can send invitations." },
      { status: 403 }
    );
  }

  /* The invitation must exist in the caller's org. */
  const { data: invitation } = await supabase
    .from("org_invitations")
    .select("id, expires_at")
    .eq("organization_id", membership.organization_id)
    .eq("email", email)
    .maybeSingle();

  if (!invitation) {
    return NextResponse.json(
      {
        error:
          "No pending invitation for that address in this organization.",
      },
      { status: 404 }
    );
  }

  /* Expired invitations cannot be accepted (0008) — refuse to
     mail one instead of sending a link that will bounce. */
  if (
    new Date(invitation.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      {
        error:
          "That invitation has expired. Re-invite the address to extend it.",
      },
      { status: 409 }
    );
  }

  const [{ data: org }, { data: profile }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name")
      .eq("id", membership.organization_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const result = await sendInvitationEmail({
    to: email,
    organizationName: org?.name ?? "your organization",
    invitedByName: profile?.display_name ?? "An administrator",
  });

  await logAudit(supabase, {
    action: "org.invite.email",
    entity: "org_invitation",
    entityId: invitation.id,
    metadata: { email, delivery: result.status },
  });

  if (result.status === "failed") {
    return NextResponse.json(
      {
        status: result.status,
        error:
          "The email provider rejected the invitation email.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    status: result.status,
    configured: isMailConfigured(),
  });
}
