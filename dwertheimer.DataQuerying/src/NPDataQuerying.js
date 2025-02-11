// @flow
/*
TO DO:
- finish the rest of Extended tags in removeExtendedSearchTags()
- /search for match does not work for fuzzy (e.g. @tester)
- make clicking on a link take you to a note with the selection highlighted
- write the database index using cron?
- Remove ...title if it's at the beginning of search results (I tried but it doesn't work)
- THE FUZZY SEARCH SEEMS TO SUCK: title is weighted heavily, but Horizons search brings up soyrizo first
- For fuse refactor writeIndex to get the index and write it
- For FUSE make a version of getMetaData() to use instead of the map to remove hashtags and mentions to skip
- for FUSE index, skip the html files
- for FUSE figure out how to do dates (right now it's ISO)
- Move functions to support directory with tests
- Add config fields/defaults
- Add back in showProgress calls but they trap errors so don't turn on until you know it all works

*/
const OUTPUT_SEARCH_RESULTS = false

// import * as dh from './support/data-helpers'
import * as fh from './support/fuse-helpers'
// import { testDB } from './support/database' //didn't seem to work

import { log, logError, clo, timer, JSP, copyObject } from '../../helpers/dev'
import { formatSearchOutput } from './support/query-helpers'
import pluginJson from '../plugin.json'
// import { HTML5_FMT } from 'moment'

type NoteIndex = {
  hashtags: { [string]: mixed },
  mentions: { [string]: mixed },
}

type NoteIndexType = {
  filename: string,
  title: string,
  content: string,
}

const INDEX_FILENAME = 'fuse-index.json'

const SEARCH_OPTIONS = {
  /* keys: ['type', { name: 'title', weight: 5 }, 'hashtags', 'mentions', 'content', 'filename', 'changedDateISO'],*/
  keys: [
    { name: 'title', weight: 3 },
    { name: 'content', weight: 1 },
  ],
  includeScore: true,
  includeMatches: true,
  useExtendedSearch: true,
  shouldSort: true,
  findAllMatches: true,
}

type TgetNotesForIndex = {
  type: TNote['type'],
  title: TNote['title'],
  hashtags: TNote['hashtags'],
  mentions: TNote['mentions'],
  content: TNote['content'],
  filename: TNote['filename'],
  changedDateISO: string,
}
/**
 * Get a list of notes in a form we can use for FUSE
 * @param {Object} config
 * @returns
 */
function getNotesForIndex(config: DataQueryingConfig): $ReadOnlyArray<TgetNotesForIndex> {
  const consolidatedNotes = [...DataStore.projectNotes, ...DataStore.calendarNotes]
  log(pluginJson, `getNotesForIndex: ${consolidatedNotes.length} notes before eliminating foldersToIgnore: ${config.foldersToIgnore.toString()}`)
  // consolidatedNotes.prototype.changedDateISO = () => this.changedDate.toISOString()
  let foldersToIgnore = config.foldersToIgnore || []
  if (config.searchNoteFolder && Array.isArray(foldersToIgnore)) {
    foldersToIgnore.push(config.searchNoteFolder)
  }
  // log(pluginJson, `getNotesForIndex: ${consolidatedNotes.length} notes before eliminating foldersToIgnore: ${JSON.stringify(foldersToIgnore)} `)
  const cn = consolidatedNotes
    .filter((note) => foldersToIgnore.every((skipFolder) => !note.filename.includes(`${skipFolder}/`)))
    .map((n: TNote): TgetNotesForIndex => {
      return {
        type: n.type,
        title: n.title,
        hashtags: n.hashtags,
        mentions: n.mentions,
        content: n.content,
        filename: n.filename,
        changedDateISO: n.changedDate.toISOString(),
      }
    })

  log(pluginJson, `getNotesForIndex: FollowUp=${cn.filter((n) => n.filename == '_Inbox/FollowUp.md').length}`)
  return cn
  // Note: had to do the map above to get the actual NP objects to be visible in the console
  // May not be necessary in production
  // return includedNotes
}

