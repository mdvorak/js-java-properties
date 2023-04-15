import * as fs from 'node:fs/promises'

import properties from '.'

describe('parse', () => {
  it('should parse all lines', () => {
    // Data
    const sample =
      'registry=https://abcd\n#foo bar\r\n@scope:test=avx\rextra\r\n'

    // Test
    const result = properties.parse(sample)
    expect(result.lines).toEqual([
      'registry=https://abcd',
      '#foo bar',
      '@scope:test=avx',
      'extra'
    ])
  })

  it('should remove BOM', () => {
    const sample = '\ufefffoo=bar\n#test'

    // Test
    const result = properties.parse(sample)
    expect(result.lines).toEqual(['foo=bar', '#test'])
  })
})

describe('stringify', () => {
  it('should format all lines', () => {
    // Data
    const config = {
      lines: ['registry=https://abcd', '#foo bar', '@scope:test=avx']
    }

    // Test
    const result = properties.stringify(config)
    expect(result).toEqual('registry=https://abcd\n#foo bar\n@scope:test=avx\n')
  })

  it('should remove leading newlines', () => {
    // Data
    const config = {
      lines: ['', '', 'foo=bar']
    }

    // Test
    const result = properties.stringify(config)
    expect(result).toEqual('foo=bar\n')
  })
})

