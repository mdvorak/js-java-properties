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
 * Byte-order mark.
 */
export const BOM = 0xfeff

/**
 * Parses java properties file contents.
 *
 * @param contents Java properties string.
 * @return Parsed configuration.
 */
export const parse = (contents: string): Properties => {
  // NOTE all line separators are valid - LF, CRLF, CR
  const lines = contents.split(/\r\n|\r|\n/)

  // Remove last line, if empty
  if (lines.length > 0 && lines[lines.length - 1].length === 0) {
    lines.pop()
  }

  // Remove BOM from the first line
  if (lines.length > 0 && lines[0].codePointAt(0) === BOM) {
    lines[0] = lines[0].slice(1)
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
export function* listProperties(config: Properties): Generator<KeyValuePair> {
  for (const {key, value} of listPairs(config.lines)) {
    yield {key, value}
  }
}

/**
 * Finds a value for the given key.
 *
 * Note that this method has O(n) complexity. If you want to read the file
 * effectively, use `toObject` or `toMap` functions.
 *
 * @param config Java properties set.
 * @param key Key name.
 * @return Found value, or undefined. Value is properly unescaped.
 */
export const getProperty = (
  config: Properties,
  key: string
): string | undefined => {
  let value: string | undefined = undefined

  // Find last value
  for (const entry of listPairs(config.lines)) {
    // If found, remember it
    if (key === entry.key) {
      value = entry.value
    }
  }

  return value
}

/**
 * Loads all defined keys in the Object.
 *
 * If duplicate keys are found, last one is used.
 *
 * @param config Java properties set.
 */
export const toObject = (config: Properties): Record<string, string> => {
  const result: Record<string, string> = {}

  for (const {key, value} of listPairs(config.lines)) {
    result[key] = value
  }

  return result
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

  for (const {key, value} of listPairs(config.lines)) {
    result.set(key, value)
  }

  return result
}

/**
 * Format key-value pair as a single line.
 *
 * @param key Key, can be empty string.
 * @param value Value, can be empty string.
 * @param sep Separator, cannot be empty. Valid chars are ` :=`.
 * @param escapeUnicode Enable/disable unicode escaping.
 */
const formatLine = (
  key: string,
  value: string,
  sep: string,
  escapeUnicode: boolean
) =>
  `${escapeKey(key, escapeUnicode)}${sep}${escapeValue(value, escapeUnicode)}`

/**
 * Set or remove value for the given key.
 *
 * @param config Java properties set.
 * @param key Key name.
 * @param value New value. If undefined or null, key will be removed.
 * @param options Optionally override set behavior.
 */
export const setProperty = (
  config: Properties,
  key: string,
  value: string | undefined | null,
  options?: {separator?: string}
): void => {
  const escapeUnicode = true
  let sep = options?.separator || '='
  let found = false

  // Find all entries
  for (const entry of listPairs(config.lines)) {
    // Remember separator
    if (!options?.separator && entry.sep) sep = entry.sep

    // If found, either replace or remove
    if (key === entry.key) {
      const items =
        !found && typeof value === 'string'
          ? [formatLine(key, value, sep, escapeUnicode)]
          : []

      config.lines.splice(entry.start, entry.len, ...items)
      found = true
    }
  }

  // Not found, append
  if (!found && typeof value === 'string') {
    config.lines.push(formatLine(key, value, sep, escapeUnicode))
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
export const removeProperty = (config: Properties, key: string): void =>
  setProperty(config, key, undefined)

/**
 * Character iterator over lines of chars.
 *
 * @param lines Lines to iterate over.
 */
function* chars(
  lines: string[]
): Generator<{char: string; lineNumber: number}> {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const char of line) {
      yield {char, lineNumber: i}
    }
    yield {char: 'EOL', lineNumber: i}
  }
}

/**
 * State for a simple state-machine inside listPairs.
 */
enum State {
  START,
  COMMENT,
  KEY,
  SEPARATOR,
  VALUE
}

/**
 * Create empty START state.
 */
const newState = (): {
  state: State
  start: number
  key: string
  sep: string
  value: string
  skipSpace: boolean
  escapedNext: boolean
  unicode?: string
} => ({
  state: State.START,
  start: -1,
  key: '',
  sep: '',
  value: '',
  skipSpace: true,
  escapedNext: false
})

/**
 * Parse and iterate over key-pairs.
 *
 * @param lines Lines to parse.
 * @return Parsed and unescaped key-value pairs.
 */
function* listPairs(lines: string[]): Generator<{
  start: number
  len: number
  sep: string
  key: string
  value: string
}> {
  let state = newState()

  for (const {char, lineNumber} of chars(lines)) {
    // Simply ignore spaces
    if (state.skipSpace && char === ' ') {
      continue
    }
    state.skipSpace = false

    // Parse unicode
    if (state.unicode) {
      // Handle incomplete sequence
      if (char === 'EOL') {
        throw new Error(`Invalid unicode sequence at line ${lineNumber}`)
      }

      // Append and consume until it has correct length
      state.unicode += char
      if (state.unicode.length < 6) {
        continue
      }
    }

    // First char on the line
    if (state.state === State.START) {
      switch (char) {
        case 'EOL':
          break
        case '#':
        case '!':
          state.state = State.COMMENT
          state.start = lineNumber
          break
        default:
          state.state = State.KEY
          state.start = lineNumber
          break
      }
    }

    // Comment
    if (state.state === State.COMMENT) {
      if (char === 'EOL') {
        state = newState()
      }
      continue
    }

    // Key
    if (state.state === State.KEY) {
      // Special unicode handling
      if (state.unicode) {
        state.key += parseUnicode(state.unicode, lineNumber)
        state.unicode = undefined
        continue
      }

      switch (char) {
        case 'EOL':
          if (state.escapedNext) {
            // Multi-line key
            state.escapedNext = false
            state.skipSpace = true
          } else {
            // Value-less key
            yield {...state, len: lineNumber - state.start + 1}
            state = newState()
          }
          break
        case ' ':
        case '=':
        case ':':
          if (state.escapedNext) {
            // Part of the key
            state.escapedNext = false
            state.key += char
          } else {
            // Start of the separator
            state.state = State.SEPARATOR
          }
          break
        case '\\':
          if (state.escapedNext) {
            // Escaped \ char
            state.escapedNext = false
            state.key += char
          } else {
            // Escaped next char
            state.escapedNext = true
          }
          break
        default:
          // Escape sequence
          if (state.escapedNext) {
            state.escapedNext = false
            if (char === 'u') {
              // Unicode
              state.unicode = '0x'
            } else {
              // Special char
              state.key += unescapeControlChar(char)
            }
          } else {
            // Normal char
            state.key += char
          }
          break
      }
    }

    // Separator
    if (state.state === State.SEPARATOR) {
      switch (char) {
        case 'EOL':
          // Value-less key
          yield {...state, len: lineNumber - state.start + 1}
          state = newState()
          break
        case ' ':
          state.sep += char
          break
        case '=':
        case ':':
          // Only one non-space separator char is allowed
          if (state.sep.match(/[=:]/)) {
            // This is already part of the value
            state.state = State.VALUE
          } else {
            // Part of the separator
            state.sep += char
          }
          break
        default:
          // Value start
          state.state = State.VALUE
          break
      }
    }

    // Value
    if (state.state === State.VALUE) {
      // Special unicode handling
      if (state.unicode) {
        state.value += parseUnicode(state.unicode, lineNumber)
        state.unicode = undefined
        continue
      }

      switch (char) {
        case 'EOL':
          if (state.escapedNext) {
            // Multi-line value
            state.escapedNext = false
            state.skipSpace = true
          } else {
            // Value end
            yield {...state, len: lineNumber - state.start + 1}
            state = newState()
          }
          break
        case '\\':
          if (state.escapedNext) {
            // Escaped \ char
            state.escapedNext = false
            state.value += char
          } else {
            // Escaped next char
            state.escapedNext = true
          }
          break
        default:
          if (state.escapedNext) {
            state.escapedNext = false
            if (char === 'u') {
              // Unicode
              state.unicode = '0x'
            } else {
              // Special char
              state.value += unescapeControlChar(char)
            }
          } else {
            // Normal char
            state.value += char
          }
          break
      }
    }
  }
}

const unescapeControlChar = (c: string): string => {
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

const parseUnicode = (sequence: string, line: number): string => {
  if (!sequence.match(/^0x[\da-fA-F]{4}$/)) {
    throw new Error(`Invalid unicode sequence at line ${line}`)
  }
  return String.fromCodePoint(parseInt(sequence, 16))
}

/**
 * Escape property key.
 *
 * @param unescapedKey Property key to be escaped.
 * @param escapeUnicode Escape unicode chars (below 0x0020 and above 0x007e). Default is true.
 * @return Escaped string.
 */
export const escapeKey = (
  unescapedKey: string,
  escapeUnicode = true
): string => {
  return escape(unescapedKey, true, escapeUnicode)
}

/**
 * Escape property value.
 *
 * @param unescapedValue Property value to be escaped.
 * @param escapeUnicode Escape unicode chars (below 0x0020 and above 0x007e). Default is true.
 * @return Escaped string.
 */
export const escapeValue = (
  unescapedValue: string,
  escapeUnicode = true
): string => {
  return escape(unescapedValue, false, escapeUnicode)
}

/**
 * Internal escape method.
 *
 * @param unescapedContent Text to be escaped.
 * @param escapeSpace Whether all spaces should be escaped
 * @param escapeUnicode Whether unicode chars should be escaped
 * @return Escaped string.
 */
const escape = (
  unescapedContent: string,
  escapeSpace: boolean,
  escapeUnicode: boolean
): string => {
  const result: string[] = []

  for (let index = 0; index < unescapedContent.length; index++) {
    const char = unescapedContent[index]
    switch (char) {
      case ' ': {
        // Escape space if required, or if it is first character
        if (escapeSpace || index === 0) {
          result.push('\\ ')
        } else {
          result.push(' ')
        }
        break
      }
      case '\\': {
        result.push('\\\\')
        break
      }
      case '\f': {
        // Form-feed
        result.push('\\f')
        break
      }
      case '\n': {
        // Newline
        result.push('\\n')
        break
      }
      case '\r': {
        // Carriage return
        result.push('\\r')
        break
      }
      case '\t': {
        // Tab
        result.push('\\t')
        break
      }
      case '=': // Fall through
      case ':': // Fall through
      case '#': // Fall through
      case '!': {
        result.push('\\', char)
        break
      }
      default: {
        if (escapeUnicode) {
          const codePoint: number = char.codePointAt(0) as number // can never be undefined
          if (codePoint < 0x0020 || codePoint > 0x007e) {
            result.push('\\u', codePoint.toString(16).padStart(4, '0'))
            break
          }
        }
        // Normal char
        result.push(char)
        break
      }
    }
  }

  return result.join('')
}
