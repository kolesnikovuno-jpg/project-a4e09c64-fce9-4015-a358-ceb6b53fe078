/** Local-only bridge between the current browser prototype and Egg v0.3.
 * Does NOT imply Supabase storage, Google Drive access, or server approval.
 */
import { createEggProject, type EggProject } from "./eggEngine.js";
import { exportEggManifest, validDriveFileId, validDriveWebUrl } from "./eggArtifacts.js";

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
  readAll().findLast?.(item => item.seed.text === seed.trim()) ??
  [...readAll()].reverse().find(item => item.seed.text === seed.trim()) ?? null;

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
