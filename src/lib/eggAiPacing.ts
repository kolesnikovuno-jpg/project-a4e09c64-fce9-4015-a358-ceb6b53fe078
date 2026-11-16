/**
 * EGG / Gemini preview tier: conservative client-side request pacing.
 *
 * The observed AI Studio RPM cap was 5. A 17-second inter-request gap is
 * intentionally below that rate, including the charged preflight. The shared
 * key coordinates tabs in ONE browser, across Idea, Matter and sphere calls.
 *
 * IMPORTANT: not an account-wide quota lock. Other devices, external clients
 * and daily token/request quotas still require provider-side 429 handling.
 * No background jobs or automatic endless 429 retries are started here.
 */
export const EGG_AI_REQUEST_SPACING_MS=17_000;
const STORAGE_KEY="egg:ai:next-request-at:v1";
let memoryNext=0;

type Store={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void};
function storage():Store|null{
 try{return typeof window==="undefined"?null:window.localStorage;}catch{return null;}
}
function readNext(store:Store|null){
 try{
  const raw=store?.getItem(STORAGE_KEY);
  if(raw===null||raw===undefined)return memoryNext;
  const value=Number(raw);
  return Number.isFinite(value)&&value>=0?Math.max(value,memoryNext):memoryNext;
 }catch{return memoryNext;}
}
function setNext(at:number,store:Store|null){
 memoryNext=at;
 try{store?.setItem(STORAGE_KEY,String(at));}catch{/* Safari private storage */}
}
export function getEggAiCooldownMs(now=Date.now()){
 return Math.max(0,readNext(storage())-now);
}
export function reserveEggAiRequest(now=Date.now(),store:Store|null=storage()){
 const start=Math.max(now,readNext(store));
 const nextAt=start+EGG_AI_REQUEST_SPACING_MS;
 setNext(nextAt,store);
 return {startAt:start,waitMs:start-now,nextAt};
}
export function postponeEggAiRequests(ms:number,now=Date.now(),store:Store|null=storage()){
 const delay=Math.min(24*60*60*1000,Math.max(0,Math.ceil(ms)));
 const at=Math.max(readNext(store),now+delay);
 setNext(at,store);
 return at;
}
/** Returns false when the Author leaves the pane or asks to stop. */
export async function waitForEggAiRequest(opts?:{
 shouldStop?:()=>boolean;onWaiting?:(seconds:number)=>void;
 now?:()=>number;sleep?:(ms:number)=>Promise<void>;
}):Promise<boolean>{
 const clock=opts?.now??Date.now;
 const sleep=opts?.sleep??((ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms)));
 if(opts?.shouldStop?.())return false;
 const {startAt}=reserveEggAiRequest(clock());
 while(clock()<startAt){
  if(opts?.shouldStop?.())return false;
  const left=startAt-clock();
  opts?.onWaiting?.(Math.ceil(left/1000));
  await sleep(Math.min(1000,left));
 }
 return !opts?.shouldStop?.();
}
/** HTTP Retry-After seconds or date, never a guarantee of provider recovery. */
export function parseEggRetryAfter(value:string|null,now=Date.now()){
 if(!value)return undefined;
 const trimmed=value.trim();
 const seconds=/^\d+(?:\.\d+)?$/.test(trimmed)
  ?Number(trimmed):(Date.parse(trimmed)-now)/1000;
 if(!Number.isFinite(seconds)||seconds<=0)return undefined;
 return Math.min(86400,Math.ceil(seconds));
}
