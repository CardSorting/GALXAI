/**
 * Next.js 15.5+ Server Lifecycle & Instrumentation Hook
 * Boots on server initialization across Node.js and Edge runtimes.
 * Includes global process resilience guards to prevent fatal worker aborts.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Register global process error guards to prevent unhandled background stream crashes
      if (typeof process !== 'undefined' && process.on) {
        process.on('unhandledRejection', (reason, promise) => {
          console.error('🛡️ [GALXAI Server Resilience Guard] Unhandled Rejection intercepted:', reason);
        });

        process.on('uncaughtException', (error) => {
          console.error('🛡️ [GALXAI Server Resilience Guard] Uncaught Exception intercepted:', error);
        });
      }

      // Dynamic import to keep Edge bundles lean
      const { GalxPersistence } = await import('@/lib/storage/GalxPersistence');
      const { ModelCatalog, EXCLUSIVE_MODEL_CATALOG } = await import('@/core/router/ModelCatalog');

      // Warm up persistence and catalog in memory
      GalxPersistence.getInstance();
      ModelCatalog.getTable();

      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ [GALXAI Instrumentation] Next.js 15.5 server booted: ${EXCLUSIVE_MODEL_CATALOG.length} models & memory store initialized.`);
      }
    } catch (err) {
      console.warn('⚠️ [GALXAI Instrumentation] Warning during server boot warmup:', err);
    }
  }
}
