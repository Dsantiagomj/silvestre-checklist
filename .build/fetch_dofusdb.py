"""Download DofusDB reference data (achievements, boss monsters) into .build/data."""
import json, pathlib, time, urllib.request

OUT = pathlib.Path(__file__).parent / "data"
API = "https://api.dofusdb.fr"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "silvestre-checklist/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def page_all(path, query=""):
    rows, skip = [], 0
    while True:
        data = get(f"{API}/{path}?$limit=50&$skip={skip}{query}")
        rows += data["data"]
        skip += 50
        if skip >= data["total"]:
            return rows
        time.sleep(0.05)


for name, path, query in [
    ("achievements", "achievements", ""),
    ("bosses", "monsters", "&isBoss=true"),
    ("dungeons", "dungeons", ""),
    ("quests", "quests", ""),
]:
    rows = page_all(path, query)
    (OUT / f"{name}.json").write_text(json.dumps(rows, ensure_ascii=False))
    print(f"{name}: {len(rows)}")
