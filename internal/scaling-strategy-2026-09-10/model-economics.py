#!/usr/bin/env python3
"""Reproduce private planning tables with Decimal arithmetic; no network or database."""
import csv
import json
from decimal import Decimal, ROUND_HALF_UP
from itertools import product
from pathlib import Path

ROOT = Path(__file__).resolve().parent
cfg = json.loads((ROOT / 'economics-inputs.json').read_text())
D = Decimal


def number(key):
    value = D(cfg[key])
    if not value.is_finite() or value < 0:
        raise ValueError(f'Invalid nonnegative input: {key}')
    return value


def fmt(value):
    return str(value.quantize(D('0.000001'), rounding=ROUND_HALF_UP))


def write_csv(name, rows):
    with (ROOT / name).open('w', newline='') as output:
        writer = csv.DictWriter(output, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


price = number('monthly_price')
allowance = number('included_credit_units')
backup_cost = number('backup_cost_per_credit')
overage_rate = number('overage_price_per_credit')
cap = number('monthly_overage_cap_usd')
fee_rate = number('payment_fee_fraction')
fixed_fee = number('fixed_payment_fee_per_month')
overhead = number('allocated_infrastructure_and_support')
risk = number('refund_and_incident_reserve')
target = number('target_contribution_margin')
if price <= 0 or allowance <= 0 or overage_rate <= 0 or fee_rate >= 1 or target >= 1:
    raise ValueError('Price, allowance and overage rate must be positive; fractions must be below 1.')

rows = []
cases = product(['unbounded_flat', 'allowance_hard_stop', 'allowance_capped_overage'],
    cfg['primary_cost_per_credit_cases'], cfg['backup_fraction_cases'],
    cfg['demand_multiple_cases'], cfg['attempt_cost_multiplier_cases'])
for mode, primary_raw, fallback_raw, demand_raw, attempt_raw in cases:
    primary, fraction, demand_multiple, attempt = map(D, [primary_raw, fallback_raw, demand_raw, attempt_raw])
    if not all(x.is_finite() for x in [primary, fraction, demand_multiple, attempt]):
        raise ValueError('Non-finite scenario input')
    if primary < 0 or not 0 <= fraction <= 1 or demand_multiple < 0 or attempt < 1:
        raise ValueError('Invalid scenario input')
    demand = allowance * demand_multiple
    overage_credit = D(0)
    if mode == 'unbounded_flat':
        served = demand
    elif mode == 'allowance_hard_stop':
        served = min(demand, allowance)
    else:
        overage_credit = min(max(D(0), demand - allowance), cap / overage_rate)
        served = min(demand, allowance) + overage_credit
    overage_revenue = overage_credit * overage_rate
    revenue = price + overage_revenue
    blended_cost = (1 - fraction) * primary + fraction * backup_cost
    supplier_cost = served * blended_cost * attempt
    payment_cost = revenue * fee_rate + fixed_fee
    contribution = revenue - payment_cost - overhead - risk - supplier_cost
    rows.append({
        'mode': mode, 'primary_cost_per_credit': fmt(primary), 'backup_fraction': fmt(fraction),
        'demand_multiple': fmt(demand_multiple), 'attempt_cost_multiplier': fmt(attempt),
        'demand_credit': fmt(demand), 'served_credit': fmt(served),
        'unserved_credit': fmt(demand - served), 'overage_revenue_usd': fmt(overage_revenue),
        'revenue_usd': fmt(revenue), 'supplier_cost_usd': fmt(supplier_cost),
        'payment_cost_usd': fmt(payment_cost), 'overhead_usd': fmt(overhead),
        'risk_reserve_usd': fmt(risk), 'contribution_usd': fmt(contribution),
        'contribution_margin': fmt(contribution / revenue),
    })
    if mode == 'allowance_capped_overage':
        assert overage_revenue <= cap
    if mode == 'allowance_hard_stop':
        assert served <= allowance
    assert D(0) <= served <= demand
write_csv('economics-scenarios.csv', rows)

promotions = []
for amount, multiplier in [('25', '1.5'), ('50', '1.6'), ('100', '1.75'), ('250', '2'), ('500', '2')]:
    deposit, match = D(amount), D(multiplier)
    credit = deposit * match + D(5)
    max_supplier_ratio = deposit / credit
    promotions.append({'first_deposit_usd': fmt(deposit), 'credit_with_eligible_welcome_grant': fmt(credit),
        'max_supplier_cost_per_credit_before_other_costs': fmt(max_supplier_ratio),
        'minimum_cost_advantage_before_other_costs_pct': fmt((1 - max_supplier_ratio) * 100)})
write_csv('promotion-break-even.csv', promotions)

a = {k: D(v) for k, v in cfg['availability'].items()}
if any(not v.is_finite() or not 0 <= v <= 1 for v in a.values()):
    raise ValueError('Availability inputs must be finite probabilities')
single = a['shared_availability'] * (1 - a['primary_failure_probability'])
qualified = a['shared_availability'] * (1 - a['primary_failure_probability'] *
    (1 - a['backup_eligibility'] * a['switch_success'] * (1 - a['backup_failure_given_primary_failure'])))
ideal = a['shared_availability'] * (1 - a['primary_failure_probability'] * a['independent_backup_failure_example'])
available_cost = price * (1 - fee_rate - target) - fixed_fee - overhead - risk
summary = {
    'classification': cfg['classification'], 'scenario_count': len(rows),
    'max_supplier_expense_at_target_margin': fmt(available_cost),
    'max_full_use_allowance_by_cost_ratio': {ratio: fmt(max(D(0), available_cost) / D(ratio))
        for ratio in cfg['primary_cost_per_credit_cases'] if D(ratio) > 0},
    'illustrative_availability_pct': {'primary_only': fmt(single * 100),
        'qualified_backup': fmt(qualified * 100), 'ideal_independent_backup': fmt(ideal * 100)},
}
(ROOT / 'economics-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
