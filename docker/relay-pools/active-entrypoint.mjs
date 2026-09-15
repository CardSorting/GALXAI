try { await (await import('./service.mjs')).poolEntrypoint(); }
catch { console.error('Service startup refused. Check the fixed identity and mounted configuration.'); process.exitCode=1; }
