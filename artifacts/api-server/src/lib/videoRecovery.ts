/**
 * Pure logic for the video recovery audit (scripts/videoRecoveryAudit.ts).
 *
 * Recovery is evidence-based only: a database value is repaired when the
 * object id is literally embedded in it (a legacy URL form of the same key).
 * Ownership is never inferred from timestamps, file names or sizes — an
 * object nobody references stays an orphan, however plausible a match looks.
 */

export type StoredReference = {
  table: string;
  column: string;
  /** Primary-key column/value pair identifying the row. */
  keyColumn: string;
  key: string;
  value: string;
  /** jsonb values and rows without a single-column key are reported, never rewritten. */
  reportOnly: boolean;
};

export type ObjectFacts = {
  objectPath: string;
  size: number;
  contentType: string;
  md5: string | null;
  createdAt: string | null;
  aclOwner: string | null;
  /** null = not a video by signature or declared type. */
  structure: "valid" | "corrupt" | null;
};

export type OwnerFacts = { role: string } | null;

export type ObjectClass =
  | "A_LINKED_VALID"
  | "B_VALID_LEGACY_LINK"
  | "C_ORPHAN_OWNER_KNOWN"
  | "C_ORPHAN_OWNER_UNKNOWN"
  | "C_ORPHAN_NO_OWNER"
  | "E_CORRUPT_LINKED"
  | "E_CORRUPT_UNLINKED"
  | "F_UNVERIFIED";

const OBJECT_KEY = /(?:^|\/)objects\/((?:[\w-]+\/)*[\w-]+)(?=$|[?#])/;

/**
 * Durable object key (`/objects/...`) embedded in a stored value, whatever
 * URL form an earlier build saved: the bare key, `/api/storage/objects/...`
 * with an old `?token=`, an absolute app URL, or a signed storage URL for
 * `<bucket>/<private dir>/...`. Returns null when no key is embedded.
 */
export function embeddedObjectPath(value: string, privateDirName = ".private"): string | null {
  const raw = value.trim();
  if (!raw) return null;
  let path = raw;
  try {
    const url = new URL(raw, "http://relative.invalid");
    path = url.pathname;
    if (url.hostname === "storage.googleapis.com") {
      const marker = `/${privateDirName}/`;
      const at = path.indexOf(marker);
      return at >= 0 ? `/objects/${path.slice(at + marker.length)}` : null;
    }
  } catch {
    return null;
  }
  if (path.includes("..")) return null;
  const match = OBJECT_KEY.exec(path);
  return match ? `/objects/${match[1]}` : null;
}

export function isCanonicalReference(value: string): boolean {
  return /^\/objects\/(?:[\w-]+\/)*[\w-]+$/.test(value) && !value.includes("..");
}

/** Replace query strings (tokens, signatures) before a value enters a report. */
export function redactReference(value: string): string {
  return value.replace(/\?.*$/, "?[redacted]");
}

export type Repair = {
  reference: StoredReference;
  newValue: string;
  evidence: string;
};

export type Classified = {
  object: ObjectFacts;
  klass: ObjectClass;
  references: StoredReference[];
  repairs: Repair[];
  duplicateOf: string[];
};

export type AuditResult = {
  objects: Classified[];
  /** DB references (any column) whose embedded object does not exist. */
  missing: StoredReference[];
  /** Several distinct rows pointing at one object — reported, never merged. */
  sharedObjects: { objectPath: string; references: StoredReference[] }[];
};

export function classifyVideoObjects(
  objects: ObjectFacts[],
  references: StoredReference[],
  owners: Map<string, OwnerFacts>,
): AuditResult {
  const byPath = new Map<string, StoredReference[]>();
  const missing: StoredReference[] = [];
  const known = new Set(objects.map((object) => object.objectPath));
  for (const reference of references) {
    const objectPath = embeddedObjectPath(reference.value);
    if (!objectPath) continue;
    if (!known.has(objectPath)) {
      missing.push(reference);
      continue;
    }
    byPath.set(objectPath, [...(byPath.get(objectPath) ?? []), reference]);
  }

  const byMd5 = new Map<string, string[]>();
  for (const object of objects) {
    if (object.md5) byMd5.set(object.md5, [...(byMd5.get(object.md5) ?? []), object.objectPath]);
  }

  const classified = objects.map((object): Classified => {
    const refs = byPath.get(object.objectPath) ?? [];
    const duplicateOf = object.md5
      ? (byMd5.get(object.md5) ?? []).filter((path) => path !== object.objectPath)
      : [];
    const repairs: Repair[] = object.structure === "valid"
      ? refs
        .filter((reference) => !reference.reportOnly && !isCanonicalReference(reference.value))
        .map((reference) => ({
          reference,
          newValue: object.objectPath,
          evidence: `stored value embeds the exact object key ${object.objectPath}; object exists and passed structure validation`,
        }))
      : [];
    let klass: ObjectClass;
    if (object.structure === null) klass = "F_UNVERIFIED";
    else if (object.structure === "corrupt") klass = refs.length ? "E_CORRUPT_LINKED" : "E_CORRUPT_UNLINKED";
    else if (refs.length === 0) {
      if (!object.aclOwner) klass = "C_ORPHAN_NO_OWNER";
      else klass = owners.get(object.aclOwner) ? "C_ORPHAN_OWNER_KNOWN" : "C_ORPHAN_OWNER_UNKNOWN";
    } else klass = repairs.length ? "B_VALID_LEGACY_LINK" : "A_LINKED_VALID";
    return { object, klass, references: refs, repairs, duplicateOf };
  });

  const sharedObjects = [...byPath.entries()]
    .filter(([, refs]) => new Set(refs.map((ref) => `${ref.table}:${ref.key}`)).size > 1)
    .map(([objectPath, refs]) => ({ objectPath, references: refs }));

  return { objects: classified, missing, sharedObjects };
}
