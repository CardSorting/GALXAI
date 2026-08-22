/**
 * GALXAI: Cloudflare Durable Object Swarm Coordinator
 * Synchronizes multi-agent swarm tasks and sub-agent reasoning loops in edge memory.
 * Accumulates intermediate thoughts, shared prompt prefixes, and sub-task outputs with $0 database load.
 */

export interface SwarmAgentState {
  agentId: string;
  role: string;
  status: 'IDLE' | 'THINKING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  lastOutput?: string;
  updatedAtMs: number;
}

export interface SwarmSessionState {
  swarmId: string;
  goal: string;
  agents: Map<string, SwarmAgentState>;
  sharedContext: Record<string, any>;
  isFinished: boolean;
  createdAtMs: number;
  updatedAtMs: number;
}

export class GalxSwarmCoordinatorDO {
  private state: SwarmSessionState;

  constructor(public readonly swarmId: string, goal: string) {
    this.state = {
      swarmId,
      goal,
      agents: new Map(),
      sharedContext: {},
      isFinished: false,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };
  }

  registerAgent(agentId: string, role: string): void {
    this.state.agents.set(agentId, {
      agentId,
      role,
      status: 'IDLE',
      updatedAtMs: Date.now()
    });
    this.state.updatedAtMs = Date.now();
  }

  updateAgentStatus(agentId: string, status: SwarmAgentState['status'], output?: string): void {
    const agent = this.state.agents.get(agentId);
    if (agent) {
      agent.status = status;
      if (output) agent.lastOutput = output;
      agent.updatedAtMs = Date.now();
      this.state.updatedAtMs = Date.now();
    }
  }

  setSharedContext(key: string, value: any): void {
    this.state.sharedContext[key] = value;
    this.state.updatedAtMs = Date.now();
  }

  getSharedContext(key: string): any {
    return this.state.sharedContext[key];
  }

  getState(): {
    swarmId: string;
    goal: string;
    agents: SwarmAgentState[];
    sharedContext: Record<string, any>;
    isFinished: boolean;
  } {
    return {
      swarmId: this.state.swarmId,
      goal: this.state.goal,
      agents: Array.from(this.state.agents.values()),
      sharedContext: this.state.sharedContext,
      isFinished: this.state.isFinished
    };
  }

  completeSwarm(): void {
    this.state.isFinished = true;
    this.state.updatedAtMs = Date.now();
  }
}
