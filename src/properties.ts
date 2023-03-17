/**
 * Wrapper for java properties file contents
 */
export type Properties = {
  /**
   * Plain text unparsed lines.
   */
  lines: string[]
}

/**
 * Key and value pair.
 */
export type KeyValuePair = {
  /**
   * Property key.
   */
  key: string
  /**
   * Property value.
   */
  value: string
}

/**
 * Returns an empty object.
 */
export const empty = (): Properties => ({lines: []})

/**
 * Parses java properties file contents.
 *
 * @param contents Java properties string.
 * @return Parsed configuration.
 */
export const parse = (contents: string): Properties => {
  const lines = contents.split(/\r?\n/)

  // Remove last line, if empty
  if (lines.length > 0 && lines[lines.length - 1].length === 0) {
    lines.pop()
  }

  return {lines}
}

/**
 * Formats java properties file contents.
 *
 * @param config Java properties set.
 * @return Formatted java properties string.
 */
export const stringify = (config: Properties): string => {
  let lines = config.lines

  // Remove leading newlines
  let start = 0
  while (start < lines.length - 1 && lines[start].length === 0) {
    start++
  }
  lines = lines.slice(start)

  // Add trailing newline
  if (lines.length > 0 && lines[lines.length - 1].length !== 0) {
    lines = lines.concat('')
  }

  return lines.join('\n')
}

/**
 * Iterate over all key-value pairs.
 *
 * It ignores malformed lines, no error is thrown.
 *
 * @param config Java properties set.
 */
export function* list(config: Properties): Generator<KeyValuePair> {
  for (const {key, rawValue} of listPairs(config.lines)) {
    yield {key, value: unescapeValue(rawValue)}
  }
}

/**
 * Finds a value for the given key.
 *
 * @param config Java properties set.
 * @param key Key name.
 * @return Found value, or undefined. Value is properly unescaped.
 */
export const get = (config: Properties, key: string): string | undefined => {
  // Find existing
  const {rawValue} = findValue(config.lines, key)
  return typeof rawValue === 'string' ? unescapeValue(rawValue) : undefined
}

/**
 * Loads all defined keys in the Map.
 *
 * If duplicate keys are found, last one is used.
 *
 * @param config Java properties set.
 */
export const toMap = (config: Properties): Map<string, string> => {
  const result = new Map<string, string>()

  for (const {key, rawValue} of listPairs(config.lines)) {
    result.set(key, unescapeValue(rawValue))
  }

  return result
}

/**
 * Set or remove value for the given key.
 *
 * @param config Java properties set.
 * @param key Key name.
 * @param value New value. If undefined or null, key will be removed.
 */
export const set = (
  config: Properties,
  key: string,
  value: string | undefined | null
): void => {
  // Find existing
  const {start, len, sep} = findValue(config.lines, key)

  // Prepare value
  const items =
    typeof value === 'string'
      ? [`${escapeKey(key)}${sep}${escapeValue(value)}`]
      : []

  // If found
  if (start >= 0 && len > 0) {
    // Replace
    config.lines.splice(start, len, ...items)
  } else {
    // Not found, append
    config.lines.push(...items)
  }
}

/**
 * Remove value for the given key.
 *
 * This is alias for `set(config, key, undefined)`.
 *
 * @param config Java properties set.
 * @param key Key name.
 */
export const remove = (config: Properties, key: string): void =>
  set(config, key, undefined)

const findValue = (
  lines: string[],
  key: string
): { start: number; len: number; sep: string; rawValue?: string } => {
  let sep = '='
  for (const entry of listPairs(lines)) {
    // Remember separator
    if (entry.sep) sep = entry.sep
    // Return found value
    if (key === entry.key) {
      return entry
    }
  }

  // Not found
  return {start: -1, len: 0, sep}
}

