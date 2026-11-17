/** Portable, privacy-conscious EGG memory exchange format for Drive archives.
 * The app does not receive the user's ChatGPT Google Drive credentials.
 * An authorized connector may upload this JSON; importing requires explicit validation.
 */
import type {SphereId} from "./eggEngine.js";
import {EGG_SPHERE_IDS} from "./eggSphereReplication.js";
import {getSphereMemory,type ProjectWithSphereMemory} from "./eggSphereMemory.js";
export type EggMemoryArchive={
 schema:"egg.memory-archive/1";projectId:string;exportedAt:string;
 spheres:ReturnType<typeof getSphereMemory>[];
};
export function exportEggMemory(project:ProjectWithSphereMemory,at:string):EggMemoryArchive {
 if(!project.id||!Number.isFinite(Date.parse(at)))throw Error("Valid project and timestamp required");
 return {schema:"egg.memory-archive/1",projectId:project.id,exportedAt:at,
  spheres:EGG_SPHERE_IDS.map(id=>getSphereMemory(project,id))};
}
export function importEggMemory(project:ProjectWithSphereMemory,archive:EggMemoryArchive):ProjectWithSphereMemory {
 if(archive?.schema!=="egg.memory-archive/1"||archive.projectId!==project.id||
  !Array.isArray(archive.spheres)||archive.spheres.length!==EGG_SPHERE_IDS.length)
  throw Error("Invalid or foreign EGG memory archive");
 const seen=new Set<SphereId>();
 for(const entry of archive.spheres){
  if(!EGG_SPHERE_IDS.includes(entry.sphere)||seen.has(entry.sphere)||
   entry.active?.id!==entry.sphere||!Number.isSafeInteger(entry.active.version)||entry.active.version<1||
   !Array.isArray(entry.history)||!Array.isArray(entry.observations)||!Array.isArray(entry.proposals))
   throw Error("Invalid sphere memory entry");
  seen.add(entry.sphere);
 }
 if(project.sphereMemory && Object.keys(project.sphereMemory.spheres).length)
  throw Error("Refusing to overwrite existing project memory");
 return {...project,sphereMemory:{schema:"egg.sphere-memory/1",
  spheres:Object.fromEntries(archive.spheres.map(e=>[e.sphere,JSON.parse(JSON.stringify(e))]))}};
}
