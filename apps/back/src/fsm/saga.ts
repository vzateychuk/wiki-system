import { SagaContext, SagaDefinition } from './types.js';

export async function runSaga<C extends SagaContext>(
  definition: SagaDefinition<C>,
  initialContext: Omit<C, keyof SagaContext> & Partial<SagaContext>
): Promise<C> {
  const ctx: C = {
    sagaName: definition.name,
    startedAt: new Date(),
    metadata: {},
    ...initialContext,
  } as C;

  try {
    for (const step of definition.steps) {
      ctx.currentStep = step.name;
      await step.execute(ctx);
    }

    await definition.onComplete?.(ctx);
    return ctx;
  } catch (err) {
    ctx.error = err instanceof Error ? err : new Error(String(err));
    await definition.onError?.(ctx, ctx.error, ctx.currentStep!);
    throw err;
  }
}