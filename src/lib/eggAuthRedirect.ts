/**
 * EGG login is bound to one browser origin. Vercel preview aliases and
 * egg.kolesnikov.studio have separate cookies/localStorage, so magic links
 * must ALWAYS return to the canonical project URL.
 *
 * Supabase Auth must allow this exact callback in its Redirect URLs.
 */
export const EGG_CANONICAL_ORIGIN="https://egg.kolesnikov.studio";
export const EGG_AUTH_CALLBACK=EGG_CANONICAL_ORIGIN+"/egg/connect";
export const EGG_CANONICAL_ACCOUNT=EGG_AUTH_CALLBACK;

export function eggAuthOriginMismatch(origin:string):boolean{
  try{return new URL(origin).origin!==EGG_CANONICAL_ORIGIN;}
  catch{return true;}
}

/**
 * Rescue an implicit Auth callback redirected to a legacy Vercel preview
 * origin. Preserve only an actual Supabase Auth callback fragment and move it
 * to our fixed HTTPS canonical URL before any Auth client reads the hash.
 *
 * This is NOT an open redirect: only the known deployment suffix is accepted,
 * the destination is fixed, and normal page visits are unaffected.
 */
export function eggAuthBridgeUrl(origin:string,path:string,hash:string):string|null{
  let host:string;
  try{const parsed=new URL(origin);if(parsed.protocol!=="https:")return null;host=parsed.hostname;}
  catch{return null;}
  if(!host.endsWith(".vercel.app")||!eggAuthOriginMismatch(origin)||
    path!=="/egg/connect"||!hash.startsWith("#"))return null;
  const params=new URLSearchParams(hash.slice(1));
  const validToken=params.has("access_token")&&params.has("refresh_token")&&params.has("token_type");
  const authError=params.has("error_code")||params.has("error_description");
  if(!validToken&&!authError)return null;
  return EGG_AUTH_CALLBACK+hash;
}
