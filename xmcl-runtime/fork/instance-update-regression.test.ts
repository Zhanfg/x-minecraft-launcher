import { createHash } from 'node:crypto'
import { join, sep } from 'node:path'
import type { InstanceFile } from '@xmcl/instance'
import { computeFileUpdates } from '@xmcl/instance'
import { describe, expect, it } from 'vitest'

const ROOT = join(process.cwd(), '.fork-p0-06-smoke')
const sha1 = (content: string) => createHash('sha1').update(content).digest('hex')
const entry = (path: string, content: string): InstanceFile => ({
  path,
  hashes: { sha1: sha1(content) },
  size: Buffer.byteLength(content),
})

function fakeFs(disk: Record<string, { content: string; mtime: number }>) {
  const memo = new WeakMap<object, string>()
  const toRelative = (path: string) => path.slice(ROOT.length + 1).split(sep).join('/')
  return {
    async getFile(path: string) {
      const known = disk[toRelative(path)]
      if (!known) return undefined
      const result = { size: Buffer.byteLength(known.content), mtime: known.mtime }
      memo.set(result, known.content)
      return result
    },
    async getSha1(_instance: string, file: { size: number; mtime: number }) {
      return sha1(memo.get(file) ?? '')
    },
    async getCrc32() {
      return 0
    },
    async getChecksum(_instance: string, file: { size: number; mtime: number }, algorithm: string) {
      return createHash(algorithm).update(memo.get(file) ?? '').digest('hex')
    },
  }
}

const old = [
  entry('mods/stable.jar', 'stable-v1'),
  entry('mods/removed.jar', 'removed-v1'),
  entry('config/client.json', 'publisher-v1'),
]
const next = [
  entry('mods/stable.jar', 'stable-v1'),
  entry('mods/new.jar', 'added-v2'),
  entry('config/client.json', 'publisher-v2'),
]

describe('P0-06 managed Fabric instance update plan', () => {
  it('first-install adds required managed files, without inventing user files', async () => {
    const updates = await computeFileUpdates(ROOT, [], old, undefined, fakeFs({}))
    expect(updates.map(u => [u.file.path, u.operation])).toEqual([
      ['mods/stable.jar', 'add'],
      ['mods/removed.jar', 'add'],
      ['config/client.json', 'add'],
    ])
  })

  it('preserves user-edited config and unowned mods during upgrade', async () => {
    const fs = fakeFs({
      'mods/stable.jar': { content: 'stable-v1', mtime: 100 },
      'mods/removed.jar': { content: 'removed-v1', mtime: 100 },
      'config/client.json': { content: 'user-custom-settings', mtime: 500 },
      'mods/user-owned.jar': { content: 'user-mod', mtime: 500 },
      'saves/World/level.dat': { content: 'my world', mtime: 500 },
    })
    const updates = await computeFileUpdates(ROOT, old, next, 200, fs)
    const plan = Object.fromEntries(updates.map(u => [u.file.path, u.operation]))
    expect(plan).toMatchObject({
      'mods/stable.jar': 'keep',
      'mods/removed.jar': 'remove',
      'mods/new.jar': 'add',
      'config/client.json': 'backup-add',
    })
    expect(plan['mods/user-owned.jar']).toBeUndefined()
    expect(plan['saves/World/level.dat']).toBeUndefined()
  })

  it('plans inverse operations when rolling back a clean upgrade', async () => {
    const fs = fakeFs({
      'mods/stable.jar': { content: 'stable-v1', mtime: 100 },
      'mods/new.jar': { content: 'added-v2', mtime: 100 },
      'config/client.json': { content: 'publisher-v2', mtime: 100 },
    })
    const reversed = await computeFileUpdates(ROOT, next, old, 200, fs)
    const plan = Object.fromEntries(reversed.map(u => [u.file.path, u.operation]))
    expect(plan).toMatchObject({
      'mods/stable.jar': 'keep',
      'mods/new.jar': 'remove',
      'mods/removed.jar': 'add',
      'config/client.json': 'add',
    })
  })

  it('backs up a modified removed file instead of deleting it', async () => {
    const fs = fakeFs({ 'mods/removed.jar': { content: 'user-replaced', mtime: 500 } })
    const changes = await computeFileUpdates(ROOT, [old[1]], [], 200, fs)
    expect(changes[0].operation).toBe('backup-remove')
  })
})
