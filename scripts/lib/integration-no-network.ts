/** The broad legacy suite uses synthetic edge transports; HTTP must never leave it. */
let attempts = 0;
globalThis.fetch = async () => { attempts++; throw new Error('Unexpected HTTP request in isolated integration tests'); };
process.on('exit', () => {
  if (attempts) { console.error(`Isolated integration suite attempted ${attempts} unexpected HTTP requests.`); process.exitCode = 1; }
});
