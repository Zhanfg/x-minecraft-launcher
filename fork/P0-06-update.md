# P0-06: incremental update and rollback regression

Upstream already implements `computeFileUpdates` and progressive staging/lock/resume in `InstanceInstallService`. This fork does **not** add a second installer.

The dedicated test job verifies:

1. Initial managed installation adds expected files.
2. Version upgrade keeps stable mods, removes pack-owned retired mods, adds replacements.
3. Player-edited configuration is backed up, while unowned mods and saves never enter the managed deletion plan.
4. Reverse manifest diff plans a rollback.
5. Upstream progressive install tests continue to cover interruption, resume, supersession and final commit guards.

**Important:** this proves the **planning and existing test harness**, not a player-ready rollback UX or a real installer recovery on NTFS. P0-06 remains partial until the smoke pack is installed and updated/rolled back on Windows using a genuine instance.

No game assets, credentials, server address or Android code are involved.
