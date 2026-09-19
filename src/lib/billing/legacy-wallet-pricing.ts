/**
 * Historical wallet settlement math.
 *
 * This is used only by the fallback path that reconciles legacy wallet
 * records. It is intentionally not imported by Stripe checkout, quote, or any
 * public pricing response.
 */
export function calculateLegacyComputeCredit(amountUsd: number) {
  const deposit = Math.max(0, Number(amountUsd) || 0);
  const matchRate = deposit >= 250 ? 1 : deposit >= 100 ? 0.75 : deposit >= 50 ? 0.6 : deposit >= 25 ? 0.5 : 0;
  const welcomeGrant = deposit >= 25 ? 5 : 0;
  const matchBonus = Number((deposit * matchRate).toFixed(2));
  const totalCredit = Number((deposit + welcomeGrant + matchBonus).toFixed(2));
  const concurrencyRpm = deposit >= 500 ? 'Unlimited' : deposit >= 250 ? 1_200 : deposit >= 100 ? 600 : deposit >= 50 ? 300 : deposit >= 25 ? 120 : 60;

  return {
    depositAmount: deposit,
    welcomeGrant,
    matchBonus,
    totalCredit,
    tier: {
      label: 'Historical wallet settlement',
      concurrencyRpm,
    },
  };
}
