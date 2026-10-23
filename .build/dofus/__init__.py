"""The Dofus the pipeline builds: its own tables and where its files go.

Every script takes `--dofus <id>` (or the DOFUS environment variable; by default
silvestre). The tables written by hand for that Dofus's guide live in
.build/dofus/<id>.py, loaded here by its path (the scripts run with -I, so this
folder is importable only because each script puts its own folder on sys.path).

  ID      the Dofus id ("silvestre")
  CONFIG  the module .build/dofus/<id>.py
  SRC     src/dofus/<id>/        what the app imports (@dofus): steps.js and the JSON
  LISTS   .build/lists/<id>/     the page snapshot, its compiled list, item_quests.json
  WORK    .build/data/<id>/      intermediate files of this Dofus (step_assets.json);
                                 the raw DofusDB data and the API caches in .build/data/
                                 stay shared by every Dofus
"""
import importlib.util
import os
import pathlib
import sys

BUILD = pathlib.Path(__file__).resolve().parent.parent
ROOT = BUILD.parent
DEFAULT = "silvestre"


def take_arg(argv):
    """The id after --dofus (or in --dofus=<id>), removed from argv so each script keeps
    reading its own arguments as before. None when it is not there."""
    for i, arg in enumerate(argv[1:], 1):
        if arg == "--dofus" and i + 1 < len(argv):
            value = argv[i + 1]
            del argv[i:i + 2]
            return value
        if arg.startswith("--dofus="):
            del argv[i]
            return arg.split("=", 1)[1]
    return None


def known():
    """The ids with a .build/dofus/<id>.py."""
    return sorted(p.stem for p in pathlib.Path(__file__).parent.glob("*.py") if p.stem != "__init__")


def load(dofus_id):
    """The module .build/dofus/<id>.py, loaded by its path."""
    path = pathlib.Path(__file__).parent / f"{dofus_id}.py"
    if dofus_id == "__init__" or not path.is_file():
        raise SystemExit(f"Dofus desconocido: {dofus_id!r} (hay: {', '.join(known())})")
    spec = importlib.util.spec_from_file_location(f"dofus_{dofus_id}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ID = take_arg(sys.argv) or os.environ.get("DOFUS") or DEFAULT
CONFIG = load(ID)
SRC = ROOT / "src" / "dofus" / ID
LISTS = BUILD / "lists" / ID
WORK = BUILD / "data" / ID
