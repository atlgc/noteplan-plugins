const { colors, helpers, print, strings, system } = require('@codedungeon/gunner')
const Messenger = require('@codedungeon/messenger')
const appUtils = require('../utils/app')
const pluginRelease = require('./support/plugin-release-np')
const releasePrompts = require('./support/plugin-release/release-prompts')

module.exports = {
  name: 'plugin:release',
  description: 'Releases Plugin to Public Directory',
  disabled: false,
  hidden: false,
  usage: `plugin:release ${colors.magenta('<plugin>')} ${colors.blue('[options]')}`,
  usePrompts: true,
  arguments: {
    plugin: {
      type: 'string',
      aliases: ['p'],
      description: 'Plugin Name',
      required: true,
      prompt: {
        type: 'input',
        description: 'Plugin Name',
        hint: 'e.g., codedungeon.Toolbox',
        required: true,
      },
    },
  },
  flags: {
    force: {
      aliases: ['f'],
      type: 'boolean',
      description: `Force Plugin Publish ${colors.gray('(will ignore all non required validations)')}`,
      required: false,
    },
    noTests: {
      aliases: ['t'],
      type: 'boolean',
      description: `Skip Tests`,
      required: false,
    },
    preview: {
      aliases: ['p'],
      type: 'boolean',
      description: `Show tasks without actually executing them`,
    },
  },

  async execute(toolbox) {
    const args = helpers.getArguments(toolbox.arguments, this, { initializeNullValues: true })

    const pluginName = args.plugin || toolbox.arguments.plugin || null
    const preview = args.preview || false
    const force = args.force || false
    const noTests = args.noTests || false

    const configData = appUtils.getPluginConfig(pluginName)
    const pluginVersion = configData['plugin.version']

    // const pluginJsonFilename = path.resolve(pluginName, 'plugin.json')
    let nextVersion = configData['plugin.version']
    if (!(await pluginRelease.checkVersion(pluginName))) {
      const existingReleaseName = `${pluginName} v${configData['plugin.version']}`
      print.warn(`Release matching ${colors.cyan(existingReleaseName)} has already been published.`, 'HALT')
      print.info(`       https://github.com/NotePlan/plugins/releases/tag/codedungeon.Toolbox-v${nextVersion}`)
      console.log('')
      const version = await releasePrompts.versionPrompt(configData['plugin.version'])
      if (!version) {
        print.warn('Release Cancelled', 'ABORT')
        process.exit()
      } else {
        nextVersion = strings.raw(version)
        if (version === 'Abort') {
          print.warn('Release Cancelled', 'ABORT')
          process.exit()
        }
      }
    }

    const runner = pluginRelease.run(pluginName, nextVersion, args)
  },
}
