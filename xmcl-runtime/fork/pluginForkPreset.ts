import { commands, defineCommand, LaunchInstanceInputSchema } from '@xmcl/runtime-api'
import type { LauncherAppPlugin } from '../app'
import projectConfig from '../../fork/config/project.json'
import { resolveServerPreset } from './serverPreset'

/**
 * Register before pluginCli so the fork CLI is recognized on the first process
 * launch, including when Electron/DeskGap starts with a deferred window.
 *
 * Does NOT touch saved accounts, instance files, or the server list. Official
 * authentication and Minecraft install remain with upstream instance.launch.
 */
export const pluginForkPreset: LauncherAppPlugin = () => {
  if (commands.has('fork.launch')) return
  commands.register(defineCommand({
    id: 'fork.launch',
    title: 'Launch Fork Server',
    description: 'Launch a configured instance and join the selected fork server.',
    category: 'instance',
    input: LaunchInstanceInputSchema.pick({ instance: true }).partial(),
    cli: { name: 'fork launch', positionals: ['instance'] },
    ui: { icon: 'play_arrow' },
    async handler(input, ctx) {
      const preset = resolveServerPreset(projectConfig, input.instance)
      return commands.dispatch('instance.launch', {
        instance: preset.instance,
        side: 'client',
        server: preset.server,
      }, ctx)
    },
  }))
}
