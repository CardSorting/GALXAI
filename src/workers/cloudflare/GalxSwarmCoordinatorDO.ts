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

  constructor(stateOrId?: any, envOrGoal?: any) {
    const isDOState = stateOrId && typeof stateOrId === 'object' && 'id' in stateOrId;
    const swarmId = isDOState ? stateOrId.id.toString() : typeof stateOrId === 'string' ? stateOrId : 'default_swarm';
    const goal = typeof envOrGoal === 'string' ? envOrGoal : 'Autonomous Swarm Coordination';

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

  /**
   * Cloudflare Durable Object HTTP Ingress & RPC Dispatcher
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/state' && request.method === 'GET') {
      return new Response(JSON.stringify(this.getState()), {
        headers: { 'content-type': 'application/json' }
      });
    }

    if (url.pathname === '/agent/register' && request.method === 'POST') {
      const body = (await request.json()) as any;
      this.registerAgent(body.agentId, body.role);
      return new Response(JSON.stringify({ success: true, agentId: body.agentId }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    if (url.pathname === '/agent/status' && request.method === 'POST') {
      const body = (await request.json()) as any;
      this.updateAgentStatus(body.agentId, body.status, body.output);
      return new Response(JSON.stringify({ success: true, state: this.getState() }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    if (url.pathname === '/context' && request.method === 'POST') {
      const body = (await request.json()) as any;
      this.setSharedContext(body.key, body.value);
      return new Response(JSON.stringify({ success: true, context: this.state.sharedContext }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    if (url.pathname === '/complete' && request.method === 'POST') {
      this.completeSwarm();
      return new Response(JSON.stringify({ success: true, isFinished: true }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: `Durable Object route not found: ${url.pathname}` }), {
      status: 404,
      headers: { 'content-type': 'application/json' }
    });
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

