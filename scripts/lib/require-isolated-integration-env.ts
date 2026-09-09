import { isolatedIntegrationEnvironment } from './integration-test-environment.js';

// First dependency of the broad suite: run before loading repository singletons.
// Billing has its own disposable-database harness.
if (!process.argv.includes('--billing')) {
  const next = isolatedIntegrationEnvironment(process.env);
  for (const key of Object.keys(process.env)) if (!Object.hasOwn(next, key)) delete process.env[key];
  Object.assign(process.env, next);
}
