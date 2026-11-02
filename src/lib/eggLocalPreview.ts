/** Local-only bridge between the current browser prototype and Egg v0.3.
 * Does NOT imply Supabase storage, Google Drive access, or server approval.
 */
import { createEggProject, EGG_SPHERES, type EggProject, type SphereId } from "./eggEngine.js";
import { exportEggManifest, registerDriveReference, validDriveFileId, validDriveWebUrl } from "./eggArtifacts.js";

export const EGG_LOCAL_PROJECTS_KEY = "unocalc.egg.local-projects.v1";
const LIMIT = 12;

const readAll = (): EggProject[] => {
  try {
    const raw = window.localStorage.getItem(EGG_LOCAL_PROJECTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is EggProject => {
      if (!x || typeof x !== "object") return false;
      const item = x as Partial<EggProject>;
      return item.schema === "egg.engine/0.1" &&
        typeof item.id === "string" &&
        typeof item.seed?.text === "string" &&
        typeof item.nextSequence === "number" &&
        Array.isArray(item.tasks) && Array.isArray(item.events) &&
        (!item.artifacts || (Array.isArray(item.artifacts) && item.artifacts.every(artifact =>
          artifact && artifact.provider === "google_drive" &&
          typeof artifact.id === "string" &&
          typeof artifact.title === "string" &&
          typeof artifact.collectionKey === "string" &&
          validDriveFileId(artifact.fileId) &&
          (!artifact.webUrl || validDriveWebUrl(artifact.webUrl, artifact.fileId)) &&
          (artifact.status === "reported" || artifact.status === "author_confirmed"))));
    });
  } catch {
    return [];
  }
};

export const loadLocalEggProject = (seed: string): EggProject | null =>
  readAll().reverse().find(item => item.seed.text === seed.trim()) ?? null;

export const saveLocalEggProject = (project: EggProject): boolean => {
  try {
    const previous = readAll().filter(item => item.id !== project.id);
    window.localStorage.setItem(EGG_LOCAL_PROJECTS_KEY,
      JSON.stringify([...previous, project].slice(-LIMIT)));
    return true;
  } catch {
    return false;
  }
};

export const startLocalEggProject = (seed: string, at: string): EggProject => {
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "local-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  const project = createEggProject({ id, seed, at });
  saveLocalEggProject(project);
  return project;
};

/** Read only standard Drive and Docs URLs; sanitize tracking/query fragments.
 * We do not fetch the link or check that fileId actually exists on Google.
 */
export const parseGoogleDriveFileLink = (
  raw: string,
): { fileId: string; webUrl: string; mimeType: string } | null => {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const { hostname, pathname } = url;
    let match: RegExpMatchArray | null = null;
    let mimeType = "application/octet-stream";
    if (hostname === "drive.google.com") {
      match = pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]{10,256})(?:\/|$)/);
      if (!match && pathname === "/open") {
        const id = url.searchParams.get("id");
        if (id && validDriveFileId(id)) {
          return {
            fileId: id,
            webUrl: "https://drive.google.com/file/d/" + id + "/view",
            mimeType,
          };
        }
      }
    } else if (hostname === "docs.google.com") {
      match = pathname.match(/^\/(document|spreadsheets|presentation|drawings|forms)\/d\/([a-zA-Z0-9_-]{10,256})(?:\/|$)/);
      const kind = match?.[1];
      mimeType = ({
        document: "application/vnd.google-apps.document",
        spreadsheets: "application/vnd.google-apps.spreadsheet",
        presentation: "application/vnd.google-apps.presentation",
        drawings: "application/vnd.google-apps.drawing",
        forms: "application/vnd.google-apps.form",
      } as Record<string, string>)[kind ?? ""] ?? mimeType;
    } else {
      return null;
    }
    const fileId = hostname === "drive.google.com" ? match?.[1] : match?.[2];
    if (!fileId || !validDriveFileId(fileId)) return null;
    const webUrl = url.origin + url.pathname;
    if (!validDriveWebUrl(webUrl, fileId)) return null;
    return { fileId, webUrl, mimeType };
  } catch {
    return null;
  }
};

