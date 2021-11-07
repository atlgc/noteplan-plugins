/* eslint-disable */

import colors from 'chalk'
import DateModule from '../lib/support/modules/DateModule'
import moment from 'moment'

const PLUGIN_NAME = `📙 ${colors.yellow('np.Templating')}`
const section = colors.blue

describe(`${PLUGIN_NAME}`, () => {
  describe(section('DateModule'), () => {
    it(`should render .now`, async () => {
      const result = new DateModule().now()
      expect(result).toEqual(moment(new Date()).format('YYYY-MM-DD'))
    })

    it(`should render .now using 'short' format`, () => {
      const result = new DateModule().now('short')

      const test = new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(new Date())

      expect(result).toEqual(test)
    })

    it(`should render .now using 'medium' format`, () => {
      const result = new DateModule().now('medium')

      const test = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date())

      expect(result).toEqual(test)
    })

    it(`should render .now using 'long' format`, () => {
      const result = new DateModule().now('long')

      const test = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date())

      expect(result).toEqual(test)
    })

    it(`should render .now using 'full' format`, () => {
      const result = new DateModule().now('full')

      const test = new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date())

      expect(result).toEqual(test)
    })

    it(`should render .now using custom format`, async () => {
      const result = new DateModule().now('YYYY-MM')
      expect(result).toEqual(moment(new Date()).format('YYYY-MM'))
    })

    it(`should render .now using configuration`, async () => {
      const testConfig = {
        defaultFormats: {
          date: 'YYYY-MM',
        },
      }
      const result = new DateModule(testConfig).now()
      expect(result).toEqual(moment(new Date()).format('YYYY-MM'))
    })

    it(`should render .now using positive offset`, async () => {
      const result = new DateModule().now('', 7)

      const assertValue = moment(new Date()).add(7, 'days').format('YYYY-MM-DD')

      expect(result).toEqual(assertValue)
    })

    it(`should render .now using negative offset`, async () => {
      const result = new DateModule().now('', -7)

      const assertValue = moment(new Date()).subtract(7, 'days').format('YYYY-MM-DD')

      expect(result).toEqual(assertValue)
    })

    it(`should render today`, async () => {
      const result = new DateModule().today()

      expect(result).toEqual(moment(new Date()).format('YYYY-MM-DD'))
    })

    it(`should render today w/ custom format`, async () => {
      const result = new DateModule({ defaultFormats: { date: 'short' } }).today()

      expect(result).toEqual(moment(new Date()).format('MM/D/YY'))
    })

    it(`should render yesterday`, async () => {
      const result = new DateModule().yesterday()

      const assertValue = moment(new Date()).subtract(1, 'days').format('YYYY-MM-DD')

      expect(result).toEqual(assertValue)
    })

    it(`should render yesterday w/ intl format`, async () => {
      const result = new DateModule({ defaultFormats: { date: 'short' } }).yesterday()

      const assertValue = moment(new Date()).subtract(1, 'days').format('MM/D/YY')

      expect(result).toEqual(assertValue)
    })

    it(`should render yesterday w/ custom format`, async () => {
      const result = new DateModule({ defaultFormats: { date: 'short' } }).yesterday('YYYY/MM/DD')

      const assertValue = moment(new Date()).subtract(1, 'days').format('YYYY/MM/DD')

      expect(result).toEqual(assertValue)
    })

    it(`should render tomorrow`, async () => {
      const result = new DateModule().tomorrow()

      const assertValue = moment(new Date()).add(1, 'days').format('YYYY-MM-DD')

      expect(result).toEqual(assertValue)
    })

    it(`should render tomorrow w/ intl format`, async () => {
      const result = new DateModule({ defaultFormats: { date: 'short' } }).tomorrow()

      const assertValue = moment(new Date()).add(1, 'days').format('MM/D/YY')

      expect(result).toEqual(assertValue)
    })

    it(`should render tomorrow w/ custom format`, async () => {
      const result = new DateModule({ defaultFormats: { date: 'short' } }).tomorrow('YYYY/MM/DD')

      const assertValue = moment(new Date()).add(1, 'days').format('YYYY/MM/DD')

      expect(result).toEqual(assertValue)
    })

    it(`should render weekday (this monday)`, async () => {
      const result = new DateModule().weekday('', 0)

      const assertValue = moment(new Date()).weekday(0).format('YYYY-M-DD')

      expect(result).toEqual(assertValue)
    })

    it(`should render true if weekend`, async () => {
      const result = new DateModule().isWeekend('10-16-2021')

      expect(result).toEqual(true)
    })

    it(`should render false if not weekend`, async () => {
      const result = new DateModule().isWeekend('10-15-2021')

      expect(result).toEqual(false)
    })

    it(`should render true if weekday`, async () => {
      const result = new DateModule().isWeekday('10-15-2021')

      expect(result).toEqual(true)
    })

    it(`should render true if weekday`, async () => {
      const result = new DateModule().isWeekday('2021-10-13')

      expect(result).toEqual(true)
    })

    it(`should format supplied date`, async () => {
      const result = new DateModule().format('YYYY-MM', '2021-10-16')

      const assertValue = moment('2021-10-16').format('YYYY-MM')

      expect(result).toEqual(assertValue)
    })

    it('should calculate week of based on current date', async () => {
      let result = new DateModule().weekOf()

      const startDate = new DateModule().weekday('YYYY-MM-DD', 0)
      const endDate = new DateModule().weekday('YYYY-MM-DD', 6)

      expect(result).toEqual(`${startDate} to ${endDate}`)
    })
  })
})
