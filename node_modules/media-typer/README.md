# media-typer

[![NPM Version][npm-version-image]][npm-url]
[![NPM Downloads][npm-downloads-image]][npm-url]
[![Build Status][ci-image]][ci-url]
[![Coverage Status][coverage-image]][coverage-url]

Simple RFC 6838 media type parser.

This module will parse a given media type into its component parts, like type,
subtype, and suffix. A formatter is also provided to put them back together and
the two can be combined to normalize media types into a canonical form.

If you are looking to parse the string that represents a media type and its
parameters in HTTP (for example, the `Content-Type` header), use the
[content-type module](https://www.npmjs.com/package/content-type).

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/). Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```sh
$ npm install media-typer
```

## API

```js
import * as typer from "media-typer";
```

### typer.parse(string)

```js
const obj = typer.parse("image/svg+xml");
```

Parse a media type string. This will return an object with the following properties:

- `type`: The type of the media type (always lower case). Example: `'image'`
- `subtype`: The subtype of the media type (always lower case). Example: `'svg'`
- `suffix`: Optional suffix of the media type (always lower case). Example: `'xml'`

If the given type string is invalid, then a `TypeError` is thrown.

### typer.format(obj)

```js
const obj = typer.format({ type: "image", subtype: "svg", suffix: "xml" });
```

Format an object into a media type string. This will return a string of the
mime type for the given object. For the properties of the object, see the
documentation for `typer.parse(string)`.

If any of the given object values are invalid, then a `TypeError` is thrown.

### typer.test(string)

```js
const valid = typer.test("image/svg+xml");
```

Validate a media type string. This will return `true` if the string is a well-
formatted media type, or `false` otherwise.

## License

[MIT](LICENSE)

[ci-image]: https://img.shields.io/github/actions/workflow/status/jshttp/media-typer/ci.yml
[ci-url]: https://github.com/jshttp/media-typer/actions/workflows/ci.yml?query=branch%3Amaster
[coverage-image]: https://img.shields.io/codecov/c/github/jshttp/media-typer/master
[coverage-url]: https://app.codecov.io/gh/jshttp/media-typer
[npm-downloads-image]: https://img.shields.io/npm/dm/media-typer
[npm-url]: https://npmjs.org/package/media-typer
[npm-version-image]: https://img.shields.io/npm/v/media-typer