export type LocalEggBundleInput = {
  project: EggProject;
  maturity: { stage: 1 | 2 | 3 | 4 | 5; iteration: number };
  ideaCycle: unknown;
  designLoop: unknown;
  brief: unknown;
  sketches: Array<{ id: string; name: string }>;
  exportedAt: string;
};

/** Portable local preview — includes all TEXT data and Drive references, NOT
 * IndexedDB sketch binaries, third-party Drive file bytes or AI account data.
 */
export const createLocalEggBundle = (input: LocalEggBundleInput) => ({
  schema: "egg.browser-bundle/0.1" as const,
  exportedAt: input.exportedAt,
  environment: "local-browser-prototype" as const,
  filesEmbedded: false as const,
  sketchBinariesEmbedded: false as const,
  engine: exportEggManifest({
    ...input.project, level: input.maturity.stage, iteration: input.maturity.iteration,
  }, input.exportedAt),
  preview: {
    stage: input.maturity,
    ideaCycle: input.ideaCycle,
    designLoop: input.designLoop,
    designBrief: input.brief,
    sketchIndex: input.sketches,
  },
});


/** Import ONLY Drive links from a previously exported Egg JSON.
 * It does not overwrite seed, levels, Author decisions, design state, or files.
 * Imported links return to "reported" so an arbitrary JSON file cannot forge
 * an Author's confirmation. Existing links are deduplicated.
 */
export const importEggFileReferences = (
  current: EggProject, raw: string, at: string,
): { project: EggProject; imported: number; skipped: number } => {
  if (!raw.trim() || raw.length > 2_000_000) throw new Error("Invalid import size");
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Error("Invalid JSON"); }
  if (!data || typeof data !== "object") throw new Error("Invalid Egg export");
  const root = data as Record<string, unknown>;
  const manifest = root.schema === "egg.browser-bundle/0.1"
    ? root.engine : root.schema === "egg.export/0.1" ? root : null;
  if (!manifest || typeof manifest !== "object") throw new Error("Unsupported Egg export");
  const exportedProject = (manifest as { project?: unknown }).project;
  if (!exportedProject || typeof exportedProject !== "object") throw new Error("Missing Egg project");
  const record = exportedProject as Partial<EggProject>;
  if (record.schema !== "egg.engine/0.1" ||
      record.seed?.text?.trim() !== current.seed.text.trim())
    throw new Error("This export belongs to another project seed");
  const list = record.artifacts ?? [];
  if (!Array.isArray(list) || list.length > 250) throw new Error("Invalid artifact count");
  let project = current;
  let imported = 0;
  let skipped = 0;
  for (const item of list) {
    if (!item || typeof item !== "object") throw new Error("Invalid artifact entry");
    const artifact = item as Record<string, unknown>;
    if (artifact.provider !== "google_drive" ||
        typeof artifact.fileId !== "string" || !validDriveFileId(artifact.fileId) ||
        typeof artifact.title !== "string" || !artifact.title.trim() || artifact.title.length > 250 ||
        typeof artifact.mimeType !== "string" || !artifact.mimeType.trim() || artifact.mimeType.length > 140 ||
        typeof artifact.collectionKey !== "string" || !artifact.collectionKey.trim() ||
        artifact.collectionKey.length > 80 ||
        typeof artifact.webUrl !== "string" || artifact.webUrl.length > 1200 ||
        !validDriveWebUrl(artifact.webUrl, artifact.fileId) ||
        (artifact.sphere !== undefined &&
          (typeof artifact.sphere !== "string" ||
            !Object.prototype.hasOwnProperty.call(EGG_SPHERES, artifact.sphere))))
      throw new Error("Invalid Drive reference in export");
    const sphere = artifact.sphere as SphereId | undefined;
    if (project.artifacts?.some(previous =>
      previous.provider === "google_drive" &&
      previous.fileId === artifact.fileId &&
      previous.collectionKey === artifact.collectionKey &&
      previous.sphere === sphere)) {
      skipped++;
      continue;
    }
    project = registerDriveReference(project, {
      actor: "author", at, fileId: artifact.fileId,
      title: artifact.title, mimeType: artifact.mimeType,
      webUrl: artifact.webUrl, collectionKey: artifact.collectionKey,
      ...(sphere ? { sphere } : {}),
    });
    imported++;
  }
  return { project, imported, skipped };
};
