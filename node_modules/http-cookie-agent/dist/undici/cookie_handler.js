"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CookieHandler = void 0;
var _convert_to_headers_object = require("../utils/convert_to_headers_object");
var _create_cookie_header_value = require("../utils/create_cookie_header_value");
var _save_cookies_from_header = require("../utils/save_cookies_from_header");
var _validate_cookie_options = require("../utils/validate_cookie_options");
/* global Buffer */

const kRequestUrl = Symbol('requestUrl');
const kCookieOptions = Symbol('cookieOptions');
const kDispatchHandler = Symbol('dispatchHandler');
const kDispatch = Symbol('dispatch');
class CookieHandler {
  constructor(dispatch, cookieOptions, handler) {
    (0, _validate_cookie_options.validateCookieOptions)(cookieOptions);
    this[kRequestUrl] = null;
    this[kCookieOptions] = cookieOptions;
    this[kDispatchHandler] = handler;
    this[kDispatch] = dispatch;
  }
  dispatch(options, handler) {
    const cookieOptions = this[kCookieOptions];
    const requestUrl = new URL(options.path, options.origin).toString();
    const headers = (0, _convert_to_headers_object.convertToHeadersObject)(options.headers);
    options.headers = headers;
    headers['cookie'] = (0, _create_cookie_header_value.createCookieHeaderValue)({
      cookieOptions,
      passedValues: [headers['cookie']].flat(),
      requestUrl
    });
    this[kRequestUrl] = requestUrl;
    return this[kDispatch](options, handler);
  }
  onRequestStart(controller, context) {
    this[kDispatchHandler].onRequestStart?.(controller, context);
  }
  onRequestUpgrade(controller, statusCode, headers, socket) {
    this[kDispatchHandler].onRequestUpgrade?.(controller, statusCode, headers, socket);
  }
  onResponseStart(controller, statusCode, headers, statusMessage) {
    const cookieOptions = this[kCookieOptions];
    const requestUrl = this[kRequestUrl];
    if (requestUrl != null) {
      (0, _save_cookies_from_header.saveCookiesFromHeader)({
        cookieOptions,
        cookies: (0, _convert_to_headers_object.convertToHeadersObject)(headers)['set-cookie'],
        requestUrl
      });
    }
    this[kDispatchHandler].onResponseStart?.(controller, statusCode, headers, statusMessage);
  }
  onResponseData(controller, chunk) {
    this[kDispatchHandler].onResponseData?.(controller, chunk);
  }
  onResponseEnd(controller, trailers) {
    this[kDispatchHandler].onResponseEnd?.(controller, trailers);
  }
  onResponseError(controller, error) {
    this[kDispatchHandler].onResponseError?.(controller, error);
  }
}
exports.CookieHandler = CookieHandler;