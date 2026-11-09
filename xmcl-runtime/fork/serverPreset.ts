/** Fork-only, pure server preset resolver. No network or file-system side effects. */
export interface ForkServerConfiguration {
  modpack: { instanceId?: string | null }
  server: { displayName?: string | null; address?: string | null }
  guardrails: { requireMicrosoftAuthentication: boolean }
}

export function parseServerHost(address: string): { host: string; port?: number } {
  const value = address.trim()
  if (!value || /[\s/@#?\\]/.test(value) || value.includes('://')) {
    throw new Error('Invalid configured Minecraft server address')
  }
  let host: string
  let portText: string | undefined
  if (value.startsWith('[')) {
    const match = /^\[([0-9A-Fa-f:.]+)\](?::(\d{1,5}))?$/.exec(value)
    if (!match || !match[1].includes(':')) throw new Error('Invalid bracketed IPv6 address')
    host = '[' + match[1] + ']'
    portText = match[2]
  } else {
    const match = /^([a-zA-Z0-9._-]+)(?::(\d{1,5}))?$/.exec(value)
    if (!match) throw new Error('Invalid hostname or IPv4 address')
    host = match[1]
    portText = match[2]
  }
  if (portText !== undefined) {
    const port = Number(portText)
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port out of range')
    return { host, port }
  }
  return { host }
}

export function resolveServerPreset(config: ForkServerConfiguration, requestedInstance?: string) {
  if (!config.guardrails.requireMicrosoftAuthentication) throw new Error('Official authentication guardrail must remain enabled')
  const name = (requestedInstance ?? config.modpack.instanceId ?? '').trim()
  if (!name || name.length > 256) throw new Error('Choose a valid instance name or configure fork.modpack.instanceId')
  const address = config.server.address
  if (!address) throw new Error('Fork server address is not configured in fork/config/project.json')
  return { instance: name, server: parseServerHost(address) }
}


/** Reject offline and third-party accounts for a server that expects an official login. */
export function requireOfficialMinecraftUser(user: {
  id: string
  authority: string
  invalidated: boolean
  selectedProfile: string
  profiles: Record<string, unknown>
}): string {
  if (user.authority !== 'x://microsoft') throw new Error('A Microsoft Minecraft account is required for fork server launch')
  if (user.invalidated || !user.selectedProfile || !user.profiles[user.selectedProfile]) {
    throw new Error('The Microsoft Minecraft profile must be selected and reauthenticated')
  }
  return user.id
}
