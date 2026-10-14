/* =========================================================
   END-TO-END SUITE — production server over HTTP

   Boots the real `next start` build (no dev server, no
   mocks) and verifies the behaviors every deployment must
   have before it serves anyone.

   Phase 1 — configured (deliberately unreachable backend):
     - /api/health liveness (unauthenticated)
     - landing + login render with the real document title
     - branded 404 page
     - middleware redirects signed-out users away from
       every /workspace route
     - every API route rejects unauthenticated callers
     - unknown API path is a 404

   Phase 2 — unconfigured (no Supabase env at all):
     - liveness stays 200 and reports configured:false
     - protected pages and API routes answer 503 with a
       message naming only variable names
     - the upstream library's internal error text is never
       returned to the client

   Dummy Supabase env is used on purpose in phase 1: no route
   may return 500 instead of 401 when the backend is unreachable.

   Run: npm run build && npm run test:e2e
   (the script builds first if .next is missing)
========================================================= */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const HERE = new URL("..", import.meta.url).pathname;

const NEXT_BIN = join(
  HERE,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next"
);

/* Text the Supabase client throws when unconfigured. It must
   never reach a client. */
const UPSTREAM_LEAK = "required to create a Supabase client";

let pass = 0;
let fail = 0;

function check(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function freePort() {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/* ---------- build if needed ---------- */

if (!existsSync(join(HERE, ".next", "BUILD_ID"))) {
  console.log("no build found — running `npm run build`…");
  const build = spawnSync("npm", ["run", "build"], {
    cwd: HERE,
    stdio: "inherit",
  });

  if (build.status !== 0) {
    console.error("build failed; cannot run e2e");
    process.exit(1);
  }
}

/* ---------- server helpers ---------- */

function startNext(port, env) {
  const proc = spawn(
    process.execPath,
    [NEXT_BIN, "start", "-p", String(port)],
    {
      cwd: HERE,
      env: {
        ...env,
        NODE_ENV: "production",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  const state = { log: "" };
  proc.stdout.on("data", (chunk) => (state.log += chunk));
  proc.stderr.on("data", (chunk) => (state.log += chunk));

  return { proc, state, base: `http://127.0.0.1:${port}` };
}

async function stopNext(server) {
  if (!server) return;
  server.proc.kill("SIGTERM");
  await sleep(600);
  if (!server.proc.killed) server.proc.kill("SIGKILL");
  await sleep(200);
}

async function waitForHealth(server, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${server.base}/api/health`);
      if (response.ok) return true;
    } catch {
      /* server still starting */
    }
    await sleep(500);
  }

  return false;
}

const phase1 = { proc: null, state: { log: "" } };
const phase2 = { proc: null, state: { log: "" } };

try {
  /* =========================================================
     PHASE 1 — configured, backend unreachable
     ========================================================= */

  const port1 = await freePort();
  const app1 = startNext(port1, {
    ...process.env,
    /* Deliberately unreachable backend: routes must degrade
       to honest 4xx, never 5xx. */
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
  });
  phase1.proc = app1.proc;
  phase1.state = app1.state;

  const ready1 = await waitForHealth(app1);

  if (!ready1) {
    console.error("server never became healthy");
    console.error(app1.state.log.slice(-2000));
    process.exit(1);
  }

  console.log(`\n-- health --`);

  const health = await fetch(`${app1.base}/api/health`);
  const healthBody = await health.json().catch(() => ({}));
  check(
    "GET /api/health → 200 ok without auth",
    health.status === 200 && healthBody.status === "ok",
    `status ${health.status}`
  );
  check(
    "health reports config state, never values",
    typeof healthBody.configured?.supabase === "boolean" &&
      typeof healthBody.configured?.gemini === "boolean"
  );

  console.log(`\n-- pages render --`);

  const landing = await fetch(`${app1.base}/`);
  check("GET / → 200", landing.status === 200);

  const landingHtml = await landing.text().catch(() => "");
  check(
    "landing uses the real app title",
    landingHtml.includes("Atlas Enterprise OS") &&
      !landingHtml.includes("Create Next App"),
    "title still boilerplate?"
  );

  const login = await fetch(`${app1.base}/login`);
  const loginHtml = await login.text();
  check(
    "GET /login → 200 with a real form",
    login.status === 200 && loginHtml.includes("<form")
  );

  const notFound = await fetch(`${app1.base}/this-route-does-not-exist`);
  const notFoundHtml = await notFound.text().catch(() => "");
  check(
    "unknown page → branded 404",
    notFound.status === 404 &&
      notFoundHtml.includes("This page does not exist"),
    `status ${notFound.status}`
  );

  console.log(`\n-- middleware guards /workspace --`);

  for (const path of [
    "/workspace",
    "/workspace/dashboard",
    "/workspace/knowledge",
    "/workspace/knowledge/articles",
    "/workspace/team",
    "/workspace/settings",
  ]) {
    const response = await fetch(`${app1.base}${path}`, {
      redirect: "manual",
    });
    const location = response.headers.get("location") ?? "";
    check(
      `signed-out ${path} redirects to /login`,
      [301, 302, 303, 307, 308].includes(response.status) &&
        location.includes("/login"),
      `status ${response.status} → ${location}`
    );
  }

  console.log(`\n-- API rejects unauthenticated callers --`);

  const apiCases = [
    ["POST", "/api/ai/ask", { question: "hi" }],
    ["POST", "/api/knowledge/search", { query: "policy" }],
    ["POST", "/api/documents/ingest", {}],
    ["POST", "/api/workflows/run", null],
    ["POST", "/api/org/invite-email", { email: "x@y.example" }],
  ];

  for (const [method, path, body] of apiCases) {
    const response = await fetch(`${app1.base}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    check(
      `${method} ${path} without session → 401`,
      response.status === 401,
      `status ${response.status}`
    );
  }

  const integrations = await fetch(`${app1.base}/api/integrations`);
  check(
    "GET /api/integrations without session → 401",
    integrations.status === 401,
    `status ${integrations.status}`
  );

  const missing = await fetch(`${app1.base}/api/does-not-exist`);
  check("unknown API path → 404", missing.status === 404);

  await stopNext(app1);
  phase1.proc = null;

  /* =========================================================
     PHASE 2 — no Supabase configuration at all
     ========================================================= */

  console.log(`\n-- unconfigured deployment --`);

  const unconfigured = { ...process.env };
  delete unconfigured.NEXT_PUBLIC_SUPABASE_URL;
  delete unconfigured.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const port2 = await freePort();
  const app2 = startNext(port2, unconfigured);
  phase2.proc = app2.proc;
  phase2.state = app2.state;

  const ready2 = await waitForHealth(app2);

  if (!ready2) {
    console.error("unconfigured server never became healthy");
    console.error(app2.state.log.slice(-2000));
    process.exit(1);
  }

  const health2 = await fetch(`${app2.base}/api/health`);
  const health2Body = await health2.json().catch(() => ({}));
  check(
    "liveness stays 200 without credentials",
    health2.status === 200 && health2Body.status === "ok",
    `status ${health2.status}`
  );
  check(
    "health reports supabase unconfigured",
    health2Body.configured?.supabase === false
  );

  const landing2 = await fetch(`${app2.base}/`);
  check(
    "landing still renders unconfigured",
    landing2.status === 200,
    `status ${landing2.status}`
  );

  const login2 = await fetch(`${app2.base}/login`);
  const login2Html = await login2.text().catch(() => "");
  check(
    "unconfigured /login → 503 with setup guidance",
    login2.status === 503 &&
      login2Html.includes("NEXT_PUBLIC_SUPABASE_URL") &&
      !login2Html.includes(UPSTREAM_LEAK),
    `status ${login2.status}`
  );

  const workspace2 = await fetch(`${app2.base}/workspace/dashboard`, {
    redirect: "manual",
  });
  const workspace2Html = await workspace2.text().catch(() => "");
  check(
    "unconfigured /workspace/dashboard → 503 (not 500)",
    workspace2.status === 503 &&
      !workspace2Html.includes(UPSTREAM_LEAK),
    `status ${workspace2.status}`
  );

  const ask2 = await fetch(`${app2.base}/api/ai/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "hi" }),
  });
  const ask2Body = await ask2.text().catch(() => "");
  let ask2Json = {};
  try {
    ask2Json = JSON.parse(ask2Body);
  } catch {
    /* asserted below */
  }
  check(
    "unconfigured POST /api/ai/ask → 503 JSON, no leak",
    ask2.status === 503 &&
      ask2Json.code === "supabase_not_configured" &&
      !ask2Body.includes(UPSTREAM_LEAK),
    `status ${ask2.status} body ${ask2Body.slice(0, 120)}`
  );

  await stopNext(app2);
  phase2.proc = null;
} catch (error) {
  fail += 1;
  console.error("SUITE ERROR:", error.message);
  console.error(
    (phase2.state.log || phase1.state.log).slice(-2000)
  );
} finally {
  await stopNext(phase1.proc);
  await stopNext(phase2.proc);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
