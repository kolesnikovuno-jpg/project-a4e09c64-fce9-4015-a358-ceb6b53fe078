import {describe,expect,it} from "vitest";
import {
  eggSphereAiPresence,
  getEggSphereSkill,
  resolveEggSphereExecution,
  type EggSphereDelegation,
} from "../../lib/eggSphereSkillContract";

const owner = "project-owner";
const worker = "invited-designer";
const project = "project-1";
const delegation: EggSphereDelegation = {
  assignmentId: "assignment-1",
  projectId: project,
  sphereId: "design",
  assignedUserId: worker,
  assignedByOwnerId: owner,
  status: "active",
};
const connection = {connectionId: "server-connection-ref",ownerUserId: worker,active:true};

describe("EGG sphere skills and delegated execution (ADR-029)", () => {
  it("binds a stable skill to the sphere regardless of the selected executor", () => {
    expect(getEggSphereSkill("design")).toEqual(getEggSphereSkill("design"));
    expect(getEggSphereSkill("idea").skillId).toBe("egg.sphere.idea");
    expect(getEggSphereSkill("matter").skillId).toBe("egg.sphere.matter");
    expect(getEggSphereSkill("legal").manifest.role).not.toBe(getEggSphereSkill("design").manifest.role);
  });
  it("works fully by a human with 0% AI and without any provider", () => {
    const output = resolveEggSphereExecution({
      projectId:project,sphereId:"idea",actorUserId:owner,projectOwnerId:owner,aiPercent:0,
    });
    expect(output.participation).toEqual({
      aiPercent:0,humanPercent:100,mode:"human",aiCallsAllowed:false,
    });
    expect(output.providerConnectionId).toBeNull();
    expect(output.mayApproveDna).toBe(false);
    expect(output.mayAdvanceLevel).toBe(false);
  });
  it("allows an accepted sphere participant to use their own AI", () => {
    const output = resolveEggSphereExecution({
      projectId:project,sphereId:"design",actorUserId:worker,projectOwnerId:owner,
      delegation,provider:connection,aiPercent:65,
    });
    expect(output.executorUserId).toBe(worker);
    expect(output.assignmentId).toBe("assignment-1");
    expect(output.participation.humanPercent).toBe(35);
    expect(output.participation.mode).toBe("symbiosis");
    expect(output.skillId).toBe(getEggSphereSkill("design").skillId);
    expect(output.destinations).toEqual(["fixed-next-sphere-or-endpoint","yolk"]);
  });
  it("permits 100% AI in the sphere without transferring approval authority", () => {
    const output = resolveEggSphereExecution({
      projectId:project,sphereId:"design",actorUserId:worker,projectOwnerId:owner,
      delegation,provider:connection,aiPercent:100,
    });
    expect(output.participation).toMatchObject({mode:"auto",humanPercent:0,aiCallsAllowed:true});
    expect(output.mayApproveDna).toBe(false);
    expect(output.mayAdvanceLevel).toBe(false);
  });
  it("requires acceptance and checks project, sphere, and executor", () => {
    const base = {projectId:project,sphereId:"design" as const,actorUserId:worker,
      projectOwnerId:owner,delegation,aiPercent:0};
    expect(()=>resolveEggSphereExecution({...base,delegation:{...delegation,status:"invited"}})).toThrow();
    expect(()=>resolveEggSphereExecution({...base,delegation:{...delegation,status:"revoked"}})).toThrow();
    expect(()=>resolveEggSphereExecution({...base,delegation:{...delegation,projectId:"other-project"}})).toThrow();
    expect(()=>resolveEggSphereExecution({...base,delegation:{...delegation,sphereId:"legal"}})).toThrow();
    expect(()=>resolveEggSphereExecution({...base,actorUserId:owner})).toThrow();
    const afterRevocation = resolveEggSphereExecution({...base,actorUserId:owner,delegation:{...delegation,status:"revoked"}});
    expect(afterRevocation.executorUserId).toBe(owner);
    expect(afterRevocation.assignmentId).toBeNull();
  });
  it("does not let a participant spend through another user's AI connection", () => {
    const base = {projectId:project,sphereId:"design" as const,actorUserId:worker,
      projectOwnerId:owner,delegation,aiPercent:60};
    expect(()=>resolveEggSphereExecution(base)).toThrow();
    expect(()=>resolveEggSphereExecution({...base,provider:{...connection,ownerUserId:owner}})).toThrow();
    expect(()=>resolveEggSphereExecution({...base,provider:{...connection,active:false}})).toThrow();
  });
  it("rejects malformed AI participation instead of silently coercing values", () => {
    expect(()=>eggSphereAiPresence(-1)).toThrow(RangeError);
    expect(()=>eggSphereAiPresence(101)).toThrow(RangeError);
    expect(()=>eggSphereAiPresence(20.5)).toThrow(RangeError);
    expect(eggSphereAiPresence(50).mode).toBe("symbiosis");
  });
});
