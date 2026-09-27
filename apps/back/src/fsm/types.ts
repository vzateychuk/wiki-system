export interface SagaContext {
  sagaName: string;
  startedAt: Date;
  currentStep?: string;
  error?: Error;
  metadata: Record<string, unknown>;
}

export interface SagaStep<C extends SagaContext> {
  name: string;
  execute: (ctx: C) => Promise<void>;
}

export interface SagaDefinition<C extends SagaContext> {
  name: string;
  steps: SagaStep<C>[];
  onError?: (ctx: C, error: Error, stepName: string) => Promise<void>;
  onComplete?: (ctx: C) => Promise<void>;
}