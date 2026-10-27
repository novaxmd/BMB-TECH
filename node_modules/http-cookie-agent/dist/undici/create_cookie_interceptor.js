"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCookieInterceptor = createCookieInterceptor;
var _cookie_handler = require("./cookie_handler");
function createCookieInterceptor(cookieOptions) {
  return dispatch => {
    return function interceptCookie(dispatchOptions, handler) {
      const cookieHandler = new _cookie_handler.CookieHandler(dispatch, cookieOptions, handler);
      return cookieHandler.dispatch(dispatchOptions, cookieHandler);
    };
  };
}