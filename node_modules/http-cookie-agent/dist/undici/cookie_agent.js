"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CookieAgent = void 0;
var _undici = require("undici");
var _create_cookie_interceptor = require("./create_cookie_interceptor");
class CookieAgent extends _undici.Agent {
  constructor({
    cookies: cookieOpts,
    ...agentOpts
  }) {
    super({
      ...agentOpts
    });
    if (cookieOpts != null) {
      return this.compose((0, _create_cookie_interceptor.createCookieInterceptor)(cookieOpts));
    } else {
      return this;
    }
  }
}
exports.CookieAgent = CookieAgent;