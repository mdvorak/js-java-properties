# js-java-properties

Java properties file parser and formatter for Javascript.

Intended mostly for the tools that need to modify existing property file, without reformatting the contents.
That is achieved by using string array as a backing storage. If you want only to read the properties,
you might convert it to `Map` using `toMap(...)` function.

_Warning: Currently this parser does not support UTF-8 character escaping. If you want that feature, please open an
issue._

## Usage

TODO

```sh
npm install js-java-properties
```

## Development

TODO

### Publishing

TODO
