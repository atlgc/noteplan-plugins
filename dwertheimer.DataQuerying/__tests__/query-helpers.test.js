// USE THIS FOR QUERY LANGUAGE https://github.com/frederickf/bqpjs

import { clo, JSP } from '../../helpers/dev'
import * as qh from '../src/support/query-helpers'

describe('dwertheimer.DataQuerying', () => {
  describe('query-helpers', () => {
    describe('queryToRPN', () => {
      test('should create a parsed query with RPN result', () => {
        const result = qh.queryToRPN(`a OR b`)
        expect(Array.isArray(result)).toEqual(true)
        expect(result.length).toEqual(3)
        expect(result[0].value).toEqual('a')
        expect(result[1].value).toEqual('b')
        expect(result[2].value).toEqual('OR')
      })
      test('should return empty array with bad query', () => {
        const result = qh.queryToRPN(``)
        expect(Array.isArray(result)).toEqual(true)
        expect(result.length).toEqual(0)
      })
    })
    describe('formatSearchOutput', () => {
      test('should format output', () => {
        const results = [
          { item: { title: 'title', filename: 'filename', content: 'irrelevant for this test' }, matches: [{ key: 'key', value: 'value is here', indices: [[0, 1]] }] },
        ]
        const query = 'foo'
        const config = { linksOnly: false, charsBeforeAndAfter: 20, maxSearchResultLine: 50 }
        const result = qh.formatSearchOutput(results, query, config)
        expect(result).toMatch(/### Searching for: "foo"/)
        expect(result).toMatch(/\*\*va\*\*lue is here/)
      })
      test('should work for items with no content (like PDF files)', () => {
        const results = [{ item: { title: 'title', filename: 'filename.pdf' } }]
        const query = 'foo'
        const config = { linksOnly: false, charsBeforeAndAfter: 20, maxSearchResultLine: 50 }
        const result = qh.formatSearchOutput(results, query, config)
        expect(result).toMatch(/### Searching for: "foo"/)
        // expect(result).toMatch(/\[title\]\(noteplan://x-callback-url/openNote?filename=filename\)/)
        expect(result).toEqual('### Searching for: "foo":\n---\n[title](noteplan://x-callback-url/openNote?filename=filename.pdf)\n... File: "title" ...\n---')
      })
      test('should work for items with no content and no title (like PDF files)', () => {
        const results = [{ item: { filename: 'filename.pdf' } }]
        const query = 'foo'
        const config = { linksOnly: false, charsBeforeAndAfter: 20, maxSearchResultLine: 50 }
        const result = qh.formatSearchOutput(results, query, config)
        expect(result).toMatch(/### Searching for: "foo"/)
        // expect(result).toMatch(/\[title\]\(noteplan://x-callback-url/openNote?filename=filename\)/)
        expect(result).toEqual('### Searching for: "foo":\n---\n[undefined](noteplan://x-callback-url/openNote?filename=filename.pdf)\n... File Contents Unreadable ...\n---')
      })
      // test('should get correct match data', () => {
      //   const results = [{ item: { title: 'title', filename: 'filename', content: 'content', matches: [{ key: 'content', value: 'content', indices: [0, 1] }] } }]
      //   const query = 'foo'
      //   const result = qh.formatSearchOutput(results, query)
      //   console.log(result)
      //   expect(result).toMatch(/### Searching for: "foo"/)
      //   // expect(result).toMatch(/\[title\]\(noteplan://x-callback-url/openNote?filename=filename\)/)
      //   expect(result).toMatch(/content/)
      // })
    })

    describe('getSurroundingChars', () => {
      const config = test('should format output with no surrounding chars', () => {
        const res = qh.getSurroundingChars('foo', 0, 2, {
          charsBeforeAndAfter: 0,
          maxSearchResultLine: 20,
        })
        expect(res).toEqual('**foo**')
      })
      test('should work same with 5 before/after', () => {
        const res = qh.getSurroundingChars('foo', 0, 2, {
          charsBeforeAndAfter: 5,
          maxSearchResultLine: 20,
        })
        expect(res).toEqual('**foo**')
      })
      test('should work with text only before', () => {
        const res = qh.getSurroundingChars('so foo', 3, 5, {
          charsBeforeAndAfter: 5,
          maxSearchResultLine: 20,
        })
        expect(res).toEqual('so **foo**')
      })
      test('should work with text only after', () => {
        const res = qh.getSurroundingChars('foo so', 0, 2, {
          charsBeforeAndAfter: 5,
          maxSearchResultLine: 20,
        })
        expect(res).toEqual('**foo** so')
      })
      test('should work with text on both sides', () => {
        const res = qh.getSurroundingChars('do foo so', 3, 5, {
          charsBeforeAndAfter: 5,
          maxSearchResultLine: 20,
        })
        expect(res).toEqual('do **foo** so')
      })
      test('should work with text on both sides', () => {
        const res = qh.getSurroundingChars('987654321foo123456789', 9, 11, {
          charsBeforeAndAfter: 5,
          maxSearchResultLine: 20,
        })
        expect(res).toEqual('54321**foo**12345')
      })
      test('should clip sides, balancing for max output', () => {
        const res = qh.getSurroundingChars('987654321foo123456789', 9, 11, {
          charsBeforeAndAfter: 5,
          maxSearchResultLine: 10,
        })
        expect(res).toEqual('1**foo**1')
      })
    })
  })
})

// describe('dwertheimer.DataQuerying', () => {
//   describe('bqpjs', () => {
//     test('should create basic index per Fuse docs', () => {
//       // $or: [{ $and: [{ content: `'"jumped"` }, { content: `'"log"` }] }, { content: `'#lazy` }],
//       const searchQuery = `("jumped" AND "log" OR ("fred" OR "ethyl") OR "#lazy" AND "sam")`
//       const result = bqpjs(searchQuery)
//       let obje = []
//       let arr = []
//       for (const item of result?.rpn) {
//         if (item.type === 'operator') {
//           const lastTwo = arr.slice(-2)
//           arr = arr.slice(0, -2)
//           const op = getFuseOperator(item.value)
//           if (op && op[0] === '$') {
//             arr.push({ [op]: lastTwo })
//           } else {
//             //TODO: handle non AND/OR operators (NOT and ! etc)
//           }
//         } else {
//           arr.push({ content: item.value }) //Note need to read whether quoted and exact match it
//         }
//       }
//       const rpn = JSP(result.rpn)
//     })
//   })
// })
