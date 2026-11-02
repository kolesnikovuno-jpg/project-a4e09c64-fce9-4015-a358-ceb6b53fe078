import { describe, expect, it } from "vitest";
import { createEggProject } from "../lib/eggEngine";
import { eggCommandSchema, eggMutationSchema, mayAccessEgg, readEggState, runEggMutation } from "../lib/eggCommands";

const id = "04f246c5-e73a-4c66-9b99-36dfcb7074a0";
const other = "6b0f47fd-7755-4ff5-83b9-df8df9ec7435";
const ownerId = "owner-one";
const at = "2026-11-02T22:00:00Z";
const author = { kind: "author" as const, ownerId };
const agent = {
  kind: "agent" as const, projectId: id, ownerId,
  scopes: ["read" as const, "contribute" as const],
};
const create = () => createEggProject({ id, seed: "The author seed", at });

describe("External Egg command contract", () => {
  it("only accepts known strict commands with validated input limits", () => {
    expect(eggCommandSchema.safeParse({ command: "create", seed: "My seed" }).success).toBe(true);
    expect(eggCommandSchema.safeParse({ command: "create", seed: "" }).success).toBe(false);
    expect(eggCommandSchema.safeParse({ command: "create", seed: "My seed", actor: "author" }).success).toBe(false);
    expect(eggCommandSchema.safeParse({
      command: "route", projectId: id, expectedRevision: 1,
      from: "idea", to: "marketing", question: "Who needs this?",
    }).success).toBe(true);
    expect(eggMutationSchema.safeParse({
      command: "route", projectId: id, expectedRevision: 1,
      from: "idea", to: "marketing", question: "Who needs this?", actor: "author",
    }).success).toBe(false);
    expect(eggMutationSchema.safeParse({
      command: "return", projectId: id, expectedRevision: 1,
      taskId: "task-1", text: "Possible", evidence: "fact",
    }).success).toBe(false);
    expect(eggCommandSchema.safeParse({
      command: "issue_key", projectId: id, label: "AI", expiresInDays: 31,
    }).success).toBe(false);
  });

  it("restricts scoped agent keys to one owner, one project and allowed actions", () => {
    expect(mayAccessEgg(agent, id, ownerId, "read")).toBe(true);
    expect(mayAccessEgg(agent, id, ownerId, "contribute")).toBe(true);
    expect(mayAccessEgg(agent, id, ownerId, "author")).toBe(false);
    expect(mayAccessEgg(agent, other, ownerId, "read")).toBe(false);
    expect(mayAccessEgg(agent, id, "other-owner", "read")).toBe(false);
    expect(mayAccessEgg({ ...agent, scopes: ["read"] }, id, ownerId, "contribute")).toBe(false);
    expect(mayAccessEgg(author, id, ownerId, "author")).toBe(true);
    expect(mayAccessEgg(author, id, "other-owner", "read")).toBe(false);
  });

  it("lets external AI contribute but prohibits impersonating the Author", () => {
    const state = create();
    const routed = runEggMutation(state, {
      command: "route", projectId: id, expectedRevision: 1,
      from: "idea", to: "marketing", question: "Market research",
    }, agent, ownerId, at);
    expect(routed.tasks).toHaveLength(1);
    expect(routed.tasks[0].initiatedBy).toBe("ai");
    expect(readEggState(routed).core.accepted).toHaveLength(0);
    expect(() => runEggMutation(routed, {
      command: "set_level", projectId: id, expectedRevision: 2,
      level: 2, reason: "Ready",
    }, agent, ownerId, at)).toThrow(/Forbidden/);
    expect(() => runEggMutation(routed, {
      command: "route", projectId: id, expectedRevision: 2,
      from: "author", to: "retail", question: "Impersonation attempt",
    }, agent, ownerId, at)).toThrow(/Unpermitted/);
    expect(() => runEggMutation(routed, {
      command: "route", projectId: id, expectedRevision: 2,
      from: "idea", to: "design", question: "Skip graph",
    }, agent, ownerId, at)).toThrow(/Unpermitted/);
  });

  it("allows a verified Author to approve and move levels in strict transitions", () => {
    const state = create();
    const next = runEggMutation(state, {
      command: "set_level", projectId: id, expectedRevision: 1,
      level: 2, reason: "Author approved concept",
    }, author, ownerId, at);
    expect(next.level).toBe(2);
    expect(state.level).toBe(1);
  });

  it("rejects a bearer for another project or owner", () => {
    const state = create();
    const cmd = {
      command: "route" as const, projectId: id, expectedRevision: 1,
      from: "idea" as const, to: "legal" as const, question: "Rights?",
    };
    expect(() => runEggMutation(state, cmd, { ...agent, projectId: other }, ownerId, at)).toThrow(/Forbidden/);
    expect(() => runEggMutation(state, cmd, agent, "other-owner", at)).toThrow(/Forbidden/);
    expect(() => runEggMutation(state, { ...cmd, projectId: other }, agent, ownerId, at)).toThrow(/Forbidden/);
  });
});
