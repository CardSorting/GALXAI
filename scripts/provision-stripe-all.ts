/**
 * Legacy entry point retained so an old operator command cannot recreate the
 * retired prepaid Developer catalog.
 *
 * The active Stripe surfaces are the GALX Pro and GALX Nova Developer Access
 * subscriptions. Developer Access has its own product/price provisioning
 * procedure and must not be folded into the legacy catalog.
 */
console.error('The legacy prepaid Stripe catalog is retired and this command is disabled.');
console.error('Use the private Pro procedure for the $10/month consumer plan.');
console.error('Use the private Nova Developer procedure for the separate $50/month recurring access subscription.');
process.exitCode = 1;
