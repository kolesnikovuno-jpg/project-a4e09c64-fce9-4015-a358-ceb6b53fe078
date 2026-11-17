import {useEffect,useMemo,useRef,useState} from "react";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";

export type EggWorkspaceScope="idea"|"field"|"matter"|"research";
type Meta={revision:number;hash:string};
type Remote={payload:unknown;revision:number};
type Status="connecting"|"synced"|"saving"|"conflict"|"local"|"error";
const TABLE="egg_workspace_snapshots";
const MAX_BYTES=2_700_000;
function sorted(value:unknown):unknown{
 if(Array.isArray(value))return value.map(sorted);
 if(value&&typeof value==="object")
  return Object.fromEntries(Object.entries(value as Record<string,unknown>)
   .filter(([,v])=>v!==undefined)
   .sort(([a],[b])=>a.localeCompare(b))
   .map(([k,v])=>[k,sorted(v)]));
 return value;
}
export const canonicalEggSnapshot=(data:unknown)=>JSON.stringify(sorted(data));
export function eggSnapshotHash(data:unknown):string{
 const input=canonicalEggSnapshot(data);
 let a=2166136261,b=2246822519;
 for(let i=0;i<input.length;i++){
  const c=input.charCodeAt(i);
  a=Math.imul(a^c,16777619);
  b=Math.imul(b^c,3266489917);
 }
 return input.length+":"+[a,b].map(x=>(x>>>0).toString(16).padStart(8,"0")).join("");
}
export type EggReconciliation="empty"|"upload_local"|"load_remote"|"in_sync"|"conflict";
/** No choice is permitted to silently discard two different unsynced versions. */
export function decideEggReconciliation(
 local:unknown,remote:Remote|null,meta:Meta|null,localEmpty:boolean,
):EggReconciliation{
 if(!remote)return localEmpty?"empty":"upload_local";
 const localHash=eggSnapshotHash(local),remoteHash=eggSnapshotHash(remote.payload);
 if(localHash===remoteHash)return "in_sync";
 if(meta&&meta.revision===remote.revision&&meta.hash===remoteHash)return "upload_local";
 if(meta&&meta.hash===localHash)return "load_remote";
 if(localEmpty&&!meta)return "load_remote";
 return "conflict";
}
function readMeta(key:string):Meta|null{
 try{
  const raw=window.localStorage.getItem(key),obj=raw?JSON.parse(raw):null;
  return typeof obj?.revision==="number"&&obj.revision>0&&
   typeof obj.hash==="string"?obj:null;
 }catch{return null;}
}
function writeMeta(key:string,revision:number,data:unknown){
 try{localStorage.setItem(key,JSON.stringify({revision,hash:eggSnapshotHash(data)}));}
 catch{/* Browser storage may be full; keep session revision in memory. */}
}
function backupLocal(projectId:string,scope:EggWorkspaceScope,data:unknown):boolean{
 try{
  const key="egg:sync-backup:"+scope+":"+projectId+":"+Date.now();
  localStorage.setItem(key,JSON.stringify(data));
  return true;
 }catch{return false;}
}
function exportLocal(projectId:string,scope:EggWorkspaceScope,data:unknown){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;a.download="egg-"+scope+"-"+projectId+".json";
 a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
type Props<T>={
 projectId:string;scope:EggWorkspaceScope;ready:boolean;
 value:T;onRestore:(value:T)=>void;
 isEmpty:(value:T)=>boolean;
 className?:string;
};
/** Bridges existing localStorage without replacing it.
 * RLS + composite (project_id,owner_id) foreign key prevent cross-project reads.
 * For unsynced changes on two devices, require an explicit author decision.
 */
export default function EggWorkspaceSync<T>({projectId,scope,ready,value,
 onRestore,isEmpty,className=""}:Props<T>){
 const [status,setStatus]=useState<Status>("connecting");
 const [retryTick,setRetryTick]=useState(0);
 const [notice,setNotice]=useState("");
 const [conflict,setConflict]=useState<Remote|null>(null);
 const [serverRevision,setServerRevision]=useState(0);
 const clientRef=useRef<{client:SupabaseClient;ownerId:string}|null>(null);
 const revisionRef=useRef(0);
 const savedHashRef=useRef("");
 const initializedRef=useRef(false);
 const busyRef=useRef(false);
 const valueRef=useRef(value);
 const restoreRef=useRef(onRestore);
 const emptyRef=useRef(isEmpty);
 valueRef.current=value;restoreRef.current=onRestore;emptyRef.current=isEmpty;
 const valueHash=eggSnapshotHash(value);
 const metaKey="egg:sync-meta:v1:"+scope+":"+projectId;

 async function readRemote():Promise<Remote|null>{
  const session=clientRef.current;
  if(!session)throw Error("auth_required");
  const {data,error}=await session.client.from(TABLE).select("payload,revision")
   .eq("project_id",projectId).eq("scope",scope).maybeSingle();
  if(error)throw Error(error.message);
  return data?{payload:data.payload,revision:Number(data.revision)}:null;
 }
 function mark(revision:number,data:unknown){
  revisionRef.current=revision;
  savedHashRef.current=eggSnapshotHash(data);
  setServerRevision(revision);
  writeMeta(metaKey,revision,data);
  setStatus("synced");setNotice("");
 }
 async function save(snapshot:T,expected:number){
  if(busyRef.current)return;
  const session=clientRef.current;
  if(!session)return;
  const serialized=JSON.stringify(snapshot);
  if(new TextEncoder().encode(serialized).length>MAX_BYTES){
   setStatus("error");setNotice("Данные слишком объёмные для синхронизации. Локальная копия сохранена.");
   return;
  }
  busyRef.current=true;setStatus("saving");
  try{
   let revision:number|undefined;
   if(expected===0){
    const {data,error}=await session.client.from(TABLE)
     .insert({project_id:projectId,owner_id:session.ownerId,scope,payload:snapshot,revision:1})
     .select("revision").maybeSingle();
    if(error){if(error.code==="23505")revision=undefined;else throw Error(error.message);}
    else revision=Number(data?.revision);
   }else{
    const {data,error}=await session.client.from(TABLE)
     .update({payload:snapshot,revision:expected+1,updated_at:new Date().toISOString()})
     .eq("project_id",projectId).eq("scope",scope).eq("revision",expected)
     .select("revision").maybeSingle();
    if(error)throw Error(error.message);
    revision=data?Number(data.revision):undefined;
   }
   if(revision!==undefined&&Number.isFinite(revision)){
    mark(revision,snapshot);
   }else{
    const fresh=await readRemote();
    if(fresh){setConflict(fresh);setStatus("conflict");}
    else{setStatus("error");setNotice("Сервер не подтвердил сохранение.");}
   }
  }catch(e){
   setStatus("error");setNotice(e instanceof Error?e.message:"Нет связи с хранилищем.");
  }finally{
   busyRef.current=false;
  }
 }
 // One initial read per scope/project, NEVER overwrite local edits while reading.
 useEffect(()=>{
  if(!ready||!/^[a-f0-9-]{36}$/i.test(projectId))return;
  let active=true;
  initializedRef.current=false;
  clientRef.current=null;
  revisionRef.current=0;savedHashRef.current="";
  setConflict(null);setNotice("");setStatus("connecting");
  void(async()=>{
   try{
    const config=await fetch("/api/egg-config",{cache:"no-store"});
    if(!config.ok)throw Error("EGG не настроен.");
    const cfg=await config.json() as {supabaseUrl:string;publishableKey:string};
    const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
    const {data:auth,error:authError}=await client.auth.getUser();
    if(authError||!auth.user)throw Error("Авторизация EGG не найдена.");
    if(!active)return;
    clientRef.current={client,ownerId:auth.user.id};
    const remote=await readRemote();
    if(!active)return;
    const current=valueRef.current,meta=readMeta(metaKey);
    const decision=decideEggReconciliation(current,remote,meta,emptyRef.current(current));
    initializedRef.current=true;
    if(decision==="empty"){setStatus("synced");setServerRevision(0);return;}
    if(decision==="in_sync"&&remote){mark(remote.revision,remote.payload);return;}
    if(decision==="load_remote"&&remote){
     if(!emptyRef.current(current)&&eggSnapshotHash(current)!==eggSnapshotHash(remote.payload)&&
       !backupLocal(projectId,scope,current)){
       setStatus("error");setNotice("Резервная копия не поместилась. Локальный черновик оставлен без изменений.");
       return;
     }
     mark(remote.revision,remote.payload);restoreRef.current(remote.payload as T);
     return;
    }
    if(decision==="conflict"&&remote){
     setConflict(remote);setStatus("conflict");return;
    }
    revisionRef.current=remote?.revision??0;
    savedHashRef.current=meta?.hash??"";
    void save(current,remote?.revision??0);
   }catch(e){
    if(!active)return;
    setStatus("local");
    setNotice(e instanceof Error?e.message:"Сервер недоступен.");
   }
  })();
  return()=>{active=false;initializedRef.current=false;clientRef.current=null;};
 // Scope is a stable logical record; snapshots are observed in the second effect.
 },[projectId,scope,ready,retryTick]);
 useEffect(()=>{
  if(!ready||!initializedRef.current||!clientRef.current||status==="conflict"||status==="local"||
   status==="connecting"||status==="error"||valueHash===savedHashRef.current)return;
  const timer=setTimeout(()=>{
   if(busyRef.current)return;
   void save(valueRef.current,revisionRef.current);
  },950);
  return()=>clearTimeout(timer);
 },[ready,projectId,scope,valueHash,status]);
 async function useServer(){
  if(!conflict)return;
  const current=valueRef.current;
  if(!emptyRef.current(current)&&!backupLocal(projectId,scope,current)){
   setNotice("Резервная копия не поместилась. Сначала экспортируйте локальный черновик.");
   return;
  }
  const remote=conflict;
  setConflict(null);
  mark(remote.revision,remote.payload);
  restoreRef.current(remote.payload as T);
 }
 async function useLocal(){
  if(!conflict)return;
  // Author explicitly elects to supersede remote content; retain a local copy
  // of the prior remote revision before any network write.
  if(!backupLocal(projectId,scope,conflict.payload)){
   setNotice("Невозможно сохранить резервную копию серверной версии. Экспортируйте её перед заменой.");
   return;
  }
  const revision=conflict.revision;
  setConflict(null);
  void save(valueRef.current,revision);
 }
 return <div className={"text-[10px] text-foreground/60 "+className}
  data-testid={"egg-workspace-sync-"+scope}>
  {status==="synced"?<span title={"Серверная версия "+serverRevision}>В EGG · синхронизировано</span>:
   status==="saving"||status==="connecting"?<span>{status==="saving"?"Сохранение в EGG…":"Проверка синхронизации…"}</span>:
   status==="local"||status==="error"?<div className="flex flex-wrap items-center gap-2">
    <span role="status" className="text-amber-800">{status==="local"?"Только на этом устройстве":"Не синхронизировано"} · {notice}</span>
    <button type="button" className="underline underline-offset-2" onClick={()=>setRetryTick(v=>v+1)}>Повторить</button>
    <button type="button" className="underline underline-offset-2"
     onClick={()=>exportLocal(projectId,scope,valueRef.current)}>Экспорт</button>
   </div>:
   <div className="max-w-md space-y-2 rounded-xl border border-amber-700/25 bg-background/95 p-3 text-xs text-foreground/80"
    data-testid={"egg-sync-conflict-"+scope}>
    <p>Есть две разные версии. Ни одна не перезаписана.</p>
    <div className="flex flex-wrap gap-2">
     <button type="button" className="rounded-full border px-3 py-1.5" onClick={()=>void useServer()}>
      Использовать серверную
     </button>
     <button type="button" className="rounded-full border px-3 py-1.5" onClick={()=>void useLocal()}>
      Сохранить местную в EGG
     </button>
     <button type="button" className="rounded-full border px-3 py-1.5"
      onClick={()=>exportLocal(projectId,scope,valueRef.current)}>Экспорт местной</button>
     <button type="button" className="rounded-full border px-3 py-1.5"
      onClick={()=>exportLocal(projectId,scope,conflict?.payload)}>Экспорт серверной</button>
    </div>
    {notice&&<p role="status">{notice}</p>}
   </div>}
 </div>;
}
