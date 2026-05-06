export function createInMemoryAdapter() {
  const agentMap = new Map();
  const roomMap = new Map();
  const participantMap = new Map();
  const entityMap = new Map();
  const memoryMap = new Map();
  const logEntries = [];
  const worldMap = new Map();

  return {
    db: {},
    initialize: async () => {},
    init: async () => {},
    isReady: async () => true,
    close: async () => {},
    getConnection: async () => ({}),
    ensureEmbeddingDimension: async () => {},
    getAgent: async (id) => agentMap.get(id) ?? null,
    getAgents: async () => Array.from(agentMap.values()),
    createAgent: async (agent) => {
      if (agent?.id) {
        agentMap.set(agent.id, agent);
      }
      return true;
    },
    updateAgent: async (id, agent) => {
      agentMap.set(id, { ...(agentMap.get(id) ?? {}), ...agent });
      return true;
    },
    deleteAgent: async () => true,
    getEntitiesByIds: async (ids) => ids.map((id) => entityMap.get(id)).filter(Boolean),
    getEntityById: async (id) => entityMap.get(id) ?? null,
    getEntitiesForRoom: async () => [],
    createEntities: async (entities) => {
      for (const entity of entities) {
        entityMap.set(entity.id, entity);
      }
      return true;
    },
    createEntity: async (entity) => {
      entityMap.set(entity.id, entity);
      return true;
    },
    updateEntity: async (entity) => {
      entityMap.set(entity.id, entity);
    },
    getComponent: async () => null,
    getComponents: async () => [],
    createComponent: async () => true,
    updateComponent: async () => {},
    deleteComponent: async () => {},
    getMemories: async () => [],
    getMemoryById: async (id) => memoryMap.get(id) ?? null,
    getMemoriesByIds: async (ids) => ids.map((id) => memoryMap.get(id)).filter(Boolean),
    getMemoriesByRoomIds: async () => [],
    getCachedEmbeddings: async () => [],
    log: async (entry) => {
      logEntries.push(entry);
    },
    getLogs: async () => logEntries,
    deleteLog: async () => {},
    searchMemories: async () => [],
    createMemory: async (memory) => {
      memoryMap.set(memory.id, memory);
      return memory.id;
    },
    updateMemory: async (memory) => {
      memoryMap.set(memory.id, { ...(memoryMap.get(memory.id) ?? {}), ...memory });
    },
    deleteMemory: async () => {},
    deleteAllMemories: async () => {},
    countMemories: async () => 0,
    getRooms: async () => Array.from(roomMap.values()),
    getRoom: async (id) => roomMap.get(id) ?? null,
    getRoomsByIds: async (ids) => ids.map((id) => roomMap.get(id)).filter(Boolean),
    createRoom: async (room) => {
      roomMap.set(room.id, room);
      return true;
    },
    createRooms: async (rooms) => {
      for (const room of rooms) {
        roomMap.set(room.id, room);
      }
      return rooms;
    },
    updateRoom: async () => {},
    deleteRoom: async () => {},
    createWorld: async (world) => {
      worldMap.set(world.id, world);
      return world.id;
    },
    getWorld: async (id) => worldMap.get(id) ?? null,
    getWorlds: async () => Array.from(worldMap.values()),
    removeParticipant: async (entityId, roomId) => {
      participantMap.set(
        roomId,
        (participantMap.get(roomId) ?? []).filter((id) => id !== entityId),
      );
      return true;
    },
    getParticipantsForEntity: async (entityId) => {
      const rooms = [];
      for (const [roomId, participants] of participantMap.entries()) {
        if (participants.includes(entityId)) {
          rooms.push(roomId);
        }
      }
      return rooms;
    },
    getParticipantsForRoom: async (roomId) => participantMap.get(roomId) ?? [],
    isRoomParticipant: async (roomId, entityId) => (participantMap.get(roomId) ?? []).includes(entityId),
    addParticipantsRoom: async (entityIds, roomId) => {
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
}
