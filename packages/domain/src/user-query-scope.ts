const USER_SCOPED_QUERY_ROOTS = new Set([
  "auth",
  "student",
  "teacher",
  "admin",
  "fatwa",
  "notifications",
  "library",
  "sharia",
]);

/** Recognize private tRPC query keys while preserving intentionally public catalogs. */
export function isUserScopedQueryKey(queryKey: readonly unknown[]): boolean {
  const route = queryKey[0];
  const path = Array.isArray(route)
    ? route
    : typeof route === "string"
      ? route.split(".")
      : [];
  const [root, procedure] = path;
  if (typeof root !== "string") return false;
  if (root === "student" && procedure === "teachers") return false;
  if (root === "fatwa" && (procedure === "publicList" || procedure === "publicDetail")) return false;
  if (root === "recitation") {
    return procedure === "todayAssignment" || procedure === "myHistory" || procedure === "studentSessions";
  }
  return USER_SCOPED_QUERY_ROOTS.has(root);
}
