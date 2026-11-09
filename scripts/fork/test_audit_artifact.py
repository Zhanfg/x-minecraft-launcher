import io
import json
import stat
import unittest
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory

from audit_artifact import validate_archive, validate_name

MANIFEST = {
    "formatVersion": 1,
    "game": "minecraft",
    "versionId": "p0",
    "name": "safe",
    "files": [],
    "dependencies": {"minecraft": "1.21.1", "fabric-loader": "0.16.14"},
}

def make_zip(path, extra_name=None, symlink=False):
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("modrinth.index.json", json.dumps(MANIFEST))
        if extra_name is not None:
            info = zipfile.ZipInfo(extra_name)
            if symlink:
                info.create_system = 3
                info.external_attr = (stat.S_IFLNK | 0o777) << 16
            z.writestr(info, "fixture")

class PackAuditTests(unittest.TestCase):
    def test_unsafe_paths_rejected(self):
        for name in ["../x", "/root/x", "C:/private/file", "mods/../token.txt", "config\\x", "saves/World/level.dat", "accounts/profile.json", "ops.json"]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                validate_name(name)

    def test_minimal_valid_pack(self):
        with TemporaryDirectory() as temp:
            path = Path(temp) / "pack.mrpack"
            make_zip(path, "client-overrides/config/smoke.json")
            self.assertEqual(len(validate_archive(path)), 64)

    def test_traversal_entry_is_rejected(self):
        with TemporaryDirectory() as temp:
            path = Path(temp) / "pack.mrpack"
            make_zip(path, "../escape")
            with self.assertRaises(ValueError):
                validate_archive(path)

    def test_symlink_entry_is_rejected(self):
        with TemporaryDirectory() as temp:
            path = Path(temp) / "pack.mrpack"
            make_zip(path, "client-overrides/config/link", symlink=True)
            with self.assertRaises(ValueError):
                validate_archive(path)

    def test_duplicate_entry_is_rejected(self):
        with TemporaryDirectory() as temp:
            path = Path(temp) / "pack.mrpack"
            with zipfile.ZipFile(path, "w") as z:
                z.writestr("modrinth.index.json", json.dumps(MANIFEST))
                z.writestr("modrinth.index.json", json.dumps(MANIFEST))
            with self.assertRaises(ValueError):
                validate_archive(path)

if __name__ == "__main__":
    unittest.main()
