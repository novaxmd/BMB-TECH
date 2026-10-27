'use strict'

const { format } = require('node:util')

/**
 * @namespace processWarning
 */

/**
 * Represents a warning item with details.
 * @typedef {Function} WarningItem
 * @param {*} [a] Possible message interpolation value.
 * @param {*} [b] Possible message interpolation value.
 * @param {*} [c] Possible message interpolation value.
 * @property {string} name - The name of the warning.
 * @property {string} code - The code associated with the warning.
 * @property {string} message - The warning message.
 * @property {boolean} emitted - Indicates if the warning has been emitted.
 * @property {function} format - Formats the warning message.
 * @returns {boolean} emit - Indicates if the warning has been emitted by this call.
 */

/**
 * Options for creating a process warning.
 * @typedef {Object} ProcessWarningOptions
 * @property {string} name - The name of the warning.
 * @property {string} code - The code associated with the warning.
 * @property {string} message - The warning message.
 * @property {boolean} [unlimited=false] - If true, allows unlimited emissions of the warning.
 */

/**
 * Represents the process warning functionality.
 * @typedef {Object} ProcessWarning
 * @property {function} createWarning - Creates a warning item.
 * @property {function} createDeprecation - Creates a deprecation warning item.
 * @property {function} spyWarning - Spy a warning item.
 */

/**
 * Represents the spy data.
 * @typedef {Object} WarningSpyData
 * @property {object} calls - Arguments of WarningItem calls with.
 * @property {function} callCount - Number of counts called the WarningItem.
 * @property {function} reset - Reset the calls data and state of WarningItem.
 * @property {function} restore - Remove spy from WarningItem.
 */

const kWarningFn = Symbol('process-warning.fn')
const kWarningSpyData = Symbol('process-warning.spyData')

/**
 * Spy a warning item.
 * @function
 * @memberof processWarning
 * @param {WarningItem} warning - The warning item to spy.
 * @returns {WarningSpyData} The created spy data.
 */
function spyWarning (warning) {
  // Do not double spy the same warning
  if (warning[kWarningSpyData] === null) {
    const warningFn = warning[kWarningFn]
    warning[kWarningFn] = function (a, b, c) {
      const args = []
      // since warning always call by fn(a, b, c)
      // it need to remove the trailing undefined arguments
      if (c) {
        args.push(a, b, c)
      } else if (b) {
        args.push(a, b)
      } else if (a) {
        args.push(a)
      }
      warning[kWarningSpyData].calls.push({
        arguments: args,
        result: warningFn(a, b, c)
      })
    }
    const spyData = {
      calls: [],
      callCount () {
        return spyData.calls.length
      },
      reset () {
        warning.emitted = false
        spyData.calls.length = 0
      },
      restore () {
        spyData.reset()
        warning[kWarningFn] = warningFn
        warning[kWarningSpyData] = null
      }
    }
    warning[kWarningSpyData] = spyData
  }

  return warning[kWarningSpyData]
}

/**
 * Creates a deprecation warning item.
 * @function
 * @memberof processWarning
 * @param {ProcessWarningOptions} params - Options for creating the warning.
 * @returns {WarningItem} The created deprecation warning item.
 */
function createDeprecation (params) {
  return createWarning({ ...params, name: 'DeprecationWarning' })
}

/**
 * Creates a warning item.
 * @function
 * @memberof processWarning
 * @param {ProcessWarningOptions} params - Options for creating the warning.
 * @returns {WarningItem} The created warning item.
 * @throws {Error} Throws an error if name, code, or message is empty, or if opts.unlimited is not a boolean.
 */
function createWarning ({ name, code, message, unlimited = false } = {}) {
  if (!name) throw new Error('Warning name must not be empty')
  if (!code) throw new Error('Warning code must not be empty')
  if (!message) throw new Error('Warning message must not be empty')
  if (typeof unlimited !== 'boolean') throw new Error('Warning opts.unlimited must be a boolean')

  code = code.toUpperCase()

  const warningFn = unlimited === true
    ? function (a, b, c) {
      warning.emitted = true
      process.emitWarning(warning.format(a, b, c), warning.name, warning.code)
      return true
    }
    : function (a, b, c) {
      if (warning.emitted === true && warning.unlimited !== true) {
        return false
      }
      warning.emitted = true
      process.emitWarning(warning.format(a, b, c), warning.name, warning.code)
      return true
    }

  const warningContainer = {
    [name]: function (a, b, c) {
      return warning[kWarningFn](a, b, c)
    }
  }

  const warning = warningContainer[name]

  warning.emitted = false
  warning.message = message
  warning.unlimited = unlimited
  warning.code = code
  warning[kWarningFn] = warningFn
  warning[kWarningSpyData] = null

  /**
 * Formats the warning message.
 * @param {*} [a] Possible message interpolation value.
 * @param {*} [b] Possible message interpolation value.
 * @param {*} [c] Possible message interpolation value.
 * @returns {string} The formatted warning message.
 */
  warning.format = function (a, b, c) {
    let formatted
    if (a && b && c) {
      formatted = format(message, a, b, c)
    } else if (a && b) {
      formatted = format(message, a, b)
    } else if (a) {
      formatted = format(message, a)
    } else {
      formatted = message
    }
    return formatted
  }

  return warning
}

/**
 * Module exports containing the process warning functionality.
 * @namespace
 * @property {function} createWarning - Creates a warning item.
 * @property {function} createDeprecation - Creates a deprecation warning item.
 * @property {function} spyWarning - Spy a warning item.
 * @property {ProcessWarning} processWarning - Represents the process warning functionality.
 */
const out = { createWarning, createDeprecation, spyWarning }
module.exports = out
module.exports.default = out
module.exports.processWarning = out
