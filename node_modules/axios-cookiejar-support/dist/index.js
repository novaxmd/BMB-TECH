"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapper = wrapper;
const http_1 = require("http-cookie-agent/http");
const AGENT_CREATED_BY_AXIOS_COOKIEJAR_SUPPORT = Symbol('AGENT_CREATED_BY_AXIOS_COOKIEJAR_SUPPORT');
function requestInterceptor(config) {
    if (!config.jar) {
        return config;
    }
    // @ts-expect-error -- Legacy config allows to assign boolean as jar.
    if (config.jar === true) {
        throw new Error('config.jar does not accept boolean since axios-cookiejar-support@2.0.0.');
    }
    if ((config.httpAgent != null &&
        config.httpAgent[AGENT_CREATED_BY_AXIOS_COOKIEJAR_SUPPORT] !== true) ||
        (config.httpsAgent != null &&
            config.httpsAgent[AGENT_CREATED_BY_AXIOS_COOKIEJAR_SUPPORT] !== true)) {
        throw new Error('axios-cookiejar-support does not support for use with other http(s).Agent.');
    }
    config.httpAgent = new http_1.HttpCookieAgent({ cookies: { jar: config.jar } });
    Object.defineProperty(config.httpAgent, AGENT_CREATED_BY_AXIOS_COOKIEJAR_SUPPORT, {
        configurable: false,
        enumerable: false,
        value: true,
        writable: false,
    });
    config.httpsAgent = new http_1.HttpsCookieAgent({ cookies: { jar: config.jar } });
    Object.defineProperty(config.httpsAgent, AGENT_CREATED_BY_AXIOS_COOKIEJAR_SUPPORT, {
        configurable: false,
        enumerable: false,
        value: true,
        writable: false,
    });
    return config;
}
function wrapper(axios) {
    const isWrapped = axios.interceptors.request.handlers.find(({ fulfilled }) => fulfilled === requestInterceptor);
    if (isWrapped) {
        return axios;
    }
    axios.interceptors.request.use(requestInterceptor);
    if ('create' in axios) {
        const create = axios.create.bind(axios);
        axios.create = (...args) => {
            const instance = create.apply(axios, args);
            instance.interceptors.request.use(requestInterceptor);
            return instance;
        };
    }
    return axios;
}
