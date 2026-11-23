import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const load = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'))
const fail = (reason) => { throw new Error(`P0 baseline invalid: ${reason}`) }
const baseline = load('fork/baseline.json')
const project = load('fork/config/project.json')
const main = load('package.json')
const electron = load('xmcl-electron-app/package.json')
const deskgap = load('deskgap-app/package.json')

if (baseline.schemaVersion !== 1 || project.schemaVersion !== 1) fail('Unsupported config schema')
if (baseline.upstream !== 'Voxelum/x-minecraft-launcher' || baseline.fork !== 'Zhanfg/x-minecraft-launcher') fail('Unexpected source repo')
if (!/^[0-9a-f]{40}$/.test(baseline.upstreamCommit)) fail('Upstream baseline is not a 40-hex SHA')
if (!baseline.policy.keepMasterSyncable || !baseline.policy.androidOutOfScope) fail('P0 scope policy changed')
if (typeof main.version !== 'string' || main.private !== true) fail('Unexpected workspace metadata')
if (electron.version !== main.version || !deskgap.config?.deskgapVersion) fail('Incompatible host metadata')
if (project.guardrails.requireMicrosoftAuthentication !== true || project.guardrails.preservePlayerFiles !== true) fail('Safety guardrails disabled')
if (project.distribution.updateFeedUrl !== null && !/^https:\/\//.test(project.distribution.updateFeedUrl)) fail('Update URL must use HTTPS')
if (project.modpack.manifestUrl !== null && !/^https:\/\//.test(project.modpack.manifestUrl)) fail('Manifest URL must use HTTPS')
if (project.server.address !== null && /[\s/@]/.test(project.server.address)) fail('Invalid server address')

try {
  execFileSync('git', ['merge-base', '--is-ancestor', baseline.upstreamCommit, 'HEAD'], { cwd: root, stdio: 'pipe' })
} catch {
  fail('Baseline commit is not an ancestor of HEAD (use fetch-depth: 0)')
}
console.log(`P0 baseline OK: upstream ${baseline.upstreamCommit.slice(0, 12)}, launcher ${main.version}, DeskGap ${deskgap.config.deskgapVersion}`)
