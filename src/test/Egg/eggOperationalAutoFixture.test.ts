import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
const fixture=vi.hoisted(()=>({createClient:vi.fn(),generate:vi.fn(),reserve:vi.fn(),complete:vi.fn(),updates:[] as Array<[string,Record<string,unknown>]>}));
vi.mock("@supabase/supabase-js",()=>({createClient:fixture.createClient}));
vi.mock("../../server/eggStorageConfig",()=>({getEggStorageConfig:()=>({url:"https://fixture.invalid",serviceKey:"not-a-key"})}));
vi.mock("../../../api/egg-flow-ai",()=>({
  providerFromEnv:()=>({kind:"direct_openai",model:"gpt-6-luna"}),
  generate:fixture.generate,
}));
import handler from "../../server/eggOperationalAuto";

const valid={observation:"The source check succeeded.",hypothesis:"A real signal may be present.",
  nextStep:"Compare the next closed day.",confidence:"low",limitations:["The denominator is unknown."],evidenceGaps:[],scenarios:[]};
const day="2026-11-25";
const token="fixture-token-that-is-longer-than-32-characters";
function request(auth=true){
  const req={method:"POST",headers:auth?{"x-egg-lyra-job-token":token}:{},body:{slot:1}};
  const res={statusCode:0,setHeader:vi.fn(),end:vi.fn()};
  return {req,res};
}
function emulateDb(){
  const operations:Record<string,unknown>[]=[];
  return {
    from(table:string){
      let selected="", mode="read";
      const result=()=>{
        if(table==="egg_operational_projects") return {data:{id:"lyra-fixture",goal_target:2,auto_research_enabled:true,auto_research_daily_limit:2,ads_daily_limit_uah:100,ads_rolling_30d_limit_uah:3000,ads_operation_allowed:false}};
        if(table==="egg_operational_auto_runs")return {data:mode==="insert"?{id:"run-fixture"}:null};
        if(table==="egg_operational_activations")return selected==="id"&&mode==="read"?{count:0}:{data:mode==="update"?{id:"act-fixture"}:[{id:"act-fixture",event_id:"signal",sphere:"marketing",task:"Research",status:"pending",retry_count:0}]};
        if(table==="egg_operational_events")return {data:[{id:"signal",kind:"site_metrics",source:"lyra_supabase_daily_v1",evidence_status:"verified_source",facts:{day}}]};
        if(table==="egg_operational_source_checks")return {data:{status:"ok",source_day:day}};
        return {data:table==="egg_object_activation_links"?null:[]};
      };
      const builder={
        select(value:string){selected=value;return this;},
        eq(){return this;}, in(){return this;}, gte(){return this;}, order(){return this;}, limit(){return this;},
        insert(values:Record<string,unknown>){mode="insert";operations.push(values);return this;},
        update(values:Record<string,unknown>){mode="update";fixture.updates.push([table,values]);return this;},
        maybeSingle(){return Promise.resolve(result());},
        then(resolve:(value:unknown)=>void){resolve(result());},
      };
      return builder;
    },
    async rpc(name:string,args:unknown){
      if(name==="egg_reserve_ai_budget"){fixture.reserve(args);return{data:true};}
      if(name==="egg_complete_operational_auto_run"){fixture.complete(args);return{data:true};}
      throw new Error("Unexpected fixture RPC");
    },
  };
}
describe("EGG Lyra operational handler with mocked DB and AI",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    fixture.updates.length=0;
    vi.stubEnv("EGG_LYRA_JOB_TOKEN",token);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T07:40:00Z"));
    fixture.createClient.mockImplementation(emulateDb);
  });
  afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers();});
  it("rejects an unauthenticated invocation before reading a DB or starting AI",async()=>{
    const {req,res}=request(false);
    await handler(req as never,res as never);
    expect(res.statusCode).toBe(401);
    expect(fixture.createClient).not.toHaveBeenCalled();
    expect(fixture.generate).not.toHaveBeenCalled();
  });
  it("routes verified signal to one bounded analysis and verified internal handoff",async()=>{
    fixture.generate.mockResolvedValue(JSON.stringify(valid));
    const {req,res}=request();
    await handler(req as never,res as never);
    expect(res.statusCode).toBe(200);
    expect(fixture.generate).toHaveBeenCalledTimes(1);
    expect(fixture.reserve).toHaveBeenCalledTimes(1);
    expect(fixture.complete).toHaveBeenCalledWith(expect.objectContaining({
      p_baseline_day:day,p_finding:expect.objectContaining({externalActionsExecuted:0,authorGoalChanged:false,internalAction:"observe_next_closed_day"}),
    }));
  });
  it("keeps only field diagnostics on a blocked invalid provider response",async()=>{
    fixture.generate.mockResolvedValue(JSON.stringify({...valid,limitations:[],observation:"SECRET"}));
    const {req,res}=request();
    await handler(req as never,res as never);
    expect(res.statusCode).toBe(502);
    expect(fixture.generate).toHaveBeenCalledTimes(1);
    expect(fixture.complete).not.toHaveBeenCalled();
    expect(fixture.updates).toContainEqual(["egg_operational_activations",expect.objectContaining({
      status:"blocked",finding:expect.objectContaining({analysisIssues:[
        {path:"observation",code:"too_small"},{path:"limitations",code:"too_small"},
      ]}),
    })]);
    expect(JSON.stringify(fixture.updates)).not.toContain("SECRET");
  });
});
