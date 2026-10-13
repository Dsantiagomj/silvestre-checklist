# Canonical step data + verification of weights. Not shipped.
# effort tiers -> points
TIER_POINTS = {"trivial": 1, "corto": 3, "medio": 8, "largo": 20, "epico": 50}

# Zone and effort tier of each step, read from src/data/steps.js
import pathlib
import re

_STEPS = (pathlib.Path(__file__).resolve().parent.parent / "src" / "data" / "steps.js").read_text()
_ROWS = re.findall(r'\{ n: (\d+), zone: "(.*?)", effort: "(\w+)"', _STEPS.split("export const STEPS = [", 1)[1].split("\n];", 1)[0])
n_to_tier = {int(n): tier for n, _, tier in _ROWS}
ZONE = {int(n): zone for n, zone, _ in _ROWS}

# Coverage check
missing = [n for n in range(1, 101) if n not in n_to_tier]
print("Missing steps:", missing)
print("Total classified:", len(n_to_tier))

# Counts per tier
from collections import Counter
c = Counter(n_to_tier.values())
print("Tier counts:", dict(c))

total_points = sum(TIER_POINTS[t] for t in n_to_tier.values())
print("Total points:", total_points)
assert len(ZONE) == 100

# Zone weights
zone_points = {}
zone_steps = {}
for n, z in ZONE.items():
    zone_points[z] = zone_points.get(z, 0) + TIER_POINTS[n_to_tier[n]]
    zone_steps[z] = zone_steps.get(z, 0) + 1

print("\nZone weights (% of total points):")
for z in sorted(zone_points, key=lambda k: -zone_points[k]):
    pct = zone_points[z] / total_points * 100
    print(f"  {z:30s} pts={zone_points[z]:4d} steps={zone_steps[z]:2d} weight={pct:5.2f}%")

print("\nSum of zone weights:", sum(zone_points.values()) / total_points * 100)
