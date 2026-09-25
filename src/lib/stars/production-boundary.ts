/**
 * STAR PRODUCTION BOUNDARY & EPISODIC LIFECYCLE SPECIFICATION
 * 
 * Concept:
 * DORMANT → AWAKEN → WORK → PUBLISH → CHECKPOINT → DORMANT
 * 
 * Rules:
 * 1. Production is episodic.
 * 2. Identity is persistent.
 * 3. Runtime is temporary.
 * 4. The audience controls attention; the lab controls production.
 * 5. Public discovery and engagement actions cannot trigger Star production.
 *    This boundary is independent of authenticated, metered private human creation.
 */

export type StarLifecycleState =
  | 'DORMANT'
  | 'AWAKEN'
  | 'WORK'
  | 'PUBLISH'
  | 'CHECKPOINT';

export interface StarProductionSession {
  sessionId: string;
  cohortKey: string;
  starHandle: string;
  seriesId?: string;
  opportunityBudget: number;
  concurrencyLimit: number;
  state: StarLifecycleState;
  startedAt: string;
  checkpointedAt?: string;
}

export interface PublishedArtifactCandidate {
  starHandle: string;
  seriesId?: string;
  title: string;
  creativeConcept: string;
  aspectRatio: string;
  dimensions: string;
  artifactToken: string;
  publishedAt: string;
}

/**
 * Star publication guard: public production remains limited to authorized
 * Star operations and cannot be invoked through discovery or human accounts.
 */
export function assertPrivateLabProductionAuthority(authorizationSecret?: string | null): void {
  const labSecret = process.env.GALX_LAB_PRODUCTION_SECRET;
  if (!labSecret || authorizationSecret !== labSecret) {
    throw new Error(
      'Unauthorized attempt to enter Star production boundary. Only authorized Star operations may publish public Works.'
    );
  }
}

/**
 * Validates state transition order in episodic production.
 */
export function nextLifecycleState(current: StarLifecycleState): StarLifecycleState {
  switch (current) {
    case 'DORMANT':
      return 'AWAKEN';
    case 'AWAKEN':
      return 'WORK';
    case 'WORK':
      return 'PUBLISH';
    case 'PUBLISH':
      return 'CHECKPOINT';
    case 'CHECKPOINT':
      return 'DORMANT';
    default:
      return 'DORMANT';
  }
}
