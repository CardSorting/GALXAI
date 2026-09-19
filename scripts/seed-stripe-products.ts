/**
 * Legacy entry point retained as a guard. It must not recreate prepaid
 * Developer or compute-pack products in Stripe.
 */
console.error('The legacy prepaid Stripe product seeder is retired and disabled.');
console.error('Nova Developer Access is provisioned separately as a $50/month recurring Stripe Price.');
process.exitCode = 1;
