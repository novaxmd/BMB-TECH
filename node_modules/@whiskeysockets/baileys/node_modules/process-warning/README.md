# process-warning

[![CI](https://github.com/fastify/process-warning/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fastify/process-warning/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/process-warning.svg?style=flat)](https://www.npmjs.com/package/process-warning)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)

A small utility for generating consistent [warning objects](https://nodejs.org/api/process.html#event-warning) across your codebase.
It also exposes a utility for emitting those warnings, guaranteeing that they are issued only once (unless configured otherwise).

_This module is used by the [Fastify](https://fastify.dev) framework and it was called `fastify-warning` prior to version 1.0.0._

### Install

```
npm i process-warning
```

### Usage

The module exports two builder functions for creating warnings.

```js
const {
  createWarning,
  createDeprecation
} = require('process-warning')

const warning = createWarning({
  name: 'ExampleWarning',
  code: 'EXP_WRN_001',
  message: 'Hello %s',
  unlimited: true
})
const emitted = warning('world')
```

#### Methods

##### `createWarning({ name, code, message[, unlimited] })`

- `name` (`string`, required) - The error name, you can access it later with
`error.name`. For consistency, we recommend prefixing module error names
with `{YourModule}Warning`
- `code` (`string`, required) - The warning code, you can access it later with
`error.code`. For consistency, we recommend prefixing plugin error codes with
`{ThreeLetterModuleName}_`, e.g. `FST_`. NOTE: codes should be all uppercase.
- `message` (`string`, required) - The warning message. You can also use
interpolated strings for formatting the message.
- `options` (`object`, optional) - Optional options with the following
properties:
  + `unlimited` (`boolean`, optional) - Should the warning be emitted more than
  once? Defaults to `false`.


##### `createDeprecation({code, message[, options]})`

This is a wrapper for `createWarning`. It is equivalent to invoking
`createWarning` with the `name` parameter set to "DeprecationWarning".

Deprecation warnings have extended support for the Node.js CLI options:
`--throw-deprecation`, `--no-deprecation`, and `--trace-deprecation`.

##### `warning([, a [, b [, c]]])`

The returned `warning` function can used for emitting warnings.
A warning is guaranteed to be emitted at least once.

- `[, a [, b [, c]]]` (`any`, optional) - Parameters for string interpolation.

```js
const { createWarning } = require('process-warning')
const FST_ERROR_CODE = createWarning({ name: 'MyAppWarning', code: 'FST_ERROR_CODE', message: 'message' })
FST_ERROR_CODE()
```

How to use an interpolated string:
```js
const { createWarning } = require('process-warning')
const FST_ERROR_CODE = createWarning({ name: 'MyAppWarning', code: 'FST_ERROR_CODE', message: 'Hello %s'})
FST_ERROR_CODE('world')
```

The `warning` object has methods and properties for managing the warning's state. Useful for testing.
```js
const { createWarning } = require('process-warning')
const FST_ERROR_CODE = createWarning({ name: 'MyAppWarning', code: 'FST_ERROR_CODE', message: 'Hello %s'})
console.log(FST_ERROR_CODE.emitted) // false
FST_ERROR_CODE('world')
console.log(FST_ERROR_CODE.emitted) // true

const FST_ERROR_CODE_2 = createWarning('MyAppWarning', 'FST_ERROR_CODE_2', 'Hello %s')
FST_ERROR_CODE_2.emitted = true
FST_ERROR_CODE_2('world') // will not be emitted because it is not unlimited
```

How to use an unlimited warning:
```js
const { createWarning } = require('process-warning')
const FST_ERROR_CODE = createWarning({ name: 'MyAppWarning', code: 'FST_ERROR_CODE', message: 'Hello %s', unlimited: true })
FST_ERROR_CODE('world') // will be emitted
FST_ERROR_CODE('world') // will be emitted again
```

#### `spyWarning(warning)`

Spy the created warning function for testing purpose.

```js
const { test } = require('node:test')
const { createWarning, spyWarning } = require('process-warning')
const FST_ERROR_CODE = createWarning({ name: 'MyAppWarning', code: 'FST_ERROR_CODE', message: 'Hello %s' })

test('spy warning', t => {
  const spyData = spyWarning(FST_ERROR_CODE)

  // call after spy
  const emitted = FST_ERROR_CODE('world')
  t.assert.strictEqual(emitted, true)

  // restore the warning function
  // it must be called when you do not need to spy anymore
  // otherwise, the calls data will accumulates.
  t.after(() => spyData.restore())

  t.assert.strictEqual(FST_ERROR_CODE.emitted, true)
  // calls return the arguments and result.
  // result indicate whether warning is emitted through process.emitWarning
  console.log(spyData.calls) // [{ arguments: ['world'], result: true }]
  t.assert.deepStrictEqual(spyData.calls[0].arguments, ['world'])
  t.assert.strictEqual(spyData.calls[0].result,  true)
  // number of times called the function
  console.log(spyData.callCount()) // 1
  t.assert.strictEqual(spyData.callCount(),  1)

  // reset the spy stat and warning state
  spyData.reset()
  t.assert.strictEqual(FST_ERROR_CODE.emitted, false)
  t.assert.deepStrictEqual(spyData.calls, [])
  t.assert.strictEqual(spyData.callCount(),  0)
})
```

#### Suppressing warnings

It is possible to suppress warnings by utilizing one of node's built-in warning suppression mechanisms.

Warnings can be suppressed:

- by setting the `NODE_NO_WARNINGS` environment variable to `1`
- by passing the `--no-warnings` flag to the node process
- by setting '--no-warnings' in the `NODE_OPTIONS` environment variable

For more information see [node's documentation](https://nodejs.org/api/cli.html).

## License

Licensed under [MIT](./LICENSE).
