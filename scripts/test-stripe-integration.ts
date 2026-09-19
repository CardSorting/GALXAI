/**
 * Compatibility entry point for the old billing integration command.
 *
 * The former test created simulated prepaid Developer checkout sessions and
 * asserted wallet-credit fulfillment. Developer usage economics remain
 * separate; the current subscription strategy is covered by the pricing and
 * database lifecycle tests.
 */
await import('./test-stripe-pricing-strategy');
