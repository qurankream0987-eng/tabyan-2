#!/usr/bin/env node
// Starts the whole local stack: Postgres (.local-pg), S3 storage (.local-s3),
// the API on :8080 and the web app on :5173. `--mobile` also starts Metro on
// :8082 and routes the Android emulator's localhost to this machine.
// Services whose port is already taken are left alone. Ctrl+C stops what this
// script started (Postgres keeps running; stop it with `npm run dev:db:stop`).
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const withMobile = process.argv.includes("--mobile");
const isWindows = process.platform === "win32";
const children = [];

const colors = { db: 36, s3: 35, api: 33, web: 32, metro: 34, dev: 37 };
const log = (name, line) => process.stdout.write(`\x1b[${colors[name] ?? 37}m[${name}]\x1b[0m ${line}\n`);

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs = 60_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await portInUse(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function run(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...options.env },
    shell: options.shell ?? false,
    windowsHide: true,
  });
  for (const stream of [child.stdout, child.stderr]) {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) if (line.trim()) log(name, line);
    });
  }
  child.on("exit", (code, signal) => log(name, `exited (${signal ?? code})`));
  children.push(child);
  return child;
}

async function startPostgres() {
  if (await portInUse(5433)) return log("db", "already running on :5433");
  const pgCtl = path.join(root, ".local-pg/bin", isWindows ? "pg_ctl.exe" : "pg_ctl");
  if (!existsSync(pgCtl)) return log("db", "no .local-pg found; skipping (set DATABASE_URL to your own Postgres)");
  // pg_ctl hands its stdio to the postgres server it launches, so capturing
  // output would never see EOF; ignore it and wait for the port instead.
  spawnSync(pgCtl, ["-D", ".local-pg/data", "-l", ".local-pg/pg.log", "start"], { cwd: root, stdio: "ignore" });
  log("db", (await waitForPort(5433, 30_000)) ? "started on :5433 (log: .local-pg/pg.log)" : "did not open :5433 within 30s; see .local-pg/pg.log");
}

async function startStorage() {
  if (await portInUse(9000)) return log("s3", "already running on :9000");
  const weed = path.join(root, ".local-s3/bin", isWindows ? "weed.exe" : "weed");
  if (!existsSync(weed)) return log("s3", "no .local-s3 found; skipping (uploads will not work)");
  run("s3", weed, [
    "server", "-ip=127.0.0.1", "-ip.bind=127.0.0.1", "-dir=.local-s3/data",
    "-master.port=19333", "-volume.port=18080", "-filer", "-filer.port=18888",
    "-s3", "-s3.port=9000", "-s3.config=.local-s3/s3.json", "-s3.allowedOrigins=*",
  ]);
  if (!(await waitForPort(9000))) log("s3", "did not open :9000 within 60s");
}

async function startApi() {
  if (await portInUse(8080)) return log("api", "already running on :8080");
  const cwd = path.join(root, "apps/api");
  log("api", "building…");
  const build = spawnSync(process.execPath, ["./build.mjs"], { cwd, env: { ...process.env, NODE_ENV: "development" }, encoding: "utf8" });
  if (build.status !== 0) {
    log("api", (build.stderr || build.stdout).trim());
    throw new Error("API build failed");
  }
  run("api", process.execPath, ["--env-file=../../.env", "--enable-source-maps", "./dist/index.mjs"], {
    cwd,
    env: { PORT: "8080", NODE_ENV: "development" },
  });
  if (!(await waitForPort(8080))) log("api", "did not open :8080 within 60s");
}

async function startWeb() {
  if (await portInUse(5173)) return log("web", "already running on :5173");
  const cwd = path.join(root, "apps/web");
  const vite = path.join(root, "node_modules/vite/bin/vite.js");
  run("web", process.execPath, ["--env-file=../../.env", vite, "--config", "vite.config.ts", "--host", "localhost"], {
    cwd,
    env: { PORT: "5173", BASE_PATH: "/", LOCAL_API_TARGET: "http://localhost:8080" },
  });
}

async function startMetro() {
  if (await portInUse(8082)) return log("metro", "already running on :8082");
  for (const port of [8082, 9000]) {
    const r = spawnSync("adb", ["reverse", `tcp:${port}`, `tcp:${port}`], { encoding: "utf8", shell: isWindows });
    log("metro", r.status === 0 ? `adb reverse tcp:${port} ok` : `adb reverse tcp:${port} failed (is the emulator running?)`);
  }
  run("metro", "npx", ["expo", "start", "--dev-client", "--port", "8082"], {
    cwd: path.join(root, "apps/mobile"),
    env: { EXPO_PUBLIC_DOMAIN: "http://10.0.2.2:8080" },
    shell: isWindows,
  });
}

function stopAll() {
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    if (isWindows) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
}

if (process.argv.includes("--stop-db")) {
  const pgCtl = path.join(root, ".local-pg/bin", isWindows ? "pg_ctl.exe" : "pg_ctl");
  const result = spawnSync(pgCtl, ["-D", ".local-pg/data", "stop"], { cwd: root, encoding: "utf8" });
  log("db", (result.stdout || result.stderr || "").trim());
  process.exit(result.status ?? 1);
}

process.on("SIGINT", () => { log("dev", "stopping…"); stopAll(); process.exit(0); });
process.on("SIGTERM", () => { stopAll(); process.exit(0); });

try {
  await startPostgres();
  await startStorage();
  await startApi();
  await startWeb();
  if (withMobile) await startMetro();
  log("dev", `ready: web http://localhost:5173  api http://localhost:8080${withMobile ? "  metro :8082" : ""}  (Ctrl+C to stop)`);
} catch (error) {
  log("dev", `failed: ${error.message}`);
  stopAll();
  process.exit(1);
}
