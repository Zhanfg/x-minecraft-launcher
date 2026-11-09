#!/usr/bin/env python3
"""Build a deterministic, redistributable Modrinth-format Fabric smoke pack.

Only original metadata and an original no-code Fabric client mod are embedded.
No Minecraft, Fabric or third-party JARs are downloaded or redistributed.
"""
import hashlib
import io
import json
import pathlib
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
SPEC = json.loads((ROOT / "fork/modpack/fixture/pack.json").read_text(encoding="utf-8"))
DEST = ROOT / "fork/modpack/fixture/dist"
STAMP = (2024, 1, 1, 0, 0, 0)

def compact(data):
    return (json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")

def archive(files):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for path, content in sorted(files.items()):
            if path.startswith("/") or ".." in pathlib.PurePosixPath(path).parts or "\\" in path:
                raise ValueError(f"Unsafe archive path: {path}")
            info = zipfile.ZipInfo(path, date_time=STAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, content)
    return buffer.getvalue()

def must(condition, message):
    if not condition:
        raise ValueError(message)

must(SPEC["schemaVersion"] == 1, "Unknown fixture schema")
must(SPEC["minecraft"] == "1.21.1" and SPEC["fabricLoader"] == "0.16.14", "Rebaseline deliberately")
must(SPEC["resourcePackFormat"] == 34, "Fixture resource pack format has changed")

mod = archive({
    "fabric.mod.json": compact({
        "schemaVersion": 1,
        "id": "p0_client_smoke",
        "version": "0.1.0",
        "name": "P0 Client Smoke",
        "description": "Original metadata-only client fixture. Contains no Java code.",
        "environment": "client",
        "license": "MIT",
    }),
    "assets/p0_client_smoke/readme.txt": b"P0 client-only fixture; no game code.\n",
})
resource = archive({
    "pack.mcmeta": compact({"pack": {"pack_format": SPEC["resourcePackFormat"], "description": "P0 smoke resources"}}),
})
metadata = {
    "formatVersion": 1,
    "game": "minecraft",
    "versionId": SPEC["id"] + "-" + SPEC["packVersion"],
    "name": SPEC["name"],
    "summary": "Minimal legally redistributable Fabric smoke pack for XMCL install testing.",
    "files": [],
    "dependencies": {
        "minecraft": SPEC["minecraft"],
        "fabric-loader": SPEC["fabricLoader"],
    },
}
pack = archive({
    "modrinth.index.json": compact(metadata),
    "client-overrides/mods/p0-client-smoke.jar": mod,
    "client-overrides/resourcepacks/p0-smoke-resources.zip": resource,
    "client-overrides/config/p0-smoke.json": compact({"schemaVersion": 1, "smoke": True}),
})
def verify(payload):
    with zipfile.ZipFile(io.BytesIO(payload)) as z:
        must(z.testzip() is None, "ZIP CRC mismatch")
        names = set(z.namelist())
        must("modrinth.index.json" in names, "Missing mrpack manifest")
        must(all(not n.startswith("/") and ".." not in pathlib.PurePosixPath(n).parts and "\\" not in n for n in names), "Unsafe ZIP paths")
        parsed = json.loads(z.read("modrinth.index.json"))
        must(parsed["dependencies"] == metadata["dependencies"], "Wrong Minecraft/Fabric pin")
        must(parsed["files"] == [], "Smoke pack must not include remote proprietary assets")
        with zipfile.ZipFile(io.BytesIO(z.read("client-overrides/mods/p0-client-smoke.jar"))) as jar:
            m = json.loads(jar.read("fabric.mod.json"))
            must(m["environment"] == "client" and m["id"] == "p0_client_smoke", "Wrong Fabric mod side")
        with zipfile.ZipFile(io.BytesIO(z.read("client-overrides/resourcepacks/p0-smoke-resources.zip"))) as r:
            m = json.loads(r.read("pack.mcmeta"))
            must(m["pack"]["pack_format"] == 34, "Wrong resource pack format")
        must("client-overrides/config/p0-smoke.json" in names, "Missing config override")
    return hashlib.sha256(payload).hexdigest()

digest = verify(pack)
if "--check" in sys.argv:
    print("P0-04 fixture validation OK", digest)
else:
    DEST.mkdir(parents=True, exist_ok=True)
    output = DEST / (metadata["versionId"] + ".mrpack")
    output.write_bytes(pack)
    (DEST / "SHA256SUMS").write_text(digest + "  " + output.name + "\n", encoding="utf-8")
    print("Wrote", output, "SHA256", digest)