/**
 * Create searchable (Fuse) index and write it to disk
 * @returns {NoteIndexType | null}
 */
export async function writeIndex(index: any): null | any {
  try {
    // CommandBar.showLoading(true, 'Building search index')
    // await CommandBar.onAsyncThread()
    // const consolidatedNotes = [...DataStore.projectNotes, ...DataStore.calendarNotes].map((note) => ({ ...note, changedDate: note.changedDate.toISOString() }))
    let timeStart = new Date()
    log(pluginJson, `writeIndex: index is of type: "${typeof index}" ; ${JSON.stringify(index).length} char length of index`)
    DataStore.saveJSON(JSON.stringify(index), INDEX_FILENAME)
    let elapsed = timer(timeStart)
    // log(pluginJson, `createIndex: ${includedNotes.length} notes written to disk as ${INDEX_FILENAME} total elapsed: ${elapsed}`)

    // await CommandBar.onMainThread()
    // CommandBar.showLoading(false)
    return index
  } catch (error) {
    clo(error, 'writeIndex: caught error')
    return null
  }
}

// DELETE THIS FUNCTION - THIS WAS A WORKAROUND FOR NOT BEING ABLE TO FORCE A FILENAME
// @EDUARD UPDATED THE API, SO THIS IS NO LONGER NEEDED
// async function getSearchNoteFilename(config: DataQueryingConfig): Promise<string> {
//   let note, fname
//   const { searchNoteTitle, searchNoteFolder } = config
//   note = await DataStore.projectNoteByTitle(searchNoteTitle)
//   if (note?.length) {
//     note.filter((n) => n.filename.includes(searchNoteFolder))
//     if (note && note[0]) {
//       fname = note[0].filename
//     } else {
//       throw 'No note found with title: ' + searchNoteTitle
//     }
//   } else {
//     fname = await DataStore.newNote(searchNoteTitle, searchNoteFolder)
//   }
//   return fname || ''
// }

/**
 * Create Fuse Index of current notes
 * @param {Object} notesToInclude (optional) if you have the cleansed note list, pass it in, otherwise it will be created
 * @returns {FuseIndex}
 */
export async function createIndex(notesToInclude: $ReadOnlyArray<TNote> = [], config: { ... }): Fuse.FuseIndex<mixed> {
  let timeStart = new Date()
  const includedNotes = notesToInclude.length ? notesToInclude : getNotesForIndex(config)
  const index = fh.buildIndex(includedNotes, SEARCH_OPTIONS)
  let elapsed = timer(timeStart)
  log(pluginJson, `createIndex: ${includedNotes.length} notes indexed in: ${elapsed} `)
  return index
}

export async function searchButShowTitlesOnly(linksOnly: boolean = false): Promise<void> {
  try {
    await searchUserInput(true)
  } catch (error) {
    clo(error, 'searchButShowTitlesOnly: caught error')
  }
}

const isCalendarNote = (filename) => (/^[0-9]{8}\.(md|txt)$/.test(filename) ? 'Calendar' : 'Notes')

const getParagraphsContaining = (filename: string, searchTerm: string, config: any): Array<TParagraph> => {
  const cleanSearchTerm = fh.removeExtendedSearchTags(searchTerm)
  const note = DataStore.noteByFilename(filename, isCalendarNote(filename))
  const matches: Array<TParagraph> = []
  note?.paragraphs?.forEach((paragraph) => {
    // Note: FIXME: paragraph.children() will work here, but not later
    if (paragraph.content.includes(cleanSearchTerm)) {
      if (config.includeChildren) {
        matches.push({ ...copyObject(paragraph), children: paragraph.children() })
      } else {
        matches.push(copyObject(paragraph))
      }
    }
  })
  return matches
}

/**
 * Called as a processFunction by searchUserInput function
 * @param {*} results
 * @param {*} searchTerm
 * @param {*} config
 */
