"""Private, standard-library-only commercial sensitivity model. No accounts/network.

Run: python3 internal/scaling-strategy-2026-09-10/commercial-reset/model.py
All costs are assumptions from inputs.json. Dollar outputs are monthly unless named.
Contribution includes a planning reserve; it is not GAAP gross margin or net profit.
"""
import csv
import itertools
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
I = json.loads((ROOT / "inputs.json").read_text())
assert 0 <= I["payment_percent"] < 1
assert 0 <= I["target_platform_contribution_margin"] < 1 - I["payment_percent"]
assert all(x > 0 for x in I["platform_prices"] + I["support_hours"] + I["managed_compute_cost_cases"])
assert all(0 < x <= 1 for x in I["trial_conversion_cases"])
assert all(0 <= x <= 1 for x in I["monthly_logo_churn_cases"])


def platform(price, support, requests):
    infra = I["direct_account_infrastructure"] + requests / 1000 * I["infrastructure_per_1000_requests"]
    labor = support * I["loaded_support_hourly_cost"]
    processing = price * I["payment_percent"] + I["payment_fixed"]
    costs = infra + labor + processing + I["monthly_reliability_reserve"]
    contribution = price - costs
    denominator = 1 - I["payment_percent"] - I["target_platform_contribution_margin"]
    assert denominator > 0
    floor = (infra + labor + I["payment_fixed"] + I["monthly_reliability_reserve"]) / denominator
    return dict(price=price, support_hours=support, requests=requests,
                direct_infrastructure=infra, support_cost=labor, processing_cost=processing,
                risk_reserve=I["monthly_reliability_reserve"], contribution=contribution,
                contribution_margin=contribution / price, target_price_floor=floor)


def csv_file(name, rows):
    with (ROOT / name).open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        for row in rows:
            writer.writerow({k: round(v, 6) if isinstance(v, float) else v for k, v in row.items()})


platform_rows = [platform(*args) for args in itertools.product(
    I["platform_prices"], I["support_hours"], I["monthly_requests"])]
csv_file("platform-scenarios.csv", platform_rows)

capacity_rows = []
for hours, fixed in itertools.product(I["support_hours"], I["fixed_monthly_cost_cases"]):
    account = platform(I["pilot_price"], hours, I["pilot_requests"])
    c = account["contribution"]
    required = math.ceil(fixed / c) if c > 0 else None
    capacity = math.floor(I["monthly_customer_support_capacity_hours"] / hours)
    capacity_rows.append(dict(support_hours_per_account=hours, fixed_monthly_cost=fixed,
        contribution_per_account=c, accounts_for_break_even=required,
        support_hours_at_break_even=required * hours if required else None,
        accounts_at_support_capacity=capacity, contribution_at_capacity=capacity * c,
        break_even_within_support_capacity=required is not None and required <= capacity))
csv_file("capacity-and-break-even.csv", capacity_rows)

compute_rows = []
for b, m, r, g in itertools.product(I["managed_compute_cost_cases"], I["managed_markup_cases"],
                                  I["unrecovered_attempt_cost_rates"], I["upstream_gateway_fee_rates"]):
    collected = b * (1 + m)
    supplier = b * (1 + r) * (1 + g)
    payment = collected * I["payment_percent"] + I["payment_fixed"]
    loss = b * I["compute_loss_reserve_rate"]
    c = collected - supplier - payment - loss
    floor = ((1 + r) * (1 + g) + I["compute_loss_reserve_rate"] + I["payment_fixed"] / b) / (1 - I["payment_percent"]) - 1
    compute_rows.append(dict(estimated_supplier_workload=b, markup=m,
        unrecovered_attempt_rate=r, upstream_gateway_fee=g, collected=collected,
        actual_supplier_cost=supplier, processing_cost=payment, loss_reserve=loss,
        contribution=c, contribution_margin=c / collected, break_even_markup=floor))
csv_file("managed-compute-scenarios.csv", compute_rows)

