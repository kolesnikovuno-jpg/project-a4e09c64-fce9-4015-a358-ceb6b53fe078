/**
 * EGG Lyra daily ingest: a bounded, read-only server-to-server bridge.
 * Cron uses an independently protected token in Supabase Vault.
 * An EGG author can also request backfill of up to seven closed Kyiv days.
 * The route never creates paid advertising actions or invokes AI.
 */
import type {IncomingMessage,ServerResponse} from "node:http";
import {timingSafeEqual} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {z} from "zod";
import {getEggStorageConfig} from "./eggStorageConfig.js";


type Request=IncomingMessage&{body?:unknown};
const allowed=z.object({days:z.number().int().min(1).max(7).optional()}).strict();
const nonnegative=z.number().int().min(0).max(1_000_000);
const metricsSchema=z.object({
  day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone:z.literal("Europe/Kyiv"),
  websiteEvents:nonnegative,
  sessionIdentifiers:nonnegative,
  pageViews:nonnegative,
  requestOpens:nonnegative,
  formSuccessEvents:nonnegative,
  infoOpens:nonnegative,
  modelInteractions:nonnegative,
  sourceCampaignEvents:nonnegative,
  sourceGoogleEvents:nonnegative,
  sourceDirectEvents:nonnegative,
  inquiries:nonnegative,
  inquiriesNew:nonnegative,
  inquiriesClosed:nonnegative,
  demandEvents:nonnegative,
  confirmedOrders:z.null(),
}).strict();
type Snapshot=z.infer<typeof metricsSchema>;
const safeResponse=(res:ServerResponse,status:number,body:Record<string,unknown>)=>{
  res.statusCode=status;
  res.setHeader("content-type","application/json; charset=utf-8");
  res.setHeader("cache-control","no-store, private");
  res.setHeader("x-content-type-options","nosniff");
  res.end(JSON.stringify(body));
};
const equalSecret=(a:string,b:string)=>{
  if(a.length<32||a.length!==b.length)return false;
  return timingSafeEqual(Buffer.from(a,"utf8"),Buffer.from(b,"utf8"));
};
const kyivDate=(date:Date)=>{
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"Europe/Kyiv",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(date);
  const field=(key:string)=>parts.find(x=>x.type===key)?.value??"";
  return [field("year"),field("month"),field("day")].join("-");
};
const previousClosedKyivDays=(count:number,now:Date)=>{
  const localToday=kyivDate(now);
  const start=new Date(localToday+"T00:00:00Z");
  if(!Number.isFinite(start.valueOf()))throw Error("bad_date");
  return Array.from({length:count},(_,i)=>{
    const d=new Date(start);
    d.setUTCDate(d.getUTCDate()-1-i);
    return d.toISOString().slice(0,10);
  }).reverse();
};
const readJson=async(req:Request):Promise<unknown>=>{
  if(req.body!==undefined){
    const v=typeof req.body==="string"?JSON.parse(req.body) as unknown:req.body;
    if(Buffer.byteLength(JSON.stringify(v))>400)return null;
    return v;
  }
  const parts:Buffer[]=[];let bytes=0;
  for await(const chunk of req){
    const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk as Uint8Array);
    bytes+=b.length;if(bytes>400)throw Error("request_too_large");
    parts.push(b);
  }
  return parts.length?JSON.parse(Buffer.concat(parts).toString("utf8")) as unknown:{};
};
type IngestReport={day:string;websiteEvents:number;inquiries:number;inserted:boolean;status:string};
export default async function handler(req:Request,res:ServerResponse){
  if(req.method!=="POST"){res.setHeader("allow","POST");safeResponse(res,405,{ok:false,error:"method_not_allowed"});return;}
  const origin=req.headers.origin;
  const host=req.headers.host;
  if(origin){
    try{if(!host||new URL(String(origin)).host!==host)throw Error("origin");}
    catch{safeResponse(res,403,{ok:false,error:"cross_origin_forbidden"});return;}
  }
  const cfg=getEggStorageConfig(process.env);
  const feedToken=process.env.EGG_LYRA_FEED_TOKEN?.trim();
  if(!cfg||!feedToken){safeResponse(res,503,{ok:false,error:"sync_not_configured"});return;}
  const supplied=String(req.headers["x-egg-lyra-job-token"]??"");
  const expected=process.env.EGG_LYRA_JOB_TOKEN?.trim()??"";
  const isJob=!!expected&&equalSecret(supplied,expected);
  const authHeader=/^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization??""));
  if(!isJob&&!authHeader){safeResponse(res,401,{ok:false,error:"author_or_cron_auth_required"});return;}
  const db=createClient(cfg.url,cfg.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:project,error:projectError}=await db.from("egg_operational_projects")
    .select("id,owner_id,ads_operation_allowed").eq("slug","lyra").maybeSingle();
  if(projectError||!project){safeResponse(res,503,{ok:false,error:"project_not_ready"});return;}
  if(!isJob){
    const auth=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:identity,error:identityError}=await auth.auth.getUser(authHeader![1]);
    if(identityError||identity.user?.id!==project.owner_id){
      safeResponse(res,403,{ok:false,error:"not_project_author"});return;
    }
  }
  let days:number;
  try{days=allowed.parse(await readJson(req)).days??1;}
  catch{safeResponse(res,400,{ok:false,error:"invalid_request"});return;}
  // Both authenticated callers are bounded to <=7 closed days. The pg_cron
  // command requests exactly one day; backfill uses the same private route.
  const response:Array<IngestReport>=[];
  let processingDay:string|null=null;
  try{
    for(const day of previousClosedKyivDays(days,new Date())){
      processingDay=day;
      const src=new URL("https://gdsvwiemdggxboxzbdqd.supabase.co/functions/v1/lyra-egg-feed");
      src.searchParams.set("day",day);
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),15000);
      let remote:Response;
      try{
        remote=await fetch(src.toString(),{
          method:"GET",
          headers:{"x-egg-feed-token":feedToken,"accept":"application/json"},
          redirect:"error",signal:controller.signal,
        });
      }finally{clearTimeout(timer);}
      if(!remote.ok)throw Error("source_feed_unavailable");
      const data=await remote.json() as {ok?:unknown;source?:unknown;metrics?:unknown};
      if(data?.ok!==true||data.source!=="lyra_supabase_daily_v1")
        throw Error("source_feed_invalid");
      const snapshot=metricsSchema.parse(data.metrics);
      if(snapshot.day!==day||snapshot.sessionIdentifiers>snapshot.websiteEvents||
        snapshot.inquiriesNew>snapshot.inquiries||
        snapshot.inquiriesClosed>snapshot.inquiries||
        snapshot.pageViews>snapshot.websiteEvents||
        snapshot.sourceCampaignEvents+snapshot.sourceGoogleEvents+snapshot.sourceDirectEvents>snapshot.websiteEvents)
        throw Error("source_metric_inconsistent");
      const events:Array<{
        operational_project_id:string;
        source:string;external_event_id:string;kind:"site_metrics"|"inquiry_received";
        observed_at:string;summary:string;evidence_status:"verified_source";
        facts:Record<string,unknown>;
      }>=[];
      // A closed Kyiv day is summarized once, not on every page refresh.
      // No session IDs, contact details, free-text fields or Google Ads spend.
      if(snapshot.websiteEvents>0||snapshot.demandEvents>0){
        events.push({
          operational_project_id:project.id,
          source:"lyra_supabase_daily_v1",external_event_id:"site-"+day,
          kind:"site_metrics",observed_at:new Date().toISOString(),
          summary:"Lyra, "+day+": "+snapshot.websiteEvents+" событий сайта, "+
            snapshot.sessionIdentifiers+" идентификаторов сессий, "+
            snapshot.pageViews+" просмотров страницы, "+
            snapshot.requestOpens+" открытий формы, "+
            snapshot.formSuccessEvents+" событий успешной отправки формы. "+
            "Атрибуция сайта не подтверждает показатели Google Ads или реальные заказы.",
          evidence_status:"verified_source",
          facts:{...snapshot,sourceKind:"website_daily_aggregate",
            attributionLimit:"Site event labels are not authoritative Ads API metrics",
            ownerVisitsMayBeIncluded:true},
        });
      }
      if(snapshot.inquiries>0){
        events.push({
          operational_project_id:project.id,
          source:"lyra_supabase_daily_v1",external_event_id:"inquiries-"+day,
          kind:"inquiry_received",observed_at:new Date().toISOString(),
          summary:"Lyra, "+day+": "+snapshot.inquiries+" заявок через форму, "+
            snapshot.inquiriesNew+" со статусом new. "+
            "Заявки не являются подтверждёнными заказами.",
          evidence_status:"verified_source",
          facts:{day,timezone:"Europe/Kyiv",inquiries:snapshot.inquiries,
            inquiriesNew:snapshot.inquiriesNew,
            inquiriesClosed:snapshot.inquiriesClosed,confirmedOrders:null,
            sourceKind:"inquiries_daily_aggregate"},
        });
      }
      if(events.length){
        const {error:writeError}=await db.from("egg_operational_events")
          .upsert(events,{onConflict:"operational_project_id,source,external_event_id",
            ignoreDuplicates:true});
        if(writeError)throw Error("destination_write_failed");
      }
      const status=events.length?"ok":"no_activity";
      const {error:auditError}=await db.from("egg_operational_source_checks").upsert({
        operational_project_id:project.id,
        source:"lyra_supabase_daily_v1",
        source_day:day,
        status,
        checked_at:new Date().toISOString(),
        website_events:snapshot.websiteEvents,
        inquiries:snapshot.inquiries,
        error_code:null,
      },{onConflict:"operational_project_id,source,source_day"});
      if(auditError)throw Error("destination_audit_failed");
      response.push({day,websiteEvents:snapshot.websiteEvents,inquiries:snapshot.inquiries,
        inserted:events.length>0,status:events.length?"ingested_or_existing":"no_activity"});
    }
    safeResponse(res,200,{ok:true,source:"lyra_supabase_daily_v1",days:response,
      externalActionsExecuted:0,aiCallsExecuted:0});
  }catch(err){
    // No secret headers or raw source responses in output/logs.
    const reason=err instanceof Error?err.message:"unknown";
    const status=reason==="destination_write_failed"?"destination_unavailable":
      reason==="source_feed_unavailable"?"source_feed_unavailable":
      reason==="source_feed_invalid"||reason==="source_metric_inconsistent"?"source_data_invalid":
      "sync_failed";
    if(processingDay){
      try{
        await db.from("egg_operational_source_checks").upsert({
          operational_project_id:project.id,
          source:"lyra_supabase_daily_v1",
          source_day:processingDay,
          status:"error",
          checked_at:new Date().toISOString(),
          website_events:0,inquiries:0,error_code:status,
        },{onConflict:"operational_project_id,source,source_day"});
      }catch{/* Preserve original error; no raw data in log. */}
    }
    safeResponse(res,502,{ok:false,error:status,completedDays:response.length,
      externalActionsExecuted:0});
  }
}
