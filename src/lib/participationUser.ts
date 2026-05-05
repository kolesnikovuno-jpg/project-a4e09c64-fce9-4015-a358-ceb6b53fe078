/**
 * Lightweight client-side identity for the participation flow.
 *
 * Stores a stable user_id in localStorage and a per-model participation
 * status. No authentication — this is a soft recognition layer so the
 * Participation popup can skip the intro/form for users who already
 * submitted a request (or who arrived through a personalised ?token=
 * link from the operator).
 */

export type ParticipationStatus = "none" | "requested" | "allowed";
export type ModelId = "lyra" | "nava";

const USER_ID_KEY = "uno.participation.user_id";
const USER_NAME_KEY = "uno.participation.user_name";
const STATUS_PREFIX = "uno.participation.status."; // + modelId

const WEBHOOK_URL =
  "https://hook.eu2.make.com/n4g9lw19rfw52krs9ff6gsvy7p7x5mnx";

const safeGet = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

const safeSet = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

export const getUserId = (): string | null => safeGet(USER_ID_KEY);
export const setUserId = (id: string): void => safeSet(USER_ID_KEY, id);

export const getUserName = (): string | null => safeGet(USER_NAME_KEY);
export const setUserName = (name: string): void => safeSet(USER_NAME_KEY, name);

export const getStatus = (model: ModelId): ParticipationStatus => {
  const v = safeGet(STATUS_PREFIX + model);
  return v === "requested" || v === "allowed" ? v : "none";
};

export const setStatus = (model: ModelId, status: ParticipationStatus): void => {
  safeSet(STATUS_PREFIX + model, status);
};

/**
 * Try to lift user_id / status / name from a webhook response. Make
 * scenarios may return plain text or JSON; we handle both defensively.
 */
const applyWebhookResponse = async (
  res: Response,
  fallbackModel?: ModelId,
): Promise<void> => {
  let data: any = null;
  try {
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // Not JSON — nothing to apply.
      }
    }
  } catch {
    return;
  }
  if (!data || typeof data !== "object") return;
  if (typeof data.user_id === "string" && data.user_id) setUserId(data.user_id);
  if (typeof data.user_name === "string" && data.user_name)
    setUserName(data.user_name);
  const model: ModelId | undefined =
    data.model_id === "lyra" || data.model_id === "nava"
      ? data.model_id
      : fallbackModel;
  if (
    model &&
    (data.status === "requested" || data.status === "allowed" || data.status === "none")
  ) {
    setStatus(model, data.status);
  }
};

/**
 * On app boot: if the URL has ?token=..., exchange it with the operator
 * webhook for a user identity, then strip the token from the URL.
 */
export const processTokenFromUrl = async (): Promise<void> => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");
  if (!token) return;
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "token_exchange", token }),
    });
    await applyWebhookResponse(res);
  } catch (e) {
    console.warn("participation token exchange failed", e);
  } finally {
    url.searchParams.delete("token");
    const clean =
      url.pathname +
      (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
      url.hash;
    window.history.replaceState({}, "", clean);
  }
};

/**
 * Ask the webhook for the latest status of (user_id, model). Best-effort:
 * any failure leaves the cached status untouched.
 */
export const refreshStatus = async (model: ModelId): Promise<void> => {
  const userId = getUserId();
  if (!userId) return;
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "status_check",
        user_id: userId,
        model_id: model,
      }),
    });
    await applyWebhookResponse(res, model);
  } catch (e) {
    console.warn("participation status refresh failed", e);
  }
};

export { WEBHOOK_URL as PARTICIPATION_WEBHOOK_URL };