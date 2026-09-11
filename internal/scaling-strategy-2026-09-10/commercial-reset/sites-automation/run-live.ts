/** Historical entry point retired to prevent overwriting evidence or replaying work. */
console.error('The one-shot probe is retired. Use durable/local.ts and its documented create/generate/prepare/accept-package commands.');
process.exitCode = 1;
