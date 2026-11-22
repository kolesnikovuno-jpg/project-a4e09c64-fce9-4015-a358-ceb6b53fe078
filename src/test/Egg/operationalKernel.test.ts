import { describe, expect, it } from "vitest";
import {
  assessEggAdExperiment, routeEggOperationalEvent,
  type EggOperationalField,
} from "../../lib/eggOperationalKernel";

const now="2026-11-23T12:00:00.000Z";
const actual=(amountUAH:number) => ({amountUAH,source:"trusted:account:metric",verifiedAt:now});
const base=():EggOperationalField => ({
  projectId:"lyra-project",goal:{metric:"confirmed_orders_per_month",target:2,approvedBy:"author",revision:1},
  commerce:{advertising:null,spentToday:null,spentRolling30Days:null,unitPrice:null,variableCost:null},
  processedEventIds:[],
});
const funded=():EggOperationalField => ({
  ...base(),commerce:{
    advertising:{authorApproved:true,dailyMaxUAH:100,monthlyMaxUAH:3000,approvedAt:now},
    spentToday:actual(0),spentRolling30Days:actual(200),unitPrice:actual(55000),variableCost:actual(20000),
  },
});

describe("ADR-030: operational triad — goal, sphere, common field",()=>{
  it("routes a real advertising event to relevant spheres only; does not start a flow",()=>{
    const field=base();
    const event={eventId:"ad-20261123",projectId:field.projectId,kind:"ads_metrics" as const,
      source:"google-ads:account",observedAt:now,summary:"Read-only aggregated metrics"};
    const output=routeEggOperationalEvent(field,event);
    expect(output.status).toBe("new");
    expect(output.field.goal).toEqual(field.goal);
    expect(output.activations.map(a=>a.sphere)).toEqual(["marketing","commerce","retail","testDrive"]);
    const duplicate=routeEggOperationalEvent(output.field,event);
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.activations).toHaveLength(0);
    expect(field.processedEventIds).toEqual([]);
  });
  it("rejects cross-project events and unknown event kinds",()=>{
    const event={eventId:"event-1",projectId:"another-project",kind:"order_confirmed" as const,
      source:"orders",observedAt:now,summary:"confirmed"};
    expect(()=>routeEggOperationalEvent(base(),event)).toThrow("invalid_operational_event");
    expect(()=>routeEggOperationalEvent(base(),{...event,projectId:"lyra-project",kind:"something" as never}))
      .toThrow("invalid_operational_event");
  });
  it("distinguishes an inquiry from a confirmed order",()=>{
    const field=base();
    const event={eventId:"inquiry-1",projectId:field.projectId,kind:"inquiry_received" as const,
      source:"lyra:inquiries",observedAt:now,summary:"One inquiry"};
    const out=routeEggOperationalEvent(field,event);
    expect(out.activations.some(x=>x.sphere==="production")).toBe(false);
    expect(out.field.goal.target).toBe(2);
    expect(out.activations.some(x=>x.task.includes("обращение от подтверждённого заказа"))).toBe(true);
  });
  it("does not initiate spend when the author only discussed a budget",()=>{
    const out=assessEggAdExperiment(base(),100,now);
    expect(out.status).toBe("insufficient_data");
    expect(out.candidateSpendUAH).toBeNull();
    expect(out.researchAllowed).toBe(true);
    expect(out.externalActionExecuted).toBe(false);
  });
  it("cannot initiate an experiment outside commercial limits",()=>{
    const over=assessEggAdExperiment({...funded(),commerce:{...funded().commerce,spentToday:actual(40)}},100,now);
    expect(over.status).toBe("outside_corridor");
    expect(over.candidateSpendUAH).toBeNull();
    const negative=assessEggAdExperiment({...funded(),commerce:{...funded().commerce,variableCost:actual(60000)}},100,now);
    expect(negative.status).toBe("outside_corridor");
  });
  it("can form a bounded proposal but does not execute it",()=>{
    const out=assessEggAdExperiment(funded(),100,now);
    expect(out.status).toBe("within_corridor");
    expect(out.candidateSpendUAH).toBe(100);
    expect(out.externalActionExecuted).toBe(false);
  });
  it("stale evidence fails closed, irrespective of AI presence",()=>{
    const old={...actual(0),verifiedAt:"2026-11-19T12:00:00.000Z"};
    const field={...funded(),commerce:{...funded().commerce,spentRolling30Days:old}};
    expect(assessEggAdExperiment(field,100,now).status).toBe("insufficient_data");
  });
});
