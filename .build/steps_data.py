# Canonical step data + verification of weights. Not shipped.
# effort tiers -> points
TIER_POINTS = {"trivial": 1, "corto": 3, "medio": 8, "largo": 20, "epico": 50}

# Classification per spec heuristics
EFFORT = {
    "trivial": [4, 6, 8, 9, 14, 24, 29, 30, 31],
    "corto":   [3, 5, 11, 12, 13, 19, 25, 26, 27, 32, 33, 35, 40, 43, 53, 57, 58, 60,
                63, 64, 65, 68, 71, 72, 74, 80, 81, 82, 83, 84, 85, 89, 90, 91, 92, 95, 96],
    "medio":   [7, 10, 15, 17, 20, 22, 28, 34, 36, 37, 38, 39, 41, 44, 45, 46, 47, 48,
                50, 51, 52, 54, 59, 61, 66, 73, 76, 78, 87, 100],
    "largo":   [1, 2, 16, 18, 21, 23, 42, 49, 55, 56, 62, 67, 69, 70, 77, 79, 86, 88, 98, 99],
    "epico":   [75, 93, 94, 97],
}

# Build n -> tier
n_to_tier = {}
for tier, ns in EFFORT.items():
    for n in ns:
        assert n not in n_to_tier, f"dup {n}"
        n_to_tier[n] = tier

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

# Zone detection by prefix (n -> zone). Filled from text below.
ZONE = {
    1:"Misiones de Mundo",2:"Astrub",3:"Astrub",4:"Krosmoz",5:"Misiones de Mundo",
    6:"Justicieros",7:"Torres de la Hermandad",8:"Cania",9:"Sidimote",10:"Sidimote",
    11:"Cania",12:"Dimensiones Divinas",13:"Misiones de Mundo",14:"Sufokia",15:"Sufokia",
    16:"Animatopía",17:"Misiones de Mundo",18:"Misiones de Mundo",19:"Misiones de Mundo",
    20:"Alineamiento",21:"Misiones de Mundo",22:"Alineamiento",23:"Isla de Frigost",
    24:"Isla de Frigost",25:"Isla de Frigost",26:"Isla de Frigost",27:"Isla de Frigost",
    28:"Isla de Frigost",29:"Isla de Frigost",30:"Isla de Frigost",31:"Isla de Frigost",
    32:"Misiones de Mundo",33:"Misiones de Mundo",34:"Reino de Amakna",35:"Reino de Amakna",
    36:"Alineamiento",37:"Reino de Amakna",38:"Misiones de Mundo",39:"Misiones de Mundo",
    40:"Isla de Frigost",41:"Misiones de Mundo",42:"Selocalipsis",43:"Isla de Pandala",
    44:"Misiones de Mundo",45:"Isla de Pandala",46:"Isla de Pandala",47:"Alineamiento",
    48:"Isla de Pandala",49:"Isla de Pandala",50:"Misiones de Mundo",51:"Alineamiento",
    52:"Isla de Frigost",53:"Isla de Pandala",54:"Misiones de Mundo",55:"Misiones de Mundo",
    56:"Isla de Pandala",57:"Isla de Pandala",58:"Misiones de Mundo",59:"Alineamiento",
    60:"Reino de Amakna",61:"Alineamiento",62:"Misiones de Mundo",63:"Isla de Frigost",
    64:"Isla de Pandala",65:"Isla de Pandala",66:"Isla de Pandala",67:"Isla de Pandala",
    68:"Selocalipsis",69:"Archipiélago de Valonia",70:"Archipiélago de Valonia",
    71:"Archipiélago de Valonia",72:"Reino de Amakna",73:"Archipiélago de Valonia",
    74:"Selocalipsis",75:"Selocalipsis",76:"Alineamiento",77:"Misiones de Mundo",
    78:"Misiones de Mundo",79:"Misiones de Mundo",80:"Alineamiento",81:"Isla de Frigost",
    82:"Isla de Frigost",83:"Alineamiento",84:"Isla de Frigost",85:"Misiones de Mundo",
    86:"Archipiélago de Valonia",87:"Alineamiento",88:"Atolón de los Poseídos",
    89:"Pesadilla de los Devastadores",90:"Misiones de Mundo",91:"Selocalipsis",
    92:"Selocalipsis",93:"Misiones de Mundo",94:"Misiones de Mundo",95:"Isla de Frigost",
    96:"Misiones de Mundo",97:"Misiones de Mundo",98:"Selocalipsis",99:"Misiones de Mundo",
    100:"Reino de Amakna",
}
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
