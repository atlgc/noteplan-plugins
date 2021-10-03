// @flow

import { debug } from '../../../helpers/general'
import { getOrMakeTemplateFolder } from '../../../nmn.Templates/src/template-folder'
import { parseFirstCodeblock } from './configuration'

import eta from './eta.dev'

import DateHelpers from './DateHelpers'
import TimeHelpers from './TimeHelpers'
import UtilsHelpers from './UtilsHelpers'

const DEFAULT_TEMPLATE_CONFIG = {
  date: {
    now: 'YYYY-MM-DD',
  },
  time: {
    now: 'HH:mm:ss A',
  },
  user: {
    first: '',
    last: '',
  },
}

export default class Templating {
  // default templating config
  static async renderConfig(): Promise<mixed> {
    return {
      varName: 'np',
      parse: {
        exec: '*',
        interpolate: '',
        raw: '',
      },
      autoTrim: false,
      globalAwait: true,
      useWith: true,
    }
  }

  static async templateErrorMessage(method: string = '', message: string = ''): Promise<string> {
    const line = '*'.repeat(message.length + 30)
    console.log(line)
    console.log(`   ERROR`)
    console.log(`   Method: ${method}:`)
    console.log(`   Message: ${message}`)
    console.log(line)
    console.log('\n')
    return `**Error: ${method}**\n- **${message}**`
  }

  static async getTemplate(templateName: string = ''): Promise<string> {
    const selectedTemplate = await DataStore.projectNoteByTitle(templateName, true, false)?.[0]
    const templateContent = selectedTemplate?.content
    if (templateContent == null || templateContent.length === 0) {
      const message = `Template "${templateName}" Not Found or Empty`
      return this.templateErrorMessage('Templating.getTemplate', message)
    }

    return templateContent
  }

  static async render(templateData: string = '', userData: mixed = {}, userOptions: mixed = {}): Promise<string> {
    const s = (data: mixed = {}) => {
      return JSON.stringify(data, null, 4)
    }

    // $FlowFixMe
    const configData = await this.getTemplateConfig()

    const options = { ...{ extended: false, tags: [] }, ...userOptions }

    // $FlowFixMe
    const renderOptions = await this.renderConfig()
    if (options.extended) {
      delete renderOptions.parse
    }

    if (options?.tags?.length > 0) {
      renderOptions.tags = options.tags
    }

    const weather = templateData.includes('web.weather') ? await UtilsHelpers.weather() : ''
    const quote = templateData.includes('web.quote') ? await UtilsHelpers.quote() : ''

    const helpers = {
      date: DateHelpers,
      time: TimeHelpers,
      note: {},
      utils: UtilsHelpers,
      user: {
        first: configData?.templates?.user?.first || '',
        last: configData?.templates?.user?.last || '',
        email: configData?.templates?.user?.email || '',
        phone: configData?.templates?.user?.phone || '',
      },
      web: {
        quote: () => {
          return quote
        },
        weather: () => {
          return weather.replace('\n', '')
        },
      },
    }

    const renderData = {
      ...helpers,
      ...userData,
    }

    try {
      let result = eta.render(templateData, renderData, renderOptions)
      result = result.replaceAll('undefined', '')

      return result
    } catch (err) {
      return this.templateErrorMessage('Templating.render', err.message)
    }
  }

  static async getTemplateConfig(): Promise<mixed> {
    const templateFolder = await getOrMakeTemplateFolder()
    const configFile = DataStore.projectNotes
      // $FlowIgnore[incompatible-call]
      .filter((n) => n.filename?.startsWith(templateFolder))
      .find((n) => !!n.title?.startsWith('_configuration'))

    const content: ?string = configFile?.content
    if (content == null) {
      return {}
    }

    const firstCodeblock = content.split('\n```')[1]

    return await parseFirstCodeblock(firstCodeblock)
  }
}
