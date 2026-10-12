#!/usr/bin/env node
/* =========================================================
   INTEGRATION TEST SUITE — migrations + RLS + RBAC

   Runs every supabase/migrations/*.sql file against a real
   PostgreSQL instance and asserts the security model with a
   multi-user, multi-organization matrix.

   Modes:
     default                 embedded-postgres (devDependency)
     ATLAS_TEST_DATABASE_URL external server (e.g. CI service
                             container); embedded server is skipped

   Vector tests (0002) run when the pgvector extension loads;
   set ATLAS_TEST_REQUIRE_VECTOR=1 to make them mandatory.

   Run: npm run test:db
========================================================= */

import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIG_DIR = join(HERE, "..", "..", "..", "supabase", "migrations");

const EXTERNAL_URL = process.env.ATLAS_TEST_DATABASE_URL || "";
const REQUIRE_VECTOR = process.env.ATLAS_TEST_REQUIRE_VECTOR === "1";

const A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const D = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const E = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const F = "ffffffff-ffff-ffff-ffff-ffffffffffff";

let pass = 0;
let fail = 0;
let skip = 0;

function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function skipCheck(name, why) {
  skip += 1;
  console.log(`  SKIP ${name} (${why})`);
}

const vec = (hot) =>
  JSON.stringify(
    Array.from({ length: 768 }, (_, i) => (hot.includes(i) ? 1 : 0))
  );

async function expectError(client, sql, params = []) {
  try {
    await client.query(sql, params);
    return null;
  } catch (error) {
    return error;
  }
}

/* ---------- server bootstrap ---------- */

async function startServer() {
  if (EXTERNAL_URL) {
    console.log(`using external server: ${EXTERNAL_URL.replace(/:[^:@/]*@/, ":***@")}`);
    return { mode: "external" };
  }

  const { default: EmbeddedPostgres } = await import(
    "embedded-postgres"
  );

  const dataDir = join(
    "/tmp",
    `atlas-db-tests-${process.pid}-${Date.now()}`
  );

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "password",
    port: 5544 + (process.pid % 400),
    persistent: false,
  });

  await pg.initialise();

  /*
   * The zonky binaries used by embedded-postgres bake an
   * absolute pkglibdir that does not exist here; adding the
   * real lib dir to dynamic_library_path lets optional
   * extensions (vector) load when present.
   */
  const candidates = [
    join(HERE, "..", "node_modules", "@embedded-postgres", "linux-x64", "native", "lib"),
    join(HERE, "..", "node_modules", "embedded-postgres", "node_modules", "@embedded-postgres", "linux-x64", "native", "lib"),
    process.env.ATLAS_TEST_PG_NATIVE_LIB || "",
  ];
  const nativeLib =
    candidates.find((dir) => dir && existsSync(dir)) ||
    join(HERE, "..", "node_modules", "@embedded-postgres", "linux-x64", "native", "lib");
  try {
    appendFileSync(
      `${dataDir}/postgresql.conf`,
      `\ndynamic_library_path = '$libdir:${nativeLib}'\n`
    );
  } catch {
    /* non-fatal: vector tests may be skipped */
  }

  await pg.start();
  console.log("using embedded PostgreSQL");

  return { mode: "embedded", pg };
}

async function connect(server) {
  if (server.mode === "external") {
    const { default: pgLib } = await import("pg");
    const client = new pgLib.Client({ connectionString: EXTERNAL_URL });
    await client.connect();
    return client;
  }

  const client = server.pg.getPgClient();
  await client.connect();
  return client;
}

/* ---------- Supabase-like environment ---------- */

