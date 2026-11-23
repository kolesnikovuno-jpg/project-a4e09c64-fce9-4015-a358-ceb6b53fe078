import type { SupabaseClient } from "@supabase/supabase-js";

/** Server-backed field: originals stay in private Supabase Storage, metadata in Postgres.
 * Requires a real authenticated EGG project UUID; never use the local preview UUID.
 */
export const EGG_FIELD_BUCKET = "egg-author-media";
export type EggFieldAsset = {
  id: string; project_id: string; storage_path: string; original_name: string;
  mime_type: string; size_bytes: number; created_at: string; archived_at: string | null;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assertId = (id: string) => {
  if (!UUID.test(id)) throw new Error("A valid server project ID is required");
};
const safeName = (name: string) =>
  name.replace(/[\\/\x00-\x1f]/g, "_").slice(0, 180) || "document";

export async function listEggFieldAssets(client: SupabaseClient, projectId: string) {
  assertId(projectId);
  const { data, error } = await client.from("egg_field_assets")
    .select("id,project_id,storage_path,original_name,mime_type,size_bytes,created_at,archived_at")
    .eq("project_id", projectId).is("archived_at", null).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EggFieldAsset[];
}

export async function uploadEggFieldOriginal(client: SupabaseClient, projectId: string, file: File) {
  assertId(projectId);
  if (!file.size || file.size > 50 * 1024 * 1024) throw new Error("File must be 1 byte to 50 MB");
  const { data: userData, error: authError } = await client.auth.getUser();
  if (authError || !userData.user) throw new Error("Sign in to EGG before uploading");
  const id = crypto.randomUUID();
  const storagePath = `${projectId}/${id}/${safeName(file.name)}`;
  const { error: uploadError } = await client.storage.from(EGG_FIELD_BUCKET)
    .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await client.from("egg_field_assets").insert({
    id, project_id: projectId, storage_path: storagePath, original_name: file.name,
    mime_type: file.type || "application/octet-stream", size_bytes: file.size,
    created_by: userData.user.id,
  }).select("id,project_id,storage_path,original_name,mime_type,size_bytes,created_at,archived_at").single();
  // An orphaned immutable blob can remain if metadata insertion fails; do not silently
  // delete originals. Surface the storage path for an administrator to reconcile.
  if (error) throw new Error(`File uploaded but registration failed (${storagePath}): ${error.message}`);
  return data as EggFieldAsset;
}

export async function getEggFieldOriginalUrl(client: SupabaseClient, asset: EggFieldAsset) {
  assertId(asset.project_id);
  if (!asset.storage_path.startsWith(asset.project_id + "/")) throw new Error("Invalid asset path");
  const { data, error } = await client.storage.from(EGG_FIELD_BUCKET)
    .createSignedUrl(asset.storage_path, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function selectEggMaterial(client: SupabaseClient, projectId: string, assetId: string, note = "") {
  assertId(projectId);
  assertId(assetId);
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error("Sign in to EGG");
  const { data, error } = await client.from("egg_material_selections").insert({
    project_id: projectId, asset_id: assetId, selected_by: auth.user.id,
    annotations: { note },
  }).select("id,project_id,asset_id,created_at").single();
  if (error) throw error;
  return data;
}
