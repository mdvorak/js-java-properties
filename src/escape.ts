/**
 * Escape property key.
 *
 * @param unescapedKey Property key to be escaped.
 * @param escapeUnicode Escape unicode chars (below 0x0020 and above 0x007e). Default is true.
 * @return Escaped string.
 */
export const escapeKey = (unescapedKey: string, escapeUnicode = true): string => {
  return escape(unescapedKey, true, escapeUnicode)
}

/**
 * Escape property value.
 *
 * @param unescapedValue Property value to be escaped.
 * @param escapeUnicode Escape unicode chars (below 0x0020 and above 0x007e). Default is true.
 * @return Escaped string.
 */
export const escapeValue = (unescapedValue: string, escapeUnicode = true): string => {
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
const escape = (unescapedContent: string, escapeSpace: boolean, escapeUnicode: boolean): string => {
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
