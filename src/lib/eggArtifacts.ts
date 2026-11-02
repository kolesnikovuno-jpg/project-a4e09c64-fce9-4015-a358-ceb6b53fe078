/**
 * Egg v0.3: owner-controlled external file references.
 *
 * No Drive OAuth/API or upload is performed here. A record supplied by an AI
 * remains "reported" until the Author acknowledges it. An acknowledged link
 * is not equivalent to a Google API verification of content or access rights.
 */
import {
  EggEngineError, type EggActor, type EggProject, type SphereId,
} from "./eggEngine.js";

export type EggArtifact = {
  id: string;
  /** Stable ID of the save operation; retries must reuse it. Older records may omit. */
  operationId?: string;
  provider: "google_drive";
  fileId: string;
  title: string;
  mimeType: string;
  webUrl?: string;
  collectionKey: string;
  version: number; // Number of registered references in collection, not Drive revisions.
  taskId?: string;
  sphere?: SphereId;
  status: "reported" | "author_confirmed";
  registeredBy: EggActor;
  registeredAt: string;
  confirmedAt?: string;
};
export type EggProjectArtifact = EggProject & { artifacts?: EggArtifact[] };

export type RegisterDriveReference = {
  actor: EggActor;
  operationId?: string;
  fileId: string;
  title: string;
  mimeType: string;
  collectionKey: string;
  webUrl?: string;
  taskId?: string;
  sphere?: SphereId;
  at: string;
};

const must = (value: string, name: string) => {
  if (!value || !value.trim()) throw new EggEngineError(name + " is required");
  return value.trim();
};

/** Google Drive ids are opaque, not URLs or authorization tokens.
 * Validate format, never inspect/guess a sharing link. */
export const validDriveFileId = (id: string) =>
  typeof id === "string" && /^[a-zA-Z0-9_-]{10,256}$/.test(id);

export const validDriveWebUrl = (url: string, fileId: string): boolean => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
      parsed.port || parsed.hash) return false;
    if (parsed.hostname !== "drive.google.com" && parsed.hostname !== "docs.google.com")
      return false;
    const pieces = parsed.pathname.split("/").filter(Boolean);
    const pathReferencesId = pieces.includes(fileId);
    const queryReferencesId = parsed.searchParams.get("id") === fileId;
    return pathReferencesId || queryReferencesId;
  } catch {
    return false;
  }
};

const pushArtifactEvent = (
  state: EggProjectArtifact,
  input: { actor: EggActor; at: string; detail: string; taskId?: string },
): EggProjectArtifact => ({
  ...state,
  nextSequence: state.nextSequence + 1,
  events: [...state.events, {
    id: "event-" + state.nextSequence,
    kind: "artifact_registered", actor: input.actor,
    at: input.at, taskId: input.taskId, detail: input.detail,
  }],
});

/** Store only a reference. No data leaves Drive as a result of this action. */
export const registerDriveReference = (
  project: EggProjectArtifact, input: RegisterDriveReference,
): EggProjectArtifact => {
  if (!validDriveFileId(input.fileId)) throw new EggEngineError("Invalid Google Drive file ID");
  const title = must(input.title, "File title");
  const mimeType = must(input.mimeType, "MIME type");
  const collectionKey = must(input.collectionKey, "Collection key");
  const at = must(input.at, "Timestamp");
  if (input.webUrl && !validDriveWebUrl(input.webUrl, input.fileId))
    throw new EggEngineError("URL must reference the same Google Drive file");
  if (input.taskId && !project.tasks.some(task => task.id === input.taskId))
    throw new EggEngineError("Artifact must reference a task in the same project");
  const artifacts = project.artifacts ?? [];
  const operationId = input.operationId;
  if (operationId !== undefined) {
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(operationId)) throw new EggEngineError("Invalid operation ID");
    const previous = artifacts.find(item => item.operationId === operationId);
    if (previous) {
      if (previous.fileId !== input.fileId || previous.collectionKey !== collectionKey ||
          previous.title !== title || previous.mimeType !== mimeType ||
          previous.webUrl !== input.webUrl || previous.taskId !== input.taskId ||
          previous.sphere !== (input.sphere ?? project.tasks.find(item => item.id === input.taskId)?.sphere))
        throw new EggEngineError("Operation ID already used for a different artifact");
      return project;
    }
  }
  const version = artifacts.filter(item => item.collectionKey === collectionKey).length + 1;
  const task = project.tasks.find(item => item.id === input.taskId);
  if (input.sphere && task && input.sphere !== task.sphere)
    throw new EggEngineError("Artifact sphere must match its task");
  const sphere = task?.sphere ?? input.sphere;
  const artifact: EggArtifact = {
    id: "artifact-" + project.nextSequence,
    ...(operationId ? { operationId } : {}),
    provider: "google_drive",
    fileId: input.fileId,
    title,
    mimeType,
    collectionKey,
    version,
    ...(input.webUrl ? { webUrl: input.webUrl } : {}),
    ...(task ? { taskId: task.id } : {}),
    ...(sphere ? { sphere } : {}),
    status: "reported",
    registeredBy: input.actor,
    registeredAt: at,
  };
  return pushArtifactEvent({
    ...project,
    artifacts: [...artifacts, artifact],
  }, {
    actor: input.actor, at, taskId: task?.id,
    detail: artifact.id + " / " + collectionKey + " v" + version,
  });
};

export const confirmDriveReference = (
  project: EggProjectArtifact,
  input: { actor: EggActor; artifactId: string; at: string },
): EggProjectArtifact => {
  if (input.actor !== "author") throw new EggEngineError("Only the Author may confirm an artifact");
  const artifacts = project.artifacts ?? [];
  const index = artifacts.findIndex(item => item.id === input.artifactId);
  if (index < 0) throw new EggEngineError("Unknown artifact");
  if (artifacts[index].status === "author_confirmed") return project;
  const at = must(input.at, "Timestamp");
  return {
    ...project,
    artifacts: artifacts.map((item, i) => i === index
      ? { ...item, status: "author_confirmed" as const, confirmedAt: at }
      : item),
    nextSequence: project.nextSequence + 1,
    events: [...project.events, {
      id: "event-" + project.nextSequence,
      kind: "artifact_confirmed" as const,
      actor: "author" as const,
      at,
      taskId: artifacts[index].taskId,
      detail: artifacts[index].id,
    }],
  };
};

/** Portable snapshot, including entire decision history, references and
 * exact schema; NEVER includes third-party file bytes or access tokens. */
export const exportEggManifest = (project: EggProjectArtifact, at: string) => ({
  schema: "egg.export/0.1" as const,
  exportedAt: must(at, "Export timestamp"),
  content: "project-state-and-external-file-references" as const,
  filesEmbedded: false as const,
  project: {
    ...project,
    artifacts: [...(project.artifacts ?? [])],
  },
});
