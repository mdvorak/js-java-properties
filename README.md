# js-java-properties

This is a small library that provides utilities to parse and
manipulate [Java properties](https://docs.oracle.com/javase/9/docs/api/java/util/Properties.html) files.

Intended mostly for the tools that need to modify an existing property file without reformatting the contents. This is
achieved by using a string array as a backing storage. If you want only to read the properties, you should convert it to
an object or a `Map` using `toObject(...)` or `toMap(...)` function, respectively.

## Usage

You can install this library using NPM:

```shell
npm install js-java-properties
```

### Types

- `Properties` represent lines in the properties file. A single property can span multiple lines.
  It is a part of the API, and it may be extended in future versions.
- `KeyValuePair` parsed key and value. Used by `listProperties`.

### Parsing

Parses correctly file contents as a string into lines.

```ts
import * as properties from 'js-java-properties'

const props = properties.parse('key1=value1\nkey2 = value2\nkey3: value3')
console.log(props)
// { lines: [ 'key1=value1', 'key2 = value2', 'key3: value3' ] }
```

To read a file from a disk, use standard node `fs` module:

```ts
import fs from 'node:fs'
import * as properties from 'js-java-properties'

const props = properties.parse(fs.readFileSync('file.properties', 'utf-8'))
```

### Stringify

Formats property lines into string.

```ts
import * as properties from 'js-java-properties'

const props = properties.empty()
props.lines.push('key1=value1', 'key2 = value2', 'key3: value3')

const output = properties.stringify(props)
console.log(output)
// 'key1=value1\nkey2 = value2\nkey3: value3\n'
```

### Listing key-value pairs

Iterate over every key-value pair. Note that if file contains duplicate keys,
they are returned here as well.

```ts
import * as properties from 'js-java-properties'

const props = properties.empty()
props.lines.push('# comment')
props.lines.push('key1=value1', 'key2 = value2', 'key3: value3')
props.lines.push('key3: duplicate')

for (const {key, value} of properties.listProperties(props)) {
  console.log(`${key}=${value}`)
  // key1=value1
  // key2=value2
  // key3=value3
  // key3=duplicate
}
```

### Getting a value by key

Note that this method has `O(n)` complexity for every operation.
Use `toObject` or `toMap` methods to convert it into a readable object.

In case there are duplicate keys, the last one is returned.

```ts
import * as properties from 'js-java-properties'

const props = properties.empty()
props.lines.push('key1=value1', 'key2 = value2', 'key3: value3')

console.log(properties.getProperty(props, 'key2'))
// 'value2'

props.lines.push('key2 = duplicate')
console.log(properties.getProperty(props, 'key2'))
// 'duplicate'
```

### Converting to object or map

In case there are duplicate keys, the last one is returned.

```ts
import * as properties from 'js-java-properties'

const props = properties.empty()
props.lines.push('key1=value1', 'key2 = value2', 'key3: value3')

console.log(properties.toObject(props))
// { key1: 'value1', key2: 'value2', key3: 'value3' }

console.log(properties.toMap(props))
// Map(3) { 'key1' => 'value1', 'key2' => 'value2', 'key3' => 'value3' }
```

### Setting a value

This method adds or replaces the given key-value pair. If the value is undefined, the key is removed.
Note that an empty string is still considered a value.

If there are multiple occurrences of the same key in the list, only the first one is kept and
all other occurrences are removed.

```ts
import * as properties from 'js-java-properties'

const props = properties.empty()
props.lines.push('key1=value1', 'key2 = value2', 'key3: value3')

properties.setProperty(props, 'key2', 'new-value')
console.log(props)
// { lines: [ 'key1=value1', 'key2 = new-value', 'key3: value3' ] }

properties.setProperty(props, 'new-key', 'new-value')
console.log(props)
// { lines: [ 'key1=value1', 'key2 = new-value', 'key3: value3', 'new-key: new-value' ] }

properties.setProperty(props, 'new-key', 'new-value', {separator: ' = '})
console.log(props)
// { lines: [ 'key1=value1', 'key2 = new-value', 'key3: value3', 'new-key = new-value' ] }

properties.setProperty(props, 'key3', undefined)
console.log(props)
// { lines: [ 'key1=value1', 'key2 = new-value', 'new-key = new-value' ] }
```

### Removing a value

Removes the given key and its associated value. If there are duplicate keys with the same name,
all values associated with the given key are removed.

```ts
import * as properties from 'js-java-properties'

const props = properties.empty()
props.lines.push('key1=value1', 'key2 = value2', 'key3: value3')

properties.removeProperty(props, 'key2')
console.log(props)
// { lines: [ 'key1=value1', 'key3: value3' ] }
```

## Development

- Commits must follow [Conventional Commits](https://www.conventionalcommits.org) standard
- Code must conform to eslint and prettier rules
- 100% test coverage is required

### Publishing

Releases are generated using [Release Please](https://github.com/googleapis/release-please).
Package is automatically published to a [npm registry](https://www.npmjs.com/package/js-java-properties),
when release is created.

## Contributing

If you would like to contribute to this library, feel free to submit a pull request on GitHub.