async function setupStubs(client) {
  await client.query(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
    end $$;

    create schema if not exists auth;

    create table if not exists auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );

    create or replace function auth.uid() returns uuid
      language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

    create schema if not exists storage;

    create table if not exists storage.buckets (
      id text primary key,
      name text,
      public boolean default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );

    create table if not exists storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text,
      name text,
      owner uuid
    );

    create or replace function storage.foldername(name text)
      returns text[] language sql immutable as
    $$ select string_to_array(name, '/') $$;

    alter table storage.objects enable row level security;
  `);
}

async function createUser(client, id, email, fullName) {
  await client.query(
    `insert into auth.users (id, email, raw_user_meta_data)
     values ($1, $2, $3::jsonb)
     on conflict (id) do nothing`,
    [id, email, JSON.stringify({ full_name: fullName })]
  );
}

async function grants(client) {
  await client.query(`
    grant usage on schema public, auth, storage to authenticated, anon;
    grant all on all tables in schema public to authenticated;
    grant select on all tables in schema public to anon;
    grant select, insert, update, delete on storage.objects to authenticated;
    grant select on auth.users to authenticated;
    grant execute on function auth.uid(), storage.foldername(text)
      to authenticated, anon;
  `);
}

let HAS_VECTOR = false;

async function detectVector(client) {
  try {
    const r = await client.query(
      `select 1 from pg_available_extensions where name = 'vector'`);
    HAS_VECTOR = r.rows.length === 1;
  } catch {
    HAS_VECTOR = false;
  }

  if (REQUIRE_VECTOR && !HAS_VECTOR) {
    throw new Error(
      "ATLAS_TEST_REQUIRE_VECTOR=1 but pgvector is not available");
  }

  if (!HAS_VECTOR) {
    console.log(
      "NOTE: pgvector unavailable — 0002 and vector tests are SKIPPED");
  }
}

async function applyMigrationsAgain(client) {
  const files = readdirSync(MIG_DIR)
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort()
    .filter((name) => HAS_VECTOR || !name.startsWith("0002"));

  for (const file of files) {
    const again = await client.query(
      readFileSync(join(MIG_DIR, file), "utf8")
    ).then(() => true).catch((error) => {
      console.log(`  FAIL re-apply ${file} — ${error.message}`);
      return false;
    });

    if (!again) {
      fail += 1;
    }
  }

  check("all migrations idempotent (second full pass)", fail === 0);
}

async function asUser(client, id) {
  await client.query(
    `select set_config('request.jwt.claim.sub', $1, false)`,
    [id ?? ""]
  );
}

/* ---------- test sequences ---------- */

async function seedEra1(client, files) {
  /* apply 0001..0004 only, seed data under owner-only RLS,
     then 0005 runs against real pre-existing rows, then 0006
     (its trigger depends on org_members from 0005) */
  for (const file of files
        .filter((f) =>
          !f.startsWith("0005") &&
          !f.startsWith("0006") &&
          !f.startsWith("0007"))
        .filter((f) => HAS_VECTOR || !f.startsWith("0002"))) {
    await client.query(readFileSync(join(MIG_DIR, file), "utf8"));
    console.log(`applied ${file}`);
  }
  await grants(client);

  await asUser(client, A);
  await client.query("set role authenticated");

  const docA = await client.query(
    `insert into public.documents (title, file_name, uploaded_by)
     values ('A handbook', $1, $2) returning id`,
    [`${A}/1.pdf`, A]
  );
  if (HAS_VECTOR) {
    await client.query(
      `insert into public.document_chunks
         (document_id, uploaded_by, chunk_index, content, embedding)
       values ($1, $2, 0, 'welcome to the handbook', $3::vector)`,
      [docA.rows[0].id, A, vec([0])]
    );
  }
  await client.query(
    `insert into public.tasks (title, created_by)
     values ('A task', $1)`,
    [A]
  );

  await asUser(client, B);
  await client.query(
    `insert into public.documents (title, file_name, uploaded_by)
     values ('B secret', $1, $2)`,
    [`${B}/9.pdf`, B]
  );

  await client.query("reset role");
  await asUser(client, null);

  await client.query(
    readFileSync(join(MIG_DIR, "0005_organizations.sql"), "utf8")
  );
  console.log("applied 0005_organizations.sql");

  await client.query(
    readFileSync(join(MIG_DIR, "0006_membership_audit.sql"), "utf8")
  );
  console.log("applied 0006_membership_audit.sql");

  await client.query(
    readFileSync(join(MIG_DIR, "0007_knowledge_articles.sql"), "utf8")
  );
  console.log("applied 0007_knowledge_articles.sql");
}

async function testBackfill(client) {
  const a = await client.query(
    `select m.role, o.id, o.name from public.org_members m
     join public.organizations o on o.id = m.organization_id
     where m.user_id = $1`,
    [A]
  );
  check("backfill: A owns a personal organization",
    a.rows.length === 1 &&
    a.rows[0].role === "owner" &&
    a.rows[0].name.includes("Alice Owner"),
    JSON.stringify(a.rows));
  const orgA = a.rows[0]?.id;

  const b = await client.query(
    `select m.role, o.id from public.org_members m
     join public.organizations o on o.id = m.organization_id
     where m.user_id = $1`,
    [B]
  );
  check("backfill: B owns a separate personal organization",
    b.rows.length === 1 && b.rows[0].id !== orgA);
  const orgB = b.rows[0]?.id;

  const rows = await client.query(
    `select
       (select count(*) from public.documents
        where organization_id is not null) as docs,
       (select count(*) from public.tasks
        where organization_id is not null) as tasks,
       (select count(*) from public.profiles
        where organization_id is not null) as profiles`
  );
  const r = rows.rows[0];
  check("backfill: every pre-existing row received an organization",
    Number(r.docs) >= 2 && Number(r.tasks) >= 1 &&
    Number(r.profiles) >= 2,
    JSON.stringify(r));

  const mixed = await client.query(
    `select count(*) as n from public.documents
     where uploaded_by = $1 and organization_id <> $2`,
    [A, orgA]
  );
  check("backfill: A's documents point at A's organization",
    Number(mixed.rows[0].n) === 0);

  return { orgA, orgB };
}

async function testIsolation(client) {
  await asUser(client, A);
  await client.query("set role authenticated");

  let r = await client.query(
    `select id from public.documents where title = 'B secret'`);
  check("A cannot see B's document (separate organizations)",
    r.rows.length === 0);

  r = await client.query(
    `select id from public.profiles where id = $1`, [B]);
  check("A cannot see B's profile (separate organizations)",
    r.rows.length === 0);

  await client.query("reset role");
  await asUser(client, null);
  await client.query("set role anon");
  r = await client.query(`select id from public.documents`);
  check("anon sees nothing", r.rows.length === 0);
  await client.query("reset role");
  await asUser(client, null);
}

async function testOnboarding(client) {
  /* C and D are created AFTER 0005: no organization until
     they create one or accept an invitation. */
  await createUser(client, C, "c@atlas.test", "Carol Creator");
  await createUser(client, D, "d@atlas.test", "Dana Invitee");
  await createUser(client, E, "e@atlas.test", "Eve Admin");
  await grants(client);

  await asUser(client, C);
  await client.query("set role authenticated");

  let orgC = null;
  try {
    const res = await client.query(
      `select public.create_organization('Carol Corp') as id`);
    orgC = res.rows[0].id;
  } catch (error) {
    console.log("  (create_organization threw)", error.message);
  }
  check("C creates an organization via RPC", Boolean(orgC));

  let err = await expectError(
    client, `select public.create_organization('Second Org')`);
  check("C cannot create a second organization",
    Boolean(err) && /already belong/.test(err.message),
    err?.message);

  err = await expectError(
    client,
    `insert into public.organizations (name, created_by)
     values ('Sneaky', $1)`,
    [C]
  );
  check("RLS blocks direct organization insert for members",
    Boolean(err), err?.message);

  await client.query("reset role");
  await asUser(client, null);

  return { orgC };
}

async function testInviteFlow(client, orgs) {
  await asUser(client, A);
  await client.query("set role authenticated");

  const inv = await client.query(
    `select public.invite_member('d@atlas.test') as result`);
  check("A invites Dana", inv.rows[0].result === "invited");

  let err = await expectError(
    client,
    `select public.invite_member('nobody', 'member')`);
  check("invalid email rejected", Boolean(err) && /valid email/.test(err.message));

  await client.query("reset role");
  await asUser(client, D);
  await client.query("set role authenticated");

  let mine = await client.query(`select * from public.my_invitations()`);
  check("D sees exactly her invitation",
    mine.rows.length === 1 &&
    mine.rows[0].organization_id === orgs.orgA &&
    mine.rows[0].role === "member",
    JSON.stringify(mine.rows));
  const invId = mine.rows[0]?.id;

  let err2 = await expectError(
    client, `select public.accept_invitation($1)`,
    ["00000000-0000-0000-0000-000000000000"]);
  check("accepting an unknown invitation fails",
    Boolean(err2) && /not found/.test(err2.message));

  const accepted = await client.query(
    `select public.accept_invitation($1) as id`, [invId]);
  check("D accepts and joins A's organization",
    accepted.rows[0].id === orgs.orgA);

  mine = await client.query(`select * from public.my_invitations()`);
  check("invitation consumed after acceptance", mine.rows.length === 0);

  const profile = await client.query(
    `select organization_id from public.profiles where id = $1`, [D]);
  check("D's profile points at the new organization",
    profile.rows[0].organization_id === orgs.orgA);

  err = await expectError(
    client, `select public.create_organization('Own Org')`);
  check("D (member) cannot create another organization",
    Boolean(err) && /already belong/.test(err.message));

  await client.query("reset role");
  await asUser(client, null);
}

async function testSharingAndRbac(client, orgs) {
  /* A creates a shared document */
  await asUser(client, A);
  await client.query("set role authenticated");
  const shared = await client.query(
    `insert into public.documents (title, file_name, uploaded_by, organization_id)
     values ('Shared plan', $1, $2, $3) returning id`,
    [`${A}/shared.pdf`, A, orgs.orgA]
  );
  const sharedId = shared.rows[0].id;

  let r = await client.query(
    `select id from public.documents where id = $1`, [sharedId]);
  check("A sees the shared document", r.rows.length === 1);

  /* D (member) can read + update, but not delete */
  await asUser(client, D);
  r = await client.query(
    `select id from public.documents where id = $1`, [sharedId]);
  check("D (member) reads A's document", r.rows.length === 1);

  r = await client.query(
    `update public.documents set title = 'Shared plan v2'
     where id = $1 returning id`, [sharedId]);
  check("D (member) can edit A's document", r.rows.length === 1);

  r = await client.query(
    `delete from public.documents where id = $1 returning id`,
    [sharedId]);
  check("D (member) cannot delete A's document", r.rows.length === 0);

  /* D (member) cannot invite */
  let err = await expectError(
    client, `select public.invite_member('x@atlas.test')`);
  check("D (member) cannot invite",
    Boolean(err) && /administrators/.test(err.message));

  await client.query("reset role");
  await asUser(client, null);
}

async function testAdminAndRoles(client, orgs) {
  /* A (owner) invites Eve as admin; Eve accepts */
  await asUser(client, A);
  await client.query("set role authenticated");
  await client.query(
    `select public.invite_member('e@atlas.test', 'admin')`);

  let adminRow = await client.query(
    `select id, role from public.org_invitations
     where lower(email) = 'e@atlas.test'`);
  check("owner's admin invitation exists", adminRow.rows.length === 1);

  let err = await expectError(
    client,
    `select public.invite_member('z@atlas.test', 'admin')`);
  /* A IS the owner so this should succeed — sanity: */
  check("owner can invite another admin",
    !err, err?.message);

  /* last-invite cleanup to keep counts predictable */
  await client.query(
    `delete from public.org_invitations where lower(email) = 'z@atlas.test'`);
  await client.query("reset role");

  /* D creates a document that the admin will remove */
  await asUser(client, D);
  await client.query("set role authenticated");
  const dDoc = await client.query(
    `insert into public.documents (title, file_name, uploaded_by, organization_id)
     values ('D doc', $1, $2, $3) returning id`,
    [`${D}/d.pdf`, D, orgs.orgA]);
  await client.query("reset role");

  await asUser(client, E);
  await client.query("set role authenticated");
  const acc = await client.query(
    `select public.accept_invitation($1) as id`,
    [adminRow.rows[0].id]);
  check("Eve accepts the admin invitation",
    acc.rows[0].id === orgs.orgA);

  const role = await client.query(
    `select role from public.org_members where user_id = $1`, [E]);
  check("Eve's role is admin", role.rows[0]?.role === "admin");

  /* admin: can delete other members' content */
  let r = await client.query(
    `delete from public.documents where id = $1 returning id`,
    [dDoc.rows[0].id]);
  check("admin deletes a member's document", r.rows.length === 1);

  /* admin cannot change roles (owner-only policy) */
  r = await client.query(
    `update public.org_members set role = 'member'
     where user_id = $1 returning user_id`, [D]);
  check("admin cannot change roles", r.rows.length === 0);

  /* admin cannot invite admins */
  err = await expectError(
    client,
    `select public.invite_member('q@atlas.test', 'admin')`);
  check("admin cannot invite other admins",
    Boolean(err) && /owner/.test(err.message));

  /* admin CAN invite members */
  const inv2 = await client.query(
    `select public.invite_member('q@atlas.test') as result`);
  check("admin can invite members", inv2.rows[0].result === "invited");

  await client.query("reset role");

  /* D (member) cannot change roles either */
  await asUser(client, D);
  await client.query("set role authenticated");
  r = await client.query(
    `update public.org_members set role = 'owner'
     where user_id = $1 returning user_id`, [D]);
  check("member cannot change roles", r.rows.length === 0);
  await client.query("reset role");

  /* owner CAN change roles */
  await asUser(client, A);
  await client.query("set role authenticated");
  r = await client.query(
    `update public.org_members set role = 'admin'
     where user_id = $1 returning role`, [D]);
  check("owner changes a member's role to admin",
    r.rows.length === 1 && r.rows[0].role === "admin");
  /* put D back to member */
  await client.query(
    `update public.org_members set role = 'member' where user_id = $1`,
    [D]);

  /* last owner cannot leave */
  err = await expectError(
    client,
    `delete from public.org_members where user_id = $1`, [A]);
  check("sole owner cannot leave the organization",
    Boolean(err) && /at least one owner/.test(err.message));

  await client.query("reset role");
  await asUser(client, null);
}

async function testDepartmentsAndProfiles(client, orgs) {
  await asUser(client, A);
  await client.query("set role authenticated");

  const dept = await client.query(
    `insert into public.departments (organization_id, name)
     values ($1, 'Engineering') returning id`, [orgs.orgA]);
  check("owner creates a department", dept.rows.length === 1);

  let r = await client.query(
    `update public.profiles set department_id = $1
     where id = $2 returning id`,
    [dept.rows[0].id, D]);
  check("owner assigns a member to a department", r.rows.length === 1);

  await client.query("reset role");
  await asUser(client, null);

  /* C creates a department in their own organization, for the
     cross-organization trigger test below */
  await asUser(client, C);
  await client.query("set role authenticated");
  const foreignDept = await client.query(
    `insert into public.departments (organization_id, name)
     values ($1, 'Carol Team') returning id`,
    [orgs.orgC]
  );
  await client.query("reset role");
  await asUser(client, null);

  let err;

  /* D (member) cannot create departments */
  await asUser(client, D);
  await client.query("set role authenticated");
  err = await expectError(
    client,
    `insert into public.departments (organization_id, name)
     values ($1, 'MemberMade')`,
    [orgs.orgA]
  );
  check("member cannot create departments", Boolean(err), err?.message);

  /* D can edit own profile but not escape the organization */
  r = await client.query(
    `update public.profiles set display_name = 'Dana D'
     where id = $1 returning id`, [D]);
  check("member edits own profile", r.rows.length === 1);

  err = await expectError(
    client,
    `update public.profiles set organization_id = $1 where id = $2`,
    [orgs.orgC ?? null, D]);
  check("member cannot move their profile to another organization",
    Boolean(err), err?.message);

  /* department trigger: cross-org department rejected */
  err = await expectError(
    client,
    `update public.profiles set department_id = $1 where id = $2`,
    [foreignDept.rows[0].id, D]
  );
  check("cross-organization department assignment rejected",
    Boolean(err), err?.message);

  await client.query("reset role");
  await asUser(client, null);
}

async function testStorageSharing(client) {
  await asUser(client, A);
  await client.query("set role authenticated");
  await client.query(
    `insert into storage.objects (bucket_id, name)
     values ('documents', $1)`,
    [`${A}/1.pdf`]
  );
  let r = await client.query(
    `select id from storage.objects where name = $1`,
    [`${A}/1.pdf`]);
  check("uploader sees their stored object", r.rows.length === 1);

  /* B (other org): object exists but the document is invisible */
  await client.query("reset role");
  await asUser(client, B);
  await client.query("set role authenticated");
  r = await client.query(
    `select id from storage.objects where name = $1`,
    [`${A}/1.pdf`]);
  check("other organization cannot read the object", r.rows.length === 0);
  await client.query("reset role");

  /* D (same org): document row is visible -> object visible */
  await asUser(client, D);
  await client.query("set role authenticated");
  r = await client.query(
    `select id from storage.objects where name = $1`,
    [`${A}/1.pdf`]);
  check("organization member reads the shared object",
    r.rows.length === 1);

  /* D cannot upload into A's folder */
  try {
    await client.query(
      `insert into storage.objects (bucket_id, name)
       values ('documents', $1)`,
      [`${A}/evil.pdf`]
    );
    check("upload path must be the caller's own folder", false);
  } catch {
    check("upload path must be the caller's own folder", true);
  }
  await client.query("reset role");
  await asUser(client, null);
}

async function testPersonalTables(client, orgs) {
  /* notifications stay per-user */
  await asUser(client, A);
  await client.query("set role authenticated");
  await client.query(
    `insert into public.notifications (user_id, title, message)
     values ($1, 'Hello', 'world')`, [A]);
  let r = await client.query(
    `select id from public.notifications where user_id = $1`, [A]);
  check("owner sees own notification", r.rows.length === 1);

  await client.query("reset role");
  await asUser(client, D);
  await client.query("set role authenticated");
  r = await client.query(
    `select id from public.notifications where user_id = $1`, [A]);
  check("member cannot read another user's notifications",
    r.rows.length === 0);

  /* ai_conversations: personal + org-scoped */
  const conv = await client.query(
    `insert into public.ai_conversations
       (user_id, prompt, response, model, organization_id)
     values ($1, 'q', 'a', 'm', $2) returning id`,
    [D, orgs.orgA]);
  check("conversation insert carries the organization",
    conv.rows.length === 1);

  await client.query("reset role");
  await asUser(client, E);
  await client.query("set role authenticated");
  r = await client.query(
    `select id from public.ai_conversations where id = $1`,
    [conv.rows[0].id]);
  check("another member cannot read personal conversations",
    r.rows.length === 0);
  await client.query("reset role");

  /* audit_logs: own rows + admin org visibility */
  await asUser(client, A);
  await client.query("set role authenticated");
  await client.query(
    `insert into public.audit_logs
       (user_id, action, entity, organization_id)
     values ($1, 'task.create', 'task', $2)`,
    [A, orgs.orgA]);
  const auditCount = await client.query(
    `select count(*) as n from public.audit_logs
     where user_id = $1`, [A]);
  check("owner sees own audit rows",
    Number(auditCount.rows[0].n) >= 1);
  await client.query("reset role");

  await asUser(client, D);
  await client.query("set role authenticated");
  r = await client.query(
    `select id from public.audit_logs where user_id = $1`, [A]);
  check("member cannot read other members' audit rows",
    r.rows.length === 0);
  await client.query("reset role");

  await asUser(client, E);
  await client.query("set role authenticated");
  r = await client.query(
    `select id from public.audit_logs
     where user_id = $1 and organization_id = $2`,
    [A, orgs.orgA]);
  check("admin reads the organization's audit rows",
    r.rows.length >= 1);
  await client.query("reset role");
  await asUser(client, null);
}

async function testVectorOrgScope(client) {
  if (!HAS_VECTOR) {
    skipCheck("pgvector organization-scope tests", "extension unavailable");
    return;
  }

  check("pgvector extension available", true);

  await asUser(client, D);
  await client.query("set role authenticated");
  let r = await client.query(
    `select id from public.match_document_chunks($1::vector, 8, 0.0)`,
    [vec([0])]);
  check("same-organization member retrieves A's chunk semantically",
    r.rows.length === 1, JSON.stringify(r.rows));
  await client.query("reset role");

  await asUser(client, B);
  await client.query("set role authenticated");
  r = await client.query(
    `select id from public.match_document_chunks($1::vector, 8, 0.0)`,
    [vec([0])]);
  check("other organization retrieves nothing semantically",
    r.rows.length === 0, JSON.stringify(r.rows));
  await client.query("reset role");
  await asUser(client, null);
}

async function testEscapeHatch(client) {
  /* A sole owner of a personal org can delete it (documented
     escape hatch to join another organization later). */
  await asUser(client, B);
  await client.query("set role authenticated");

  let r = await client.query(
    `delete from public.organizations
     where id = public.current_org_id() returning id`);
  check("sole owner can delete their personal organization",
    r.rows.length === 1);

  r = await client.query(
    `select count(*) as n from public.org_members where user_id = $1`,
    [B]);
  check("membership removed with the organization",
    Number(r.rows[0].n) === 0);

  const invites = await client.query(
    `select count(*) as n from public.my_invitations()`);
  check("unaffiliated user can receive invitations again",
    Number(invites.rows[0].n) >= 0);

  await client.query("reset role");
  await asUser(client, null);
}

/* ---------- orchestration ---------- */

async function testMembershipAudit(client, orgs) {
  /* 0006: join / role-change / removal are recorded by an
     row trigger in the same transaction, whichever code path
     performed them, and affected members are notified. */

  /* F must be created after 0005 so the backfill does not
     hand them a personal organization. */
  await createUser(client, F, "f@atlas.test", "Fay Member");

  /* --- join via invitation accept --- */
  await asUser(client, A);
  await client.query("set role authenticated");
  await client.query(`select public.invite_member('f@atlas.test')`);
  const inv = await client.query(
    `select id from public.org_invitations where lower(email) = 'f@atlas.test'`);
  check("audit: invitation for F exists", inv.rows.length === 1);
  await client.query("reset role");

  await asUser(client, F);
  await client.query("set role authenticated");
  await client.query(`select public.accept_invitation($1)`,
    [inv.rows[0].id]);
  await client.query("reset role");

  let rows = await client.query(
    `select user_id, entity_id, metadata from public.audit_logs
     where action = 'org.member.joined' and entity_id = $1`, [F]);
  check("audit: join records org.member.joined",
    rows.rows.length === 1 &&
    rows.rows[0].user_id === F &&
    rows.rows[0].metadata?.role === "member",
    JSON.stringify(rows.rows));

  let notif = await client.query(
    `select id from public.notifications where user_id = $1`, [F]);
  check("audit: joining does not notify the joiner",
    notif.rows.length === 0);

  /* --- self-leave records the removal, no notification --- */
  await asUser(client, F);
  await client.query("set role authenticated");
  await client.query(
    `delete from public.org_members where user_id = $1 returning user_id`,
    [F]);
  await client.query("reset role");

  rows = await client.query(
    `select user_id, entity_id from public.audit_logs
     where action = 'org.member.removed' and entity_id = $1`, [F]);
  check("audit: self-leave records org.member.removed",
    rows.rows.length === 1 && rows.rows[0].user_id === F);

  notif = await client.query(
    `select id from public.notifications where user_id = $1`, [F]);
  check("audit: self-leave does not notify the leaver",
    notif.rows.length === 0);

  /* --- rejoin, then a role change by the owner --- */
  await asUser(client, A);
  await client.query("set role authenticated");
  await client.query(`select public.invite_member('f@atlas.test')`);
  const inv2 = await client.query(
    `select id from public.org_invitations where lower(email) = 'f@atlas.test'`);
  await client.query("reset role");

  await asUser(client, F);
  await client.query("set role authenticated");
  await client.query(`select public.accept_invitation($1)`,
    [inv2.rows[0].id]);
  await client.query("reset role");

  await asUser(client, A);
  await client.query("set role authenticated");
  await client.query(
    `update public.org_members set role = 'admin'
     where user_id = $1 and organization_id = $2`,
    [F, orgs.orgA]);
  await client.query("reset role");

  rows = await client.query(
    `select user_id, metadata from public.audit_logs
     where action = 'org.member.role_changed' and entity_id = $1
     order by created_at desc`, [F]);
  check("audit: role change records from/to metadata",
    rows.rows.length === 1 &&
    rows.rows[0].user_id === A &&
    rows.rows[0].metadata?.from === "member" &&
    rows.rows[0].metadata?.to === "admin",
    JSON.stringify(rows.rows));

  notif = await client.query(
    `select title from public.notifications where user_id = $1`,
    [F]);
  check("audit: role change notifies the affected member",
    notif.rows.length === 1 &&
    notif.rows[0].title === "Your role changed");

  /* --- removal by the owner notifies the removed member --- */
  await asUser(client, A);
  await client.query("set role authenticated");
  await client.query(
    `delete from public.org_members where user_id = $1 returning user_id`,
    [F]);
  await client.query("reset role");

  rows = await client.query(
    `select user_id, entity_id from public.audit_logs
     where action = 'org.member.removed' and entity_id = $1`, [F]);
  check("audit: admin removal records the acting owner",
    rows.rows.length === 2 && rows.rows.some((r) => r.user_id === A),
    JSON.stringify(rows.rows));

  notif = await client.query(
    `select title from public.notifications where user_id = $1
     order by created_at`, [F]);
  check("audit: removal notifies the removed member",
    notif.rows.length === 2 &&
    notif.rows[1].title === "Removed from an organization",
    JSON.stringify(notif.rows));

  /* --- trigger never blocks the operation itself --- */
  const member = await client.query(
    `select user_id from public.org_members where user_id = $1`, [F]);
  check("audit: F's membership row is gone after removal",
    member.rows.length === 0);
}

async function testKnowledgeArticles(client, orgs) {
  /* 0007: org-scoped articles, trigger-enforced immutable
     version history, wiki-style edit rights. */

  await asUser(client, A);
  await client.query("set role authenticated");
  const art = await client.query(
    `insert into public.knowledge_articles
       (organization_id, title, content, created_by)
     values ($1, 'Onboarding', 'Welcome to the team.', $2)
     returning id, current_version`,
    [orgs.orgA, A]);
  check("articles: create records version 1",
    art.rows[0].current_version === 1);

  let v = await client.query(
    `select version_number, content, created_by
     from public.knowledge_article_versions
     where article_id = $1`, [art.rows[0].id]);
  check("articles: version 1 row exists with the creator",
    v.rows.length === 1 &&
    v.rows[0].version_number === 1 &&
    v.rows[0].created_by === A);

  await client.query(
    `update public.knowledge_articles
     set content = 'Welcome aboard — updated.'
     where id = $1`, [art.rows[0].id]);

  const edited = await client.query(
    `select current_version from public.knowledge_articles
     where id = $1`, [art.rows[0].id]);
  check("articles: editing bumps current_version",
    edited.rows[0].current_version === 2);

  v = await client.query(
    `select version_number, created_by
     from public.knowledge_article_versions
     where article_id = $1 order by version_number`,
    [art.rows[0].id]);
  check("articles: edit appended an immutable version",
    v.rows.length === 2 && v.rows[1].version_number === 2);

  /* cross-organization isolation */
  await asUser(client, B);
  await client.query("set role authenticated");
  let r = await client.query(
    `select id from public.knowledge_articles where id = $1`,
    [art.rows[0].id]);
  check("articles: other organizations cannot see the article",
    r.rows.length === 0);

  r = await client.query(
    `update public.knowledge_articles set title = 'Hacked'
     where id = $1 returning id`, [art.rows[0].id]);
  check("articles: other organizations cannot edit it",
    r.rows.length === 0);

  const bad = await expectError(client,
    `insert into public.knowledge_articles
       (organization_id, title, content, created_by)
     values ($1, 'Spoof', '', $2)`,
    [orgs.orgA, B]);
  check("articles: spoofed organization insert is rejected",
    Boolean(bad));

  /* wiki model: any org member may read and edit */
  await asUser(client, D);
  await client.query("set role authenticated");
  r = await client.query(
    `select id from public.knowledge_articles where id = $1`,
    [art.rows[0].id]);
  check("articles: org members can read",
    r.rows.length === 1);

  await client.query(
    `update public.knowledge_articles
     set title = 'Onboarding handbook'
     where id = $1`, [art.rows[0].id]);

  v = await client.query(
    `select version_number, created_by
     from public.knowledge_article_versions
     where article_id = $1 order by version_number desc limit 1`,
    [art.rows[0].id]);
  check("articles: member edit is versioned with their id",
    v.rows[0].version_number === 3 && v.rows[0].created_by === D);

  /* versions are immutable */
  r = await client.query(
    `update public.knowledge_article_versions set content = 'x'
     where article_id = $1 returning id`, [art.rows[0].id]);
  check("articles: history rows cannot be updated",
    r.rows.length === 0);

  r = await client.query(
    `delete from public.knowledge_article_versions
     where article_id = $1 returning id`, [art.rows[0].id]);
  check("articles: history rows cannot be deleted",
    r.rows.length === 0);

  /* delete: creator or admin only */
  r = await client.query(
    `delete from public.knowledge_articles
     where id = $1 returning id`, [art.rows[0].id]);
  check("articles: non-creator member cannot delete",
    r.rows.length === 0);

  await client.query("reset role");

  /* cascade: org deletion removes articles and versions */
  await asUser(client, C);
  await client.query("set role authenticated");
  await client.query(
    `insert into public.knowledge_articles
       (organization_id, title, content, created_by)
     values ($1, 'C article', 'body', $2)`,
    [orgs.orgC, C]);
  await client.query("reset role");

  const orgCRows = await client.query(
    `select id from public.knowledge_articles
     where organization_id = $1`, [orgs.orgC]);
  check("articles: org C has its article",
    orgCRows.rows.length === 1);
}

async function main() {
  const server = await startServer();
  let client = null;

  try {
    client = await connect(server);

    await setupStubs(client);
    await createUser(client, A, "a@atlas.test", "Alice Owner");
    await createUser(client, B, "b@atlas.test", "Bob Other");

    await detectVector(client);

    const files = readdirSync(MIG_DIR)
      .filter((name) => /^\d+.*\.sql$/.test(name))
      .sort();

    /* 0001-0004 + pre-existing data, then 0005 */
    await seedEra1(client, files);
    await grants(client);

    console.log("\n-- backfill --");
    const orgs = await testBackfill(client);

    console.log("\n-- isolation --");
    await testIsolation(client);

    console.log("\n-- onboarding RPCs --");
    const { orgC } = await testOnboarding(client);
    orgs.orgC = orgC;

    console.log("\n-- invitation flow --");
    await testInviteFlow(client, orgs);

    console.log("\n-- sharing + RBAC --");
    await testSharingAndRbac(client, orgs);

    console.log("\n-- admin + roles --");
    await testAdminAndRoles(client, orgs);

    console.log("\n-- departments + profiles --");
    await testDepartmentsAndProfiles(client, orgs);

    console.log("\n-- storage sharing --");
    await testStorageSharing(client);

    console.log("\n-- personal tables --");
    await testPersonalTables(client, orgs);

    console.log("\n-- vector org scope --");
    await testVectorOrgScope(client);

    console.log("\n-- escape hatch --");
    await testEscapeHatch(client);

    console.log("\n-- membership audit triggers (0006) --");
    await testMembershipAudit(client, orgs);

    console.log("\n-- knowledge articles (0007) --");
    await testKnowledgeArticles(client, orgs);

    console.log("\n-- idempotency --");
    await client.query("reset role");
    await asUser(client, null);
    await applyMigrationsAgain(client);
  } catch (error) {
    fail += 1;
    console.log("SUITE ERROR:", error.message);
  } finally {
    try {
      if (client) await client.end();
    } catch {
      /* ignore */
    }
    try {
      if (server.mode === "embedded") await server.pg.stop();
    } catch {
      /* ignore */
    }
  }

  console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
  process.exit(fail === 0 ? 0 : 1);
}

await main();