export async function outputMatchingLines(results: Array<any>, searchTerm: string, config: DataQueryingConfig): Promise<void> {
  // clo(results, 'outputMatchingLines: results')
  const filenames = results.map((result) => result.item.filename).sort()
  clo(filenames, 'outputMatchingLines: filenames:')
  let allMatchingLines = []
  for (let filename of filenames) {
    const res = getParagraphsContaining(filename, searchTerm, { ...config, includeChildren: true })
    if (res?.length) {
      allMatchingLines.push(...res)
    }
  }
  // TODO: figure out how to deal with Extended Search delmiters
  // clo(allMatchingLines, 'outputMatchingLines: allMatchingLines (note that Extended Searches will currently mess it all up):')
  allMatchingLines.forEach((line) => {
    log(pluginJson, `${line.content} | children: ${line.children.length}`)
  })
}

export async function searchMatchingLines() {
  const res = await searchUserInput(false, [], { processFunction: outputMatchingLines, processParams: {} })
}

export async function searchSaveUserInput() {
  try {
    await searchUserInput(false, [], { saveSearchResults: true })
  } catch (error) {
    log(pluginJson, 'searchSaveUserInput: caught error: ' + error)
  }
}

export async function searchUserInput(linksOnly: boolean = false, notesToInclude: any = [], options: any = {}): Promise<void> {
  const processFunction = options.processFunction || writeSearchNote
  const processParams = options.processParams || {}
  try {
    const start = new Date()
    const config = { ...getDefaultConfig(), ...options }
    // Get the promises, not the results
    const promSearchTerm = CommandBar.showInput("'=match-exactly; !=NOT; space=AND; |=OR", 'Search for: %@')
    await CommandBar.onAsyncThread()
    const innerStart = new Date()
    const includedNotes = notesToInclude.length ? notesToInclude : getNotesForIndex(config)
    log(pluginJson, `searchUserInput: build note list took: ${timer(innerStart)}`)
    const promIndex = createIndex(includedNotes, config)
    await CommandBar.onMainThread()
    promSearchTerm.then((searchTerm) => {
      promIndex.then(async (index) => {
        CommandBar.showLoading(true, `Searching ${DataStore.projectNotes.length} notes and attachments...`)
        await CommandBar.onAsyncThread()
        log(pluginJson, `searchUserInput: index records.length: ${String(index?.records?.length)}`)
        log(pluginJson, `searchUserInput: searchTerm=${searchTerm}`)
        const results = await search(searchTerm, config, index, includedNotes)
        await CommandBar.onMainThread()
        CommandBar.showLoading(false)
        await processFunction(results, searchTerm, { ...config, ...processParams })
        log(pluginJson, `searchUserInput: opened search note`)
        log(pluginJson, `searchUserInput: TRT=${timer(start)} (including user typing time)`)
      })
    })
    // clo(config, 'searchUserInput: config')
  } catch (error) {
    log(pluginJson, `searchUserInput: caught error: ${error}`)
  }
}

async function writeSearchNote(results, searchTerm, config) {
  const start = new Date()
  CommandBar.showLoading(true, `Found ${results.length} results; Waiting for NotePlan to display them.`)
  await CommandBar.onAsyncThread()
  const output = formatSearchOutput(results, searchTerm, config)
  const splits = output.split('\n')
  const firstLineLength = splits[0].length + 1
  let searchFilename, note
  const filename = `${config.searchNoteTitle}.${DataStore.defaultFileExtension}`
  searchFilename = config.saveSearchResults
    ? DataStore.newNoteWithContent(output, config.searchNoteFolder)
    : DataStore.newNoteWithContent(output, config.searchNoteFolder, filename)
  log(pluginJson, `writeSearchNote: searchFilename: "${searchFilename}" | filename: "${filename}"`)
  if (searchFilename) {
    await Editor.openNoteByFilename(searchFilename, config.openInNewWindow, firstLineLength, firstLineLength, config.openInSplitView)
  } else {
    log(pluginJson, `writeSearchNote: searchFilename is undefined`)
  }
  await CommandBar.onMainThread()
  CommandBar.showLoading(false)
  console.log(`searchUserInput: Noteplan opening/displaying search results took: ${timer(start)}`)
}

