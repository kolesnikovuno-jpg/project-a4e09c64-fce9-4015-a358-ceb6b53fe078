/** Manual sketch-development loop. It preserves every submitted version and
 * incoming critique; no AI research or physical tests are claimed. */
export type DesignDestination = "marketing" | "testDrive";
export type DesignOwner = "design" | DesignDestination;
export type DesignStatus = DesignOwner | "ready";
export type ReviewEvidence = "hypothesis" | "observation" | "question";

export type DesignSubmission = {
  id: string;
  version: number;
  destination: DesignDestination;
  description: string;
  changeNote: string;
  imageIds: string[];
  sentAt: number;
};

export type DesignFeedback = {
  id: string;
  submissionId: string;
  source: DesignDestination;
  text: string;
  evidence: ReviewEvidence;
  receivedAt: number;
};

export type DesignLoop = {
  seed: string;
  layer: string;
  status: DesignStatus;
  description: string;
  changeNote: string;
  imageIds: string[];
  submissions: DesignSubmission[];
  feedback: DesignFeedback[];
  marketingDraft: string;
  marketingEvidence: ReviewEvidence;
  testDraft: string;
  testEvidence: ReviewEvidence;
};

export const DESIGN_LOOP_STORAGE = "unocalc.egg.design-loop.v1";

export const createDesignLoop = (seed: string, layer: string): DesignLoop => ({
  seed, layer, status: "design", description: "", changeNote: "", imageIds: [],
  submissions: [], feedback: [],
  marketingDraft: "", marketingEvidence: "hypothesis",
  testDraft: "", testEvidence: "hypothesis",
});

export const latestDesignSubmission = (loop: DesignLoop): DesignSubmission | null =>
  loop.submissions[loop.submissions.length - 1] ?? null;

export const hasMarketingReturn = (loop: DesignLoop): boolean =>
  loop.feedback.some((feedback) => feedback.source === "marketing");

export const hasTestReturn = (loop: DesignLoop): boolean =>
  loop.feedback.some((feedback) => feedback.source === "testDrive");

export const canSendDesign = (loop: DesignLoop, destination: DesignDestination): boolean =>
  loop.status === "design" &&
  (loop.description.trim().length > 0 || loop.imageIds.length > 0) &&
  (destination === "marketing" || hasMarketingReturn(loop));

export const sendDesign = (loop: DesignLoop, destination: DesignDestination, now: number): DesignLoop => {
  if (!canSendDesign(loop, destination)) return loop;
  const version = loop.submissions.length + 1;
  return {
    ...loop,
    status: destination,
    submissions: [...loop.submissions, {
      id: `v${version}`, version, destination,
      description: loop.description.trim(),
      changeNote: loop.changeNote.trim(),
      imageIds: [...loop.imageIds],
      sentAt: now,
    }],
    changeNote: "",
  };
};

export const returnDesignFeedback = (loop: DesignLoop, now: number): DesignLoop => {
  if (loop.status !== "marketing" && loop.status !== "testDrive") return loop;
  const source = loop.status;
  const text = (source === "marketing" ? loop.marketingDraft : loop.testDraft).trim();
  const submission = latestDesignSubmission(loop);
  if (!text || !submission || submission.destination !== source) return loop;
  if (loop.feedback.some((item) => item.submissionId === submission.id)) return loop;
  return {
    ...loop, status: "design",
    feedback: [...loop.feedback, {
      id: `review-${loop.feedback.length + 1}`,
      submissionId: submission.id, source, text,
      evidence: source === "marketing" ? loop.marketingEvidence : loop.testEvidence,
      receivedAt: now,
    }],
    marketingDraft: source === "marketing" ? "" : loop.marketingDraft,
    testDraft: source === "testDrive" ? "" : loop.testDraft,
  };
};

export const canMarkDesignReady = (loop: DesignLoop): boolean => {
  if (loop.status !== "design") return false;
  const last = latestDesignSubmission(loop);
  if (!last || last.destination !== "testDrive") return false;
  if (!loop.feedback.some((item) => item.submissionId === last.id && item.source === "testDrive")) return false;
  return loop.description.trim() === last.description &&
    loop.imageIds.length === last.imageIds.length &&
    loop.imageIds.every((id, i) => id === last.imageIds[i]);
};

export const markDesignReady = (loop: DesignLoop): DesignLoop =>
  canMarkDesignReady(loop) ? { ...loop, status: "ready" } : loop;

/** Fail closed on malformed/outdated records. The manual prototype can be restarted. */
export const restoreDesignLoop = (): DesignLoop | null => {
  try {
    const raw = window.localStorage.getItem(DESIGN_LOOP_STORAGE);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const data = value as Partial<DesignLoop>;
    if (typeof data.seed !== "string" || typeof data.layer !== "string" ||
      !["design", "marketing", "testDrive", "ready"].includes(data.status ?? "") ||
      !Array.isArray(data.submissions) || !Array.isArray(data.feedback) ||
      typeof data.description !== "string" || !Array.isArray(data.imageIds)) return null;
    const submissions = data.submissions.filter((s): s is DesignSubmission =>
      !!s && typeof s.id === "string" && typeof s.version === "number" &&
      typeof s.description === "string" && Array.isArray(s.imageIds) &&
      (s.destination === "marketing" || s.destination === "testDrive") &&
      typeof s.changeNote === "string" && typeof s.sentAt === "number");
    const feedback = data.feedback.filter((v): v is DesignFeedback =>
      !!v && typeof v.id === "string" && typeof v.text === "string" &&
      typeof v.submissionId === "string" && ["marketing", "testDrive"].includes(v.source) &&
      ["hypothesis", "observation", "question"].includes(v.evidence) &&
      typeof v.receivedAt === "number");
    return {
      seed: data.seed, layer: data.layer, status: data.status,
      description: data.description, changeNote: typeof data.changeNote === "string" ? data.changeNote : "",
      imageIds: data.imageIds.filter((v): v is string => typeof v === "string"),
      submissions, feedback,
      marketingDraft: typeof data.marketingDraft === "string" ? data.marketingDraft : "",
      testDraft: typeof data.testDraft === "string" ? data.testDraft : "",
      marketingEvidence: ["hypothesis", "observation", "question"].includes(data.marketingEvidence ?? "") ? data.marketingEvidence! : "hypothesis",
      testEvidence: ["hypothesis", "observation", "question"].includes(data.testEvidence ?? "") ? data.testEvidence! : "hypothesis",
    };
  } catch { return null; }
};
