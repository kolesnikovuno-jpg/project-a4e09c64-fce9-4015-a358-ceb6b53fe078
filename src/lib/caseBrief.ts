import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Case = Tables<"cases">;

type CaseAttachment = { name: string; path: string };

const ATTACHMENT_PATH_RE = /intake\/[^\s]+/g;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

const filenameFromPath = (path: string) => (path.split("/").pop() || path).replace(/^\d+-/, "");

export const extractCaseAttachmentPaths = (c: Case): CaseAttachment[] => {
  const text = c.raw_input ?? "";
  const byPath = new Map<string, CaseAttachment>();

  for (const line of text.split("\n")) {
    const matches = line.match(ATTACHMENT_PATH_RE);
    if (!matches) continue;

    for (const path of matches) {
      const before = line.split(path)[0] ?? "";
      const name = before.replace(/[—\-•:]\s*$/, "").trim() || filenameFromPath(path);
      byPath.set(path, { name, path });
    }
  }

  return [...byPath.values()];
};

const signAttachmentUrls = async (attachments: CaseAttachment[]) => {
  const urlByPath = new Map<string, string>();
  if (attachments.length === 0) return urlByPath;

  const { data } = await supabase.storage
    .from("clarity-attachments")
    .createSignedUrls(
      attachments.map((a) => a.path),
      SIGNED_URL_TTL_SECONDS,
    );

  data?.forEach((item, index) => {
    const path = item.path ?? attachments[index]?.path;
    if (path && item.signedUrl) urlByPath.set(path, item.signedUrl);
  });

  return urlByPath;
};

const replaceInternalAttachmentPaths = (text: string, urlByPath: Map<string, string>) =>
  text.replace(ATTACHMENT_PATH_RE, (path) => urlByPath.get(path) ?? "[signed URL unavailable]");

export const buildCaseBrief = async (c: Case): Promise<string> => {
  const attachments = extractCaseAttachmentPaths(c);
  const urlByPath = await signAttachmentUrls(attachments);
  const clientInput = replaceInternalAttachmentPaths(c.raw_input ?? "", urlByPath);

  const base = `CASE ID: ${c.id}

Client:
Name: ${c.client_name || "Not provided"}
Email: ${c.email ?? ""}
Language: ${c.language ?? ""}

Client Input:
${clientInput}

Task:
Use this case as an expert structural diagnostic draft.

Goal:
Generate an internal working draft for expert review, not final client output.

Required output:

1. Explicit client problem
What the client directly describes.

2. Hidden structural tension
What underlying contradiction, mismatch, uncertainty, or pattern may be driving the issue.

3. Structural diagnosis
Interpret the architecture of the situation.

4. Possible correction vectors
Suggest meaningful structural shifts, reframing directions, or interventions.

5. Draft expert response
Create a preliminary expert working response that can later be refined.

Important:
This is an internal production draft, not final client-facing output.`;

  if (attachments.length === 0) return `${base}\n\nAttachments:\nnone`;

  const attachmentLines = attachments.map((attachment) => {
    const url = urlByPath.get(attachment.path) ?? "[signed URL unavailable]";
    return `${attachment.name}\n${url}`;
  });

  return `${base}\n\nAttachments:\n${attachmentLines.join("\n\n")}`;
};