export async function search(pattern: string = `Cava`, config: DataQueryingConfig = getDefaultConfig(), pIndex?: number, notes?: $ReadOnlyArray<TNote>): Promise<any> {
  try {
    // CommandBar.showLoading(true, `Searching ${DataStore.projectNotes.length} notes and attachments...`)
    // await CommandBar.onAsyncThread()
    let index = pIndex ?? null
    let timeStart = new Date()
    if (config.loadIndexFromDisk) {
      try {
        index = DataStore.loadJSON(INDEX_FILENAME)
      } catch (error) {
        clo(error, 'search: caught error')
      }
    }
    // const consolidatedNotes = [...DataStore.projectNotes, ...DataStore.calendarNotes].map((note) => ({ ...note, changedDate: note.changedDate.toISOString() }))
    const includedNotes = notes ?? getNotesForIndex(config)
    let results = []
    if (index) {
      results = fh.searchIndex(includedNotes, pattern, { options: SEARCH_OPTIONS, index })
    } else {
      results = fh.search(includedNotes, pattern, SEARCH_OPTIONS)
    }
    log(pluginJson, `search for ${pattern} took: ${timer(timeStart)} including load/index; returned ${results.length} results`)
    // if (OUTPUT_SEARCH_RESULTS) {
    //   // for debugging
    //   // clo(results[0] || '', `search: results:${results.length} results[0] example full`)
    //   // results.forEach((item, i) => {
    //   //   // clo(item.item, `search: result(${i}) matches:${item.matches.length} score:${item.score}`)
    //   // })
    // }
    return results
  } catch (error) {
    log(pluginJson, `search: caught error: ${error}`)
    return []
  }
}

export async function buildIndex(): Promise<void> {
  try {
    const timeStart = new Date()
    const config = getDefaultConfig()

    let noteIndex = getInitialIndex()

    const projectNotes = getNotes(false)
    const calendarNotes = getNotes(true)
    const notes = [...projectNotes, ...calendarNotes]
    // clo(projectNotes[0], 'projectNotes[0]')
    // clo(calendarNotes[0], 'calendarNotes[0]')

    log(`Notes.length = ${notes.length}`)
    noteIndex = buildIndexFromNotes(notes, noteIndex, config)
    // clo(noteIndex, 'noteIndex')
    log(pluginJson, `^^^^ buildIndex: \nnoteIndex.hashtags (${Object.keys(noteIndex.hashtags).length}):\n${metaListKeys(noteIndex.hashtags)}`)
    log(pluginJson, `^^^^ buildIndex: \nnoteIndex.mentions (${Object.keys(noteIndex.mentions).length}):\n${metaListKeys(noteIndex.mentions)}`)

    Editor.insertTextAtCursor(`Elapsed time: ${timer(timeStart)}`)
  } catch (error) {
    clo(error, 'buildIndex: caught error')
  }
}

function getInitialIndex(): NoteIndex {
  return { hashtags: {}, mentions: {} }
}

/**
 * Search an array to compare a string to an array of strings using regex
 * NOTE: the array items are the regexes (not the needle)
 * @param {*} needle - the single value to compare
 * @param {*} haystack - the array of string/regexes to compare against
 * @returns
 */
export function existsInArray(needle: string, haystackArrOfRegexes: Array<string>): boolean {
  const found = haystackArrOfRegexes.filter((elem) => {
    const expr = new RegExp(elem, 'gi')
    expr.test(needle)
  })
  return found.length > 0
}

// Temp for debugging
function metaListKeys(inArray) {
  const outArray = []
  Object.keys(inArray).forEach((key) => {
    // $FlowIgnore
    outArray.push(`${key} (${inArray[key]?.length})`)
  })
  return outArray.sort().join('\n')
}

