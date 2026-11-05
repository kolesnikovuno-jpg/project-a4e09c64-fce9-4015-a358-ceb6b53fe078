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