describe('data access', () => {
  const sample = properties.empty()

  beforeEach(() => {
    sample.lines = [
      '  foo0',
      'foo1=bar',
      'foo2:bar2',
      'foo3 bar3',
      ' foo4   bar4 ',
      'foo5 = bar5',
      '# foo6 = bar6',
      '  ! foo7 = bar7',
      'foo8\\::bar8',
      'foo9\\==bar9',
      'foo10\\=:bar10',
      'foo11\\  bar11',
      '\\ foo12 = bar12',
      '\\#foo13 = bar13',
      '\\!foo14# = bar14',
      'foo15 = #bar15',
      'f\\o\\o\\16 = \\b\\ar\\16',
      'foo17 = b\\',
      '  a\\',
      'r17',
      'f\\ o\\ \\ o18 =\\ bar18',
      'foo19\\n= bar\\t\\f\\r19\\n',
      'foo20 = ',
      'foo21 =\\',
      '   ',
      'foo22 =\\\\',
      'foo\\',
      '23 bar23'
    ]
  })

  const samplePairs = [
    ['foo0', ''],
    ['foo1', 'bar'],
    ['foo2', 'bar2'],
    ['foo3', 'bar3'],
    ['foo4', 'bar4 '],
    ['foo5', 'bar5'],
    ['foo8:', 'bar8'],
    ['foo9=', 'bar9'],
    ['foo10=', 'bar10'],
    ['foo11 ', 'bar11'],
    [' foo12', 'bar12'],
    ['#foo13', 'bar13'],
    ['!foo14#', 'bar14'],
    ['foo15', '#bar15'],
    ['foo16', 'bar16'],
    ['foo17', 'bar17'],
    ['f o  o18', ' bar18'],
    ['foo19\n', 'bar\t\f\r19\n'],
    ['foo20', ''],
    ['foo21', ''],
    ['foo22', '\\'],
    ['foo23', 'bar23']
  ]

  describe('get value', () => {
    it.each(samplePairs)('should get property "%s"', (key, expected) => {
      const result = properties.get(sample, key)
      expect(result).toBe(expected)
    })

    it.each([['foo6'], ['foo7']])(
      'should not get commented property "%s"',
      key => {
        const result = properties.get(sample, key)
        expect(result).toBeUndefined()
      }
    )

    it('should return last value of duplicate key', () => {
      const config: properties.Properties = {
        lines: ['key1=foo1', 'key2=foo2', 'key1=foo3']
      }

      const result = properties.get(config, 'key1')
      expect(result).toBe('foo3')
    })

    it('should throw on invalid unicode sequence in key', () => {
      const config: properties.Properties = {
        lines: ['foo\\u23a=bar']
      }

      expect(() => properties.get(config, 'foo')).toThrowError()
    })

    it.each([['foo=bar\\u23a'], ['foo=bar\\u23ax5']])(
      'should throw on invalid unicode sequence in value %s',
      line => {
        const config: properties.Properties = {
          lines: [line]
        }

        expect(() => properties.get(config, 'foo')).toThrowError()
      }
    )

    it.each([
      ['foo=bar', 'bar'],
      ['foo  bar', 'bar'],
      ['foo : bar', 'bar'],
      ['foo := bar', '= bar'],
      ['foo::bar', ':bar']
    ])('should handle separator "%s"', (line: string, value: string) => {
      const config: properties.Properties = {
        lines: [line]
      }

      const result = properties.get(config, 'foo')
      expect(result).toBe(value)
    })
  })

  describe('set value', () => {
    it.each([
      ['foo1', 'bar', 'foo1=bar'],
      ['foo8:', 'bar8', 'foo8\\:=bar8'],
      ['foo9=', 'bar9', 'foo9\\==bar9'],
      ['foo10=', 'bar10', 'foo10\\==bar10'],
      ['foo11 ', 'bar11', 'foo11\\ =bar11'],
      [' foo12', 'bar12 ', '\\ foo12=bar12 '],
      ['#foo13', 'bar13', '\\#foo13=bar13'],
      ['!foo14#', 'bar14', '\\!foo14\\#=bar14'],
      ['foo15', '#bar15', 'foo15=\\#bar15'],
      ['f o  o18', ' bar18', 'f\\ o\\ \\ o18=\\ bar18'],
      ['foo19\n', 'bar\t\f\r19\n', 'foo19\\n=bar\\t\\f\\r19\\n'],
      ['foo20', '', 'foo20='],
      ['foo22', '\\', 'foo22=\\\\']
    ])('should format key pair for "%s"', (key, value, expected) => {
      const config = properties.empty()
      properties.set(config, key, value)
      expect(config.lines).toEqual([expected])
    })

    it.each([
      ['foo=bar', 'a=b'],
      ['foo = bar', 'a = b'],
      ['foo:bar', 'a:b'],
      ['foo: bar', 'a: b'],
      ['foo  bar', 'a  b'],
      ['# comment', 'a=b']
    ])('should reuse last separator from "%s"', (line, expected) => {
      const config: properties.Properties = {
        lines: [line]
      }
      properties.set(config, 'a', 'b')
      expect(config.lines).toEqual([line, expected])
    })

    it('should replace key pairs', () => {
      const keys = [
        'foo0',
        'foo1',
        'foo2',
        'foo3',
        'foo4',
        'foo5',
        'foo6',
        'foo8:',
        'foo9=',
        'foo10=',
        'foo11 ',
        ' foo12',
        '#foo13',
        '!foo14#',
        'foo15',
        'foo16',
        'foo17',
        'f o  o18',
        'foo19\n',
        'foo20',
        'foo21',
        'foo22',
        'foo23'
      ]
      keys.forEach(key => properties.set(sample, key, 'x'))

      expect(sample.lines).toEqual([
        'foo0=x',
        'foo1=x',
        'foo2:x',
        'foo3 x',
        'foo4   x',
        'foo5 = x',
        '# foo6 = bar6',
        '  ! foo7 = bar7',
        'foo8\\::x',
        'foo9\\==x',
        'foo10\\=:x',
        'foo11\\  x',
        '\\ foo12 = x',
        '\\#foo13 = x',
        '\\!foo14\\# = x',
        'foo15 = x',
        'foo16 = x',
        'foo17 = x',
        'f\\ o\\ \\ o18 =x',
        'foo19\\n= x',
        'foo20 = x',
        'foo21 =x',
        'foo22 =x',
        'foo23 x',
        'foo6 x'
      ])
    })

    it('should use custom separator', () => {
      const config: properties.Properties = {
        lines: ['key1=foo1', 'key2=foo2']
      }

      properties.set(config, 'key1', 'test', {separator: ': '})
      expect(config.lines).toEqual(['key1: test', 'key2=foo2'])
    })

    it('should remove duplicate keys on set', () => {
      const config: properties.Properties = {
        lines: ['key1=foo1', 'key2=foo2', 'key1=foo3']
      }

      properties.set(config, 'key1', 'test')
      expect(config.lines).toEqual(['key1=test', 'key2=foo2'])
    })
  })

  describe('remove value', () => {
    it('should remove existing key with set undefined', () => {
      const config: properties.Properties = {
        lines: ['foo=bar']
      }
      properties.set(config, 'foo', undefined)
      expect(config.lines).toEqual([])
    })

    it('should remove existing key with remove', () => {
      const config: properties.Properties = {
        lines: ['foo=bar']
      }
      properties.remove(config, 'foo')
      expect(config.lines).toEqual([])
    })

    it('should remove all duplicate keys with remove', () => {
      const config: properties.Properties = {
        lines: ['key1=foo1', 'key2=foo2', 'key1=foo3']
      }

      properties.remove(config, 'key1')
      expect(config.lines).toEqual(['key2=foo2'])
    })
  })

  describe('list', () => {
    it('should list all key-value pairs', () => {
      const result = [...properties.list(sample)]
      const resultAsArrays = result.map(({key, value}) => [key, value])

      expect(resultAsArrays).toEqual(samplePairs)
    })

    it('should list duplicate pairs', () => {
      const config: properties.Properties = {
        lines: ['foo=bar1', 'foo=bar2']
      }

      const result = [...properties.list(config)]
      expect(result).toEqual([
        {key: 'foo', value: 'bar1'},
        {key: 'foo', value: 'bar2'}
      ])
    })
  })

  describe('toObject', () => {
    it('should return all pairs', () => {
      const result = properties.toObject(sample)
      expect(Object.entries(result)).toEqual(samplePairs)
    })

    it('should return last value of duplicate key', () => {
      const config: properties.Properties = {
        lines: ['foo=bar1', 'a=b', 'foo=bar2', 'foo=bar3', 'c=d']
      }

      const result = properties.toObject(config)
      expect(Object.entries(result)).toEqual([
        ['foo', 'bar3'],
        ['a', 'b'],
        ['c', 'd']
      ])
    })
  })

  describe('toMap', () => {
    it('should return all pairs', () => {
      const result = properties.toMap(sample)
      expect([...result.entries()]).toEqual(samplePairs)
    })

    it('should return last value of duplicate key', () => {
      const config: properties.Properties = {
        lines: ['foo=bar1', 'a=b', 'foo=bar2', 'foo=bar3', 'c=d']
      }

      const result = properties.toMap(config)
      expect([...result.entries()]).toEqual([
        ['foo', 'bar3'],
        ['a', 'b'],
        ['c', 'd']
      ])
    })

    it('should parse test file', async () => {
      const contents = await fs.readFile(
        require.resolve('../fixtures/test-all.properties'),
        'utf-8'
      )

      // Parse
      const result = properties.toObject(properties.parse(contents))

      // Verify
      expect(result).toEqual({
        '': 'So does this line.',
        category: 'file format',
        duplicateKey: 'second',
        empty: '',
        encodedHelloInJapanese: 'こんにちは',
        evenKey: 'This is on one line\\',
        'evenLikeThis\\': '',
        hello: 'hello',
        helloInJapanese: 'こんにちは',
        こんにちは: 'hello',
        keyWithBackslashes: 'This has random backslashes',
        'keyWithDelimiters:= ':
          'This is the value for the key "keyWithDelimiters:= "',
        'keyWitheven\\': 'this colon is not escaped',
        language: 'English',
        multiline: 'This line continues on 3 lines',
        multilineKey: 'this is a multiline key',
        noWhiteSpace:
          'The key will be "noWhiteSpace" without any whitespace.    ',
        oddKey: 'This is line one and\\# This is line two',
        orLikeThis: '',
        path: 'c:\\wiki\\templates',
        topic: '.properties file',
        valueWithEscapes:
          'This is a newline\n, a carriage return\r, a tab\t and a formfeed\f.',
        website: 'https://en.wikipedia.org/',
        welcome: 'Welcome to Wikipedia!    '
      })
    })
  })
})

