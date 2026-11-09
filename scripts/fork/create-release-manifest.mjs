#!/usr/bin/env node
/**
 * P0-08: Describe exactly the bytes of an UNTRUSTED/UNSIGNED fork candidate.
 * This does not sign, auto-publish or generate an updater feed.
 */
import { createHash } from 'node:crypto'
import { readFile, writeFile, realpath, stat } from 'node:fs/promises'
import { resolve, join, relative, isAbsolute, sep } from 'node:path'

const root = resolve(process.cwd())
const destination = resolve(process.argv[2] ?? 'fork/release-candidate')
const inside = (parent, child) => {
  const rel = relative(parent, child)
  return rel && !rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel)
}
if (!inside(root, destination)) throw new Error('Release output must stay within repo workspace')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(pkg.version)) throw new Error('Unsafe version')
const expected = [
  { host: 'electron', name: `xmcl-${pkg.version}-electron-win64-portable.zip`, packaging: 'portable-zip' },
  { host: 'deskgap', name: `xmcl-deskgap-${pkg.version}-win32-x64.exe`, packaging: 'click-to-run-preview-exe' },
]
const files = []
for (const entry of expected) {
  const path = join(destination, entry.name)
  const actual = await realpath(path)
  if (!inside(destination, actual)) throw new Error('Release file escapes output directory: ' + entry.name)
  const info = await stat(path)
  if (!info.isFile() || info.size < 1024) throw new Error('Missing/invalid candidate artifact: ' + entry.name)
  const sha256 = createHash('sha256').update(await readFile(path)).digest('hex')
  files.push({ host: entry.host, name: entry.name, package: entry.packaging, bytes: info.size, sha256, signed: false })
}
const manifest = {
  schemaVersion: 1,
  source: 'Zhanfg/x-minecraft-launcher',
  upstreamBaseline: '4aee50aaf1cb7ee741ba995c87017f4dbe85584e',
  revision: process.env.GITHUB_SHA ?? 'local',
  version: pkg.version,
  platform: 'windows-x64',
  status: 'UNSIGNED_TEST_CANDIDATE',
  releaseReady: false,
  automaticUpdatesAllowed: false,
  requiresOfficialMinecraftAuthentication: true,
  notes: [
    'Do not auto-publish, auto-update, or use the upstream Voxelum release endpoint.',
    'DeskGap native code signing and Microsoft login/gameplay tests are still required.',
    'Electron portable ZIP contents must remain together to function.',
  ],
  files,
}
await writeFile(join(destination, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
await writeFile(join(destination, 'SHA256SUMS'), files.map(x => `${x.sha256}  ${x.name}`).join('\n') + '\n')
console.log(`P0-08 unsigned candidate metadata prepared for ${files.length} artifacts`)
