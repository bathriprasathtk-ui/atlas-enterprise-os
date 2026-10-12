/* =========================================================
   END-TO-END SUITE — production server over HTTP

   Boots the real `next start` build (no dev server, no
   mocks) and verifies the behaviors every deployment must
   have before it serves anyone:

     - /api/health liveness (unauthenticated)
     - landing + login render
     - middleware redirects signed-out users away from
       every /workspace route
     - every API route rejects unauthenticated callers

   Dummy Supabase env is used on purpose: no route may
   return 500 instead of 401 when the backend is unreachable.

   Run: npm run build && npm run test:e2e
   (the script builds first if .next is missing)
========================================================= */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const HERE = new URL("..", import.meta.url).pathname;
const PORT = await freePort();
const BASE = `http://127.0.0.1:${PORT}`;

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

/* ---------- boot the production server ---------- */

const server = spawn(
  process.execPath,
  [
    join(HERE, "node_modules", "next", "dist", "bin", "next"),
    "start",
    "-p",
    String(PORT),
  ],
  {
    cwd: HERE,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(PORT),
      /* Deliberately unreachable backend: routes must
         degrade to honest 4xx, never 5xx. */
      NEXT_PUBLIC_SUPABASE_URL:
        "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);

let serverLog = "";
server.stdout.on("data", (chunk) => (serverLog += chunk));
server.stderr.on("data", (chunk) => (serverLog += chunk));

async function waitForHealth(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return true;
    } catch {
      /* server still starting */
    }
    await sleep(500);
  }

  return false;
}

/* ---------- checks ---------- */

try {
  const ready = await waitForHealth();

  if (!ready) {
    console.error("server never became healthy");
    console.error(serverLog.slice(-2000));
    process.exit(1);
  }

  console.log(`\n-- health --`);

  const health = await fetch(`${BASE}/api/health`);
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

  const landing = await fetch(`${BASE}/`);
  check("GET / → 200", landing.status === 200);

  const login = await fetch(`${BASE}/login`);
  const loginHtml = await login.text();
  check(
    "GET /login → 200 with a real form",
    login.status === 200 && loginHtml.includes("<form")
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
    const response = await fetch(`${BASE}${path}`, {
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
    const response = await fetch(`${BASE}${path}`, {
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

  const integrations = await fetch(`${BASE}/api/integrations`);
  check(
    "GET /api/integrations without session → 401",
    integrations.status === 401,
    `status ${integrations.status}`
  );

  const missing = await fetch(`${BASE}/api/does-not-exist`);
  check("unknown API path → 404", missing.status === 404);
} catch (error) {
  fail += 1;
  console.error("SUITE ERROR:", error.message);
  console.error(serverLog.slice(-2000));
} finally {
  server.kill("SIGTERM");
  await sleep(500);
  if (!server.killed) server.kill("SIGKILL");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
