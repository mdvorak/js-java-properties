import properties from '.'

describe('parse', () => {
  it('should parse all lines', () => {
    // Data
    const sample = 'registry=https://abcd\n#foo bar\n@scope:test=avx\n'

    // Test
    const result = properties.parse(sample)
    expect(result.lines).toEqual([
      'registry=https://abcd',
      '#foo bar',
      '@scope:test=avx'
    ])
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
      'foo=bar',
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
      'foo22 =\\\\'
    ]
  })

  const samplePairs = [
    ['foo', 'bar'],
    ['foo2', 'bar2'],
    ['foo3', 'bar3'],
    ['foo4', 'bar4'],
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
    ['foo22', '\\']
  ]

  it.each([
    ['foo', 'bar'],
    ['foo2', 'bar2'],
    ['foo3', 'bar3'],
    ['foo4', 'bar4'],
    ['foo5', 'bar5'],
    ['foo6', undefined],
    ['foo7', undefined],
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
    ['foo22', '\\']
  ])('should get property "%s"', (key, expected) => {
    const result = properties.get(sample, key)
    expect(result).toBe(expected)
  })

  it.each([
    ['foo', 'bar', 'foo=bar'],
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
      'foo',
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
      'foo22'
    ]
    keys.forEach(key => properties.set(sample, key, 'x'))

    expect(sample.lines).toEqual([
      'foo=x',
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
      'foo6 =x'
    ])
  })

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

  describe('list', () => {
    it('should list all key-value pairs', () => {
      const result = [...properties.list(sample)]
      const resultAsArrays = result.map(({key, value}) => [key, value])

      expect(resultAsArrays).toEqual(samplePairs)
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
  })
})


describe('The property key escaping', () => {
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

describe('The property value escaping', () => {
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
