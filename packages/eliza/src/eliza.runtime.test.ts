import { AgentRuntime } from "@elizaos/core";
import { beforeEach, describe, expect, it } from "vitest";
import * as sdkMocks from "../../../test-support/mock-atbash-sdk.js";
import { auditEvaluator } from "./evaluators/auditEvaluator.js";
import { atbashPlugin } from "./index.js";

function createAdapter() {
  const agentMap = new Map<string, Record<string, unknown>>();
  const roomMap = new Map<string, Record<string, unknown>>();
  const participantMap = new Map<string, string[]>();
  const entityMap = new Map<string, Record<string, unknown>>();
  const memoryMap = new Map<string, Record<string, unknown>>();
  const logEntries: Array<Record<string, unknown>> = [];
  const worldMap = new Map<string, Record<string, unknown>>();

  const adapter = {
    db: {},
    initialize: async () => {},
    init: async () => {},
    isReady: async () => true,
    close: async () => {},
    getConnection: async () => ({}),
    ensureEmbeddingDimension: async () => {},
    getAgent: async (id: string) => (agentMap.get(id) as never) ?? null,
    getAgents: async () => Array.from(agentMap.values()) as never,
    createAgent: async (agent: Record<string, unknown>) => {
      if (agent.id) {
        agentMap.set(agent.id as string, agent);
      }
      return true;
    },
    updateAgent: async (id: string, agent: Record<string, unknown>) => {
      agentMap.set(id, { ...(agentMap.get(id) ?? {}), ...agent });
      return true;
    },
    deleteAgent: async () => true,
    getEntitiesByIds: async (ids: string[]) => ids.map((id) => entityMap.get(id)).filter(Boolean) as never,
    getEntityById: async (id: string) => (entityMap.get(id) as never) ?? null,
    getEntitiesForRoom: async () => [],
    createEntities: async (entities: Array<Record<string, unknown>>) => {
      for (const entity of entities) {
        entityMap.set(entity.id as string, entity);
      }
      return true;
    },
    createEntity: async (entity: Record<string, unknown>) => {
      entityMap.set(entity.id as string, entity);
      return true;
    },
    updateEntity: async (entity: Record<string, unknown>) => {
      entityMap.set(entity.id as string, entity);
    },
    getComponent: async () => null,
    getComponents: async () => [],
    createComponent: async () => true,
    updateComponent: async () => {},
    deleteComponent: async () => {},
    getMemories: async () => [],
    getMemoryById: async (id: string) => (memoryMap.get(id) as never) ?? null,
    getMemoriesByIds: async (ids: string[]) => ids.map((id) => memoryMap.get(id)).filter(Boolean) as never,
    getMemoriesByRoomIds: async () => [],
    getCachedEmbeddings: async () => [],
    log: async (entry: Record<string, unknown>) => {
      logEntries.push(entry);
    },
    getLogs: async () => logEntries as never,
    deleteLog: async () => {},
    searchMemories: async () => [],
    createMemory: async (memory: Record<string, unknown>) => {
      memoryMap.set(memory.id as string, memory);
      return memory.id as string;
    },
    updateMemory: async (memory: Record<string, unknown>) => {
      memoryMap.set(memory.id as string, { ...(memoryMap.get(memory.id as string) ?? {}), ...memory });
    },
    deleteMemory: async () => {},
    deleteAllMemories: async () => {},
    countMemories: async () => 0,
    getRooms: async () => Array.from(roomMap.values()) as never,
    getRoom: async (id: string) => (roomMap.get(id) as never) ?? null,
    getRoomsByIds: async (ids: string[]) => ids.map((id) => roomMap.get(id)).filter(Boolean) as never,
    createRoom: async (room: Record<string, unknown>) => {
      roomMap.set(room.id as string, room);
      return true;
    },
    createRooms: async (rooms: Array<Record<string, unknown>>) => {
      for (const room of rooms) {
        roomMap.set(room.id as string, room);
      }
      return rooms as never;
    },
    updateRoom: async () => {},
    deleteRoom: async () => {},
    createWorld: async (world: Record<string, unknown>) => {
      worldMap.set(world.id as string, world);
      return world.id as string;
    },
    getWorld: async (id: string) => (worldMap.get(id) as never) ?? null,
    getWorlds: async () => Array.from(worldMap.values()) as never,
    removeParticipant: async (entityId: string, roomId: string) => {
      participantMap.set(
        roomId,
        (participantMap.get(roomId) ?? []).filter((id) => id !== entityId),
      );
      return true;
    },
    getParticipantsForEntity: async (entityId: string) => {
      const rooms: string[] = [];
      for (const [roomId, participants] of participantMap.entries()) {
        if (participants.includes(entityId)) {
          rooms.push(roomId);
        }
      }
      return rooms as never;
    },
    getParticipantsForRoom: async (roomId: string) => participantMap.get(roomId) ?? [],
    isRoomParticipant: async (roomId: string, entityId: string) =>
      (participantMap.get(roomId) ?? []).includes(entityId),
    addParticipantsRoom: async (entityIds: string[], roomId: string) => {
      const current = new Set(participantMap.get(roomId) ?? []);
      for (const entityId of entityIds) {
        current.add(entityId);
      }
      participantMap.set(roomId, Array.from(current));
      return true;
    },
    getRelationships: async () => [],
    createRelationship: async () => true,
    updateRelationship: async () => true,
    deleteRelationship: async () => true,
    getTasks: async () => [],
    getTask: async () => null,
    createTask: async () => true,
    updateTask: async () => true,
    deleteTask: async () => true,
    getCache: async () => null,
    setCache: async () => true,
    deleteCache: async () => true,
  };

  return { adapter, logEntries };
}

