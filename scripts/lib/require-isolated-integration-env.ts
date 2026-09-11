import { isolatedIntegrationEnvironment } from './integration-test-environment.js';

// First dependency in every mode: run before loading repository singletons.
// The parent runner supplies a fresh fixture URL, including for billing-only tests.
const next = isolatedIntegrationEnvironment(process.env);
for (const key of Object.keys(process.env)) if (!Object.hasOwn(next, key)) delete process.env[key];
Object.assign(process.env, next);