function* listPairs(lines: string[]): Generator<{
  start: number
  len: number
  sep: string
  key: string
  rawValue: string
}> {
  let i = -1
  while (++i < lines.length) {
    const {key, valueLine, sep} = parseLine(lines[i])

    // Ignore unparsed lines
    if (!key || !sep) continue

    // Slurp multiline
    const start = i
    let rawValue = valueLine
    while (countEndChars(rawValue, '\\') % 2 === 1) {
      rawValue = rawValue.slice(0, -1)
      if (i < lines.length - 1) {
        // NOTE this increments i
        rawValue += trimStartSpaces(lines[++i])
      }
    }
    rawValue = trimEndSpaces(rawValue)

    yield {start, len: i - start + 1, sep, key, rawValue}
  }
}

const trimStartSpaces = (str: string): string => {
  for (let i = 0; i < str.length; i++) {
    if (str.codePointAt(i) !== 32) {
      return i > 0 ? str.slice(i) : str
    }
  }
  return '' // all spaces
}

const trimEndSpaces = (str: string): string => {
  for (let i = str.length - 1; i >= 0; i--) {
    if (str.codePointAt(i) !== 32) {
      return str.slice(0, i + 1)
    }
  }
  return '' // all spaces
}

const countEndChars = (str: string, c: string): number => {
  for (let i = str.length; i > 0; i--) {
    if (str[i - 1] !== c) {
      return str.length - i
    }
  }
  return str.length
}

const parseLine = (
  line: string
): { key: string; valueLine: string; sep: string } => {
  let i = -1

  // Skip start spaces
  while (++i < line.length) {
    if (line[i] !== ' ') break
  }

  // Ignore comments
  if ('#!'.includes(line[i])) {
    return {key: '', valueLine: '', sep: ''}
  }

  // Find end of the key
  let escaped = line[i] === '\\'
  const keyArr: string[] = !escaped ? [line[i]] : []

  while (++i < line.length) {
    const c = line[i]
    // Handle escape sequences
    if (escaped) {
      keyArr.push(unescapeChar(c))
      escaped = false
      continue
    }
    if (c === '\\') {
      escaped = true
      continue
    }

    // Find end of the key
    if (':= '.includes(c)) {
      break
    } else {
      keyArr.push(c)
    }
  }

  const key = keyArr.join('')

  // Skip separator
  const sepStart = i
  let separatorFound = line[i] !== ' '
  while (++i < line.length) {
    const c = line[i]
    // Ignore spaces
    if (c === ' ') continue
    // If non-space separator was not found yet
    if (!separatorFound && ':='.includes(c)) {
      separatorFound = true
    } else {
      // Non-space char found
      break
    }
  }

  // Rest is value
  const sep = line.substring(sepStart, i)
  const valueLine = line.substring(i)
  return {key, valueLine, sep}
}

// Very simple implementation
const unescapeChar = (c: string): string => {
  switch (c) {
    case 'r':
      return '\r'
    case 't':
      return '\t'
    case 'n':
      return '\n'
    case 'f':
      return '\f'
    default:
      return c
  }
}

const unescapeValue = (str: string): string =>
  str.replace(/\\(.)/g, s => unescapeChar(s[1]))

// Very simple implementation, does not handle unicode etc
const escapeValue = (str: string, escapeChars = ''): string => {
  const result: string[] = []
  let escapeNext = str.startsWith(' ') // always escape space at beginning

  for (const char of str) {
    switch (char) {
      case '\\':
        result.push('\\\\')
        break
      case '\r':
        result.push('\\r')
        break
      case '\t':
        result.push('\\t')
        break
      case '\n':
        result.push('\\n')
        break
      case '\f':
        result.push('\\f')
        break
      default:
        if (escapeNext || escapeChars.includes(char)) {
          result.push('\\')
          escapeNext = false
        }

        result.push(char)
        break
    }
  }
  return result.join('')
}

const escapeKey = (str: string): string => escapeValue(str, ' #!:=')
