import { describe, expect, it } from 'vitest'
import { parseServerHost, resolveServerPreset, type ForkServerConfiguration } from './serverPreset'

const base: ForkServerConfiguration = {
  modpack: { instanceId: 'Fabric Test' },
  server: { displayName: 'Test', address: 'play.example.org:25566' },
  guardrails: { requireMicrosoftAuthentication: true },
}

describe('P0-05 fork server preset', () => {
  it('parses a hostname and non-default port', () => {
    expect(parseServerHost('play.example.org:25566')).toEqual({ host: 'play.example.org', port: 25566 })
  })
  it('parses IPv6 with brackets without splitting the address', () => {
    expect(parseServerHost('[::1]:25565')).toEqual({ host: '[::1]', port: 25565 })
  })
  it('rejects URL/path injection and invalid port values', () => {
    for (const value of ['https://example.org', 'evil.com/abc', 'evil.com@host', 'abc:0', 'abc:65536', 'bad host']) {
      expect(() => parseServerHost(value)).toThrow()
    }
  })
  it('uses the pinned instance but permits an explicit valid instance name', () => {
    expect(resolveServerPreset(base)).toEqual({ instance: 'Fabric Test', server: { host: 'play.example.org', port: 25566 } })
    expect(resolveServerPreset(base, 'Custom')).toEqual({ instance: 'Custom', server: { host: 'play.example.org', port: 25566 } })
  })
  it('refuses to launch with a missing server or disabled official auth', () => {
    expect(() => resolveServerPreset({ ...base, server: { address: null } })).toThrow(/not configured/)
    expect(() => resolveServerPreset({ ...base, guardrails: { requireMicrosoftAuthentication: false } })).toThrow(/authentication/)
  })
})
