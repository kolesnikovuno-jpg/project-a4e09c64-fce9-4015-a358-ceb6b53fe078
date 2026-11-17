import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import type {EggProject} from "../../lib/eggEngine";
import {currentEggFlowCycle} from "../../lib/eggFlowCycle";
import EggFormStudyPanel from "./EggFormStudyPanel";

/** Actual Idea canvas entry, independent of the collapsed cycle details.
 * Uses verified Author session and the saved full synthesis, never local drafts.
 */
export default function EggFormStudyAccess({projectId}:{projectId:string}){
 const [snapshot,setSnapshot]=useState<{project:EggProject;revision:number}|null>(null);
 useEffect(()=>{
  if(!projectId)return;
  let active=true;
  setSnapshot(null);
  void (async()=>{
   try{
    const response=await fetch("/api/egg-config",{cache:"no-store"});
    if(!response.ok)return;
    const cfg=await response.json() as {supabaseUrl:string;publishableKey:string};
    const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
    const {data}=await client.auth.getSession();
    if(!data.session?.access_token)return;
    const state=await fetch("/api/egg-project-state?project="+encodeURIComponent(projectId),{
     cache:"no-store",headers:{Authorization:"Bearer "+data.session.access_token},
    });
    if(!state.ok)return;
    const result=await state.json() as {project:EggProject;revision:number};
    if(active&&result.project?.id===projectId&&Number.isInteger(result.revision))
      setSnapshot(result);
   }catch{/* The existing Idea workshop remains available on network errors. */}
  })();
  return()=>{active=false};
 },[projectId]);
 const cycle=snapshot?currentEggFlowCycle(snapshot.project):null;
 if(!snapshot||!cycle?.synthesis||cycle.status==="running")return null;
 return <div data-testid="egg-idea-form-access" className="mb-4">
   <EggFormStudyPanel project={snapshot.project} cycle={cycle}
     revision={snapshot.revision} authorControls/>
 </div>;
}