/**
 * Given one note, adds to the index for mType (e.g. hashtags or mentions)
 * @param {*} note
 * @param {*} mType
 * @param {*} noteIndex
 * @returns
 */
function getMetaData(note: TNote, mType: string, noteIndex: NoteIndex, config: DataQueryingConfig): NoteIndex {
  let index: NoteIndex = noteIndex
  let skip = false
  if (/<html>|<!DOCTYPE/i.test(note.title || '') && config.ignoreHTMLfiles) skip = true
  if (note && mType && note[mType]?.length && !skip) {
    note[mType].forEach((item) => {
      if (/@done(.*)/i.test(item) && config.skipDoneMentions) skip = true
      if (mType === 'hashtags' && existsInArray(item, config.hashtagsToSkip)) skip = true
      if (mType === 'mentions' && existsInArray(item, config.mentionsToSkip)) skip = true
      if (item !== '' && !skip) {
        // log(pluginJson, `${mType}:${item}`)
        // clo(index, `getMetaData: index=`)
        if (!index[mType][item]) {
          index[mType][item] = []
        }
        // log(pluginJson, `getMetaData: ${index[mType][item]}`)
        if (Array.isArray(index[mType][item])) {
          // $FlowIgnore
          index[mType][item].push({
            filename: note.filename,
            title: note.title,
            item: item,
            type: note.type,
            changed: note.changedDate || note.createdDate,
          })
        }
        // if (item == '') clo(note[mType], `note[mType][${mType}] ${note.filename}`)
      }
    })
  }
  return index
}

type NoteMetaData = {
  filename: string,
  title: string,
  item: string,
  type: string,
  changed: Date,
}

/**
 * Given an array of notes, populates the index with the details of each note
 * @param {*} notes
 * @param {*} noteIndex
 * @returns
 */
function buildIndexFromNotes(notes: Array<TNote>, noteIndex: NoteIndex, config: DataQueryingConfig): NoteIndex {
  // log(pluginJson, `getNoteDetails()`)
  // clo(noteIndex, 'getNoteDetails: noteIndex=')
  let index = noteIndex
  notes.forEach((note) => {
    index = getMetaData(note, 'hashtags', index, config)
    index = getMetaData(note, 'mentions', index, config)
  })
  return index
}

function getNotes(isCalendar?: boolean = false): $ReadOnlyArray<TNote> {
  return isCalendar ? DataStore.calendarNotes : DataStore.projectNotes
}

function getDefaultConfig(): DataQueryingConfig {
  return {
    foldersToIgnore: ['_resources', '_evernote_attachments', '@Templates', '@Trash', '@Archive', '_TEST', '📋 Templates'],
    ignoreHTMLfiles: true,
    skipDoneMentions: true,
    loadIndexFromDisk: false,
    searchNoteTitle: 'Search Results',
    searchNoteFolder: '@Searches',
    saveSearchResults: false,
    openInSplitView: true,
    openInNewWindow: false,
    maxResultCharsForBolding: 25,
    maxSearchResultLine: 250,
    charsBeforeAndAfter: 50 /* max chars before and after found match */,
    ignoreNewLines: true,
    mentionsToSkip: ['@sleep('], //FIXME: add to config and skipping,
    hashtagsToSkip: ['#🕑'], //FIXME: add to config and skipping
    linksOnly: false,
  }
}

export type DataQueryingConfig = {
  foldersToIgnore: Array<string>,
  ignoreHTMLfiles: boolean,
  skipDoneMentions: boolean,
  loadIndexFromDisk: boolean,
  searchNoteTitle: string,
  searchNoteFolder: string,
  saveSearchResults: boolean,
  openInSplitView: boolean,
  openInNewWindow: boolean,
  maxSearchResultLine: number,
  maxResultCharsForBolding: number,
  charsBeforeAndAfter: number,
  ignoreNewLines: boolean,
  mentionsToSkip: Array<string>,
  hashtagsToSkip: Array<string>,
  linksOnly: boolean,
}
