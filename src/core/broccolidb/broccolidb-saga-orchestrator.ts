/**
 * GALXAI: BroccoliSagaOrchestrator (Zenith Tier)
 *
 * In-process transaction saga orchestrator for BroccoliDB.
 * Coordinates forward actions and reverse compensation while surfacing incomplete compensation.
 */

import type {
  BroccoliSagaExecutionResult,
  BroccoliSagaState,
  BroccoliSagaStep,
  IBroccoliSagaOrchestrator,
} from "./broccolidb.contracts";

export class BroccoliSagaOrchestrator implements IBroccoliSagaOrchestrator {
  private readonly sagaHistory = new Map<string, BroccoliSagaExecutionResult<any>>();
  private readonly inFlight = new Map<string, Promise<BroccoliSagaExecutionResult<any>>>();

  public async executeSaga<TContext = any>(
    sagaId: string,
    context: TContext,
    steps: readonly BroccoliSagaStep<TContext, any>[]
  ): Promise<BroccoliSagaExecutionResult<TContext>> {
    if (!sagaId.trim()) throw new TypeError("sagaId must be non-empty");
    const prior = this.sagaHistory.get(sagaId);
    if (prior) return prior as BroccoliSagaExecutionResult<TContext>;
    const running = this.inFlight.get(sagaId);
    if (running) return running as Promise<BroccoliSagaExecutionResult<TContext>>;
    const stepNames = steps.map((step) => step.stepName);
    if (stepNames.some((name) => !name.trim())) throw new TypeError("Saga step names must be non-empty");
    if (new Set(stepNames).size !== stepNames.length) {
      throw new Error(`Saga '${sagaId}' contains duplicate step names`);
    }

    const execution = this.executeSagaOnce(sagaId, context, steps);
    this.inFlight.set(sagaId, execution);
    try {
      return await execution;
    } finally {
      this.inFlight.delete(sagaId);
    }
  }

  private async executeSagaOnce<TContext>(
    sagaId: string,
    context: TContext,
    steps: readonly BroccoliSagaStep<TContext, any>[]
  ): Promise<BroccoliSagaExecutionResult<TContext>> {
    const startTime = Date.now();
    const completedSteps: string[] = [];
    const stepResults = new Map<string, unknown>();
    let sagaState: BroccoliSagaState = "RUNNING";
    let failureError: Error | undefined = undefined;

    // 1. Forward execution phase
    for (const step of steps) {
      try {
        const result = await step.execute(context);
        completedSteps.push(step.stepName);
        stepResults.set(step.stepName, result);
      } catch (err) {
        failureError = err instanceof Error ? err : new Error(String(err));
        sagaState = "COMPENSATING";
        break;
      }
    }

    // 2. Success path
    if (sagaState === "RUNNING") {
      const finalResult: BroccoliSagaExecutionResult<TContext> = {
        sagaId,
        state: "COMPLETED",
        context,
        completedSteps,
        compensatedSteps: [],
        durationMs: Date.now() - startTime,
      };
      this.sagaHistory.set(sagaId, finalResult);
      return finalResult;
    }

    // 3. Compensation rollback phase
    const compensatedSteps: string[] = [];
    const compensationErrors: { stepName: string; error: Error }[] = [];
    const stepsToCompensate = steps
      .filter((s) => completedSteps.includes(s.stepName))
      .reverse(); // Reverse execution order for rollbacks

    for (const step of stepsToCompensate) {
      try {
        const previousResult = stepResults.get(step.stepName);
        await step.compensate(context, previousResult);
        compensatedSteps.push(step.stepName);
      } catch (compErr) {
        compensationErrors.push({
          stepName: step.stepName,
          error: compErr instanceof Error ? compErr : new Error(String(compErr)),
        });
      }
    }

    const finalResult: BroccoliSagaExecutionResult<TContext> = {
      sagaId,
      state: compensationErrors.length === 0 ? "COMPENSATED" : "FAILED",
      context,
      completedSteps,
      compensatedSteps,
      error: failureError,
      compensationErrors: compensationErrors.length > 0 ? compensationErrors : undefined,
      durationMs: Date.now() - startTime,
    };

    this.sagaHistory.set(sagaId, finalResult);
    return finalResult;
  }

  public getSagaResult(sagaId: string): BroccoliSagaExecutionResult | undefined {
    return this.sagaHistory.get(sagaId);
  }

  public listSagas(): readonly BroccoliSagaExecutionResult[] {
    return Array.from(this.sagaHistory.values());
  }
}