describe('escapeKey', () => {
  it.each([
    ['foo1', 'foo1'],
    ['foo2:', 'foo2\\:'],
    ['foo3=', 'foo3\\='],
    ['foo4\t', 'foo4\\t'],
    ['foo5 ', 'foo5\\ '],
    [' foo6', '\\ foo6'],
    ['#foo7', '\\#foo7'],
    ['!foo8#', '\\!foo8\\#'],
    ['fo  o9', 'fo\\ \\ o9'],
    ['foo10\n', 'foo10\\n'],
    ['f\r\f\n\too11', 'f\\r\\f\\n\\too11'],
    ['\\foo12\\', '\\\\foo12\\\\'],
    ['\0\u0001', '\\u0000\\u0001'],
    ['\u3053\u3093\u306B\u3061\u306F', '\\u3053\\u3093\\u306b\\u3061\\u306f'],
    ['こんにちは', '\\u3053\\u3093\\u306b\\u3061\\u306f']
  ])('should escape key "%s" as "%s"', (key: string, expected: string) => {
    const result = properties.escapeKey(key)
    expect(result).toEqual(expected)
  })
})

describe('escapeValue', () => {
  it.each([
    ['foo1', 'foo1'],
    ['foo2:', 'foo2\\:'],
    ['foo3=', 'foo3\\='],
    ['foo4\t', 'foo4\\t'],
    ['foo5 ', 'foo5 '],
    [' foo6', '\\ foo6'],
    ['#foo7', '\\#foo7'],
    ['!foo8#', '\\!foo8\\#'],
    ['fo  o9', 'fo  o9'],
    ['foo10\n', 'foo10\\n'],
    ['f\r\f\n\too11', 'f\\r\\f\\n\\too11'],
    ['\\foo12\\', '\\\\foo12\\\\'],
    ['\0\u0001', '\\u0000\\u0001'],
    ['\u3053\u3093\u306B\u3061\u306F', '\\u3053\\u3093\\u306b\\u3061\\u306f'],
    ['こんにちは', '\\u3053\\u3093\\u306b\\u3061\\u306f']
  ])('should escape value "%s" as "%s"', (key: string, expected: string) => {
    const result = properties.escapeValue(key)
    expect(result).toEqual(expected)
  })
})