describe("eliza runtime integration", () => {
  beforeEach(() => {
    sdkMocks.loadAgent.mockReset();
    sdkMocks.checkAgentExists.mockReset();
    sdkMocks.judgeAction.mockReset();
    sdkMocks.getAgentPolicy.mockReset();
    sdkMocks.logToolCall.mockReset();

    sdkMocks.loadAgent.mockReturnValue({ pubkey: "agent-pubkey", privkey: "agent-privkey" });
    sdkMocks.checkAgentExists.mockResolvedValue(true);
    sdkMocks.judgeAction.mockResolvedValue({
      verdict: "ALLOW",
      reason: "safe",
      confidence: 0.91,
      tool_call_id: "tc-1",
    });
    sdkMocks.getAgentPolicy.mockResolvedValue({
      policy: "default",
      is_jailed: false,
      is_custom: false,
    });
    sdkMocks.logToolCall.mockResolvedValue({
      success: true,
      toolCallId: "tc-2",
    });
  });

  it("loads the plugin into a real AgentRuntime and uses the registered service", async () => {
    const { adapter } = createAdapter();
    const runtime = new AgentRuntime({
      adapter: adapter as never,
      plugins: [atbashPlugin as never],
      character: {
        name: "Atbash Test Agent",
        bio: ["Runtime verification agent"],
        system: "You are a test agent.",
        settings: {
          ATBASH_ENDPOINT: "https://atbash.example",
        },
        secrets: {
          ATBASH_AGENT_PRIVKEY: "privkey-123",
        },
      },
    });

    await runtime.initialize({ skipMigrations: true });
    const atbashService = await runtime.getServiceLoadPromise("atbash" as never);

    expect(atbashService).toBeTruthy();
    expect(runtime.plugins.map((plugin) => plugin.name)).toContain("@atbash/eliza-plugin");
    expect(runtime.actions.map((action) => action.name)).toContain("ATBASH_JUDGE");
    expect(runtime.providers.map((provider) => provider.name)).toContain("atbash-policy");
    expect(runtime.evaluators.map((evaluator) => evaluator.name)).toContain("atbash-audit");

    const judgeAction = runtime.actions.find((action) => action.name === "ATBASH_JUDGE");
    const callback = async () => [];
    const result = await judgeAction!.handler(
      runtime,
      {
        content: { text: "Approve a payout" },
      } as never,
      undefined,
      undefined,
      callback,
    );

    expect(result).toMatchObject({ success: true, text: "Verdict: ALLOW" });
    expect(sdkMocks.judgeAction).toHaveBeenCalled();

    const provider = runtime.providers.find((entry) => entry.name === "atbash-policy");
    const providerResult = await provider!.get(
      runtime,
      { content: { text: "Hello" } } as never,
      { values: {}, data: {}, text: "" } as never,
    );
    expect(providerResult.text).toContain("Atbash Safety Status");

    await auditEvaluator.handler(
      runtime,
      { content: { text: "Completed transfer" } } as never,
      undefined,
      undefined,
      callback,
    );
    expect(sdkMocks.logToolCall).toHaveBeenCalled();

    await runtime.stop();
  });
});