base = platform(I["pilot_price"], I["base_support_hours"], I["pilot_requests"])
acquisition_rows = []
for cac, churn in itertools.product(I["acquisition_cost_cases"], I["monthly_logo_churn_cases"]):
    # Finite 12-month expected retained contribution, conditional on an acquired account
    # being active in month one. No infinite-horizon LTV or assumed expansion.
    retained = sum((1 - churn) ** month for month in range(12))
    expected = base["contribution"] * retained
    acquisition_rows.append(dict(cac=cac, monthly_logo_churn=churn,
        simple_payback_months=cac / base["contribution"] if base["contribution"] > 0 else None,
        expected_active_months_in_first_year=retained,
        first_year_expected_contribution=expected,
        first_year_contribution_after_cac=expected - cac))
csv_file("acquisition-scenarios.csv", acquisition_rows)

trial_rows = []
for conversion in I["trial_conversion_cases"]:
    trial_rows.append(dict(conversion_rate=conversion,
        trial_cogs_per_paying_customer=I["qualified_trial_cogs_cap"] / conversion,
        monthly_trial_cogs_cap=I["qualified_trial_cogs_cap"] * I["qualified_trials_per_month"],
        note="Excludes all sales labor, support, acquisition and referral costs"))
csv_file("trial-scenarios.csv", trial_rows)

setup_rows = []
for hours in I["setup_hours_cases"]:
    price = I["setup_price"]
    net = price * (1 - I["payment_percent"]) - I["payment_fixed"] - hours * I["loaded_support_hourly_cost"]
    setup_rows.append(dict(setup_price=price, delivery_hours=hours, contribution_before_cac=net))
csv_file("setup-scenarios.csv", setup_rows)

# Financial invariants and independently calculable anchor cases.
assert len(platform_rows) == len(I["platform_prices"]) * len(I["support_hours"]) * len(I["monthly_requests"])
assert len(compute_rows) == len(I["managed_compute_cost_cases"]) * len(I["managed_markup_cases"]) * len(I["unrecovered_attempt_cost_rates"]) * len(I["upstream_gateway_fee_rates"])
assert math.isclose(platform(299, 1, 100000)["contribution"] - platform(299, 2, 100000)["contribution"], I["loaded_support_hourly_cost"], abs_tol=1e-8)
assert math.isclose(platform(299, 1, 100000)["contribution"] - platform(299, 1, 101000)["contribution"], I["infrastructure_per_1000_requests"], abs_tol=1e-8)
assert all(row["contribution"] <= 0 for row in compute_rows if row["markup"] == 0)
assert all((row["accounts_for_break_even"] is None) == (row["contribution_per_account"] <= 0) for row in capacity_rows)
assert all(row["expected_active_months_in_first_year"] <= 12 for row in acquisition_rows)
# Fixed anchors only apply to the shipped scenario. Edited actuals remain runnable.
reference = dict(pilot_price=299, pilot_requests=100000, base_support_hours=0.5,
    direct_account_infrastructure=12, infrastructure_per_1000_requests=0.08,
    loaded_support_hourly_cost=75, monthly_reliability_reserve=5,
    payment_percent=0.03, payment_fixed=0.30, target_platform_contribution_margin=0.75)
if all(I[key] == value for key, value in reference.items()):
    assert math.isclose(base["contribution"], 227.23, abs_tol=1e-9)
    assert math.isclose(base["target_price_floor"], 285.4545454545, abs_tol=1e-8)

summary = dict(assumptions_status=I["status"], base=base,
    price_comparison=[platform(p, 0.5, 100000) for p in I["platform_prices"]],
    capacity=capacity_rows, setup=setup_rows,
    financial_invariants="passed",
    scenario_counts=dict(platform=len(platform_rows), capacity=len(capacity_rows),
        managed_compute=len(compute_rows), acquisition=len(acquisition_rows),
        trials=len(trial_rows), setup=len(setup_rows)))
(ROOT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps({"checks": "passed", "base": base, "scenario_counts": summary["scenario_counts"]}, indent=2))
