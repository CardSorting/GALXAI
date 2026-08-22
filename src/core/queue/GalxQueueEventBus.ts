import type { GalxQueueEvent, GalxQueueEventType } from '../contracts/GalxContracts';

export type EventListener = (event: GalxQueueEvent) => void;

/**
 * High-performance real-time event bus for GALXAI task queues and worker streams.
 * Delivers sub-millisecond SSE push updates for task transitions, logs, and progress events.
 */
export class GalxQueueEventBus {
  private static instance: GalxQueueEventBus;
  private readonly listeners = new Set<EventListener>();
  private readonly taskListeners = new Map<string, Set<EventListener>>();
  private readonly queueListeners = new Map<string, Set<EventListener>>();
  private readonly recentEvents: GalxQueueEvent[] = [];
  private eventCounter = 0;

  private constructor() {}

  public static getInstance(): GalxQueueEventBus {
    if (!GalxQueueEventBus.instance) {
      GalxQueueEventBus.instance = new GalxQueueEventBus();
    }
    return GalxQueueEventBus.instance;
  }

  /**
   * Emits a typed queue/task lifecycle event to all relevant active subscribers.
   */
  public emitEvent(type: GalxQueueEventType, queueId: string, taskId?: string, data?: any): GalxQueueEvent {
    this.eventCounter++;
    const event: GalxQueueEvent = {
      eventId: `evt_${Date.now()}_${this.eventCounter}`,
      type,
      queueId,
      taskId,
      timestampMs: Date.now(),
      data
    };

    // Store in ring buffer (last 200 events)
    this.recentEvents.push(event);
    if (this.recentEvents.length > 200) {
      this.recentEvents.shift();
    }

    // Global listeners
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {}
    }

    // Queue-specific listeners
    const qSet = this.queueListeners.get(queueId);
    if (qSet) {
      for (const listener of qSet) {
        try {
          listener(event);
        } catch {}
      }
    }

    // Task-specific listeners
    if (taskId) {
      const tSet = this.taskListeners.get(taskId);
      if (tSet) {
        for (const listener of tSet) {
          try {
            listener(event);
          } catch {}
        }
      }
    }

    return event;
  }

  /**
   * Subscribes to events for a specific task.
   */
  public subscribeTask(taskId: string, listener: EventListener): () => void {
    if (!this.taskListeners.has(taskId)) {
      this.taskListeners.set(taskId, new Set());
    }
    this.taskListeners.get(taskId)!.add(listener);

    return () => {
      const set = this.taskListeners.get(taskId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.taskListeners.delete(taskId);
      }
    };
  }

  /**
   * Subscribes to all events in a queue.
   */
  public subscribeQueue(queueId: string, listener: EventListener): () => void {
    if (!this.queueListeners.has(queueId)) {
      this.queueListeners.set(queueId, new Set());
    }
    this.queueListeners.get(queueId)!.add(listener);

    return () => {
      const set = this.queueListeners.get(queueId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.queueListeners.delete(queueId);
      }
    };
  }

  /**
   * Subscribes to all events globally across the engine.
   */
  public subscribeGlobal(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Retrieves recent events, optionally filtered by queueId or taskId.
   */
  public getRecentEvents(filter?: { queueId?: string; taskId?: string; limit?: number }): GalxQueueEvent[] {
    let list = this.recentEvents;
    if (filter?.queueId) {
      list = list.filter(e => e.queueId === filter.queueId);
    }
    if (filter?.taskId) {
      list = list.filter(e => e.taskId === filter.taskId);
    }
    const limit = filter?.limit || 50;
    return list.slice(-limit);
  }
}
