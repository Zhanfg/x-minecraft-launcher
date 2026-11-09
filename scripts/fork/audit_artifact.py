#!/usr/bin/env python3
"""Conservative read-only audit for Modrinth pack artifacts.

No ZIP extraction, networking, authentication, game installation, or file writes.
"""
import hashlib
import json
import pathlib
import re
import stat
import sys
import zipfile

MAX_ENTRIES = 10000
MAX_ENTRY = 128 * 1024 * 1024
MAX_TOTAL = 512 * 1024 * 1024
MAX_RATIO = 200
SENSITIVE = re.compile(r"(^|/)(?:saves|world|playerdata|screenshots|logs|crash-reports|credentials|accounts|tokens?|usercache\.json|ops\.json|eula\.txt)(?:/|$)|\.(?:pem|pfx|p12|key)$", re.I)

def validate_name(name):
    if not name or "\\" in name or "\x00" in name or name.startswith("/"):
        raise ValueError(f"Unsafe ZIP entry name: {name!r}")
    path = pathlib.PurePosixPath(name)
    if any(p in ("", ".", "..") for p in name.split("/") if p != "" and not name.endswith("/")):
        raise ValueError(f"Unsafe path segments: {name!r}")
    if ".." in path.parts or ":" in path.parts[0] or path.is_absolute():
        raise ValueError(f"Path traversal or drive prefix: {name!r}")
    if SENSITIVE.search(name):
        raise ValueError(f"Private player/server data must not be distributed: {name!r}")

def validate_archive(path):
    with zipfile.ZipFile(path, "r") as archive:
        infos = archive.infolist()
        if len(infos) > MAX_ENTRIES:
            raise ValueError("Too many ZIP entries")
        seen = set()
        total = 0
        for info in infos:
            validate_name(info.filename)
            if info.filename in seen:
                raise ValueError(f"Duplicate ZIP entry: {info.filename}")
            seen.add(info.filename)
            if ((info.external_attr >> 16) & stat.S_IFMT) == stat.S_IFLNK:
                raise ValueError(f"Symlink ZIP entry forbidden: {info.filename}")
            if info.flag_bits & 1:
                raise ValueError("Encrypted ZIP entry is not permitted")
            if info.file_size > MAX_ENTRY:
                raise ValueError(f"Uncompressed ZIP entry too large: {info.filename}")
            total += info.file_size
            if total > MAX_TOTAL:
                raise ValueError("Aggregate uncompressed size exceeds audit limit")
            if info.file_size > 1_048_576 and (info.file_size / max(1, info.compress_size)) > MAX_RATIO:
                raise ValueError(f"Suspicious decompression ratio: {info.filename}")
        if "modrinth.index.json" not in seen:
            raise ValueError("Missing modrinth.index.json")
        manifest = json.loads(archive.read("modrinth.index.json"))
        if manifest.get("formatVersion") != 1 or manifest.get("game") != "minecraft":
            raise ValueError("Invalid Modrinth format")
        deps = manifest.get("dependencies", {})
        if not deps.get("minecraft") or not deps.get("fabric-loader"):
            raise ValueError("Explicit Minecraft and Fabric versions are required")
        files = manifest.get("files", [])
        if not isinstance(files, list):
            raise ValueError("Modrinth files must be a list")
        for file in files:
            name = file.get("path", "")
            validate_name(name)
            if not name.startswith(("mods/", "config/", "resourcepacks/", "shaderpacks/", "libraries/")):
                raise ValueError(f"Unexpected managed file destination: {name}")
            hashes = file.get("hashes") or {}
            if not re.fullmatch("[0-9a-fA-F]{128}", hashes.get("sha512", "")):
                raise ValueError(f"Missing trusted SHA-512 for {name}")
            urls = file.get("downloads") or []
            if not urls or any(not u.startswith("https://") for u in urls):
                raise ValueError(f"Insecure download URLs for {name}")
        if archive.testzip() is not None:
            raise ValueError("ZIP CRC check failed")
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()

def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/fork/audit_artifact.py path/to/modpack.mrpack")
    path = pathlib.Path(sys.argv[1])
    digest = validate_archive(path)
    print(f"P0-07 archive OK: {path.name} sha256={digest}")

if __name__ == "__main__":
    main()
