import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(root, "scripts", "contract-baseline.json");
const routerRootPath = path.join(root, "lib", "tabyan-trpc", "src", "router.ts");
const routerDir = path.join(root, "lib", "tabyan-trpc", "src", "routers");
const schemaPath = path.join(root, "lib", "db", "src", "schema", "index.ts");
const webAppPath = path.join(root, "artifacts", "tabyan", "src", "App.tsx");
const webTrpcPath = path.join(root, "artifacts", "tabyan", "src", "providers", "trpc.tsx");
const mobileTrpcPath = path.join(root, "artifacts", "mobile", "lib", "trpc.tsx");
const mobileAppDir = path.join(root, "artifacts", "mobile", "app");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function routerFileFor(exportName) {
  const overrides = {
    dailyVerse: "daily-verse.ts",
  };
  return overrides[exportName] ?? `${exportName}.ts`;
}

function collectApiContract() {
  const rootRouter = fs.readFileSync(routerRootPath, "utf8");
  const namespaceMatches = [...rootRouter.matchAll(/^\s{2}([A-Za-z]\w*):\s*([A-Za-z]\w*)Router,/gm)];
  const namespaces = {};

  for (const [, namespace, exportName] of namespaceMatches) {
    const fileName = routerFileFor(exportName);
    const filePath = path.join(routerDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Router source missing for ${namespace}: ${fileName}`);
    }

    const source = fs.readFileSync(filePath, "utf8");
    const routerStart = source.indexOf(`export const ${exportName}Router = createRouter({`);
    if (routerStart < 0) throw new Error(`Router export missing: ${exportName}Router`);

    const procedures = [...source.slice(routerStart).matchAll(/^  ([A-Za-z]\w*):\s*[A-Za-z]\w*/gm)]
      .map((match) => match[1])
      .filter((name, index, all) => all.indexOf(name) === index)
      .sort();

    if (procedures.length === 0) throw new Error(`No procedures found in ${fileName}`);
    namespaces[namespace] = procedures;
  }

  return {
    namespaces: Object.fromEntries(Object.entries(namespaces).sort(([a], [b]) => a.localeCompare(b))),
    procedureCount: Object.values(namespaces).reduce((total, procedures) => total + procedures.length, 0),
  };
}

function collectDatabaseTables() {
  const schema = fs.readFileSync(schemaPath, "utf8");
  return [...schema.matchAll(/export const ([A-Za-z]\w*)\s*=\s*pgTable\("([^"]+)"/g)]
    .map(([, symbol, table]) => ({ symbol, table }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function collectWebRoutes() {
  const source = fs.readFileSync(webAppPath, "utf8");
  return [...source.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map(([, route]) => route)
    .sort();
}

function walkMobileRoutes(dir, prefix = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) return walkMobileRoutes(path.join(dir, entry.name), relative);
    if (!/\.(tsx|ts)$/.test(entry.name)) return [];
    return [relative.replaceAll(path.sep, "/")];
  }).sort();
}

function collectClientContractAnchors() {
  const web = fs.readFileSync(webTrpcPath, "utf8");
  const mobile = fs.readFileSync(mobileTrpcPath, "utf8");
  const anchors = {
    webImportsAppRouter: /AppRouter/.test(web),
    mobileImportsAppRouter: /AppRouter/.test(mobile),
    webUsesTrpcEndpoint: /\/api\/trpc/.test(web),
    mobileUsesTrpcEndpoint: /\/api\/trpc/.test(mobile),
    webUsesSuperjson: /superjson/.test(web),
    mobileUsesSuperjson: /superjson/.test(mobile),
  };
  const failed = Object.entries(anchors).filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length > 0) throw new Error(`Client contract anchors missing: ${failed.join(", ")}`);
  return anchors;
}

function collectCurrentContract() {
  return {
    schemaVersion: 1,
    api: collectApiContract(),
    databaseTables: collectDatabaseTables(),
    webRoutes: collectWebRoutes(),
    mobileRoutes: walkMobileRoutes(mobileAppDir),
    clientContractAnchors: collectClientContractAnchors(),
  };
}

function removedItems(before, after) {
  return before.filter((item) => !after.includes(item));
}

function verifyNoBreakingChanges(baseline, current) {
  const errors = [];
  const baselineNamespaces = baseline.api?.namespaces ?? {};
  const currentNamespaces = current.api.namespaces;

  for (const [namespace, procedures] of Object.entries(baselineNamespaces)) {
    if (!currentNamespaces[namespace]) {
      errors.push(`removed API namespace: ${namespace}`);
      continue;
    }
    const removed = removedItems(procedures, currentNamespaces[namespace]);
    if (removed.length > 0) errors.push(`removed ${namespace} procedures: ${removed.join(", ")}`);
  }

  const baselineTables = new Map((baseline.databaseTables ?? []).map(({ symbol, table }) => [symbol, table]));
  const currentTables = new Map(current.databaseTables.map(({ symbol, table }) => [symbol, table]));
  for (const [symbol, table] of baselineTables) {
    if (!currentTables.has(symbol)) errors.push(`removed database model: ${symbol} (${table})`);
    else if (currentTables.get(symbol) !== table) {
      errors.push(`renamed database table: ${symbol} (${table} -> ${currentTables.get(symbol)})`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Contract baseline failed:\n- ${errors.join("\n- ")}`);
  }
}

const current = collectCurrentContract();
if (process.argv.includes("--write")) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Contract baseline written: ${path.relative(root, baselinePath)}`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  throw new Error(`Baseline missing: ${path.relative(root, baselinePath)}`);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
verifyNoBreakingChanges(baseline, current);

const addedNamespaces = Object.keys(current.api.namespaces).filter((name) => !baseline.api.namespaces[name]);
const addedProcedures = Object.entries(current.api.namespaces).flatMap(([namespace, procedures]) =>
  procedures
    .filter((procedure) => !(baseline.api.namespaces[namespace] ?? []).includes(procedure))
    .map((procedure) => `${namespace}.${procedure}`),
);
const addedTables = current.databaseTables
  .filter(({ symbol }) => !(baseline.databaseTables ?? []).some((table) => table.symbol === symbol))
  .map(({ symbol }) => symbol);

console.log("Contract baseline: PASS");
console.log(`API namespaces: ${Object.keys(current.api.namespaces).length}`);
console.log(`API procedures: ${current.api.procedureCount}`);
console.log(`Database tables: ${current.databaseTables.length}`);
console.log(`Web routes: ${current.webRoutes.length}`);
console.log(`Mobile route files: ${current.mobileRoutes.length}`);
if (addedNamespaces.length > 0) console.log(`Additive namespaces: ${addedNamespaces.join(", ")}`);
if (addedProcedures.length > 0) console.log(`Additive procedures: ${addedProcedures.join(", ")}`);
if (addedTables.length > 0) console.log(`Additive tables: ${addedTables.join(", ")}`);