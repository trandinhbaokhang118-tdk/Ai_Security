(() => {
var exports = {};
exports.id = 731;
exports.ids = [731,839];
exports.modules = {

/***/ 625:
/***/ ((module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "default", ({
    enumerable: true,
    get: function() {
        return App;
    }
}));
const _interop_require_default = __webpack_require__(87020);
const _jsxruntime = __webpack_require__(8732);
const _react = /*#__PURE__*/ _interop_require_default._(__webpack_require__(82015));
const _utils = __webpack_require__(76915);
/**
 * `App` component is used for initialize of pages. It allows for overwriting and full control of the `page` initialization.
 * This allows for keeping state between navigation, custom error handling, injecting additional data.
 */ async function appGetInitialProps(param) {
    let { Component, ctx } = param;
    const pageProps = await (0, _utils.loadGetInitialProps)(Component, ctx);
    return {
        pageProps
    };
}
class App extends _react.default.Component {
    render() {
        const { Component, pageProps } = this.props;
        return /*#__PURE__*/ (0, _jsxruntime.jsx)(Component, {
            ...pageProps
        });
    }
}
App.origGetInitialProps = appGetInitialProps;
App.getInitialProps = appGetInitialProps;
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=_app.js.map


/***/ }),

/***/ 1523:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";

module.exports = __webpack_require__(63885).vendored.contexts.HeadManagerContext;

//# sourceMappingURL=head-manager-context.js.map

/***/ }),

/***/ 3147:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;

    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();

    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) return obj;
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") return { default: obj };

    var cache = _getRequireWildcardCache(nodeInterop);

    if (cache && cache.has(obj)) return cache.get(obj);

    var newObj = { __proto__: null };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;

    for (var key in obj) {
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) Object.defineProperty(newObj, key, desc);
            else newObj[key] = obj[key];
        }
    }

    newObj.default = obj;

    if (cache) cache.set(obj, newObj);

    return newObj;
}
exports._ = _interop_require_wildcard;


/***/ }),

/***/ 4325:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/**
 * Removes the trailing slash for a given route or page path. Preserves the
 * root page. Examples:
 *   - `/foo/bar/` -> `/foo/bar`
 *   - `/foo/bar` -> `/foo/bar`
 *   - `/` -> `/`
 */ 
Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "removeTrailingSlash", ({
    enumerable: true,
    get: function() {
        return removeTrailingSlash;
    }
}));
function removeTrailingSlash(route) {
    return route.replace(/\/$/, '') || '/';
} //# sourceMappingURL=remove-trailing-slash.js.map


/***/ }),

/***/ 5242:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "getHostname", ({
    enumerable: true,
    get: function() {
        return getHostname;
    }
}));
function getHostname(parsed, headers) {
    // Get the hostname from the headers if it exists, otherwise use the parsed
    // hostname.
    let hostname;
    if ((headers == null ? void 0 : headers.host) && !Array.isArray(headers.host)) {
        hostname = headers.host.toString().split(':', 1)[0];
    } else if (parsed.hostname) {
        hostname = parsed.hostname;
    } else return;
    return hostname.toLowerCase();
} //# sourceMappingURL=get-hostname.js.map


/***/ }),

/***/ 6479:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
// In output: export mode, the build id is added to the start of the HTML
// document, directly after the doctype declaration. During a prefetch, the
// client performs a range request to get the build id, so it can check whether
// the target page belongs to the same build.
//
// The first 64 bytes of the document are requested. The exact number isn't
// too important; it must be larger than the build id + doctype + closing and
// ending comment markers, but it doesn't need to match the end of the
// comment exactly.
//
// Build ids are 21 bytes long in the default implementation, though this
// can be overridden in the Next.js config. For the purposes of this check,
// it's OK to only match the start of the id, so we'll truncate it if exceeds
// a certain length.

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    DOC_PREFETCH_RANGE_HEADER_VALUE: function() {
        return DOC_PREFETCH_RANGE_HEADER_VALUE;
    },
    doesExportedHtmlMatchBuildId: function() {
        return doesExportedHtmlMatchBuildId;
    },
    insertBuildIdComment: function() {
        return insertBuildIdComment;
    }
});
const DOCTYPE_PREFIX = '<!DOCTYPE html>' // 15 bytes
;
const MAX_BUILD_ID_LENGTH = 24;
const DOC_PREFETCH_RANGE_HEADER_VALUE = 'bytes=0-63';
function escapeBuildId(buildId) {
    // If the build id is longer than the given limit, it's OK for our purposes
    // to only match the beginning.
    const truncated = buildId.slice(0, MAX_BUILD_ID_LENGTH);
    // Replace hyphens with underscores so it doesn't break the HTML comment.
    // (Unlikely, but if this did happen it would break the whole document.)
    return truncated.replace(/-/g, '_');
}
function insertBuildIdComment(originalHtml, buildId) {
    if (buildId.includes('-->') || // React always inserts a doctype at the start of the document. Skip if it
    // isn't present. Shouldn't happen; suggests an issue elsewhere.
    !originalHtml.startsWith(DOCTYPE_PREFIX)) {
        // Return the original HTML unchanged. This means the document will not
        // be prefetched.
        // TODO: The build id comment is currently only used during prefetches, but
        // if we eventually use this mechanism for regular navigations, we may need
        // to error during build if we fail to insert it for some reason.
        return originalHtml;
    }
    // The comment must be inserted after the doctype.
    return originalHtml.replace(DOCTYPE_PREFIX, DOCTYPE_PREFIX + '<!--' + escapeBuildId(buildId) + '-->');
}
function doesExportedHtmlMatchBuildId(partialHtmlDocument, buildId) {
    // Check whether the document starts with the expected buildId.
    return partialHtmlDocument.startsWith(DOCTYPE_PREFIX + '<!--' + escapeBuildId(buildId) + '-->');
} //# sourceMappingURL=output-export-prefetch-encoding.js.map


/***/ }),

/***/ 8538:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "Batcher", ({
    enumerable: true,
    get: function() {
        return Batcher;
    }
}));
const _detachedpromise = __webpack_require__(73367);
class Batcher {
    constructor(cacheKeyFn, /**
     * A function that will be called to schedule the wrapped function to be
     * executed. This defaults to a function that will execute the function
     * immediately.
     */ schedulerFn = (fn)=>fn()){
        this.cacheKeyFn = cacheKeyFn;
        this.schedulerFn = schedulerFn;
        this.pending = new Map();
    }
    static create(options) {
        return new Batcher(options == null ? void 0 : options.cacheKeyFn, options == null ? void 0 : options.schedulerFn);
    }
    /**
   * Wraps a function in a promise that will be resolved or rejected only once
   * for a given key. This will allow multiple calls to the function to be
   * made, but only one will be executed at a time. The result of the first
   * call will be returned to all callers.
   *
   * @param key the key to use for the cache
   * @param fn the function to wrap
   * @returns a promise that resolves to the result of the function
   */ async batch(key, fn) {
        const cacheKey = this.cacheKeyFn ? await this.cacheKeyFn(key) : key;
        if (cacheKey === null) {
            return fn(cacheKey, Promise.resolve);
        }
        const pending = this.pending.get(cacheKey);
        if (pending) return pending;
        const { promise, resolve, reject } = new _detachedpromise.DetachedPromise();
        this.pending.set(cacheKey, promise);
        this.schedulerFn(async ()=>{
            try {
                const result = await fn(cacheKey, resolve);
                // Resolving a promise multiple times is a no-op, so we can safely
                // resolve all pending promises with the same result.
                resolve(result);
            } catch (err) {
                reject(err);
            } finally{
                this.pending.delete(cacheKey);
            }
        });
        return promise;
    }
}

//# sourceMappingURL=batcher.js.map

/***/ }),

/***/ 8732:
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-runtime");

/***/ }),

/***/ 11590:
/***/ ((module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "default", ({
    enumerable: true,
    get: function() {
        return Error;
    }
}));
const _interop_require_default = __webpack_require__(87020);
const _jsxruntime = __webpack_require__(8732);
const _react = /*#__PURE__*/ _interop_require_default._(__webpack_require__(82015));
const _head = /*#__PURE__*/ _interop_require_default._(__webpack_require__(36006));
const statusCodes = {
    400: 'Bad Request',
    404: 'This page could not be found',
    405: 'Method Not Allowed',
    500: 'Internal Server Error'
};
function _getInitialProps(param) {
    let { req, res, err } = param;
    const statusCode = res && res.statusCode ? res.statusCode : err ? err.statusCode : 404;
    let hostname;
    if (false) {} else if (req) {
        const { getRequestMeta } = __webpack_require__(35124);
        const initUrl = getRequestMeta(req, 'initURL');
        if (initUrl) {
            const url = new URL(initUrl);
            hostname = url.hostname;
        }
    }
    return {
        statusCode,
        hostname
    };
}
const styles = {
    error: {
        // https://github.com/sindresorhus/modern-normalize/blob/main/modern-normalize.css#L38-L52
        fontFamily: 'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
        height: '100vh',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    desc: {
        lineHeight: '48px'
    },
    h1: {
        display: 'inline-block',
        margin: '0 20px 0 0',
        paddingRight: 23,
        fontSize: 24,
        fontWeight: 500,
        verticalAlign: 'top'
    },
    h2: {
        fontSize: 14,
        fontWeight: 400,
        lineHeight: '28px'
    },
    wrap: {
        display: 'inline-block'
    }
};
class Error extends _react.default.Component {
    render() {
        const { statusCode, withDarkMode = true } = this.props;
        const title = this.props.title || statusCodes[statusCode] || 'An unexpected error has occurred';
        return /*#__PURE__*/ (0, _jsxruntime.jsxs)("div", {
            style: styles.error,
            children: [
                /*#__PURE__*/ (0, _jsxruntime.jsx)(_head.default, {
                    children: /*#__PURE__*/ (0, _jsxruntime.jsx)("title", {
                        children: statusCode ? statusCode + ": " + title : 'Application error: a client-side exception has occurred'
                    })
                }),
                /*#__PURE__*/ (0, _jsxruntime.jsxs)("div", {
                    style: styles.desc,
                    children: [
                        /*#__PURE__*/ (0, _jsxruntime.jsx)("style", {
                            dangerouslySetInnerHTML: {
                                /* CSS minified from
                body { margin: 0; color: #000; background: #fff; }
                .next-error-h1 {
                  border-right: 1px solid rgba(0, 0, 0, .3);
                }

                ${
                  withDarkMode
                    ? `@media (prefers-color-scheme: dark) {
                  body { color: #fff; background: #000; }
                  .next-error-h1 {
                    border-right: 1px solid rgba(255, 255, 255, .3);
                  }
                }`
                    : ''
                }
               */ __html: "body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}" + (withDarkMode ? '@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}' : '')
                            }
                        }),
                        statusCode ? /*#__PURE__*/ (0, _jsxruntime.jsx)("h1", {
                            className: "next-error-h1",
                            style: styles.h1,
                            children: statusCode
                        }) : null,
                        /*#__PURE__*/ (0, _jsxruntime.jsx)("div", {
                            style: styles.wrap,
                            children: /*#__PURE__*/ (0, _jsxruntime.jsxs)("h2", {
                                style: styles.h2,
                                children: [
                                    this.props.title || statusCode ? title : /*#__PURE__*/ (0, _jsxruntime.jsxs)(_jsxruntime.Fragment, {
                                        children: [
                                            "Application error: a client-side exception has occurred",
                                            ' ',
                                            Boolean(this.props.hostname) && /*#__PURE__*/ (0, _jsxruntime.jsxs)(_jsxruntime.Fragment, {
                                                children: [
                                                    "while loading ",
                                                    this.props.hostname
                                                ]
                                            }),
                                            ' ',
                                            "(see the browser console for more information)"
                                        ]
                                    }),
                                    "."
                                ]
                            })
                        })
                    ]
                })
            ]
        });
    }
}
Error.displayName = 'ErrorPage';
Error.getInitialProps = _getInitialProps;
Error.origGetInitialProps = _getInitialProps;
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=_error.js.map


/***/ }),

/***/ 11896:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    HTML_LIMITED_BOT_UA_RE: function() {
        return _htmlbots.HTML_LIMITED_BOT_UA_RE;
    },
    HTML_LIMITED_BOT_UA_RE_STRING: function() {
        return HTML_LIMITED_BOT_UA_RE_STRING;
    },
    getBotType: function() {
        return getBotType;
    },
    isBot: function() {
        return isBot;
    }
});
const _htmlbots = __webpack_require__(33830);
// Bot crawler that will spin up a headless browser and execute JS.
// Only the main Googlebot search crawler executes JavaScript, not other Google crawlers.
// x-ref: https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
// This regex specifically matches "Googlebot" but NOT "Mediapartners-Google", "AdsBot-Google", etc.
const HEADLESS_BROWSER_BOT_UA_RE = /Googlebot(?!-)|Googlebot$/i;
const HTML_LIMITED_BOT_UA_RE_STRING = _htmlbots.HTML_LIMITED_BOT_UA_RE.source;
function isDomBotUA(userAgent) {
    return HEADLESS_BROWSER_BOT_UA_RE.test(userAgent);
}
function isHtmlLimitedBotUA(userAgent) {
    return _htmlbots.HTML_LIMITED_BOT_UA_RE.test(userAgent);
}
function isBot(userAgent) {
    return isDomBotUA(userAgent) || isHtmlLimitedBotUA(userAgent);
}
function getBotType(userAgent) {
    if (isDomBotUA(userAgent)) {
        return 'dom';
    }
    if (isHtmlLimitedBotUA(userAgent)) {
        return 'html';
    }
    return undefined;
} //# sourceMappingURL=is-bot.js.map


/***/ }),

/***/ 12289:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
var __webpack_unused_export__;

__webpack_unused_export__ = ({
    value: true
});
Object.defineProperty(exports, "U", ({
    enumerable: true,
    get: function() {
        return getHandler;
    }
}));
const _routekind = __webpack_require__(80237);
const _constants = __webpack_require__(70772);
const _tracer = __webpack_require__(12410);
const _formaturl = __webpack_require__(25397);
const _requestmeta = __webpack_require__(35124);
const _interopdefault = __webpack_require__(88647);
const _utils = __webpack_require__(83709);
const _normalizedatapath = __webpack_require__(95000);
const _responsecache = __webpack_require__(55122);
const _cachecontrol = __webpack_require__(56755);
const _utils1 = __webpack_require__(76915);
const _redirectstatus = __webpack_require__(30012);
const _constants1 = __webpack_require__(32072);
const _path = /*#__PURE__*/ _interop_require_default(__webpack_require__(33873));
const _sendpayload = __webpack_require__(18164);
const _renderresult = /*#__PURE__*/ _interop_require_default(__webpack_require__(64971));
const _utils2 = __webpack_require__(78737);
const _nofallbackerrorexternal = __webpack_require__(46060);
const _redirectstatuscode = __webpack_require__(13866);
const _isbot = __webpack_require__(11896);
const _addpathprefix = __webpack_require__(74420);
const _removetrailingslash = __webpack_require__(4325);
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const getHandler = ({ srcPage: originalSrcPage, config, userland, routeModule, isFallbackError, getStaticPaths, getStaticProps, getServerSideProps })=>{
    return async function handler(req, res, ctx) {
        var _serverFilesManifest_config_experimental, _serverFilesManifest_config;
        let srcPage = originalSrcPage;
        // turbopack doesn't normalize `/index` in the page name
        // so we need to to process dynamic routes properly
        // TODO: fix turbopack providing differing value from webpack
        if (false) {} else if (srcPage === '/index') {
            // we always normalize /index specifically
            srcPage = '/';
        }
        const multiZoneDraftMode = false;
        const prepareResult = await routeModule.prepare(req, res, {
            srcPage,
            multiZoneDraftMode
        });
        if (!prepareResult) {
            res.statusCode = 400;
            res.end('Bad Request');
            ctx.waitUntil == null ? void 0 : ctx.waitUntil.call(ctx, Promise.resolve());
            return;
        }
        const { buildId, query, params, parsedUrl, originalQuery, originalPathname, buildManifest, fallbackBuildManifest, nextFontManifest, serverFilesManifest, reactLoadableManifest, prerenderManifest, isDraftMode, isOnDemandRevalidate, revalidateOnlyGenerated, locale, locales, defaultLocale, routerServerContext, nextConfig, resolvedPathname } = prepareResult;
        const isExperimentalCompile = serverFilesManifest == null ? void 0 : (_serverFilesManifest_config = serverFilesManifest.config) == null ? void 0 : (_serverFilesManifest_config_experimental = _serverFilesManifest_config.experimental) == null ? void 0 : _serverFilesManifest_config_experimental.isExperimentalCompile;
        const hasServerProps = Boolean(getServerSideProps);
        const hasStaticProps = Boolean(getStaticProps);
        const hasStaticPaths = Boolean(getStaticPaths);
        const hasGetInitialProps = Boolean((userland.default || userland).getInitialProps);
        const isAmp = query.amp && (config == null ? void 0 : config.amp);
        let cacheKey = null;
        let isIsrFallback = false;
        let isNextDataRequest = prepareResult.isNextDataRequest && (hasStaticProps || hasServerProps);
        const is404Page = srcPage === '/404';
        const is500Page = srcPage === '/500';
        const isErrorPage = srcPage === '/_error';
        if (!routeModule.isDev && !isDraftMode && hasStaticProps) {
            cacheKey = `${locale ? `/${locale}` : ''}${(srcPage === '/' || resolvedPathname === '/') && locale ? '' : resolvedPathname}${isAmp ? '.amp' : ''}`;
            if (is404Page || is500Page || isErrorPage) {
                cacheKey = `${locale ? `/${locale}` : ''}${srcPage}${isAmp ? '.amp' : ''}`;
            }
            // ensure /index and / is normalized to one key
            cacheKey = cacheKey === '/index' ? '/' : cacheKey;
        }
        if (hasStaticPaths && !isDraftMode) {
            const decodedPathname = (0, _removetrailingslash.removeTrailingSlash)(locale ? (0, _addpathprefix.addPathPrefix)(resolvedPathname, `/${locale}`) : resolvedPathname);
            const isPrerendered = Boolean(prerenderManifest.routes[decodedPathname]) || prerenderManifest.notFoundRoutes.includes(decodedPathname);
            const prerenderInfo = prerenderManifest.dynamicRoutes[srcPage];
            if (prerenderInfo) {
                if (prerenderInfo.fallback === false && !isPrerendered) {
                    throw new _nofallbackerrorexternal.NoFallbackError();
                }
                if (typeof prerenderInfo.fallback === 'string' && !isPrerendered && !isNextDataRequest) {
                    isIsrFallback = true;
                }
            }
        }
        // When serving a bot request, we want to serve a blocking render and not
        // the prerendered page. This ensures that the correct content is served
        // to the bot in the head.
        if (isIsrFallback && (0, _isbot.isBot)(req.headers['user-agent'] || '') || (0, _requestmeta.getRequestMeta)(req, 'minimalMode')) {
            isIsrFallback = false;
        }
        const tracer = (0, _tracer.getTracer)();
        const activeSpan = tracer.getActiveScopeSpan();
        try {
            const method = req.method || 'GET';
            const resolvedUrl = (0, _formaturl.formatUrl)({
                pathname: nextConfig.trailingSlash ? parsedUrl.pathname : (0, _removetrailingslash.removeTrailingSlash)(parsedUrl.pathname || '/'),
                // make sure to only add query values from original URL
                query: hasStaticProps ? {} : originalQuery
            });
            const publicRuntimeConfig = (routerServerContext == null ? void 0 : routerServerContext.publicRuntimeConfig) || nextConfig.publicRuntimeConfig;
            const handleResponse = async (span)=>{
                const responseGenerator = async ({ previousCacheEntry })=>{
                    var _previousCacheEntry_value;
                    const doRender = async ()=>{
                        try {
                            var _nextConfig_i18n, _nextConfig_experimental_amp, _nextConfig_experimental_amp1;
                            return await routeModule.render(req, res, {
                                query: hasStaticProps && !isExperimentalCompile ? {
                                    ...params,
                                    ...isAmp ? {
                                        amp: query.amp
                                    } : {}
                                } : {
                                    ...query,
                                    ...params
                                },
                                params,
                                page: srcPage,
                                renderContext: {
                                    isDraftMode,
                                    isFallback: isIsrFallback,
                                    developmentNotFoundSourcePage: (0, _requestmeta.getRequestMeta)(req, 'developmentNotFoundSourcePage')
                                },
                                sharedContext: {
                                    buildId,
                                    customServer: Boolean(routerServerContext == null ? void 0 : routerServerContext.isCustomServer) || undefined,
                                    deploymentId: false
                                },
                                renderOpts: {
                                    params,
                                    routeModule,
                                    page: srcPage,
                                    pageConfig: config || {},
                                    Component: (0, _interopdefault.interopDefault)(userland),
                                    ComponentMod: userland,
                                    getStaticProps,
                                    getStaticPaths,
                                    getServerSideProps,
                                    supportsDynamicResponse: !hasStaticProps,
                                    buildManifest: isFallbackError ? fallbackBuildManifest : buildManifest,
                                    nextFontManifest,
                                    reactLoadableManifest,
                                    assetPrefix: nextConfig.assetPrefix,
                                    previewProps: prerenderManifest.preview,
                                    images: nextConfig.images,
                                    nextConfigOutput: nextConfig.output,
                                    optimizeCss: Boolean(nextConfig.experimental.optimizeCss),
                                    nextScriptWorkers: Boolean(nextConfig.experimental.nextScriptWorkers),
                                    domainLocales: (_nextConfig_i18n = nextConfig.i18n) == null ? void 0 : _nextConfig_i18n.domains,
                                    crossOrigin: nextConfig.crossOrigin,
                                    multiZoneDraftMode,
                                    basePath: nextConfig.basePath,
                                    canonicalBase: nextConfig.amp.canonicalBase || '',
                                    ampOptimizerConfig: (_nextConfig_experimental_amp = nextConfig.experimental.amp) == null ? void 0 : _nextConfig_experimental_amp.optimizer,
                                    disableOptimizedLoading: nextConfig.experimental.disableOptimizedLoading,
                                    largePageDataBytes: nextConfig.experimental.largePageDataBytes,
                                    // Only the `publicRuntimeConfig` key is exposed to the client side
                                    // It'll be rendered as part of __NEXT_DATA__ on the client side
                                    runtimeConfig: Object.keys(publicRuntimeConfig).length > 0 ? publicRuntimeConfig : undefined,
                                    isExperimentalCompile,
                                    experimental: {
                                        clientTraceMetadata: nextConfig.experimental.clientTraceMetadata || []
                                    },
                                    locale,
                                    locales,
                                    defaultLocale,
                                    setIsrStatus: routerServerContext == null ? void 0 : routerServerContext.setIsrStatus,
                                    isNextDataRequest: isNextDataRequest && (hasServerProps || hasStaticProps),
                                    resolvedUrl,
                                    // For getServerSideProps and getInitialProps we need to ensure we use the original URL
                                    // and not the resolved URL to prevent a hydration mismatch on
                                    // asPath
                                    resolvedAsPath: hasServerProps || hasGetInitialProps ? (0, _formaturl.formatUrl)({
                                        // we use the original URL pathname less the _next/data prefix if
                                        // present
                                        pathname: isNextDataRequest ? (0, _normalizedatapath.normalizeDataPath)(originalPathname) : originalPathname,
                                        query: originalQuery
                                    }) : resolvedUrl,
                                    isOnDemandRevalidate,
                                    ErrorDebug: (0, _requestmeta.getRequestMeta)(req, 'PagesErrorDebug'),
                                    err: (0, _requestmeta.getRequestMeta)(req, 'invokeError'),
                                    dev: routeModule.isDev,
                                    // needed for experimental.optimizeCss feature
                                    distDir: _path.default.join(/* turbopackIgnore: true */ process.cwd(), routeModule.relativeProjectDir, routeModule.distDir),
                                    ampSkipValidation: (_nextConfig_experimental_amp1 = nextConfig.experimental.amp) == null ? void 0 : _nextConfig_experimental_amp1.skipValidation,
                                    ampValidator: (0, _requestmeta.getRequestMeta)(req, 'ampValidator')
                                }
                            }).then((renderResult)=>{
                                const { metadata } = renderResult;
                                let cacheControl = metadata.cacheControl;
                                if ('isNotFound' in metadata && metadata.isNotFound) {
                                    return {
                                        value: null,
                                        cacheControl
                                    };
                                }
                                // Handle `isRedirect`.
                                if (metadata.isRedirect) {
                                    return {
                                        value: {
                                            kind: _responsecache.CachedRouteKind.REDIRECT,
                                            props: metadata.pageData ?? metadata.flightData
                                        },
                                        cacheControl
                                    };
                                }
                                return {
                                    value: {
                                        kind: _responsecache.CachedRouteKind.PAGES,
                                        html: renderResult,
                                        pageData: renderResult.metadata.pageData,
                                        headers: renderResult.metadata.headers,
                                        status: renderResult.metadata.statusCode
                                    },
                                    cacheControl
                                };
                            }).finally(()=>{
                                if (!span) return;
                                span.setAttributes({
                                    'http.status_code': res.statusCode,
                                    'next.rsc': false
                                });
                                const rootSpanAttributes = tracer.getRootSpanAttributes();
                                // We were unable to get attributes, probably OTEL is not enabled
                                if (!rootSpanAttributes) {
                                    return;
                                }
                                if (rootSpanAttributes.get('next.span_type') !== _constants.BaseServerSpan.handleRequest) {
                                    console.warn(`Unexpected root span type '${rootSpanAttributes.get('next.span_type')}'. Please report this Next.js issue https://github.com/vercel/next.js`);
                                    return;
                                }
                                const route = rootSpanAttributes.get('next.route');
                                if (route) {
                                    const name = `${method} ${route}`;
                                    span.setAttributes({
                                        'next.route': route,
                                        'http.route': route,
                                        'next.span_name': name
                                    });
                                    span.updateName(name);
                                } else {
                                    span.updateName(`${method} ${req.url}`);
                                }
                            });
                        } catch (err) {
                            // if this is a background revalidate we need to report
                            // the request error here as it won't be bubbled
                            if (previousCacheEntry == null ? void 0 : previousCacheEntry.isStale) {
                                await routeModule.onRequestError(req, err, {
                                    routerKind: 'Pages Router',
                                    routePath: srcPage,
                                    routeType: 'render',
                                    revalidateReason: (0, _utils.getRevalidateReason)({
                                        isRevalidate: hasStaticProps,
                                        isOnDemandRevalidate
                                    })
                                }, routerServerContext);
                            }
                            throw err;
                        }
                    };
                    // if we've already generated this page we no longer
                    // serve the fallback
                    if (previousCacheEntry) {
                        isIsrFallback = false;
                    }
                    if (isIsrFallback) {
                        const fallbackResponse = await routeModule.getResponseCache(req).get(routeModule.isDev ? null : locale ? `/${locale}${srcPage}` : srcPage, async ({ previousCacheEntry: previousFallbackCacheEntry = null })=>{
                            if (!routeModule.isDev) {
                                return (0, _utils2.toResponseCacheEntry)(previousFallbackCacheEntry);
                            }
                            return doRender();
                        }, {
                            routeKind: _routekind.RouteKind.PAGES,
                            isFallback: true,
                            isRoutePPREnabled: false,
                            isOnDemandRevalidate: false,
                            incrementalCache: await routeModule.getIncrementalCache(req, nextConfig, prerenderManifest),
                            waitUntil: ctx.waitUntil
                        });
                        if (fallbackResponse) {
                            // Remove the cache control from the response to prevent it from being
                            // used in the surrounding cache.
                            delete fallbackResponse.cacheControl;
                            fallbackResponse.isMiss = true;
                            return fallbackResponse;
                        }
                    }
                    if (!(0, _requestmeta.getRequestMeta)(req, 'minimalMode') && isOnDemandRevalidate && revalidateOnlyGenerated && !previousCacheEntry) {
                        res.statusCode = 404;
                        // on-demand revalidate always sets this header
                        res.setHeader('x-nextjs-cache', 'REVALIDATED');
                        res.end('This page could not be found');
                        return null;
                    }
                    if (isIsrFallback && (previousCacheEntry == null ? void 0 : (_previousCacheEntry_value = previousCacheEntry.value) == null ? void 0 : _previousCacheEntry_value.kind) === _responsecache.CachedRouteKind.PAGES) {
                        return {
                            value: {
                                kind: _responsecache.CachedRouteKind.PAGES,
                                html: new _renderresult.default(previousCacheEntry.value.html, {
                                    contentType: _constants1.HTML_CONTENT_TYPE_HEADER,
                                    metadata: {
                                        statusCode: previousCacheEntry.value.status,
                                        headers: previousCacheEntry.value.headers
                                    }
                                }),
                                pageData: {},
                                status: previousCacheEntry.value.status,
                                headers: previousCacheEntry.value.headers
                            },
                            cacheControl: {
                                revalidate: 0,
                                expire: undefined
                            }
                        };
                    }
                    return doRender();
                };
                const result = await routeModule.handleResponse({
                    cacheKey,
                    req,
                    nextConfig,
                    routeKind: _routekind.RouteKind.PAGES,
                    isOnDemandRevalidate,
                    revalidateOnlyGenerated,
                    waitUntil: ctx.waitUntil,
                    responseGenerator: responseGenerator,
                    prerenderManifest
                });
                // if we got a cache hit this wasn't an ISR fallback
                // but it wasn't generated during build so isn't in the
                // prerender-manifest
                if (isIsrFallback && !(result == null ? void 0 : result.isMiss)) {
                    isIsrFallback = false;
                }
                // response is finished is no cache entry
                if (!result) {
                    return;
                }
                if (hasStaticProps && !(0, _requestmeta.getRequestMeta)(req, 'minimalMode')) {
                    res.setHeader('x-nextjs-cache', isOnDemandRevalidate ? 'REVALIDATED' : result.isMiss ? 'MISS' : result.isStale ? 'STALE' : 'HIT');
                }
                let cacheControl;
                if (!hasStaticProps || isIsrFallback) {
                    if (!res.getHeader('Cache-Control')) {
                        cacheControl = {
                            revalidate: 0,
                            expire: undefined
                        };
                    }
                } else if (is404Page) {
                    const notFoundRevalidate = (0, _requestmeta.getRequestMeta)(req, 'notFoundRevalidate');
                    cacheControl = {
                        revalidate: typeof notFoundRevalidate === 'undefined' ? 0 : notFoundRevalidate,
                        expire: undefined
                    };
                } else if (is500Page) {
                    cacheControl = {
                        revalidate: 0,
                        expire: undefined
                    };
                } else if (result.cacheControl) {
                    // If the cache entry has a cache control with a revalidate value that's
                    // a number, use it.
                    if (typeof result.cacheControl.revalidate === 'number') {
                        var _result_cacheControl;
                        if (result.cacheControl.revalidate < 1) {
                            throw Object.defineProperty(new Error(`Invalid revalidate configuration provided: ${result.cacheControl.revalidate} < 1`), "__NEXT_ERROR_CODE", {
                                value: "E22",
                                enumerable: false,
                                configurable: true
                            });
                        }
                        cacheControl = {
                            revalidate: result.cacheControl.revalidate,
                            expire: ((_result_cacheControl = result.cacheControl) == null ? void 0 : _result_cacheControl.expire) ?? nextConfig.expireTime
                        };
                    } else {
                        // revalidate: false
                        cacheControl = {
                            revalidate: _constants1.CACHE_ONE_YEAR,
                            expire: undefined
                        };
                    }
                }
                // If cache control is already set on the response we don't
                // override it to allow users to customize it via next.config
                if (cacheControl && !res.getHeader('Cache-Control')) {
                    res.setHeader('Cache-Control', (0, _cachecontrol.getCacheControlHeader)(cacheControl));
                }
                // notFound: true case
                if (!result.value) {
                    var _result_cacheControl1;
                    // add revalidate metadata before rendering 404 page
                    // so that we can use this as source of truth for the
                    // cache-control header instead of what the 404 page returns
                    // for the revalidate value
                    (0, _requestmeta.addRequestMeta)(req, 'notFoundRevalidate', (_result_cacheControl1 = result.cacheControl) == null ? void 0 : _result_cacheControl1.revalidate);
                    res.statusCode = 404;
                    if (isNextDataRequest) {
                        res.end('{"notFound":true}');
                        return;
                    }
                    // TODO: should route-module itself handle rendering the 404
                    if (routerServerContext == null ? void 0 : routerServerContext.render404) {
                        await routerServerContext.render404(req, res, parsedUrl, false);
                    } else {
                        res.end('This page could not be found');
                    }
                    return;
                }
                if (result.value.kind === _responsecache.CachedRouteKind.REDIRECT) {
                    if (isNextDataRequest) {
                        res.setHeader('content-type', _constants1.JSON_CONTENT_TYPE_HEADER);
                        res.end(JSON.stringify(result.value.props));
                        return;
                    } else {
                        const handleRedirect = (pageData)=>{
                            const redirect = {
                                destination: pageData.pageProps.__N_REDIRECT,
                                statusCode: pageData.pageProps.__N_REDIRECT_STATUS,
                                basePath: pageData.pageProps.__N_REDIRECT_BASE_PATH
                            };
                            const statusCode = (0, _redirectstatus.getRedirectStatus)(redirect);
                            const { basePath } = nextConfig;
                            if (basePath && redirect.basePath !== false && redirect.destination.startsWith('/')) {
                                redirect.destination = `${basePath}${redirect.destination}`;
                            }
                            if (redirect.destination.startsWith('/')) {
                                redirect.destination = (0, _utils1.normalizeRepeatedSlashes)(redirect.destination);
                            }
                            res.statusCode = statusCode;
                            res.setHeader('Location', redirect.destination);
                            if (statusCode === _redirectstatuscode.RedirectStatusCode.PermanentRedirect) {
                                res.setHeader('Refresh', `0;url=${redirect.destination}`);
                            }
                            res.end(redirect.destination);
                        };
                        await handleRedirect(result.value.props);
                        return null;
                    }
                }
                if (result.value.kind !== _responsecache.CachedRouteKind.PAGES) {
                    throw Object.defineProperty(new Error(`Invariant: received non-pages cache entry in pages handler`), "__NEXT_ERROR_CODE", {
                        value: "E695",
                        enumerable: false,
                        configurable: true
                    });
                }
                // In dev, we should not cache pages for any reason.
                if (routeModule.isDev) {
                    res.setHeader('Cache-Control', 'no-store, must-revalidate');
                }
                // Draft mode should never be cached
                if (isDraftMode) {
                    res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
                }
                // when invoking _error before pages/500 we don't actually
                // send the _error response
                if ((0, _requestmeta.getRequestMeta)(req, 'customErrorRender') || isErrorPage && (0, _requestmeta.getRequestMeta)(req, 'minimalMode') && res.statusCode === 500) {
                    return null;
                }
                await (0, _sendpayload.sendRenderResult)({
                    req,
                    res,
                    // If we are rendering the error page it's not a data request
                    // anymore
                    result: isNextDataRequest && !isErrorPage && !is500Page ? new _renderresult.default(JSON.stringify(result.value.pageData), {
                        contentType: _constants1.JSON_CONTENT_TYPE_HEADER,
                        metadata: result.value.html.metadata
                    }) : result.value.html,
                    generateEtags: nextConfig.generateEtags,
                    poweredByHeader: nextConfig.poweredByHeader,
                    cacheControl: routeModule.isDev ? undefined : cacheControl
                });
            };
            // TODO: activeSpan code path is for when wrapped by
            // next-server can be removed when this is no longer used
            if (activeSpan) {
                await handleResponse();
            } else {
                await tracer.withPropagatedContext(req.headers, ()=>tracer.trace(_constants.BaseServerSpan.handleRequest, {
                        spanName: `${method} ${req.url}`,
                        kind: _tracer.SpanKind.SERVER,
                        attributes: {
                            'http.method': method,
                            'http.target': req.url
                        }
                    }, handleResponse));
            }
        } catch (err) {
            if (!(err instanceof _nofallbackerrorexternal.NoFallbackError)) {
                await routeModule.onRequestError(req, err, {
                    routerKind: 'Pages Router',
                    routePath: srcPage,
                    routeType: 'render',
                    revalidateReason: (0, _utils.getRevalidateReason)({
                        isRevalidate: hasStaticProps,
                        isOnDemandRevalidate
                    })
                }, routerServerContext);
            }
            // rethrow so that we can handle serving error page
            throw err;
        }
    };
};

//# sourceMappingURL=pages-handler.js.map

/***/ }),

/***/ 12569:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "NextURL", ({
    enumerable: true,
    get: function() {
        return NextURL;
    }
}));
const _detectdomainlocale = __webpack_require__(49326);
const _formatnextpathnameinfo = __webpack_require__(17035);
const _gethostname = __webpack_require__(5242);
const _getnextpathnameinfo = __webpack_require__(36732);
const REGEX_LOCALHOST_HOSTNAME = /(?!^https?:\/\/)(127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1\]|localhost)/;
function parseURL(url, base) {
    return new URL(String(url).replace(REGEX_LOCALHOST_HOSTNAME, 'localhost'), base && String(base).replace(REGEX_LOCALHOST_HOSTNAME, 'localhost'));
}
const Internal = Symbol('NextURLInternal');
class NextURL {
    constructor(input, baseOrOpts, opts){
        let base;
        let options;
        if (typeof baseOrOpts === 'object' && 'pathname' in baseOrOpts || typeof baseOrOpts === 'string') {
            base = baseOrOpts;
            options = opts || {};
        } else {
            options = opts || baseOrOpts || {};
        }
        this[Internal] = {
            url: parseURL(input, base ?? options.base),
            options: options,
            basePath: ''
        };
        this.analyze();
    }
    analyze() {
        var _this_Internal_options_nextConfig_i18n, _this_Internal_options_nextConfig, _this_Internal_domainLocale, _this_Internal_options_nextConfig_i18n1, _this_Internal_options_nextConfig1;
        const info = (0, _getnextpathnameinfo.getNextPathnameInfo)(this[Internal].url.pathname, {
            nextConfig: this[Internal].options.nextConfig,
            parseData: !undefined,
            i18nProvider: this[Internal].options.i18nProvider
        });
        const hostname = (0, _gethostname.getHostname)(this[Internal].url, this[Internal].options.headers);
        this[Internal].domainLocale = this[Internal].options.i18nProvider ? this[Internal].options.i18nProvider.detectDomainLocale(hostname) : (0, _detectdomainlocale.detectDomainLocale)((_this_Internal_options_nextConfig = this[Internal].options.nextConfig) == null ? void 0 : (_this_Internal_options_nextConfig_i18n = _this_Internal_options_nextConfig.i18n) == null ? void 0 : _this_Internal_options_nextConfig_i18n.domains, hostname);
        const defaultLocale = ((_this_Internal_domainLocale = this[Internal].domainLocale) == null ? void 0 : _this_Internal_domainLocale.defaultLocale) || ((_this_Internal_options_nextConfig1 = this[Internal].options.nextConfig) == null ? void 0 : (_this_Internal_options_nextConfig_i18n1 = _this_Internal_options_nextConfig1.i18n) == null ? void 0 : _this_Internal_options_nextConfig_i18n1.defaultLocale);
        this[Internal].url.pathname = info.pathname;
        this[Internal].defaultLocale = defaultLocale;
        this[Internal].basePath = info.basePath ?? '';
        this[Internal].buildId = info.buildId;
        this[Internal].locale = info.locale ?? defaultLocale;
        this[Internal].trailingSlash = info.trailingSlash;
    }
    formatPathname() {
        return (0, _formatnextpathnameinfo.formatNextPathnameInfo)({
            basePath: this[Internal].basePath,
            buildId: this[Internal].buildId,
            defaultLocale: !this[Internal].options.forceLocale ? this[Internal].defaultLocale : undefined,
            locale: this[Internal].locale,
            pathname: this[Internal].url.pathname,
            trailingSlash: this[Internal].trailingSlash
        });
    }
    formatSearch() {
        return this[Internal].url.search;
    }
    get buildId() {
        return this[Internal].buildId;
    }
    set buildId(buildId) {
        this[Internal].buildId = buildId;
    }
    get locale() {
        return this[Internal].locale ?? '';
    }
    set locale(locale) {
        var _this_Internal_options_nextConfig_i18n, _this_Internal_options_nextConfig;
        if (!this[Internal].locale || !((_this_Internal_options_nextConfig = this[Internal].options.nextConfig) == null ? void 0 : (_this_Internal_options_nextConfig_i18n = _this_Internal_options_nextConfig.i18n) == null ? void 0 : _this_Internal_options_nextConfig_i18n.locales.includes(locale))) {
            throw Object.defineProperty(new TypeError(`The NextURL configuration includes no locale "${locale}"`), "__NEXT_ERROR_CODE", {
                value: "E597",
                enumerable: false,
                configurable: true
            });
        }
        this[Internal].locale = locale;
    }
    get defaultLocale() {
        return this[Internal].defaultLocale;
    }
    get domainLocale() {
        return this[Internal].domainLocale;
    }
    get searchParams() {
        return this[Internal].url.searchParams;
    }
    get host() {
        return this[Internal].url.host;
    }
    set host(value) {
        this[Internal].url.host = value;
    }
    get hostname() {
        return this[Internal].url.hostname;
    }
    set hostname(value) {
        this[Internal].url.hostname = value;
    }
    get port() {
        return this[Internal].url.port;
    }
    set port(value) {
        this[Internal].url.port = value;
    }
    get protocol() {
        return this[Internal].url.protocol;
    }
    set protocol(value) {
        this[Internal].url.protocol = value;
    }
    get href() {
        const pathname = this.formatPathname();
        const search = this.formatSearch();
        return `${this.protocol}//${this.host}${pathname}${search}${this.hash}`;
    }
    set href(url) {
        this[Internal].url = parseURL(url);
        this.analyze();
    }
    get origin() {
        return this[Internal].url.origin;
    }
    get pathname() {
        return this[Internal].url.pathname;
    }
    set pathname(value) {
        this[Internal].url.pathname = value;
    }
    get hash() {
        return this[Internal].url.hash;
    }
    set hash(value) {
        this[Internal].url.hash = value;
    }
    get search() {
        return this[Internal].url.search;
    }
    set search(value) {
        this[Internal].url.search = value;
    }
    get password() {
        return this[Internal].url.password;
    }
    set password(value) {
        this[Internal].url.password = value;
    }
    get username() {
        return this[Internal].url.username;
    }
    set username(value) {
        this[Internal].url.username = value;
    }
    get basePath() {
        return this[Internal].basePath;
    }
    set basePath(value) {
        this[Internal].basePath = value.startsWith('/') ? value : `/${value}`;
    }
    toString() {
        return this.href;
    }
    toJSON() {
        return this.href;
    }
    [Symbol.for('edge-runtime.inspect.custom')]() {
        return {
            href: this.href,
            origin: this.origin,
            protocol: this.protocol,
            username: this.username,
            password: this.password,
            host: this.host,
            hostname: this.hostname,
            port: this.port,
            pathname: this.pathname,
            search: this.search,
            searchParams: this.searchParams,
            hash: this.hash
        };
    }
    clone() {
        return new NextURL(String(this), this[Internal].options);
    }
}

//# sourceMappingURL=next-url.js.map

/***/ }),

/***/ 13196:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "addLocale", ({
    enumerable: true,
    get: function() {
        return addLocale;
    }
}));
const _addpathprefix = __webpack_require__(74420);
const _pathhasprefix = __webpack_require__(23403);
function addLocale(path, locale, defaultLocale, ignorePrefix) {
    // If no locale was given or the locale is the default locale, we don't need
    // to prefix the path.
    if (!locale || locale === defaultLocale) return path;
    const lower = path.toLowerCase();
    // If the path is an API path or the path already has the locale prefix, we
    // don't need to prefix the path.
    if (!ignorePrefix) {
        if ((0, _pathhasprefix.pathHasPrefix)(lower, '/api')) return path;
        if ((0, _pathhasprefix.pathHasPrefix)(lower, "/" + locale.toLowerCase())) return path;
    }
    // Add the locale prefix to the path.
    return (0, _addpathprefix.addPathPrefix)(path, "/" + locale);
} //# sourceMappingURL=add-locale.js.map


/***/ }),

/***/ 13866:
/***/ ((module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "RedirectStatusCode", ({
    enumerable: true,
    get: function() {
        return RedirectStatusCode;
    }
}));
var RedirectStatusCode = /*#__PURE__*/ function(RedirectStatusCode) {
    RedirectStatusCode[RedirectStatusCode["SeeOther"] = 303] = "SeeOther";
    RedirectStatusCode[RedirectStatusCode["TemporaryRedirect"] = 307] = "TemporaryRedirect";
    RedirectStatusCode[RedirectStatusCode["PermanentRedirect"] = 308] = "PermanentRedirect";
    return RedirectStatusCode;
}({});
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=redirect-status-code.js.map


/***/ }),

/***/ 14157:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "default", ({
    enumerable: true,
    get: function() {
        return SideEffect;
    }
}));
const _react = __webpack_require__(82015);
const isServer = "undefined" === 'undefined';
const useClientOnlyLayoutEffect = isServer ? ()=>{} : _react.useLayoutEffect;
const useClientOnlyEffect = isServer ? ()=>{} : _react.useEffect;
function SideEffect(props) {
    const { headManager, reduceComponentsToState } = props;
    function emitChange() {
        if (headManager && headManager.mountedInstances) {
            const headElements = _react.Children.toArray(Array.from(headManager.mountedInstances).filter(Boolean));
            headManager.updateHead(reduceComponentsToState(headElements, props));
        }
    }
    if (isServer) {
        var _headManager_mountedInstances;
        headManager == null ? void 0 : (_headManager_mountedInstances = headManager.mountedInstances) == null ? void 0 : _headManager_mountedInstances.add(props.children);
        emitChange();
    }
    useClientOnlyLayoutEffect(()=>{
        var _headManager_mountedInstances;
        headManager == null ? void 0 : (_headManager_mountedInstances = headManager.mountedInstances) == null ? void 0 : _headManager_mountedInstances.add(props.children);
        return ()=>{
            var _headManager_mountedInstances;
            headManager == null ? void 0 : (_headManager_mountedInstances = headManager.mountedInstances) == null ? void 0 : _headManager_mountedInstances.delete(props.children);
        };
    });
    // We need to call `updateHead` method whenever the `SideEffect` is trigger in all
    // life-cycles: mount, update, unmount. However, if there are multiple `SideEffect`s
    // being rendered, we only trigger the method from the last one.
    // This is ensured by keeping the last unflushed `updateHead` in the `_pendingUpdate`
    // singleton in the layout effect pass, and actually trigger it in the effect pass.
    useClientOnlyLayoutEffect(()=>{
        if (headManager) {
            headManager._pendingUpdate = emitChange;
        }
        return ()=>{
            if (headManager) {
                headManager._pendingUpdate = emitChange;
            }
        };
    });
    useClientOnlyEffect(()=>{
        if (headManager && headManager._pendingUpdate) {
            headManager._pendingUpdate();
            headManager._pendingUpdate = null;
        }
        return ()=>{
            if (headManager && headManager._pendingUpdate) {
                headManager._pendingUpdate();
                headManager._pendingUpdate = null;
            }
        };
    });
    return null;
} //# sourceMappingURL=side-effect.js.map


/***/ }),

/***/ 17035:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "formatNextPathnameInfo", ({
    enumerable: true,
    get: function() {
        return formatNextPathnameInfo;
    }
}));
const _removetrailingslash = __webpack_require__(4325);
const _addpathprefix = __webpack_require__(74420);
const _addpathsuffix = __webpack_require__(56011);
const _addlocale = __webpack_require__(13196);
function formatNextPathnameInfo(info) {
    let pathname = (0, _addlocale.addLocale)(info.pathname, info.locale, info.buildId ? undefined : info.defaultLocale, info.ignorePrefix);
    if (info.buildId || !info.trailingSlash) {
        pathname = (0, _removetrailingslash.removeTrailingSlash)(pathname);
    }
    if (info.buildId) {
        pathname = (0, _addpathsuffix.addPathSuffix)((0, _addpathprefix.addPathPrefix)(pathname, "/_next/data/" + info.buildId), info.pathname === '/' ? 'index.json' : '.json');
    }
    pathname = (0, _addpathprefix.addPathPrefix)(pathname, info.basePath);
    return !info.buildId && info.trailingSlash ? !pathname.endsWith('/') ? (0, _addpathsuffix.addPathSuffix)(pathname, '/') : pathname : (0, _removetrailingslash.removeTrailingSlash)(pathname);
} //# sourceMappingURL=format-next-pathname-info.js.map


/***/ }),

/***/ 18164:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    sendEtagResponse: function() {
        return sendEtagResponse;
    },
    sendRenderResult: function() {
        return sendRenderResult;
    }
});
const _utils = __webpack_require__(76915);
const _etag = __webpack_require__(42956);
const _fresh = /*#__PURE__*/ _interop_require_default(__webpack_require__(80020));
const _cachecontrol = __webpack_require__(56755);
const _constants = __webpack_require__(32072);
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function sendEtagResponse(req, res, etag) {
    if (etag) {
        /**
     * The server generating a 304 response MUST generate any of the
     * following header fields that would have been sent in a 200 (OK)
     * response to the same request: Cache-Control, Content-Location, Date,
     * ETag, Expires, and Vary. https://tools.ietf.org/html/rfc7232#section-4.1
     */ res.setHeader('ETag', etag);
    }
    if ((0, _fresh.default)(req.headers, {
        etag
    })) {
        res.statusCode = 304;
        res.end();
        return true;
    }
    return false;
}
async function sendRenderResult({ req, res, result, generateEtags, poweredByHeader, cacheControl }) {
    if ((0, _utils.isResSent)(res)) {
        return;
    }
    if (poweredByHeader && result.contentType === _constants.HTML_CONTENT_TYPE_HEADER) {
        res.setHeader('X-Powered-By', 'Next.js');
    }
    // If cache control is already set on the response we don't
    // override it to allow users to customize it via next.config
    if (cacheControl && !res.getHeader('Cache-Control')) {
        res.setHeader('Cache-Control', (0, _cachecontrol.getCacheControlHeader)(cacheControl));
    }
    const payload = result.isDynamic ? null : result.toUnchunkedString();
    if (generateEtags && payload !== null) {
        const etag = (0, _etag.generateETag)(payload);
        if (sendEtagResponse(req, res, etag)) {
            return;
        }
    }
    if (!res.getHeader('Content-Type') && result.contentType) {
        res.setHeader('Content-Type', result.contentType);
    }
    if (payload) {
        res.setHeader('Content-Length', Buffer.byteLength(payload));
    }
    if (req.method === 'HEAD') {
        res.end(null);
        return;
    }
    if (payload !== null) {
        res.end(payload);
        return;
    }
    // Pipe the render result to the response after we get a writer for it.
    await result.pipeToNodeResponse(res);
}

//# sourceMappingURL=send-payload.js.map

/***/ }),

/***/ 20051:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/**
 * Node in the doubly-linked list used for LRU tracking.
 * Each node represents a cache entry with bidirectional pointers.
 */ 
Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "LRUCache", ({
    enumerable: true,
    get: function() {
        return LRUCache;
    }
}));
class LRUNode {
    constructor(key, data, size){
        this.prev = null;
        this.next = null;
        this.key = key;
        this.data = data;
        this.size = size;
    }
}
/**
 * Sentinel node used for head/tail boundaries.
 * These nodes don't contain actual cache data but simplify list operations.
 */ class SentinelNode {
    constructor(){
        this.prev = null;
        this.next = null;
    }
}
class LRUCache {
    constructor(maxSize, calculateSize, onEvict){
        this.cache = new Map();
        this.totalSize = 0;
        this.maxSize = maxSize;
        this.calculateSize = calculateSize;
        this.onEvict = onEvict;
        // Create sentinel nodes to simplify doubly-linked list operations
        // HEAD <-> TAIL (empty list)
        this.head = new SentinelNode();
        this.tail = new SentinelNode();
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }
    /**
   * Adds a node immediately after the head (marks as most recently used).
   * Used when inserting new items or when an item is accessed.
   * PRECONDITION: node must be disconnected (prev/next should be null)
   */ addToHead(node) {
        node.prev = this.head;
        node.next = this.head.next;
        // head.next is always non-null (points to tail or another node)
        this.head.next.prev = node;
        this.head.next = node;
    }
    /**
   * Removes a node from its current position in the doubly-linked list.
   * Updates the prev/next pointers of adjacent nodes to maintain list integrity.
   * PRECONDITION: node must be connected (prev/next are non-null)
   */ removeNode(node) {
        // Connected nodes always have non-null prev/next
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    /**
   * Moves an existing node to the head position (marks as most recently used).
   * This is the core LRU operation - accessed items become most recent.
   */ moveToHead(node) {
        this.removeNode(node);
        this.addToHead(node);
    }
    /**
   * Removes and returns the least recently used node (the one before tail).
   * This is called during eviction when the cache exceeds capacity.
   * PRECONDITION: cache is not empty (ensured by caller)
   */ removeTail() {
        const lastNode = this.tail.prev;
        // tail.prev is always non-null and always LRUNode when cache is not empty
        this.removeNode(lastNode);
        return lastNode;
    }
    /**
   * Sets a key-value pair in the cache.
   * If the key exists, updates the value and moves to head.
   * If new, adds at head and evicts from tail if necessary.
   *
   * Time Complexity:
   * - O(1) for uniform item sizes
   * - O(k) where k is the number of items evicted (can be O(N) for variable sizes)
   */ set(key, value) {
        const size = (this.calculateSize == null ? void 0 : this.calculateSize.call(this, value)) ?? 1;
        if (size <= 0) {
            throw Object.defineProperty(new Error(`LRUCache: calculateSize returned ${size}, but size must be > 0. ` + `Items with size 0 would never be evicted, causing unbounded cache growth.`), "__NEXT_ERROR_CODE", {
                value: "E789",
                enumerable: false,
                configurable: true
            });
        }
        if (size > this.maxSize) {
            console.warn('Single item size exceeds maxSize');
            return false;
        }
        const existing = this.cache.get(key);
        if (existing) {
            // Update existing node: adjust size and move to head (most recent)
            existing.data = value;
            this.totalSize = this.totalSize - existing.size + size;
            existing.size = size;
            this.moveToHead(existing);
        } else {
            // Add new node at head (most recent position)
            const newNode = new LRUNode(key, value, size);
            this.cache.set(key, newNode);
            this.addToHead(newNode);
            this.totalSize += size;
        }
        // Evict least recently used items until under capacity
        while(this.totalSize > this.maxSize && this.cache.size > 0){
            const tail = this.removeTail();
            this.cache.delete(tail.key);
            this.totalSize -= tail.size;
            this.onEvict == null ? void 0 : this.onEvict.call(this, tail.key, tail.data);
        }
        return true;
    }
    /**
   * Checks if a key exists in the cache.
   * This is a pure query operation - does NOT update LRU order.
   *
   * Time Complexity: O(1)
   */ has(key) {
        return this.cache.has(key);
    }
    /**
   * Retrieves a value by key and marks it as most recently used.
   * Moving to head maintains the LRU property for future evictions.
   *
   * Time Complexity: O(1)
   */ get(key) {
        const node = this.cache.get(key);
        if (!node) return undefined;
        // Mark as most recently used by moving to head
        this.moveToHead(node);
        return node.data;
    }
    /**
   * Returns an iterator over the cache entries. The order is outputted in the
   * order of most recently used to least recently used.
   */ *[Symbol.iterator]() {
        let current = this.head.next;
        while(current && current !== this.tail){
            // Between head and tail, current is always LRUNode
            const node = current;
            yield [
                node.key,
                node.data
            ];
            current = current.next;
        }
    }
    /**
   * Removes a specific key from the cache.
   * Updates both the hash map and doubly-linked list.
   *
   * Note: This is an explicit removal and does NOT trigger the `onEvict`
   * callback. Use this for intentional deletions where eviction tracking
   * is not needed.
   *
   * Time Complexity: O(1)
   */ remove(key) {
        const node = this.cache.get(key);
        if (!node) return;
        this.removeNode(node);
        this.cache.delete(key);
        this.totalSize -= node.size;
    }
    /**
   * Returns the number of items in the cache.
   */ get size() {
        return this.cache.size;
    }
    /**
   * Returns the current total size of all cached items.
   * This uses the custom size calculation if provided.
   */ get currentSize() {
        return this.totalSize;
    }
}

//# sourceMappingURL=lru-cache.js.map

/***/ }),

/***/ 21509:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    CachedRouteKind: function() {
        return CachedRouteKind;
    },
    IncrementalCacheKind: function() {
        return IncrementalCacheKind;
    }
});
var CachedRouteKind = /*#__PURE__*/ function(CachedRouteKind) {
    CachedRouteKind["APP_PAGE"] = "APP_PAGE";
    CachedRouteKind["APP_ROUTE"] = "APP_ROUTE";
    CachedRouteKind["PAGES"] = "PAGES";
    CachedRouteKind["FETCH"] = "FETCH";
    CachedRouteKind["REDIRECT"] = "REDIRECT";
    CachedRouteKind["IMAGE"] = "IMAGE";
    return CachedRouteKind;
}({});
var IncrementalCacheKind = /*#__PURE__*/ function(IncrementalCacheKind) {
    IncrementalCacheKind["APP_PAGE"] = "APP_PAGE";
    IncrementalCacheKind["APP_ROUTE"] = "APP_ROUTE";
    IncrementalCacheKind["PAGES"] = "PAGES";
    IncrementalCacheKind["FETCH"] = "FETCH";
    IncrementalCacheKind["IMAGE"] = "IMAGE";
    return IncrementalCacheKind;
}({});

//# sourceMappingURL=types.js.map

/***/ }),

/***/ 23403:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "pathHasPrefix", ({
    enumerable: true,
    get: function() {
        return pathHasPrefix;
    }
}));
const _parsepath = __webpack_require__(34435);
function pathHasPrefix(path, prefix) {
    if (typeof path !== 'string') {
        return false;
    }
    const { pathname } = (0, _parsepath.parsePath)(path);
    return pathname === prefix || pathname.startsWith(prefix + '/');
} //# sourceMappingURL=path-has-prefix.js.map


/***/ }),

/***/ 25080:
/***/ ((module) => {

"use strict";

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  RequestCookies: () => RequestCookies,
  ResponseCookies: () => ResponseCookies,
  parseCookie: () => parseCookie,
  parseSetCookie: () => parseSetCookie,
  stringifyCookie: () => stringifyCookie
});
module.exports = __toCommonJS(src_exports);

// src/serialize.ts
function stringifyCookie(c) {
  var _a;
  const attrs = [
    "path" in c && c.path && `Path=${c.path}`,
    "expires" in c && (c.expires || c.expires === 0) && `Expires=${(typeof c.expires === "number" ? new Date(c.expires) : c.expires).toUTCString()}`,
    "maxAge" in c && typeof c.maxAge === "number" && `Max-Age=${c.maxAge}`,
    "domain" in c && c.domain && `Domain=${c.domain}`,
    "secure" in c && c.secure && "Secure",
    "httpOnly" in c && c.httpOnly && "HttpOnly",
    "sameSite" in c && c.sameSite && `SameSite=${c.sameSite}`,
    "partitioned" in c && c.partitioned && "Partitioned",
    "priority" in c && c.priority && `Priority=${c.priority}`
  ].filter(Boolean);
  const stringified = `${c.name}=${encodeURIComponent((_a = c.value) != null ? _a : "")}`;
  return attrs.length === 0 ? stringified : `${stringified}; ${attrs.join("; ")}`;
}
function parseCookie(cookie) {
  const map = /* @__PURE__ */ new Map();
  for (const pair of cookie.split(/; */)) {
    if (!pair)
      continue;
    const splitAt = pair.indexOf("=");
    if (splitAt === -1) {
      map.set(pair, "true");
      continue;
    }
    const [key, value] = [pair.slice(0, splitAt), pair.slice(splitAt + 1)];
    try {
      map.set(key, decodeURIComponent(value != null ? value : "true"));
    } catch {
    }
  }
  return map;
}
function parseSetCookie(setCookie) {
  if (!setCookie) {
    return void 0;
  }
  const [[name, value], ...attributes] = parseCookie(setCookie);
  const {
    domain,
    expires,
    httponly,
    maxage,
    path,
    samesite,
    secure,
    partitioned,
    priority
  } = Object.fromEntries(
    attributes.map(([key, value2]) => [
      key.toLowerCase().replace(/-/g, ""),
      value2
    ])
  );
  const cookie = {
    name,
    value: decodeURIComponent(value),
    domain,
    ...expires && { expires: new Date(expires) },
    ...httponly && { httpOnly: true },
    ...typeof maxage === "string" && { maxAge: Number(maxage) },
    path,
    ...samesite && { sameSite: parseSameSite(samesite) },
    ...secure && { secure: true },
    ...priority && { priority: parsePriority(priority) },
    ...partitioned && { partitioned: true }
  };
  return compact(cookie);
}
function compact(t) {
  const newT = {};
  for (const key in t) {
    if (t[key]) {
      newT[key] = t[key];
    }
  }
  return newT;
}
var SAME_SITE = ["strict", "lax", "none"];
function parseSameSite(string) {
  string = string.toLowerCase();
  return SAME_SITE.includes(string) ? string : void 0;
}
var PRIORITY = ["low", "medium", "high"];
function parsePriority(string) {
  string = string.toLowerCase();
  return PRIORITY.includes(string) ? string : void 0;
}
function splitCookiesString(cookiesString) {
  if (!cookiesString)
    return [];
  var cookiesStrings = [];
  var pos = 0;
  var start;
  var ch;
  var lastComma;
  var nextStart;
  var cookiesSeparatorFound;
  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  }
  function notSpecialChar() {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  }
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.substring(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
    }
  }
  return cookiesStrings;
}

// src/request-cookies.ts
var RequestCookies = class {
  constructor(requestHeaders) {
    /** @internal */
    this._parsed = /* @__PURE__ */ new Map();
    this._headers = requestHeaders;
    const header = requestHeaders.get("cookie");
    if (header) {
      const parsed = parseCookie(header);
      for (const [name, value] of parsed) {
        this._parsed.set(name, { name, value });
      }
    }
  }
  [Symbol.iterator]() {
    return this._parsed[Symbol.iterator]();
  }
  /**
   * The amount of cookies received from the client
   */
  get size() {
    return this._parsed.size;
  }
  get(...args) {
    const name = typeof args[0] === "string" ? args[0] : args[0].name;
    return this._parsed.get(name);
  }
  getAll(...args) {
    var _a;
    const all = Array.from(this._parsed);
    if (!args.length) {
      return all.map(([_, value]) => value);
    }
    const name = typeof args[0] === "string" ? args[0] : (_a = args[0]) == null ? void 0 : _a.name;
    return all.filter(([n]) => n === name).map(([_, value]) => value);
  }
  has(name) {
    return this._parsed.has(name);
  }
  set(...args) {
    const [name, value] = args.length === 1 ? [args[0].name, args[0].value] : args;
    const map = this._parsed;
    map.set(name, { name, value });
    this._headers.set(
      "cookie",
      Array.from(map).map(([_, value2]) => stringifyCookie(value2)).join("; ")
    );
    return this;
  }
  /**
   * Delete the cookies matching the passed name or names in the request.
   */
  delete(names) {
    const map = this._parsed;
    const result = !Array.isArray(names) ? map.delete(names) : names.map((name) => map.delete(name));
    this._headers.set(
      "cookie",
      Array.from(map).map(([_, value]) => stringifyCookie(value)).join("; ")
    );
    return result;
  }
  /**
   * Delete all the cookies in the cookies in the request.
   */
  clear() {
    this.delete(Array.from(this._parsed.keys()));
    return this;
  }
  /**
   * Format the cookies in the request as a string for logging
   */
  [Symbol.for("edge-runtime.inspect.custom")]() {
    return `RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
  }
  toString() {
    return [...this._parsed.values()].map((v) => `${v.name}=${encodeURIComponent(v.value)}`).join("; ");
  }
};

// src/response-cookies.ts
var ResponseCookies = class {
  constructor(responseHeaders) {
    /** @internal */
    this._parsed = /* @__PURE__ */ new Map();
    var _a, _b, _c;
    this._headers = responseHeaders;
    const setCookie = (_c = (_b = (_a = responseHeaders.getSetCookie) == null ? void 0 : _a.call(responseHeaders)) != null ? _b : responseHeaders.get("set-cookie")) != null ? _c : [];
    const cookieStrings = Array.isArray(setCookie) ? setCookie : splitCookiesString(setCookie);
    for (const cookieString of cookieStrings) {
      const parsed = parseSetCookie(cookieString);
      if (parsed)
        this._parsed.set(parsed.name, parsed);
    }
  }
  /**
   * {@link https://wicg.github.io/cookie-store/#CookieStore-get CookieStore#get} without the Promise.
   */
  get(...args) {
    const key = typeof args[0] === "string" ? args[0] : args[0].name;
    return this._parsed.get(key);
  }
  /**
   * {@link https://wicg.github.io/cookie-store/#CookieStore-getAll CookieStore#getAll} without the Promise.
   */
  getAll(...args) {
    var _a;
    const all = Array.from(this._parsed.values());
    if (!args.length) {
      return all;
    }
    const key = typeof args[0] === "string" ? args[0] : (_a = args[0]) == null ? void 0 : _a.name;
    return all.filter((c) => c.name === key);
  }
  has(name) {
    return this._parsed.has(name);
  }
  /**
   * {@link https://wicg.github.io/cookie-store/#CookieStore-set CookieStore#set} without the Promise.
   */
  set(...args) {
    const [name, value, cookie] = args.length === 1 ? [args[0].name, args[0].value, args[0]] : args;
    const map = this._parsed;
    map.set(name, normalizeCookie({ name, value, ...cookie }));
    replace(map, this._headers);
    return this;
  }
  /**
   * {@link https://wicg.github.io/cookie-store/#CookieStore-delete CookieStore#delete} without the Promise.
   */
  delete(...args) {
    const [name, options] = typeof args[0] === "string" ? [args[0]] : [args[0].name, args[0]];
    return this.set({ ...options, name, value: "", expires: /* @__PURE__ */ new Date(0) });
  }
  [Symbol.for("edge-runtime.inspect.custom")]() {
    return `ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
  }
  toString() {
    return [...this._parsed.values()].map(stringifyCookie).join("; ");
  }
};
function replace(bag, headers) {
  headers.delete("set-cookie");
  for (const [, value] of bag) {
    const serialized = stringifyCookie(value);
    headers.append("set-cookie", serialized);
  }
}
function normalizeCookie(cookie = { name: "", value: "" }) {
  if (typeof cookie.expires === "number") {
    cookie.expires = new Date(cookie.expires);
  }
  if (cookie.maxAge) {
    cookie.expires = new Date(Date.now() + cookie.maxAge * 1e3);
  }
  if (cookie.path === null || cookie.path === void 0) {
    cookie.path = "/";
  }
  return cookie;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (0);


/***/ }),

/***/ 25397:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
// Format function modified from nodejs
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    formatUrl: function() {
        return formatUrl;
    },
    formatWithValidation: function() {
        return formatWithValidation;
    },
    urlObjectKeys: function() {
        return urlObjectKeys;
    }
});
const _interop_require_wildcard = __webpack_require__(3147);
const _querystring = /*#__PURE__*/ _interop_require_wildcard._(__webpack_require__(54779));
const slashedProtocols = /https?|ftp|gopher|file/;
function formatUrl(urlObj) {
    let { auth, hostname } = urlObj;
    let protocol = urlObj.protocol || '';
    let pathname = urlObj.pathname || '';
    let hash = urlObj.hash || '';
    let query = urlObj.query || '';
    let host = false;
    auth = auth ? encodeURIComponent(auth).replace(/%3A/i, ':') + '@' : '';
    if (urlObj.host) {
        host = auth + urlObj.host;
    } else if (hostname) {
        host = auth + (~hostname.indexOf(':') ? "[" + hostname + "]" : hostname);
        if (urlObj.port) {
            host += ':' + urlObj.port;
        }
    }
    if (query && typeof query === 'object') {
        query = String(_querystring.urlQueryToSearchParams(query));
    }
    let search = urlObj.search || query && "?" + query || '';
    if (protocol && !protocol.endsWith(':')) protocol += ':';
    if (urlObj.slashes || (!protocol || slashedProtocols.test(protocol)) && host !== false) {
        host = '//' + (host || '');
        if (pathname && pathname[0] !== '/') pathname = '/' + pathname;
    } else if (!host) {
        host = '';
    }
    if (hash && hash[0] !== '#') hash = '#' + hash;
    if (search && search[0] !== '?') search = '?' + search;
    pathname = pathname.replace(/[?#]/g, encodeURIComponent);
    search = search.replace('#', '%23');
    return "" + protocol + host + pathname + search + hash;
}
const urlObjectKeys = [
    'auth',
    'hash',
    'host',
    'hostname',
    'href',
    'path',
    'pathname',
    'port',
    'protocol',
    'query',
    'search',
    'slashes'
];
function formatWithValidation(url) {
    if (false) {}
    return formatUrl(url);
} //# sourceMappingURL=format-url.js.map


/***/ }),

/***/ 30012:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    allowedStatusCodes: function() {
        return allowedStatusCodes;
    },
    getRedirectStatus: function() {
        return getRedirectStatus;
    },
    modifyRouteRegex: function() {
        return modifyRouteRegex;
    }
});
const _redirectstatuscode = __webpack_require__(13866);
const allowedStatusCodes = new Set([
    301,
    302,
    303,
    307,
    308
]);
function getRedirectStatus(route) {
    return route.statusCode || (route.permanent ? _redirectstatuscode.RedirectStatusCode.PermanentRedirect : _redirectstatuscode.RedirectStatusCode.TemporaryRedirect);
}
function modifyRouteRegex(regex, restrictedPaths) {
    if (restrictedPaths) {
        regex = regex.replace(/\^/, `^(?!${restrictedPaths.map((path)=>path.replace(/\//g, '\\/')).join('|')})`);
    }
    regex = regex.replace(/\$$/, '(?:\\/)?$');
    return regex;
}

//# sourceMappingURL=redirect-status.js.map

/***/ }),

/***/ 32072:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    ACTION_SUFFIX: function() {
        return ACTION_SUFFIX;
    },
    APP_DIR_ALIAS: function() {
        return APP_DIR_ALIAS;
    },
    CACHE_ONE_YEAR: function() {
        return CACHE_ONE_YEAR;
    },
    DOT_NEXT_ALIAS: function() {
        return DOT_NEXT_ALIAS;
    },
    ESLINT_DEFAULT_DIRS: function() {
        return ESLINT_DEFAULT_DIRS;
    },
    GSP_NO_RETURNED_VALUE: function() {
        return GSP_NO_RETURNED_VALUE;
    },
    GSSP_COMPONENT_MEMBER_ERROR: function() {
        return GSSP_COMPONENT_MEMBER_ERROR;
    },
    GSSP_NO_RETURNED_VALUE: function() {
        return GSSP_NO_RETURNED_VALUE;
    },
    HTML_CONTENT_TYPE_HEADER: function() {
        return HTML_CONTENT_TYPE_HEADER;
    },
    INFINITE_CACHE: function() {
        return INFINITE_CACHE;
    },
    INSTRUMENTATION_HOOK_FILENAME: function() {
        return INSTRUMENTATION_HOOK_FILENAME;
    },
    JSON_CONTENT_TYPE_HEADER: function() {
        return JSON_CONTENT_TYPE_HEADER;
    },
    MATCHED_PATH_HEADER: function() {
        return MATCHED_PATH_HEADER;
    },
    MIDDLEWARE_FILENAME: function() {
        return MIDDLEWARE_FILENAME;
    },
    MIDDLEWARE_LOCATION_REGEXP: function() {
        return MIDDLEWARE_LOCATION_REGEXP;
    },
    NEXT_BODY_SUFFIX: function() {
        return NEXT_BODY_SUFFIX;
    },
    NEXT_CACHE_IMPLICIT_TAG_ID: function() {
        return NEXT_CACHE_IMPLICIT_TAG_ID;
    },
    NEXT_CACHE_REVALIDATED_TAGS_HEADER: function() {
        return NEXT_CACHE_REVALIDATED_TAGS_HEADER;
    },
    NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER: function() {
        return NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER;
    },
    NEXT_CACHE_SOFT_TAG_MAX_LENGTH: function() {
        return NEXT_CACHE_SOFT_TAG_MAX_LENGTH;
    },
    NEXT_CACHE_TAGS_HEADER: function() {
        return NEXT_CACHE_TAGS_HEADER;
    },
    NEXT_CACHE_TAG_MAX_ITEMS: function() {
        return NEXT_CACHE_TAG_MAX_ITEMS;
    },
    NEXT_CACHE_TAG_MAX_LENGTH: function() {
        return NEXT_CACHE_TAG_MAX_LENGTH;
    },
    NEXT_DATA_SUFFIX: function() {
        return NEXT_DATA_SUFFIX;
    },
    NEXT_INTERCEPTION_MARKER_PREFIX: function() {
        return NEXT_INTERCEPTION_MARKER_PREFIX;
    },
    NEXT_META_SUFFIX: function() {
        return NEXT_META_SUFFIX;
    },
    NEXT_QUERY_PARAM_PREFIX: function() {
        return NEXT_QUERY_PARAM_PREFIX;
    },
    NEXT_RESUME_HEADER: function() {
        return NEXT_RESUME_HEADER;
    },
    NON_STANDARD_NODE_ENV: function() {
        return NON_STANDARD_NODE_ENV;
    },
    PAGES_DIR_ALIAS: function() {
        return PAGES_DIR_ALIAS;
    },
    PRERENDER_REVALIDATE_HEADER: function() {
        return PRERENDER_REVALIDATE_HEADER;
    },
    PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER: function() {
        return PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER;
    },
    PUBLIC_DIR_MIDDLEWARE_CONFLICT: function() {
        return PUBLIC_DIR_MIDDLEWARE_CONFLICT;
    },
    ROOT_DIR_ALIAS: function() {
        return ROOT_DIR_ALIAS;
    },
    RSC_ACTION_CLIENT_WRAPPER_ALIAS: function() {
        return RSC_ACTION_CLIENT_WRAPPER_ALIAS;
    },
    RSC_ACTION_ENCRYPTION_ALIAS: function() {
        return RSC_ACTION_ENCRYPTION_ALIAS;
    },
    RSC_ACTION_PROXY_ALIAS: function() {
        return RSC_ACTION_PROXY_ALIAS;
    },
    RSC_ACTION_VALIDATE_ALIAS: function() {
        return RSC_ACTION_VALIDATE_ALIAS;
    },
    RSC_CACHE_WRAPPER_ALIAS: function() {
        return RSC_CACHE_WRAPPER_ALIAS;
    },
    RSC_DYNAMIC_IMPORT_WRAPPER_ALIAS: function() {
        return RSC_DYNAMIC_IMPORT_WRAPPER_ALIAS;
    },
    RSC_MOD_REF_PROXY_ALIAS: function() {
        return RSC_MOD_REF_PROXY_ALIAS;
    },
    RSC_PREFETCH_SUFFIX: function() {
        return RSC_PREFETCH_SUFFIX;
    },
    RSC_SEGMENTS_DIR_SUFFIX: function() {
        return RSC_SEGMENTS_DIR_SUFFIX;
    },
    RSC_SEGMENT_SUFFIX: function() {
        return RSC_SEGMENT_SUFFIX;
    },
    RSC_SUFFIX: function() {
        return RSC_SUFFIX;
    },
    SERVER_PROPS_EXPORT_ERROR: function() {
        return SERVER_PROPS_EXPORT_ERROR;
    },
    SERVER_PROPS_GET_INIT_PROPS_CONFLICT: function() {
        return SERVER_PROPS_GET_INIT_PROPS_CONFLICT;
    },
    SERVER_PROPS_SSG_CONFLICT: function() {
        return SERVER_PROPS_SSG_CONFLICT;
    },
    SERVER_RUNTIME: function() {
        return SERVER_RUNTIME;
    },
    SSG_FALLBACK_EXPORT_ERROR: function() {
        return SSG_FALLBACK_EXPORT_ERROR;
    },
    SSG_GET_INITIAL_PROPS_CONFLICT: function() {
        return SSG_GET_INITIAL_PROPS_CONFLICT;
    },
    STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR: function() {
        return STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR;
    },
    TEXT_PLAIN_CONTENT_TYPE_HEADER: function() {
        return TEXT_PLAIN_CONTENT_TYPE_HEADER;
    },
    UNSTABLE_REVALIDATE_RENAME_ERROR: function() {
        return UNSTABLE_REVALIDATE_RENAME_ERROR;
    },
    WEBPACK_LAYERS: function() {
        return WEBPACK_LAYERS;
    },
    WEBPACK_RESOURCE_QUERIES: function() {
        return WEBPACK_RESOURCE_QUERIES;
    }
});
const TEXT_PLAIN_CONTENT_TYPE_HEADER = 'text/plain';
const HTML_CONTENT_TYPE_HEADER = 'text/html; charset=utf-8';
const JSON_CONTENT_TYPE_HEADER = 'application/json; charset=utf-8';
const NEXT_QUERY_PARAM_PREFIX = 'nxtP';
const NEXT_INTERCEPTION_MARKER_PREFIX = 'nxtI';
const MATCHED_PATH_HEADER = 'x-matched-path';
const PRERENDER_REVALIDATE_HEADER = 'x-prerender-revalidate';
const PRERENDER_REVALIDATE_ONLY_GENERATED_HEADER = 'x-prerender-revalidate-if-generated';
const RSC_PREFETCH_SUFFIX = '.prefetch.rsc';
const RSC_SEGMENTS_DIR_SUFFIX = '.segments';
const RSC_SEGMENT_SUFFIX = '.segment.rsc';
const RSC_SUFFIX = '.rsc';
const ACTION_SUFFIX = '.action';
const NEXT_DATA_SUFFIX = '.json';
const NEXT_META_SUFFIX = '.meta';
const NEXT_BODY_SUFFIX = '.body';
const NEXT_CACHE_TAGS_HEADER = 'x-next-cache-tags';
const NEXT_CACHE_REVALIDATED_TAGS_HEADER = 'x-next-revalidated-tags';
const NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER = 'x-next-revalidate-tag-token';
const NEXT_RESUME_HEADER = 'next-resume';
const NEXT_CACHE_TAG_MAX_ITEMS = 128;
const NEXT_CACHE_TAG_MAX_LENGTH = 256;
const NEXT_CACHE_SOFT_TAG_MAX_LENGTH = 1024;
const NEXT_CACHE_IMPLICIT_TAG_ID = '_N_T_';
const CACHE_ONE_YEAR = 31536000;
const INFINITE_CACHE = 0xfffffffe;
const MIDDLEWARE_FILENAME = 'middleware';
const MIDDLEWARE_LOCATION_REGEXP = `(?:src/)?${MIDDLEWARE_FILENAME}`;
const INSTRUMENTATION_HOOK_FILENAME = 'instrumentation';
const PAGES_DIR_ALIAS = 'private-next-pages';
const DOT_NEXT_ALIAS = 'private-dot-next';
const ROOT_DIR_ALIAS = 'private-next-root-dir';
const APP_DIR_ALIAS = 'private-next-app-dir';
const RSC_MOD_REF_PROXY_ALIAS = 'private-next-rsc-mod-ref-proxy';
const RSC_ACTION_VALIDATE_ALIAS = 'private-next-rsc-action-validate';
const RSC_ACTION_PROXY_ALIAS = 'private-next-rsc-server-reference';
const RSC_CACHE_WRAPPER_ALIAS = 'private-next-rsc-cache-wrapper';
const RSC_DYNAMIC_IMPORT_WRAPPER_ALIAS = 'private-next-rsc-track-dynamic-import';
const RSC_ACTION_ENCRYPTION_ALIAS = 'private-next-rsc-action-encryption';
const RSC_ACTION_CLIENT_WRAPPER_ALIAS = 'private-next-rsc-action-client-wrapper';
const PUBLIC_DIR_MIDDLEWARE_CONFLICT = `You can not have a '_next' folder inside of your public folder. This conflicts with the internal '/_next' route. https://nextjs.org/docs/messages/public-next-folder-conflict`;
const SSG_GET_INITIAL_PROPS_CONFLICT = `You can not use getInitialProps with getStaticProps. To use SSG, please remove your getInitialProps`;
const SERVER_PROPS_GET_INIT_PROPS_CONFLICT = `You can not use getInitialProps with getServerSideProps. Please remove getInitialProps.`;
const SERVER_PROPS_SSG_CONFLICT = `You can not use getStaticProps or getStaticPaths with getServerSideProps. To use SSG, please remove getServerSideProps`;
const STATIC_STATUS_PAGE_GET_INITIAL_PROPS_ERROR = `can not have getInitialProps/getServerSideProps, https://nextjs.org/docs/messages/404-get-initial-props`;
const SERVER_PROPS_EXPORT_ERROR = `pages with \`getServerSideProps\` can not be exported. See more info here: https://nextjs.org/docs/messages/gssp-export`;
const GSP_NO_RETURNED_VALUE = 'Your `getStaticProps` function did not return an object. Did you forget to add a `return`?';
const GSSP_NO_RETURNED_VALUE = 'Your `getServerSideProps` function did not return an object. Did you forget to add a `return`?';
const UNSTABLE_REVALIDATE_RENAME_ERROR = 'The `unstable_revalidate` property is available for general use.\n' + 'Please use `revalidate` instead.';
const GSSP_COMPONENT_MEMBER_ERROR = `can not be attached to a page's component and must be exported from the page. See more info here: https://nextjs.org/docs/messages/gssp-component-member`;
const NON_STANDARD_NODE_ENV = `You are using a non-standard "NODE_ENV" value in your environment. This creates inconsistencies in the project and is strongly advised against. Read more: https://nextjs.org/docs/messages/non-standard-node-env`;
const SSG_FALLBACK_EXPORT_ERROR = `Pages with \`fallback\` enabled in \`getStaticPaths\` can not be exported. See more info here: https://nextjs.org/docs/messages/ssg-fallback-true-export`;
const ESLINT_DEFAULT_DIRS = [
    'app',
    'pages',
    'components',
    'lib',
    'src'
];
const SERVER_RUNTIME = {
    edge: 'edge',
    experimentalEdge: 'experimental-edge',
    nodejs: 'nodejs'
};
/**
 * The names of the webpack layers. These layers are the primitives for the
 * webpack chunks.
 */ const WEBPACK_LAYERS_NAMES = {
    /**
   * The layer for the shared code between the client and server bundles.
   */ shared: 'shared',
    /**
   * The layer for server-only runtime and picking up `react-server` export conditions.
   * Including app router RSC pages and app router custom routes and metadata routes.
   */ reactServerComponents: 'rsc',
    /**
   * Server Side Rendering layer for app (ssr).
   */ serverSideRendering: 'ssr',
    /**
   * The browser client bundle layer for actions.
   */ actionBrowser: 'action-browser',
    /**
   * The Node.js bundle layer for the API routes.
   */ apiNode: 'api-node',
    /**
   * The Edge Lite bundle layer for the API routes.
   */ apiEdge: 'api-edge',
    /**
   * The layer for the middleware code.
   */ middleware: 'middleware',
    /**
   * The layer for the instrumentation hooks.
   */ instrument: 'instrument',
    /**
   * The layer for assets on the edge.
   */ edgeAsset: 'edge-asset',
    /**
   * The browser client bundle layer for App directory.
   */ appPagesBrowser: 'app-pages-browser',
    /**
   * The browser client bundle layer for Pages directory.
   */ pagesDirBrowser: 'pages-dir-browser',
    /**
   * The Edge Lite bundle layer for Pages directory.
   */ pagesDirEdge: 'pages-dir-edge',
    /**
   * The Node.js bundle layer for Pages directory.
   */ pagesDirNode: 'pages-dir-node'
};
const WEBPACK_LAYERS = {
    ...WEBPACK_LAYERS_NAMES,
    GROUP: {
        builtinReact: [
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.actionBrowser
        ],
        serverOnly: [
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.actionBrowser,
            WEBPACK_LAYERS_NAMES.instrument,
            WEBPACK_LAYERS_NAMES.middleware
        ],
        neutralTarget: [
            // pages api
            WEBPACK_LAYERS_NAMES.apiNode,
            WEBPACK_LAYERS_NAMES.apiEdge
        ],
        clientOnly: [
            WEBPACK_LAYERS_NAMES.serverSideRendering,
            WEBPACK_LAYERS_NAMES.appPagesBrowser
        ],
        bundled: [
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.actionBrowser,
            WEBPACK_LAYERS_NAMES.serverSideRendering,
            WEBPACK_LAYERS_NAMES.appPagesBrowser,
            WEBPACK_LAYERS_NAMES.shared,
            WEBPACK_LAYERS_NAMES.instrument,
            WEBPACK_LAYERS_NAMES.middleware
        ],
        appPages: [
            // app router pages and layouts
            WEBPACK_LAYERS_NAMES.reactServerComponents,
            WEBPACK_LAYERS_NAMES.serverSideRendering,
            WEBPACK_LAYERS_NAMES.appPagesBrowser,
            WEBPACK_LAYERS_NAMES.actionBrowser
        ]
    }
};
const WEBPACK_RESOURCE_QUERIES = {
    edgeSSREntry: '__next_edge_ssr_entry__',
    metadata: '__next_metadata__',
    metadataRoute: '__next_metadata_route__',
    metadataImageMeta: '__next_metadata_image_meta__'
};

//# sourceMappingURL=constants.js.map

/***/ }),

/***/ 33134:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    NextRequestAdapter: function() {
        return NextRequestAdapter;
    },
    ResponseAborted: function() {
        return ResponseAborted;
    },
    ResponseAbortedName: function() {
        return ResponseAbortedName;
    },
    createAbortController: function() {
        return createAbortController;
    },
    signalFromNodeResponse: function() {
        return signalFromNodeResponse;
    }
});
const _requestmeta = __webpack_require__(35124);
const _utils = __webpack_require__(39833);
const _request = __webpack_require__(41801);
const _helpers = __webpack_require__(65131);
const ResponseAbortedName = 'ResponseAborted';
class ResponseAborted extends Error {
    constructor(...args){
        super(...args), this.name = ResponseAbortedName;
    }
}
function createAbortController(response) {
    const controller = new AbortController();
    // If `finish` fires first, then `res.end()` has been called and the close is
    // just us finishing the stream on our side. If `close` fires first, then we
    // know the client disconnected before we finished.
    response.once('close', ()=>{
        if (response.writableFinished) return;
        controller.abort(new ResponseAborted());
    });
    return controller;
}
function signalFromNodeResponse(response) {
    const { errored, destroyed } = response;
    if (errored || destroyed) {
        return AbortSignal.abort(errored ?? new ResponseAborted());
    }
    const { signal } = createAbortController(response);
    return signal;
}
class NextRequestAdapter {
    static fromBaseNextRequest(request, signal) {
        if (// The type check here ensures that `req` is correctly typed, and the
        // environment variable check provides dead code elimination.
        false) {} else if (// The type check here ensures that `req` is correctly typed, and the
        // environment variable check provides dead code elimination.
         true && (0, _helpers.isNodeNextRequest)(request)) {
            return NextRequestAdapter.fromNodeNextRequest(request, signal);
        } else {
            throw Object.defineProperty(new Error('Invariant: Unsupported NextRequest type'), "__NEXT_ERROR_CODE", {
                value: "E345",
                enumerable: false,
                configurable: true
            });
        }
    }
    static fromNodeNextRequest(request, signal) {
        // HEAD and GET requests can not have a body.
        let body = null;
        if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
            // @ts-expect-error - this is handled by undici, when streams/web land use it instead
            body = request.body;
        }
        let url;
        if (request.url.startsWith('http')) {
            url = new URL(request.url);
        } else {
            // Grab the full URL from the request metadata.
            const base = (0, _requestmeta.getRequestMeta)(request, 'initURL');
            if (!base || !base.startsWith('http')) {
                // Because the URL construction relies on the fact that the URL provided
                // is absolute, we need to provide a base URL. We can't use the request
                // URL because it's relative, so we use a dummy URL instead.
                url = new URL(request.url, 'http://n');
            } else {
                url = new URL(request.url, base);
            }
        }
        return new _request.NextRequest(url, {
            method: request.method,
            headers: (0, _utils.fromNodeOutgoingHttpHeaders)(request.headers),
            duplex: 'half',
            signal,
            // geo
            // ip
            // nextConfig
            // body can not be passed if request was aborted
            // or we get a Request body was disturbed error
            ...signal.aborted ? {} : {
                body
            }
        });
    }
    static fromWebNextRequest(request) {
        // HEAD and GET requests can not have a body.
        let body = null;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            body = request.body;
        }
        return new _request.NextRequest(request.url, {
            method: request.method,
            headers: (0, _utils.fromNodeOutgoingHttpHeaders)(request.headers),
            duplex: 'half',
            signal: request.request.signal,
            // geo
            // ip
            // nextConfig
            // body can not be passed if request was aborted
            // or we get a Request body was disturbed error
            ...request.request.signal.aborted ? {} : {
                body
            }
        });
    }
}

//# sourceMappingURL=next-request.js.map

/***/ }),

/***/ 33830:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
// This regex contains the bots that we need to do a blocking render for and can't safely stream the response
// due to how they parse the DOM. For example, they might explicitly check for metadata in the `head` tag, so we can't stream metadata tags after the `head` was sent.
// Note: The pattern [\w-]+-Google captures all Google crawlers with "-Google" suffix (e.g., Mediapartners-Google, AdsBot-Google, Storebot-Google)
// as well as crawlers starting with "Google-" (e.g., Google-PageRenderer, Google-InspectionTool)

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "HTML_LIMITED_BOT_UA_RE", ({
    enumerable: true,
    get: function() {
        return HTML_LIMITED_BOT_UA_RE;
    }
}));
const HTML_LIMITED_BOT_UA_RE = /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/i; //# sourceMappingURL=html-bots.js.map


/***/ }),

/***/ 33873:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 34435:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/**
 * Given a path this function will find the pathname, query and hash and return
 * them. This is useful to parse full paths on the client side.
 * @param path A path to parse e.g. /foo/bar?id=1#hash
 */ 
Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "parsePath", ({
    enumerable: true,
    get: function() {
        return parsePath;
    }
}));
function parsePath(path) {
    const hashIndex = path.indexOf('#');
    const queryIndex = path.indexOf('?');
    const hasQuery = queryIndex > -1 && (hashIndex < 0 || queryIndex < hashIndex);
    if (hasQuery || hashIndex > -1) {
        return {
            pathname: path.substring(0, hasQuery ? queryIndex : hashIndex),
            query: hasQuery ? path.substring(queryIndex, hashIndex > -1 ? hashIndex : undefined) : '',
            hash: hashIndex > -1 ? path.slice(hashIndex) : ''
        };
    }
    return {
        pathname: path,
        query: '',
        hash: ''
    };
} //# sourceMappingURL=parse-path.js.map


/***/ }),

/***/ 35124:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/* eslint-disable no-redeclare */ 
Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    NEXT_REQUEST_META: function() {
        return NEXT_REQUEST_META;
    },
    addRequestMeta: function() {
        return addRequestMeta;
    },
    getRequestMeta: function() {
        return getRequestMeta;
    },
    removeRequestMeta: function() {
        return removeRequestMeta;
    },
    setRequestMeta: function() {
        return setRequestMeta;
    }
});
const NEXT_REQUEST_META = Symbol.for('NextInternalRequestMeta');
function getRequestMeta(req, key) {
    const meta = req[NEXT_REQUEST_META] || {};
    return typeof key === 'string' ? meta[key] : meta;
}
function setRequestMeta(req, meta) {
    req[NEXT_REQUEST_META] = meta;
    return meta;
}
function addRequestMeta(request, key, value) {
    const meta = getRequestMeta(request);
    meta[key] = value;
    return setRequestMeta(request, meta);
}
function removeRequestMeta(request, key) {
    const meta = getRequestMeta(request);
    delete meta[key];
    return setRequestMeta(request, meta);
}

//# sourceMappingURL=request-meta.js.map

/***/ }),

/***/ 36006:
/***/ ((module, exports, __webpack_require__) => {

"use strict";
/* __next_internal_client_entry_do_not_use__  cjs */ 
Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    default: function() {
        return _default;
    },
    defaultHead: function() {
        return defaultHead;
    }
});
const _interop_require_default = __webpack_require__(87020);
const _interop_require_wildcard = __webpack_require__(3147);
const _jsxruntime = __webpack_require__(8732);
const _react = /*#__PURE__*/ _interop_require_wildcard._(__webpack_require__(82015));
const _sideeffect = /*#__PURE__*/ _interop_require_default._(__webpack_require__(14157));
const _ampcontextsharedruntime = __webpack_require__(57043);
const _headmanagercontextsharedruntime = __webpack_require__(1523);
const _ampmode = __webpack_require__(72974);
const _warnonce = __webpack_require__(68532);
function defaultHead(inAmpMode) {
    if (inAmpMode === void 0) inAmpMode = false;
    const head = [
        /*#__PURE__*/ (0, _jsxruntime.jsx)("meta", {
            charSet: "utf-8"
        }, "charset")
    ];
    if (!inAmpMode) {
        head.push(/*#__PURE__*/ (0, _jsxruntime.jsx)("meta", {
            name: "viewport",
            content: "width=device-width"
        }, "viewport"));
    }
    return head;
}
function onlyReactElement(list, child) {
    // React children can be "string" or "number" in this case we ignore them for backwards compat
    if (typeof child === 'string' || typeof child === 'number') {
        return list;
    }
    // Adds support for React.Fragment
    if (child.type === _react.default.Fragment) {
        return list.concat(_react.default.Children.toArray(child.props.children).reduce((fragmentList, fragmentChild)=>{
            if (typeof fragmentChild === 'string' || typeof fragmentChild === 'number') {
                return fragmentList;
            }
            return fragmentList.concat(fragmentChild);
        }, []));
    }
    return list.concat(child);
}
const METATYPES = [
    'name',
    'httpEquiv',
    'charSet',
    'itemProp'
];
/*
 returns a function for filtering head child elements
 which shouldn't be duplicated, like <title/>
 Also adds support for deduplicated `key` properties
*/ function unique() {
    const keys = new Set();
    const tags = new Set();
    const metaTypes = new Set();
    const metaCategories = {};
    return (h)=>{
        let isUnique = true;
        let hasKey = false;
        if (h.key && typeof h.key !== 'number' && h.key.indexOf('$') > 0) {
            hasKey = true;
            const key = h.key.slice(h.key.indexOf('$') + 1);
            if (keys.has(key)) {
                isUnique = false;
            } else {
                keys.add(key);
            }
        }
        // eslint-disable-next-line default-case
        switch(h.type){
            case 'title':
            case 'base':
                if (tags.has(h.type)) {
                    isUnique = false;
                } else {
                    tags.add(h.type);
                }
                break;
            case 'meta':
                for(let i = 0, len = METATYPES.length; i < len; i++){
                    const metatype = METATYPES[i];
                    if (!h.props.hasOwnProperty(metatype)) continue;
                    if (metatype === 'charSet') {
                        if (metaTypes.has(metatype)) {
                            isUnique = false;
                        } else {
                            metaTypes.add(metatype);
                        }
                    } else {
                        const category = h.props[metatype];
                        const categories = metaCategories[metatype] || new Set();
                        if ((metatype !== 'name' || !hasKey) && categories.has(category)) {
                            isUnique = false;
                        } else {
                            categories.add(category);
                            metaCategories[metatype] = categories;
                        }
                    }
                }
                break;
        }
        return isUnique;
    };
}
/**
 *
 * @param headChildrenElements List of children of <Head>
 */ function reduceComponents(headChildrenElements, props) {
    const { inAmpMode } = props;
    return headChildrenElements.reduce(onlyReactElement, []).reverse().concat(defaultHead(inAmpMode).reverse()).filter(unique()).reverse().map((c, i)=>{
        const key = c.key || i;
        if (false) {}
        return /*#__PURE__*/ _react.default.cloneElement(c, {
            key
        });
    });
}
/**
 * This component injects elements to `<head>` of your page.
 * To avoid duplicated `tags` in `<head>` you can use the `key` property, which will make sure every tag is only rendered once.
 */ function Head(param) {
    let { children } = param;
    const ampState = (0, _react.useContext)(_ampcontextsharedruntime.AmpStateContext);
    const headManager = (0, _react.useContext)(_headmanagercontextsharedruntime.HeadManagerContext);
    return /*#__PURE__*/ (0, _jsxruntime.jsx)(_sideeffect.default, {
        reduceComponentsToState: reduceComponents,
        headManager: headManager,
        inAmpMode: (0, _ampmode.isInAmpMode)(ampState),
        children: children
    });
}
const _default = Head;
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=head.js.map


/***/ }),

/***/ 36732:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "getNextPathnameInfo", ({
    enumerable: true,
    get: function() {
        return getNextPathnameInfo;
    }
}));
const _normalizelocalepath = __webpack_require__(56629);
const _removepathprefix = __webpack_require__(66537);
const _pathhasprefix = __webpack_require__(23403);
function getNextPathnameInfo(pathname, options) {
    var _options_nextConfig;
    const { basePath, i18n, trailingSlash } = (_options_nextConfig = options.nextConfig) != null ? _options_nextConfig : {};
    const info = {
        pathname,
        trailingSlash: pathname !== '/' ? pathname.endsWith('/') : trailingSlash
    };
    if (basePath && (0, _pathhasprefix.pathHasPrefix)(info.pathname, basePath)) {
        info.pathname = (0, _removepathprefix.removePathPrefix)(info.pathname, basePath);
        info.basePath = basePath;
    }
    let pathnameNoDataPrefix = info.pathname;
    if (info.pathname.startsWith('/_next/data/') && info.pathname.endsWith('.json')) {
        const paths = info.pathname.replace(/^\/_next\/data\//, '').replace(/\.json$/, '').split('/');
        const buildId = paths[0];
        info.buildId = buildId;
        pathnameNoDataPrefix = paths[1] !== 'index' ? "/" + paths.slice(1).join('/') : '/';
        // update pathname with normalized if enabled although
        // we use normalized to populate locale info still
        if (options.parseData === true) {
            info.pathname = pathnameNoDataPrefix;
        }
    }
    // If provided, use the locale route normalizer to detect the locale instead
    // of the function below.
    if (i18n) {
        let result = options.i18nProvider ? options.i18nProvider.analyze(info.pathname) : (0, _normalizelocalepath.normalizeLocalePath)(info.pathname, i18n.locales);
        info.locale = result.detectedLocale;
        var _result_pathname;
        info.pathname = (_result_pathname = result.pathname) != null ? _result_pathname : info.pathname;
        if (!result.detectedLocale && info.buildId) {
            result = options.i18nProvider ? options.i18nProvider.analyze(pathnameNoDataPrefix) : (0, _normalizelocalepath.normalizeLocalePath)(pathnameNoDataPrefix, i18n.locales);
            if (result.detectedLocale) {
                info.locale = result.detectedLocale;
            }
        }
    }
    return info;
} //# sourceMappingURL=get-next-pathname-info.js.map


/***/ }),

/***/ 39833:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    fromNodeOutgoingHttpHeaders: function() {
        return fromNodeOutgoingHttpHeaders;
    },
    normalizeNextQueryParam: function() {
        return normalizeNextQueryParam;
    },
    splitCookiesString: function() {
        return splitCookiesString;
    },
    toNodeOutgoingHttpHeaders: function() {
        return toNodeOutgoingHttpHeaders;
    },
    validateURL: function() {
        return validateURL;
    }
});
const _constants = __webpack_require__(32072);
function fromNodeOutgoingHttpHeaders(nodeHeaders) {
    const headers = new Headers();
    for (let [key, value] of Object.entries(nodeHeaders)){
        const values = Array.isArray(value) ? value : [
            value
        ];
        for (let v of values){
            if (typeof v === 'undefined') continue;
            if (typeof v === 'number') {
                v = v.toString();
            }
            headers.append(key, v);
        }
    }
    return headers;
}
function splitCookiesString(cookiesString) {
    var cookiesStrings = [];
    var pos = 0;
    var start;
    var ch;
    var lastComma;
    var nextStart;
    var cookiesSeparatorFound;
    function skipWhitespace() {
        while(pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))){
            pos += 1;
        }
        return pos < cookiesString.length;
    }
    function notSpecialChar() {
        ch = cookiesString.charAt(pos);
        return ch !== '=' && ch !== ';' && ch !== ',';
    }
    while(pos < cookiesString.length){
        start = pos;
        cookiesSeparatorFound = false;
        while(skipWhitespace()){
            ch = cookiesString.charAt(pos);
            if (ch === ',') {
                // ',' is a cookie separator if we have later first '=', not ';' or ','
                lastComma = pos;
                pos += 1;
                skipWhitespace();
                nextStart = pos;
                while(pos < cookiesString.length && notSpecialChar()){
                    pos += 1;
                }
                // currently special character
                if (pos < cookiesString.length && cookiesString.charAt(pos) === '=') {
                    // we found cookies separator
                    cookiesSeparatorFound = true;
                    // pos is inside the next cookie, so back up and return it.
                    pos = nextStart;
                    cookiesStrings.push(cookiesString.substring(start, lastComma));
                    start = pos;
                } else {
                    // in param ',' or param separator ';',
                    // we continue from that comma
                    pos = lastComma + 1;
                }
            } else {
                pos += 1;
            }
        }
        if (!cookiesSeparatorFound || pos >= cookiesString.length) {
            cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
        }
    }
    return cookiesStrings;
}
function toNodeOutgoingHttpHeaders(headers) {
    const nodeHeaders = {};
    const cookies = [];
    if (headers) {
        for (const [key, value] of headers.entries()){
            if (key.toLowerCase() === 'set-cookie') {
                // We may have gotten a comma joined string of cookies, or multiple
                // set-cookie headers. We need to merge them into one header array
                // to represent all the cookies.
                cookies.push(...splitCookiesString(value));
                nodeHeaders[key] = cookies.length === 1 ? cookies[0] : cookies;
            } else {
                nodeHeaders[key] = value;
            }
        }
    }
    return nodeHeaders;
}
function validateURL(url) {
    try {
        return String(new URL(String(url)));
    } catch (error) {
        throw Object.defineProperty(new Error(`URL is malformed "${String(url)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`, {
            cause: error
        }), "__NEXT_ERROR_CODE", {
            value: "E61",
            enumerable: false,
            configurable: true
        });
    }
}
function normalizeNextQueryParam(key) {
    const prefixes = [
        _constants.NEXT_QUERY_PARAM_PREFIX,
        _constants.NEXT_INTERCEPTION_MARKER_PREFIX
    ];
    for (const prefix of prefixes){
        if (key !== prefix && key.startsWith(prefix)) {
            return key.substring(prefix.length);
        }
    }
    return null;
}

//# sourceMappingURL=utils.js.map

/***/ }),

/***/ 40361:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/pages.runtime.prod.js");

/***/ }),

/***/ 41801:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    INTERNALS: function() {
        return INTERNALS;
    },
    NextRequest: function() {
        return NextRequest;
    }
});
const _nexturl = __webpack_require__(12569);
const _utils = __webpack_require__(39833);
const _error = __webpack_require__(68176);
const _cookies = __webpack_require__(56347);
const INTERNALS = Symbol('internal request');
class NextRequest extends Request {
    constructor(input, init = {}){
        const url = typeof input !== 'string' && 'url' in input ? input.url : String(input);
        (0, _utils.validateURL)(url);
        // node Request instance requires duplex option when a body
        // is present or it errors, we don't handle this for
        // Request being passed in since it would have already
        // errored if this wasn't configured
        if (true) {
            if (init.body && init.duplex !== 'half') {
                init.duplex = 'half';
            }
        }
        if (input instanceof Request) super(input, init);
        else super(url, init);
        const nextUrl = new _nexturl.NextURL(url, {
            headers: (0, _utils.toNodeOutgoingHttpHeaders)(this.headers),
            nextConfig: init.nextConfig
        });
        this[INTERNALS] = {
            cookies: new _cookies.RequestCookies(this.headers),
            nextUrl,
            url:  false ? 0 : nextUrl.toString()
        };
    }
    [Symbol.for('edge-runtime.inspect.custom')]() {
        return {
            cookies: this.cookies,
            nextUrl: this.nextUrl,
            url: this.url,
            // rest of props come from Request
            bodyUsed: this.bodyUsed,
            cache: this.cache,
            credentials: this.credentials,
            destination: this.destination,
            headers: Object.fromEntries(this.headers),
            integrity: this.integrity,
            keepalive: this.keepalive,
            method: this.method,
            mode: this.mode,
            redirect: this.redirect,
            referrer: this.referrer,
            referrerPolicy: this.referrerPolicy,
            signal: this.signal
        };
    }
    get cookies() {
        return this[INTERNALS].cookies;
    }
    get nextUrl() {
        return this[INTERNALS].nextUrl;
    }
    /**
   * @deprecated
   * `page` has been deprecated in favour of `URLPattern`.
   * Read more: https://nextjs.org/docs/messages/middleware-request-page
   */ get page() {
        throw new _error.RemovedPageError();
    }
    /**
   * @deprecated
   * `ua` has been removed in favour of \`userAgent\` function.
   * Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent
   */ get ua() {
        throw new _error.RemovedUAError();
    }
    get url() {
        return this[INTERNALS].url;
    }
}

//# sourceMappingURL=request.js.map

/***/ }),

/***/ 42956:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/**
 * FNV-1a Hash implementation
 * @author Travis Webb (tjwebb) <me@traviswebb.com>
 *
 * Ported from https://github.com/tjwebb/fnv-plus/blob/master/index.js
 *
 * Simplified, optimized and add modified for 52 bit, which provides a larger hash space
 * and still making use of Javascript's 53-bit integer space.
 */ 
Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    fnv1a52: function() {
        return fnv1a52;
    },
    generateETag: function() {
        return generateETag;
    }
});
const fnv1a52 = (str)=>{
    const len = str.length;
    let i = 0, t0 = 0, v0 = 0x2325, t1 = 0, v1 = 0x8422, t2 = 0, v2 = 0x9ce4, t3 = 0, v3 = 0xcbf2;
    while(i < len){
        v0 ^= str.charCodeAt(i++);
        t0 = v0 * 435;
        t1 = v1 * 435;
        t2 = v2 * 435;
        t3 = v3 * 435;
        t2 += v0 << 8;
        t3 += v1 << 8;
        t1 += t0 >>> 16;
        v0 = t0 & 65535;
        t2 += t1 >>> 16;
        v1 = t1 & 65535;
        v3 = t3 + (t2 >>> 16) & 65535;
        v2 = t2 & 65535;
    }
    return (v3 & 15) * 281474976710656 + v2 * 4294967296 + v1 * 65536 + (v0 ^ v3 >> 4);
};
const generateETag = (payload, weak = false)=>{
    const prefix = weak ? 'W/"' : '"';
    return prefix + fnv1a52(payload).toString(36) + payload.length.toString(36) + '"';
};

//# sourceMappingURL=etag.js.map

/***/ }),

/***/ 44346:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "ENCODED_TAGS", ({
    enumerable: true,
    get: function() {
        return ENCODED_TAGS;
    }
}));
const ENCODED_TAGS = {
    // opening tags do not have the closing `>` since they can contain other attributes such as `<body className=''>`
    OPENING: {
        // <html
        HTML: new Uint8Array([
            60,
            104,
            116,
            109,
            108
        ]),
        // <body
        BODY: new Uint8Array([
            60,
            98,
            111,
            100,
            121
        ])
    },
    CLOSED: {
        // </head>
        HEAD: new Uint8Array([
            60,
            47,
            104,
            101,
            97,
            100,
            62
        ]),
        // </body>
        BODY: new Uint8Array([
            60,
            47,
            98,
            111,
            100,
            121,
            62
        ]),
        // </html>
        HTML: new Uint8Array([
            60,
            47,
            104,
            116,
            109,
            108,
            62
        ]),
        // </body></html>
        BODY_AND_HTML: new Uint8Array([
            60,
            47,
            98,
            111,
            100,
            121,
            62,
            60,
            47,
            104,
            116,
            109,
            108,
            62
        ])
    },
    META: {
        // Only the match the prefix cause the suffix can be different wether it's xml compatible or not ">" or "/>"
        // <meta name="«nxt-icon»"
        // This is a special mark that will be replaced by the icon insertion script tag.
        ICON_MARK: new Uint8Array([
            60,
            109,
            101,
            116,
            97,
            32,
            110,
            97,
            109,
            101,
            61,
            34,
            194,
            171,
            110,
            120,
            116,
            45,
            105,
            99,
            111,
            110,
            194,
            187,
            34
        ])
    }
};

//# sourceMappingURL=encoded-tags.js.map

/***/ }),

/***/ 46060:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/shared/lib/no-fallback-error.external.js");

/***/ }),

/***/ 49326:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "detectDomainLocale", ({
    enumerable: true,
    get: function() {
        return detectDomainLocale;
    }
}));
function detectDomainLocale(domainItems, hostname, detectedLocale) {
    if (!domainItems) return;
    if (detectedLocale) {
        detectedLocale = detectedLocale.toLowerCase();
    }
    for (const item of domainItems){
        var _item_domain, _item_locales;
        // remove port if present
        const domainHostname = (_item_domain = item.domain) == null ? void 0 : _item_domain.split(':', 1)[0].toLowerCase();
        if (hostname === domainHostname || detectedLocale === item.defaultLocale.toLowerCase() || ((_item_locales = item.locales) == null ? void 0 : _item_locales.some((locale)=>locale.toLowerCase() === detectedLocale))) {
            return item;
        }
    }
} //# sourceMappingURL=detect-domain-locale.js.map


/***/ }),

/***/ 50996:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    chainStreams: function() {
        return chainStreams;
    },
    continueDynamicHTMLResume: function() {
        return continueDynamicHTMLResume;
    },
    continueDynamicPrerender: function() {
        return continueDynamicPrerender;
    },
    continueFizzStream: function() {
        return continueFizzStream;
    },
    continueStaticPrerender: function() {
        return continueStaticPrerender;
    },
    createBufferedTransformStream: function() {
        return createBufferedTransformStream;
    },
    createDocumentClosingStream: function() {
        return createDocumentClosingStream;
    },
    createRootLayoutValidatorStream: function() {
        return createRootLayoutValidatorStream;
    },
    renderToInitialFizzStream: function() {
        return renderToInitialFizzStream;
    },
    streamFromBuffer: function() {
        return streamFromBuffer;
    },
    streamFromString: function() {
        return streamFromString;
    },
    streamToBuffer: function() {
        return streamToBuffer;
    },
    streamToString: function() {
        return streamToString;
    }
});
const _tracer = __webpack_require__(12410);
const _constants = __webpack_require__(70772);
const _detachedpromise = __webpack_require__(73367);
const _scheduler = __webpack_require__(91504);
const _encodedtags = __webpack_require__(44346);
const _uint8arrayhelpers = __webpack_require__(92329);
const _constants1 = __webpack_require__(68643);
const _outputexportprefetchencoding = __webpack_require__(6479);
function voidCatch() {
// this catcher is designed to be used with pipeTo where we expect the underlying
// pipe implementation to forward errors but we don't want the pipeTo promise to reject
// and be unhandled
}
// We can share the same encoder instance everywhere
// Notably we cannot do the same for TextDecoder because it is stateful
// when handling streaming data
const encoder = new TextEncoder();
function chainStreams(...streams) {
    // If we have no streams, return an empty stream. This behavior is
    // intentional as we're now providing the `RenderResult.EMPTY` value.
    if (streams.length === 0) {
        return new ReadableStream({
            start (controller) {
                controller.close();
            }
        });
    }
    // If we only have 1 stream we fast path it by returning just this stream
    if (streams.length === 1) {
        return streams[0];
    }
    const { readable, writable } = new TransformStream();
    // We always initiate pipeTo immediately. We know we have at least 2 streams
    // so we need to avoid closing the writable when this one finishes.
    let promise = streams[0].pipeTo(writable, {
        preventClose: true
    });
    let i = 1;
    for(; i < streams.length - 1; i++){
        const nextStream = streams[i];
        promise = promise.then(()=>nextStream.pipeTo(writable, {
                preventClose: true
            }));
    }
    // We can omit the length check because we halted before the last stream and there
    // is at least two streams so the lastStream here will always be defined
    const lastStream = streams[i];
    promise = promise.then(()=>lastStream.pipeTo(writable));
    // Catch any errors from the streams and ignore them, they will be handled
    // by whatever is consuming the readable stream.
    promise.catch(voidCatch);
    return readable;
}
function streamFromString(str) {
    return new ReadableStream({
        start (controller) {
            controller.enqueue(encoder.encode(str));
            controller.close();
        }
    });
}
function streamFromBuffer(chunk) {
    return new ReadableStream({
        start (controller) {
            controller.enqueue(chunk);
            controller.close();
        }
    });
}
async function streamToBuffer(stream) {
    const reader = stream.getReader();
    const chunks = [];
    while(true){
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}
async function streamToString(stream, signal) {
    const decoder = new TextDecoder('utf-8', {
        fatal: true
    });
    let string = '';
    for await (const chunk of stream){
        if (signal == null ? void 0 : signal.aborted) {
            return string;
        }
        string += decoder.decode(chunk, {
            stream: true
        });
    }
    string += decoder.decode();
    return string;
}
function createBufferedTransformStream() {
    let bufferedChunks = [];
    let bufferByteLength = 0;
    let pending;
    const flush = (controller)=>{
        // If we already have a pending flush, then return early.
        if (pending) return;
        const detached = new _detachedpromise.DetachedPromise();
        pending = detached;
        (0, _scheduler.scheduleImmediate)(()=>{
            try {
                const chunk = new Uint8Array(bufferByteLength);
                let copiedBytes = 0;
                for(let i = 0; i < bufferedChunks.length; i++){
                    const bufferedChunk = bufferedChunks[i];
                    chunk.set(bufferedChunk, copiedBytes);
                    copiedBytes += bufferedChunk.byteLength;
                }
                // We just wrote all the buffered chunks so we need to reset the bufferedChunks array
                // and our bufferByteLength to prepare for the next round of buffered chunks
                bufferedChunks.length = 0;
                bufferByteLength = 0;
                controller.enqueue(chunk);
            } catch  {
            // If an error occurs while enqueuing it can't be due to this
            // transformers fault. It's likely due to the controller being
            // errored due to the stream being cancelled.
            } finally{
                pending = undefined;
                detached.resolve();
            }
        });
    };
    return new TransformStream({
        transform (chunk, controller) {
            // Combine the previous buffer with the new chunk.
            bufferedChunks.push(chunk);
            bufferByteLength += chunk.byteLength;
            // Flush the buffer to the controller.
            flush(controller);
        },
        flush () {
            if (!pending) return;
            return pending.promise;
        }
    });
}
function createPrefetchCommentStream(isBuildTimePrerendering, buildId) {
    // Insert an extra comment at the beginning of the HTML document. This must
    // come after the DOCTYPE, which is inserted by React.
    //
    // The first chunk sent by React will contain the doctype. After that, we can
    // pass through the rest of the chunks as-is.
    let didTransformFirstChunk = false;
    return new TransformStream({
        transform (chunk, controller) {
            if (isBuildTimePrerendering && !didTransformFirstChunk) {
                didTransformFirstChunk = true;
                const decoder = new TextDecoder('utf-8', {
                    fatal: true
                });
                const chunkStr = decoder.decode(chunk, {
                    stream: true
                });
                const updatedChunkStr = (0, _outputexportprefetchencoding.insertBuildIdComment)(chunkStr, buildId);
                controller.enqueue(encoder.encode(updatedChunkStr));
                return;
            }
            controller.enqueue(chunk);
        }
    });
}
function renderToInitialFizzStream({ ReactDOMServer, element, streamOptions }) {
    return (0, _tracer.getTracer)().trace(_constants.AppRenderSpan.renderToReadableStream, async ()=>ReactDOMServer.renderToReadableStream(element, streamOptions));
}
function createMetadataTransformStream(insert) {
    let chunkIndex = -1;
    let isMarkRemoved = false;
    return new TransformStream({
        async transform (chunk, controller) {
            let iconMarkIndex = -1;
            let closedHeadIndex = -1;
            chunkIndex++;
            if (isMarkRemoved) {
                controller.enqueue(chunk);
                return;
            }
            let iconMarkLength = 0;
            // Only search for the closed head tag once
            if (iconMarkIndex === -1) {
                iconMarkIndex = (0, _uint8arrayhelpers.indexOfUint8Array)(chunk, _encodedtags.ENCODED_TAGS.META.ICON_MARK);
                if (iconMarkIndex === -1) {
                    controller.enqueue(chunk);
                    return;
                } else {
                    // When we found the `<meta name="«nxt-icon»"` tag prefix, we will remove it from the chunk.
                    // Its close tag could either be `/>` or `>`, checking the next char to ensure we cover both cases.
                    iconMarkLength = _encodedtags.ENCODED_TAGS.META.ICON_MARK.length;
                    // Check if next char is /, this is for xml mode.
                    if (chunk[iconMarkIndex + iconMarkLength] === 47) {
                        iconMarkLength += 2;
                    } else {
                        // The last char is `>`
                        iconMarkLength++;
                    }
                }
            }
            // Check if icon mark is inside <head> tag in the first chunk.
            if (chunkIndex === 0) {
                closedHeadIndex = (0, _uint8arrayhelpers.indexOfUint8Array)(chunk, _encodedtags.ENCODED_TAGS.CLOSED.HEAD);
                if (iconMarkIndex !== -1) {
                    // The mark icon is located in the 1st chunk before the head tag.
                    // We do not need to insert the script tag in this case because it's in the head.
                    // Just remove the icon mark from the chunk.
                    if (iconMarkIndex < closedHeadIndex) {
                        const replaced = new Uint8Array(chunk.length - iconMarkLength);
                        // Remove the icon mark from the chunk.
                        replaced.set(chunk.subarray(0, iconMarkIndex));
                        replaced.set(chunk.subarray(iconMarkIndex + iconMarkLength), iconMarkIndex);
                        chunk = replaced;
                    } else {
                        // The icon mark is after the head tag, replace and insert the script tag at that position.
                        const insertion = await insert();
                        const encodedInsertion = encoder.encode(insertion);
                        const insertionLength = encodedInsertion.length;
                        const replaced = new Uint8Array(chunk.length - iconMarkLength + insertionLength);
                        replaced.set(chunk.subarray(0, iconMarkIndex));
                        replaced.set(encodedInsertion, iconMarkIndex);
                        replaced.set(chunk.subarray(iconMarkIndex + iconMarkLength), iconMarkIndex + insertionLength);
                        chunk = replaced;
                    }
                    isMarkRemoved = true;
                }
            // If there's no icon mark located, it will be handled later when if present in the following chunks.
            } else {
                // When it's appeared in the following chunks, we'll need to
                // remove the mark and then insert the script tag at that position.
                const insertion = await insert();
                const encodedInsertion = encoder.encode(insertion);
                const insertionLength = encodedInsertion.length;
                // Replace the icon mark with the hoist script or empty string.
                const replaced = new Uint8Array(chunk.length - iconMarkLength + insertionLength);
                // Set the first part of the chunk, before the icon mark.
                replaced.set(chunk.subarray(0, iconMarkIndex));
                // Set the insertion after the icon mark.
                replaced.set(encodedInsertion, iconMarkIndex);
                // Set the rest of the chunk after the icon mark.
                replaced.set(chunk.subarray(iconMarkIndex + iconMarkLength), iconMarkIndex + insertionLength);
                chunk = replaced;
                isMarkRemoved = true;
            }
            controller.enqueue(chunk);
        }
    });
}
function createHeadInsertionTransformStream(insert) {
    let inserted = false;
    // We need to track if this transform saw any bytes because if it didn't
    // we won't want to insert any server HTML at all
    let hasBytes = false;
    return new TransformStream({
        async transform (chunk, controller) {
            hasBytes = true;
            const insertion = await insert();
            if (inserted) {
                if (insertion) {
                    const encodedInsertion = encoder.encode(insertion);
                    controller.enqueue(encodedInsertion);
                }
                controller.enqueue(chunk);
            } else {
                // TODO (@Ethan-Arrowood): Replace the generic `indexOfUint8Array` method with something finely tuned for the subset of things actually being checked for.
                const index = (0, _uint8arrayhelpers.indexOfUint8Array)(chunk, _encodedtags.ENCODED_TAGS.CLOSED.HEAD);
                // In fully static rendering or non PPR rendering cases:
                // `/head>` will always be found in the chunk in first chunk rendering.
                if (index !== -1) {
                    if (insertion) {
                        const encodedInsertion = encoder.encode(insertion);
                        // Get the total count of the bytes in the chunk and the insertion
                        // e.g.
                        // chunk = <head><meta charset="utf-8"></head>
                        // insertion = <script>...</script>
                        // output = <head><meta charset="utf-8"> [ <script>...</script> ] </head>
                        const insertedHeadContent = new Uint8Array(chunk.length + encodedInsertion.length);
                        // Append the first part of the chunk, before the head tag
                        insertedHeadContent.set(chunk.slice(0, index));
                        // Append the server inserted content
                        insertedHeadContent.set(encodedInsertion, index);
                        // Append the rest of the chunk
                        insertedHeadContent.set(chunk.slice(index), index + encodedInsertion.length);
                        controller.enqueue(insertedHeadContent);
                    } else {
                        controller.enqueue(chunk);
                    }
                    inserted = true;
                } else {
                    // This will happens in PPR rendering during next start, when the page is partially rendered.
                    // When the page resumes, the head tag will be found in the middle of the chunk.
                    // Where we just need to append the insertion and chunk to the current stream.
                    // e.g.
                    // PPR-static: <head>...</head><body> [ resume content ] </body>
                    // PPR-resume: [ insertion ] [ rest content ]
                    if (insertion) {
                        controller.enqueue(encoder.encode(insertion));
                    }
                    controller.enqueue(chunk);
                    inserted = true;
                }
            }
        },
        async flush (controller) {
            // Check before closing if there's anything remaining to insert.
            if (hasBytes) {
                const insertion = await insert();
                if (insertion) {
                    controller.enqueue(encoder.encode(insertion));
                }
            }
        }
    });
}
// Suffix after main body content - scripts before </body>,
// but wait for the major chunks to be enqueued.
function createDeferredSuffixStream(suffix) {
    let flushed = false;
    let pending;
    const flush = (controller)=>{
        const detached = new _detachedpromise.DetachedPromise();
        pending = detached;
        (0, _scheduler.scheduleImmediate)(()=>{
            try {
                controller.enqueue(encoder.encode(suffix));
            } catch  {
            // If an error occurs while enqueuing it can't be due to this
            // transformers fault. It's likely due to the controller being
            // errored due to the stream being cancelled.
            } finally{
                pending = undefined;
                detached.resolve();
            }
        });
    };
    return new TransformStream({
        transform (chunk, controller) {
            controller.enqueue(chunk);
            // If we've already flushed, we're done.
            if (flushed) return;
            // Schedule the flush to happen.
            flushed = true;
            flush(controller);
        },
        flush (controller) {
            if (pending) return pending.promise;
            if (flushed) return;
            // Flush now.
            controller.enqueue(encoder.encode(suffix));
        }
    });
}
function createFlightDataInjectionTransformStream(stream, delayDataUntilFirstHtmlChunk) {
    let htmlStreamFinished = false;
    let pull = null;
    let donePulling = false;
    function startOrContinuePulling(controller) {
        if (!pull) {
            pull = startPulling(controller);
        }
        return pull;
    }
    async function startPulling(controller) {
        const reader = stream.getReader();
        if (delayDataUntilFirstHtmlChunk) {
            // NOTE: streaming flush
            // We are buffering here for the inlined data stream because the
            // "shell" stream might be chunkenized again by the underlying stream
            // implementation, e.g. with a specific high-water mark. To ensure it's
            // the safe timing to pipe the data stream, this extra tick is
            // necessary.
            // We don't start reading until we've left the current Task to ensure
            // that it's inserted after flushing the shell. Note that this implementation
            // might get stale if impl details of Fizz change in the future.
            await (0, _scheduler.atLeastOneTask)();
        }
        try {
            while(true){
                const { done, value } = await reader.read();
                if (done) {
                    donePulling = true;
                    return;
                }
                // We want to prioritize HTML over RSC data.
                // The SSR render is based on the same RSC stream, so when we get a new RSC chunk,
                // we're likely to produce an HTML chunk as well, so give it a chance to flush first.
                if (!delayDataUntilFirstHtmlChunk && !htmlStreamFinished) {
                    await (0, _scheduler.atLeastOneTask)();
                }
                controller.enqueue(value);
            }
        } catch (err) {
            controller.error(err);
        }
    }
    return new TransformStream({
        start (controller) {
            if (!delayDataUntilFirstHtmlChunk) {
                startOrContinuePulling(controller);
            }
        },
        transform (chunk, controller) {
            controller.enqueue(chunk);
            // Start the streaming if it hasn't already been started yet.
            if (delayDataUntilFirstHtmlChunk) {
                startOrContinuePulling(controller);
            }
        },
        flush (controller) {
            htmlStreamFinished = true;
            if (donePulling) {
                return;
            }
            return startOrContinuePulling(controller);
        }
    });
}
const CLOSE_TAG = '</body></html>';
/**
 * This transform stream moves the suffix to the end of the stream, so results
 * like `</body></html><script>...</script>` will be transformed to
 * `<script>...</script></body></html>`.
 */ function createMoveSuffixStream() {
    let foundSuffix = false;
    return new TransformStream({
        transform (chunk, controller) {
            if (foundSuffix) {
                return controller.enqueue(chunk);
            }
            const index = (0, _uint8arrayhelpers.indexOfUint8Array)(chunk, _encodedtags.ENCODED_TAGS.CLOSED.BODY_AND_HTML);
            if (index > -1) {
                foundSuffix = true;
                // If the whole chunk is the suffix, then don't write anything, it will
                // be written in the flush.
                if (chunk.length === _encodedtags.ENCODED_TAGS.CLOSED.BODY_AND_HTML.length) {
                    return;
                }
                // Write out the part before the suffix.
                const before = chunk.slice(0, index);
                controller.enqueue(before);
                // In the case where the suffix is in the middle of the chunk, we need
                // to split the chunk into two parts.
                if (chunk.length > _encodedtags.ENCODED_TAGS.CLOSED.BODY_AND_HTML.length + index) {
                    // Write out the part after the suffix.
                    const after = chunk.slice(index + _encodedtags.ENCODED_TAGS.CLOSED.BODY_AND_HTML.length);
                    controller.enqueue(after);
                }
            } else {
                controller.enqueue(chunk);
            }
        },
        flush (controller) {
            // Even if we didn't find the suffix, the HTML is not valid if we don't
            // add it, so insert it at the end.
            controller.enqueue(_encodedtags.ENCODED_TAGS.CLOSED.BODY_AND_HTML);
        }
    });
}
function createStripDocumentClosingTagsTransform() {
    return new TransformStream({
        transform (chunk, controller) {
            // We rely on the assumption that chunks will never break across a code unit.
            // This is reasonable because we currently concat all of React's output from a single
            // flush into one chunk before streaming it forward which means the chunk will represent
            // a single coherent utf-8 string. This is not safe to use if we change our streaming to no
            // longer do this large buffered chunk
            if ((0, _uint8arrayhelpers.isEquivalentUint8Arrays)(chunk, _encodedtags.ENCODED_TAGS.CLOSED.BODY_AND_HTML) || (0, _uint8arrayhelpers.isEquivalentUint8Arrays)(chunk, _encodedtags.ENCODED_TAGS.CLOSED.BODY) || (0, _uint8arrayhelpers.isEquivalentUint8Arrays)(chunk, _encodedtags.ENCODED_TAGS.CLOSED.HTML)) {
                // the entire chunk is the closing tags; return without enqueueing anything.
                return;
            }
            // We assume these tags will go at together at the end of the document and that
            // they won't appear anywhere else in the document. This is not really a safe assumption
            // but until we revamp our streaming infra this is a performant way to string the tags
            chunk = (0, _uint8arrayhelpers.removeFromUint8Array)(chunk, _encodedtags.ENCODED_TAGS.CLOSED.BODY);
            chunk = (0, _uint8arrayhelpers.removeFromUint8Array)(chunk, _encodedtags.ENCODED_TAGS.CLOSED.HTML);
            controller.enqueue(chunk);
        }
    });
}
function createRootLayoutValidatorStream() {
    let foundHtml = false;
    let foundBody = false;
    return new TransformStream({
        async transform (chunk, controller) {
            // Peek into the streamed chunk to see if the tags are present.
            if (!foundHtml && (0, _uint8arrayhelpers.indexOfUint8Array)(chunk, _encodedtags.ENCODED_TAGS.OPENING.HTML) > -1) {
                foundHtml = true;
            }
            if (!foundBody && (0, _uint8arrayhelpers.indexOfUint8Array)(chunk, _encodedtags.ENCODED_TAGS.OPENING.BODY) > -1) {
                foundBody = true;
            }
            controller.enqueue(chunk);
        },
        flush (controller) {
            const missingTags = [];
            if (!foundHtml) missingTags.push('html');
            if (!foundBody) missingTags.push('body');
            if (!missingTags.length) return;
            controller.enqueue(encoder.encode(`<html id="__next_error__">
            <template
              data-next-error-message="Missing ${missingTags.map((c)=>`<${c}>`).join(missingTags.length > 1 ? ' and ' : '')} tags in the root layout.\nRead more at https://nextjs.org/docs/messages/missing-root-layout-tags"
              data-next-error-digest="${_constants1.MISSING_ROOT_TAGS_ERROR}"
              data-next-error-stack=""
            ></template>
          `));
        }
    });
}
function chainTransformers(readable, transformers) {
    let stream = readable;
    for (const transformer of transformers){
        if (!transformer) continue;
        stream = stream.pipeThrough(transformer);
    }
    return stream;
}
async function continueFizzStream(renderStream, { suffix, inlinedDataStream, isStaticGeneration, isBuildTimePrerendering, buildId, getServerInsertedHTML, getServerInsertedMetadata, validateRootLayout }) {
    // Suffix itself might contain close tags at the end, so we need to split it.
    const suffixUnclosed = suffix ? suffix.split(CLOSE_TAG, 1)[0] : null;
    // If we're generating static HTML we need to wait for it to resolve before continuing.
    if (isStaticGeneration) {
        await renderStream.allReady;
    }
    return chainTransformers(renderStream, [
        // Buffer everything to avoid flushing too frequently
        createBufferedTransformStream(),
        // Add build id comment to start of the HTML document (in export mode)
        createPrefetchCommentStream(isBuildTimePrerendering, buildId),
        // Transform metadata
        createMetadataTransformStream(getServerInsertedMetadata),
        // Insert suffix content
        suffixUnclosed != null && suffixUnclosed.length > 0 ? createDeferredSuffixStream(suffixUnclosed) : null,
        // Insert the inlined data (Flight data, form state, etc.) stream into the HTML
        inlinedDataStream ? createFlightDataInjectionTransformStream(inlinedDataStream, true) : null,
        // Validate the root layout for missing html or body tags
        validateRootLayout ? createRootLayoutValidatorStream() : null,
        // Close tags should always be deferred to the end
        createMoveSuffixStream(),
        // Special head insertions
        // TODO-APP: Insert server side html to end of head in app layout rendering, to avoid
        // hydration errors. Remove this once it's ready to be handled by react itself.
        createHeadInsertionTransformStream(getServerInsertedHTML)
    ]);
}
async function continueDynamicPrerender(prerenderStream, { getServerInsertedHTML, getServerInsertedMetadata }) {
    return prerenderStream// Buffer everything to avoid flushing too frequently
    .pipeThrough(createBufferedTransformStream()).pipeThrough(createStripDocumentClosingTagsTransform())// Insert generated tags to head
    .pipeThrough(createHeadInsertionTransformStream(getServerInsertedHTML))// Transform metadata
    .pipeThrough(createMetadataTransformStream(getServerInsertedMetadata));
}
async function continueStaticPrerender(prerenderStream, { inlinedDataStream, getServerInsertedHTML, getServerInsertedMetadata, isBuildTimePrerendering, buildId }) {
    return prerenderStream// Buffer everything to avoid flushing too frequently
    .pipeThrough(createBufferedTransformStream())// Add build id comment to start of the HTML document (in export mode)
    .pipeThrough(createPrefetchCommentStream(isBuildTimePrerendering, buildId))// Insert generated tags to head
    .pipeThrough(createHeadInsertionTransformStream(getServerInsertedHTML))// Transform metadata
    .pipeThrough(createMetadataTransformStream(getServerInsertedMetadata))// Insert the inlined data (Flight data, form state, etc.) stream into the HTML
    .pipeThrough(createFlightDataInjectionTransformStream(inlinedDataStream, true))// Close tags should always be deferred to the end
    .pipeThrough(createMoveSuffixStream());
}
async function continueDynamicHTMLResume(renderStream, { delayDataUntilFirstHtmlChunk, inlinedDataStream, getServerInsertedHTML, getServerInsertedMetadata }) {
    return renderStream// Buffer everything to avoid flushing too frequently
    .pipeThrough(createBufferedTransformStream())// Insert generated tags to head
    .pipeThrough(createHeadInsertionTransformStream(getServerInsertedHTML))// Transform metadata
    .pipeThrough(createMetadataTransformStream(getServerInsertedMetadata))// Insert the inlined data (Flight data, form state, etc.) stream into the HTML
    .pipeThrough(createFlightDataInjectionTransformStream(inlinedDataStream, delayDataUntilFirstHtmlChunk))// Close tags should always be deferred to the end
    .pipeThrough(createMoveSuffixStream());
}
function createDocumentClosingStream() {
    return streamFromString(CLOSE_TAG);
}

//# sourceMappingURL=node-web-streams-helper.js.map

/***/ }),

/***/ 54779:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    assign: function() {
        return assign;
    },
    searchParamsToUrlQuery: function() {
        return searchParamsToUrlQuery;
    },
    urlQueryToSearchParams: function() {
        return urlQueryToSearchParams;
    }
});
function searchParamsToUrlQuery(searchParams) {
    const query = {};
    for (const [key, value] of searchParams.entries()){
        const existing = query[key];
        if (typeof existing === 'undefined') {
            query[key] = value;
        } else if (Array.isArray(existing)) {
            existing.push(value);
        } else {
            query[key] = [
                existing,
                value
            ];
        }
    }
    return query;
}
function stringifyUrlQueryParam(param) {
    if (typeof param === 'string') {
        return param;
    }
    if (typeof param === 'number' && !isNaN(param) || typeof param === 'boolean') {
        return String(param);
    } else {
        return '';
    }
}
function urlQueryToSearchParams(query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)){
        if (Array.isArray(value)) {
            for (const item of value){
                searchParams.append(key, stringifyUrlQueryParam(item));
            }
        } else {
            searchParams.set(key, stringifyUrlQueryParam(value));
        }
    }
    return searchParams;
}
function assign(target) {
    for(var _len = arguments.length, searchParamsList = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++){
        searchParamsList[_key - 1] = arguments[_key];
    }
    for (const searchParams of searchParamsList){
        for (const key of searchParams.keys()){
            target.delete(key);
        }
        for (const [key, value] of searchParams.entries()){
            target.append(key, value);
        }
    }
    return target;
} //# sourceMappingURL=querystring.js.map


/***/ }),

/***/ 55122:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "default", ({
    enumerable: true,
    get: function() {
        return ResponseCache;
    }
}));
0 && 0;
const _batcher = __webpack_require__(8538);
const _lrucache = __webpack_require__(20051);
const _log = __webpack_require__(87054);
const _scheduler = __webpack_require__(91504);
const _utils = __webpack_require__(78737);
_export_star(__webpack_require__(21509), exports);
function _export_star(from, to) {
    Object.keys(from).forEach(function(k) {
        if (k !== "default" && !Object.prototype.hasOwnProperty.call(to, k)) {
            Object.defineProperty(to, k, {
                enumerable: true,
                get: function() {
                    return from[k];
                }
            });
        }
    });
    return from;
}
/**
 * Parses an environment variable as a positive integer, returning the fallback
 * if the value is missing, not a number, or not positive.
 */ function parsePositiveInt(envValue, fallback) {
    if (!envValue) return fallback;
    const parsed = parseInt(envValue, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
/**
 * Default TTL (in milliseconds) for minimal mode response cache entries.
 * Used for cache hit validation as a fallback for providers that don't
 * send the x-invocation-id header yet.
 *
 * 10 seconds chosen because:
 * - Long enough to dedupe rapid successive requests (e.g., page + data)
 * - Short enough to not serve stale data across unrelated requests
 *
 * Can be configured via `NEXT_PRIVATE_RESPONSE_CACHE_TTL` environment variable.
 */ const DEFAULT_TTL_MS = parsePositiveInt(process.env.NEXT_PRIVATE_RESPONSE_CACHE_TTL, 10000);
/**
 * Default maximum number of entries in the response cache.
 * Can be configured via `NEXT_PRIVATE_RESPONSE_CACHE_MAX_SIZE` environment variable.
 */ const DEFAULT_MAX_SIZE = parsePositiveInt(process.env.NEXT_PRIVATE_RESPONSE_CACHE_MAX_SIZE, 150);
/**
 * Separator used in compound cache keys to join pathname and invocationID.
 * Using null byte (\0) since it cannot appear in valid URL paths or UUIDs.
 */ const KEY_SEPARATOR = '\0';
/**
 * Sentinel value used for TTL-based cache entries (when invocationID is undefined).
 * Chosen to be a clearly reserved marker for internal cache keys.
 */ const TTL_SENTINEL = '__ttl_sentinel__';
/**
 * Creates a compound cache key from pathname and invocationID.
 */ function createCacheKey(pathname, invocationID) {
    return `${pathname}${KEY_SEPARATOR}${invocationID ?? TTL_SENTINEL}`;
}
/**
 * Extracts the invocationID from a compound cache key.
 * Returns undefined if the key used TTL_SENTINEL.
 */ function extractInvocationID(compoundKey) {
    const separatorIndex = compoundKey.lastIndexOf(KEY_SEPARATOR);
    if (separatorIndex === -1) return undefined;
    const invocationID = compoundKey.slice(separatorIndex + 1);
    return invocationID === TTL_SENTINEL ? undefined : invocationID;
}
class ResponseCache {
    constructor(minimal_mode, maxSize = DEFAULT_MAX_SIZE, ttl = DEFAULT_TTL_MS){
        this.batcher = _batcher.Batcher.create({
            // Ensure on-demand revalidate doesn't block normal requests, it should be
            // safe to run an on-demand revalidate for the same key as a normal request.
            cacheKeyFn: ({ key, isOnDemandRevalidate })=>`${key}-${isOnDemandRevalidate ? '1' : '0'}`,
            // We wait to do any async work until after we've added our promise to
            // `pendingResponses` to ensure that any any other calls will reuse the
            // same promise until we've fully finished our work.
            schedulerFn: _scheduler.scheduleOnNextTick
        });
        this.revalidateBatcher = _batcher.Batcher.create({
            // We wait to do any async work until after we've added our promise to
            // `pendingResponses` to ensure that any any other calls will reuse the
            // same promise until we've fully finished our work.
            schedulerFn: _scheduler.scheduleOnNextTick
        });
        /**
   * Set of invocation IDs that have had cache entries evicted.
   * Used to detect when the cache size may be too small.
   * Bounded to prevent memory growth.
   */ this.evictedInvocationIDs = new Set();
        this.minimal_mode = minimal_mode;
        this.maxSize = maxSize;
        this.ttl = ttl;
        // Create the LRU cache with eviction tracking
        this.cache = new _lrucache.LRUCache(maxSize, undefined, (compoundKey)=>{
            const invocationID = extractInvocationID(compoundKey);
            if (invocationID) {
                // Bound to 100 entries to prevent unbounded memory growth.
                // FIFO eviction is acceptable here because:
                // 1. Invocations are short-lived (single request lifecycle), so older
                //    invocations are unlikely to still be active after 100 newer ones
                // 2. This warning mechanism is best-effort for developer guidance—
                //    missing occasional eviction warnings doesn't affect correctness
                // 3. If a long-running invocation is somehow evicted and then has
                //    another cache entry evicted, it will simply be re-added
                if (this.evictedInvocationIDs.size >= 100) {
                    const first = this.evictedInvocationIDs.values().next().value;
                    if (first) this.evictedInvocationIDs.delete(first);
                }
                this.evictedInvocationIDs.add(invocationID);
            }
        });
    }
    async get(key, responseGenerator, context) {
        // If there is no key for the cache, we can't possibly look this up in the
        // cache so just return the result of the response generator.
        if (!key) {
            return responseGenerator({
                hasResolved: false,
                previousCacheEntry: null
            });
        }
        // Check minimal mode cache before doing any other work.
        if (this.minimal_mode) {
            const cacheKey = createCacheKey(key, context.invocationID);
            const cachedItem = this.cache.get(cacheKey);
            if (cachedItem) {
                // With invocationID: exact match found - always a hit
                // With TTL mode: must check expiration
                if (context.invocationID !== undefined) {
                    return (0, _utils.toResponseCacheEntry)(cachedItem.entry);
                }
                // TTL mode: check expiration
                const now = Date.now();
                if (cachedItem.expiresAt > now) {
                    return (0, _utils.toResponseCacheEntry)(cachedItem.entry);
                }
                // TTL expired - clean up
                this.cache.remove(cacheKey);
            }
            // Warn if this invocation had entries evicted - indicates cache may be too small.
            if (context.invocationID && this.evictedInvocationIDs.has(context.invocationID)) {
                (0, _log.warnOnce)(`Response cache entry was evicted for invocation ${context.invocationID}. ` + `Consider increasing NEXT_PRIVATE_RESPONSE_CACHE_MAX_SIZE (current: ${this.maxSize}).`);
            }
        }
        const { incrementalCache, isOnDemandRevalidate = false, isFallback = false, isRoutePPREnabled = false, isPrefetch = false, waitUntil, routeKind, invocationID } = context;
        const response = await this.batcher.batch({
            key,
            isOnDemandRevalidate
        }, (_cacheKey, resolve)=>{
            const promise = this.handleGet(key, responseGenerator, {
                incrementalCache,
                isOnDemandRevalidate,
                isFallback,
                isRoutePPREnabled,
                isPrefetch,
                routeKind,
                invocationID
            }, resolve);
            // we need to ensure background revalidates are
            // passed to waitUntil
            if (waitUntil) {
                waitUntil(promise);
            }
            return promise;
        });
        return (0, _utils.toResponseCacheEntry)(response);
    }
    /**
   * Handles the get request for the response cache.
   *
   * @param key - The key to get the response cache entry for.
   * @param responseGenerator - The response generator to use to generate the response cache entry.
   * @param context - The context for the get request.
   * @param resolve - The resolve function to use to resolve the response cache entry.
   * @returns The response cache entry.
   */ async handleGet(key, responseGenerator, context, resolve) {
        let previousIncrementalCacheEntry = null;
        let resolved = false;
        try {
            // Get the previous cache entry if not in minimal mode
            previousIncrementalCacheEntry = !this.minimal_mode ? await context.incrementalCache.get(key, {
                kind: (0, _utils.routeKindToIncrementalCacheKind)(context.routeKind),
                isRoutePPREnabled: context.isRoutePPREnabled,
                isFallback: context.isFallback
            }) : null;
            if (previousIncrementalCacheEntry && !context.isOnDemandRevalidate) {
                resolve(previousIncrementalCacheEntry);
                resolved = true;
                if (!previousIncrementalCacheEntry.isStale || context.isPrefetch) {
                    // The cached value is still valid, so we don't need to update it yet.
                    return previousIncrementalCacheEntry;
                }
            }
            // Revalidate the cache entry
            const incrementalResponseCacheEntry = await this.revalidate(key, context.incrementalCache, context.isRoutePPREnabled, context.isFallback, responseGenerator, previousIncrementalCacheEntry, previousIncrementalCacheEntry !== null && !context.isOnDemandRevalidate, undefined, context.invocationID);
            // Handle null response
            if (!incrementalResponseCacheEntry) {
                // Remove the cache item if it was set so we don't use it again.
                if (this.minimal_mode) {
                    const cacheKey = createCacheKey(key, context.invocationID);
                    this.cache.remove(cacheKey);
                }
                return null;
            }
            // Resolve for on-demand revalidation or if not already resolved
            if (context.isOnDemandRevalidate && !resolved) {
                return incrementalResponseCacheEntry;
            }
            return incrementalResponseCacheEntry;
        } catch (err) {
            // If we've already resolved the cache entry, we can't reject as we
            // already resolved the cache entry so log the error here.
            if (resolved) {
                console.error(err);
                return null;
            }
            throw err;
        }
    }
    /**
   * Revalidates the cache entry for the given key.
   *
   * @param key - The key to revalidate the cache entry for.
   * @param incrementalCache - The incremental cache to use to revalidate the cache entry.
   * @param isRoutePPREnabled - Whether the route is PPR enabled.
   * @param isFallback - Whether the route is a fallback.
   * @param responseGenerator - The response generator to use to generate the response cache entry.
   * @param previousIncrementalCacheEntry - The previous cache entry to use to revalidate the cache entry.
   * @param hasResolved - Whether the response has been resolved.
   * @param waitUntil - Optional function to register background work.
   * @param invocationID - The invocation ID for cache key scoping.
   * @returns The revalidated cache entry.
   */ async revalidate(key, incrementalCache, isRoutePPREnabled, isFallback, responseGenerator, previousIncrementalCacheEntry, hasResolved, waitUntil, invocationID) {
        return this.revalidateBatcher.batch(key, ()=>{
            const promise = this.handleRevalidate(key, incrementalCache, isRoutePPREnabled, isFallback, responseGenerator, previousIncrementalCacheEntry, hasResolved, invocationID);
            // We need to ensure background revalidates are passed to waitUntil.
            if (waitUntil) waitUntil(promise);
            return promise;
        });
    }
    async handleRevalidate(key, incrementalCache, isRoutePPREnabled, isFallback, responseGenerator, previousIncrementalCacheEntry, hasResolved, invocationID) {
        try {
            // Generate the response cache entry using the response generator.
            const responseCacheEntry = await responseGenerator({
                hasResolved,
                previousCacheEntry: previousIncrementalCacheEntry,
                isRevalidating: true
            });
            if (!responseCacheEntry) {
                return null;
            }
            // Convert the response cache entry to an incremental response cache entry.
            const incrementalResponseCacheEntry = await (0, _utils.fromResponseCacheEntry)({
                ...responseCacheEntry,
                isMiss: !previousIncrementalCacheEntry
            });
            // We want to persist the result only if it has a cache control value
            // defined.
            if (incrementalResponseCacheEntry.cacheControl) {
                if (this.minimal_mode) {
                    // Set TTL expiration for cache hit validation. Entries are validated
                    // by invocationID when available, with TTL as a fallback for providers
                    // that don't send x-invocation-id. Memory is managed by LRU eviction.
                    const cacheKey = createCacheKey(key, invocationID);
                    this.cache.set(cacheKey, {
                        entry: incrementalResponseCacheEntry,
                        expiresAt: Date.now() + this.ttl
                    });
                } else {
                    await incrementalCache.set(key, incrementalResponseCacheEntry.value, {
                        cacheControl: incrementalResponseCacheEntry.cacheControl,
                        isRoutePPREnabled,
                        isFallback
                    });
                }
            }
            return incrementalResponseCacheEntry;
        } catch (err) {
            // When a path is erroring we automatically re-set the existing cache
            // with new revalidate and expire times to prevent non-stop retrying.
            if (previousIncrementalCacheEntry == null ? void 0 : previousIncrementalCacheEntry.cacheControl) {
                const revalidate = Math.min(Math.max(previousIncrementalCacheEntry.cacheControl.revalidate || 3, 3), 30);
                const expire = previousIncrementalCacheEntry.cacheControl.expire === undefined ? undefined : Math.max(revalidate + 3, previousIncrementalCacheEntry.cacheControl.expire);
                await incrementalCache.set(key, previousIncrementalCacheEntry.value, {
                    cacheControl: {
                        revalidate: revalidate,
                        expire: expire
                    },
                    isRoutePPREnabled,
                    isFallback
                });
            }
            // We haven't resolved yet, so let's throw to indicate an error.
            throw err;
        }
    }
}

//# sourceMappingURL=index.js.map

/***/ }),

/***/ 56011:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "addPathSuffix", ({
    enumerable: true,
    get: function() {
        return addPathSuffix;
    }
}));
const _parsepath = __webpack_require__(34435);
function addPathSuffix(path, suffix) {
    if (!path.startsWith('/') || !suffix) {
        return path;
    }
    const { pathname, query, hash } = (0, _parsepath.parsePath)(path);
    return "" + pathname + suffix + query + hash;
} //# sourceMappingURL=add-path-suffix.js.map


/***/ }),

/***/ 56347:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    RequestCookies: function() {
        return _cookies.RequestCookies;
    },
    ResponseCookies: function() {
        return _cookies.ResponseCookies;
    },
    stringifyCookie: function() {
        return _cookies.stringifyCookie;
    }
});
const _cookies = __webpack_require__(25080);

//# sourceMappingURL=cookies.js.map

/***/ }),

/***/ 56629:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "normalizeLocalePath", ({
    enumerable: true,
    get: function() {
        return normalizeLocalePath;
    }
}));
/**
 * A cache of lowercased locales for each list of locales. This is stored as a
 * WeakMap so if the locales are garbage collected, the cache entry will be
 * removed as well.
 */ const cache = new WeakMap();
function normalizeLocalePath(pathname, locales) {
    // If locales is undefined, return the pathname as is.
    if (!locales) return {
        pathname
    };
    // Get the cached lowercased locales or create a new cache entry.
    let lowercasedLocales = cache.get(locales);
    if (!lowercasedLocales) {
        lowercasedLocales = locales.map((locale)=>locale.toLowerCase());
        cache.set(locales, lowercasedLocales);
    }
    let detectedLocale;
    // The first segment will be empty, because it has a leading `/`. If
    // there is no further segment, there is no locale (or it's the default).
    const segments = pathname.split('/', 2);
    // If there's no second segment (ie, the pathname is just `/`), there's no
    // locale.
    if (!segments[1]) return {
        pathname
    };
    // The second segment will contain the locale part if any.
    const segment = segments[1].toLowerCase();
    // See if the segment matches one of the locales. If it doesn't, there is
    // no locale (or it's the default).
    const index = lowercasedLocales.indexOf(segment);
    if (index < 0) return {
        pathname
    };
    // Return the case-sensitive locale.
    detectedLocale = locales[index];
    // Remove the `/${locale}` part of the pathname.
    pathname = pathname.slice(detectedLocale.length + 1) || '/';
    return {
        pathname,
        detectedLocale
    };
} //# sourceMappingURL=normalize-locale-path.js.map


/***/ }),

/***/ 56755:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "getCacheControlHeader", ({
    enumerable: true,
    get: function() {
        return getCacheControlHeader;
    }
}));
const _constants = __webpack_require__(32072);
function getCacheControlHeader({ revalidate, expire }) {
    const swrHeader = typeof revalidate === 'number' && expire !== undefined && revalidate < expire ? `, stale-while-revalidate=${expire - revalidate}` : '';
    if (revalidate === 0) {
        return 'private, no-cache, no-store, max-age=0, must-revalidate';
    } else if (typeof revalidate === 'number') {
        return `s-maxage=${revalidate}${swrHeader}`;
    }
    return `s-maxage=${_constants.CACHE_ONE_YEAR}${swrHeader}`;
}

//# sourceMappingURL=cache-control.js.map

/***/ }),

/***/ 57043:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";

module.exports = __webpack_require__(63885).vendored.contexts.AmpContext;

//# sourceMappingURL=amp-context.js.map

/***/ }),

/***/ 64971:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "default", ({
    enumerable: true,
    get: function() {
        return RenderResult;
    }
}));
const _nodewebstreamshelper = __webpack_require__(50996);
const _pipereadable = __webpack_require__(79264);
const _invarianterror = __webpack_require__(83493);
class RenderResult {
    static #_ = /**
   * A render result that represents an empty response. This is used to
   * represent a response that was not found or was already sent.
   */ this.EMPTY = new RenderResult(null, {
        metadata: {},
        contentType: null
    });
    /**
   * Creates a new RenderResult instance from a static response.
   *
   * @param value the static response value
   * @param contentType the content type of the response
   * @returns a new RenderResult instance
   */ static fromStatic(value, contentType) {
        return new RenderResult(value, {
            metadata: {},
            contentType
        });
    }
    constructor(response, { contentType, waitUntil, metadata }){
        this.response = response;
        this.contentType = contentType;
        this.metadata = metadata;
        this.waitUntil = waitUntil;
    }
    assignMetadata(metadata) {
        Object.assign(this.metadata, metadata);
    }
    /**
   * Returns true if the response is null. It can be null if the response was
   * not found or was already sent.
   */ get isNull() {
        return this.response === null;
    }
    /**
   * Returns false if the response is a string. It can be a string if the page
   * was prerendered. If it's not, then it was generated dynamically.
   */ get isDynamic() {
        return typeof this.response !== 'string';
    }
    toUnchunkedString(stream = false) {
        if (this.response === null) {
            // If the response is null, return an empty string. This behavior is
            // intentional as we're now providing the `RenderResult.EMPTY` value.
            return '';
        }
        if (typeof this.response !== 'string') {
            if (!stream) {
                throw Object.defineProperty(new _invarianterror.InvariantError('dynamic responses cannot be unchunked. This is a bug in Next.js'), "__NEXT_ERROR_CODE", {
                    value: "E732",
                    enumerable: false,
                    configurable: true
                });
            }
            return (0, _nodewebstreamshelper.streamToString)(this.readable);
        }
        return this.response;
    }
    /**
   * Returns a readable stream of the response.
   */ get readable() {
        if (this.response === null) {
            // If the response is null, return an empty stream. This behavior is
            // intentional as we're now providing the `RenderResult.EMPTY` value.
            return new ReadableStream({
                start (controller) {
                    controller.close();
                }
            });
        }
        if (typeof this.response === 'string') {
            return (0, _nodewebstreamshelper.streamFromString)(this.response);
        }
        if (Buffer.isBuffer(this.response)) {
            return (0, _nodewebstreamshelper.streamFromBuffer)(this.response);
        }
        // If the response is an array of streams, then chain them together.
        if (Array.isArray(this.response)) {
            return (0, _nodewebstreamshelper.chainStreams)(...this.response);
        }
        return this.response;
    }
    /**
   * Coerces the response to an array of streams. This will convert the response
   * to an array of streams if it is not already one.
   *
   * @returns An array of streams
   */ coerce() {
        if (this.response === null) {
            // If the response is null, return an empty stream. This behavior is
            // intentional as we're now providing the `RenderResult.EMPTY` value.
            return [];
        }
        if (typeof this.response === 'string') {
            return [
                (0, _nodewebstreamshelper.streamFromString)(this.response)
            ];
        } else if (Array.isArray(this.response)) {
            return this.response;
        } else if (Buffer.isBuffer(this.response)) {
            return [
                (0, _nodewebstreamshelper.streamFromBuffer)(this.response)
            ];
        } else {
            return [
                this.response
            ];
        }
    }
    /**
   * Unshifts a new stream to the response. This will convert the response to an
   * array of streams if it is not already one and will add the new stream to
   * the start of the array. When this response is piped, all of the streams
   * will be piped one after the other.
   *
   * @param readable The new stream to unshift
   */ unshift(readable) {
        // Coerce the response to an array of streams.
        this.response = this.coerce();
        // Add the new stream to the start of the array.
        this.response.unshift(readable);
    }
    /**
   * Chains a new stream to the response. This will convert the response to an
   * array of streams if it is not already one and will add the new stream to
   * the end. When this response is piped, all of the streams will be piped
   * one after the other.
   *
   * @param readable The new stream to chain
   */ push(readable) {
        // Coerce the response to an array of streams.
        this.response = this.coerce();
        // Add the new stream to the end of the array.
        this.response.push(readable);
    }
    /**
   * Pipes the response to a writable stream. This will close/cancel the
   * writable stream if an error is encountered. If this doesn't throw, then
   * the writable stream will be closed or aborted.
   *
   * @param writable Writable stream to pipe the response to
   */ async pipeTo(writable) {
        try {
            await this.readable.pipeTo(writable, {
                // We want to close the writable stream ourselves so that we can wait
                // for the waitUntil promise to resolve before closing it. If an error
                // is encountered, we'll abort the writable stream if we swallowed the
                // error.
                preventClose: true
            });
            // If there is a waitUntil promise, wait for it to resolve before
            // closing the writable stream.
            if (this.waitUntil) await this.waitUntil;
            // Close the writable stream.
            await writable.close();
        } catch (err) {
            // If this is an abort error, we should abort the writable stream (as we
            // took ownership of it when we started piping). We don't need to re-throw
            // because we handled the error.
            if ((0, _pipereadable.isAbortError)(err)) {
                // Abort the writable stream if an error is encountered.
                await writable.abort(err);
                return;
            }
            // We're not aborting the writer here as when this method throws it's not
            // clear as to how so the caller should assume it's their responsibility
            // to clean up the writer.
            throw err;
        }
    }
    /**
   * Pipes the response to a node response. This will close/cancel the node
   * response if an error is encountered.
   *
   * @param res
   */ async pipeToNodeResponse(res) {
        await (0, _pipereadable.pipeToNodeResponse)(this.readable, res, this.waitUntil);
    }
}

//# sourceMappingURL=render-result.js.map

/***/ }),

/***/ 65131:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    isNodeNextRequest: function() {
        return isNodeNextRequest;
    },
    isNodeNextResponse: function() {
        return isNodeNextResponse;
    },
    isWebNextRequest: function() {
        return isWebNextRequest;
    },
    isWebNextResponse: function() {
        return isWebNextResponse;
    }
});
const isWebNextRequest = (req)=>"nodejs" === 'edge';
const isWebNextResponse = (res)=>"nodejs" === 'edge';
const isNodeNextRequest = (req)=>"nodejs" !== 'edge';
const isNodeNextResponse = (res)=>"nodejs" !== 'edge';

//# sourceMappingURL=helpers.js.map

/***/ }),

/***/ 66537:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "removePathPrefix", ({
    enumerable: true,
    get: function() {
        return removePathPrefix;
    }
}));
const _pathhasprefix = __webpack_require__(23403);
function removePathPrefix(path, prefix) {
    // If the path doesn't start with the prefix we can return it as is. This
    // protects us from situations where the prefix is a substring of the path
    // prefix such as:
    //
    // For prefix: /blog
    //
    //   /blog -> true
    //   /blog/ -> true
    //   /blog/1 -> true
    //   /blogging -> false
    //   /blogging/ -> false
    //   /blogging/1 -> false
    if (!(0, _pathhasprefix.pathHasPrefix)(path, prefix)) {
        return path;
    }
    // Remove the prefix from the path via slicing.
    const withoutPrefix = path.slice(prefix.length);
    // If the path without the prefix starts with a `/` we can return it as is.
    if (withoutPrefix.startsWith('/')) {
        return withoutPrefix;
    }
    // If the path without the prefix doesn't start with a `/` we need to add it
    // back to the path to make sure it's a valid path.
    return "/" + withoutPrefix;
} //# sourceMappingURL=remove-path-prefix.js.map


/***/ }),

/***/ 68176:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    PageSignatureError: function() {
        return PageSignatureError;
    },
    RemovedPageError: function() {
        return RemovedPageError;
    },
    RemovedUAError: function() {
        return RemovedUAError;
    }
});
class PageSignatureError extends Error {
    constructor({ page }){
        super(`The middleware "${page}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return NextResponse.redirect('/new-location')
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `);
    }
}
class RemovedPageError extends Error {
    constructor(){
        super(`The request.page has been deprecated in favour of \`URLPattern\`.
  Read more: https://nextjs.org/docs/messages/middleware-request-page
  `);
    }
}
class RemovedUAError extends Error {
    constructor(){
        super(`The request.ua has been removed in favour of \`userAgent\` function.
  Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent
  `);
    }
}

//# sourceMappingURL=error.js.map

/***/ }),

/***/ 68532:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "warnOnce", ({
    enumerable: true,
    get: function() {
        return warnOnce;
    }
}));
let warnOnce = (_)=>{};
if (false) {} //# sourceMappingURL=warn-once.js.map


/***/ }),

/***/ 68643:
/***/ ((module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "MISSING_ROOT_TAGS_ERROR", ({
    enumerable: true,
    get: function() {
        return MISSING_ROOT_TAGS_ERROR;
    }
}));
const MISSING_ROOT_TAGS_ERROR = 'NEXT_MISSING_ROOT_TAGS';
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=constants.js.map


/***/ }),

/***/ 72974:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "isInAmpMode", ({
    enumerable: true,
    get: function() {
        return isInAmpMode;
    }
}));
function isInAmpMode(param) {
    let { ampFirst = false, hybrid = false, hasQuery = false } = param === void 0 ? {} : param;
    return ampFirst || hybrid && hasQuery;
} //# sourceMappingURL=amp-mode.js.map


/***/ }),

/***/ 73367:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/**
 * A `Promise.withResolvers` implementation that exposes the `resolve` and
 * `reject` functions on a `Promise`.
 *
 * @see https://tc39.es/proposal-promise-with-resolvers/
 */ 
Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "DetachedPromise", ({
    enumerable: true,
    get: function() {
        return DetachedPromise;
    }
}));
class DetachedPromise {
    constructor(){
        let resolve;
        let reject;
        // Create the promise and assign the resolvers to the object.
        this.promise = new Promise((res, rej)=>{
            resolve = res;
            reject = rej;
        });
        // We know that resolvers is defined because the Promise constructor runs
        // synchronously.
        this.resolve = resolve;
        this.reject = reject;
    }
}

//# sourceMappingURL=detached-promise.js.map

/***/ }),

/***/ 74420:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "addPathPrefix", ({
    enumerable: true,
    get: function() {
        return addPathPrefix;
    }
}));
const _parsepath = __webpack_require__(34435);
function addPathPrefix(path, prefix) {
    if (!path.startsWith('/') || !prefix) {
        return path;
    }
    const { pathname, query, hash } = (0, _parsepath.parsePath)(path);
    return "" + prefix + pathname + query + hash;
} //# sourceMappingURL=add-path-prefix.js.map


/***/ }),

/***/ 78737:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    fromResponseCacheEntry: function() {
        return fromResponseCacheEntry;
    },
    routeKindToIncrementalCacheKind: function() {
        return routeKindToIncrementalCacheKind;
    },
    toResponseCacheEntry: function() {
        return toResponseCacheEntry;
    }
});
const _types = __webpack_require__(21509);
const _renderresult = /*#__PURE__*/ _interop_require_default(__webpack_require__(64971));
const _routekind = __webpack_require__(80237);
const _constants = __webpack_require__(32072);
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
async function fromResponseCacheEntry(cacheEntry) {
    var _cacheEntry_value, _cacheEntry_value1;
    return {
        ...cacheEntry,
        value: ((_cacheEntry_value = cacheEntry.value) == null ? void 0 : _cacheEntry_value.kind) === _types.CachedRouteKind.PAGES ? {
            kind: _types.CachedRouteKind.PAGES,
            html: await cacheEntry.value.html.toUnchunkedString(true),
            pageData: cacheEntry.value.pageData,
            headers: cacheEntry.value.headers,
            status: cacheEntry.value.status
        } : ((_cacheEntry_value1 = cacheEntry.value) == null ? void 0 : _cacheEntry_value1.kind) === _types.CachedRouteKind.APP_PAGE ? {
            kind: _types.CachedRouteKind.APP_PAGE,
            html: await cacheEntry.value.html.toUnchunkedString(true),
            postponed: cacheEntry.value.postponed,
            rscData: cacheEntry.value.rscData,
            headers: cacheEntry.value.headers,
            status: cacheEntry.value.status,
            segmentData: cacheEntry.value.segmentData
        } : cacheEntry.value
    };
}
async function toResponseCacheEntry(response) {
    var _response_value, _response_value1;
    if (!response) return null;
    return {
        isMiss: response.isMiss,
        isStale: response.isStale,
        cacheControl: response.cacheControl,
        value: ((_response_value = response.value) == null ? void 0 : _response_value.kind) === _types.CachedRouteKind.PAGES ? {
            kind: _types.CachedRouteKind.PAGES,
            html: _renderresult.default.fromStatic(response.value.html, _constants.HTML_CONTENT_TYPE_HEADER),
            pageData: response.value.pageData,
            headers: response.value.headers,
            status: response.value.status
        } : ((_response_value1 = response.value) == null ? void 0 : _response_value1.kind) === _types.CachedRouteKind.APP_PAGE ? {
            kind: _types.CachedRouteKind.APP_PAGE,
            html: _renderresult.default.fromStatic(response.value.html, _constants.HTML_CONTENT_TYPE_HEADER),
            rscData: response.value.rscData,
            headers: response.value.headers,
            status: response.value.status,
            postponed: response.value.postponed,
            segmentData: response.value.segmentData
        } : response.value
    };
}
function routeKindToIncrementalCacheKind(routeKind) {
    switch(routeKind){
        case _routekind.RouteKind.PAGES:
            return _types.IncrementalCacheKind.PAGES;
        case _routekind.RouteKind.APP_PAGE:
            return _types.IncrementalCacheKind.APP_PAGE;
        case _routekind.RouteKind.IMAGE:
            return _types.IncrementalCacheKind.IMAGE;
        case _routekind.RouteKind.APP_ROUTE:
            return _types.IncrementalCacheKind.APP_ROUTE;
        case _routekind.RouteKind.PAGES_API:
            // Pages Router API routes are not cached in the incremental cache.
            throw Object.defineProperty(new Error(`Unexpected route kind ${routeKind}`), "__NEXT_ERROR_CODE", {
                value: "E64",
                enumerable: false,
                configurable: true
            });
        default:
            return routeKind;
    }
}

//# sourceMappingURL=utils.js.map

/***/ }),

/***/ 79264:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    isAbortError: function() {
        return isAbortError;
    },
    pipeToNodeResponse: function() {
        return pipeToNodeResponse;
    }
});
const _nextrequest = __webpack_require__(33134);
const _detachedpromise = __webpack_require__(73367);
const _tracer = __webpack_require__(12410);
const _constants = __webpack_require__(70772);
const _clientcomponentrendererlogger = __webpack_require__(97589);
function isAbortError(e) {
    return (e == null ? void 0 : e.name) === 'AbortError' || (e == null ? void 0 : e.name) === _nextrequest.ResponseAbortedName;
}
function createWriterFromResponse(res, waitUntilForEnd) {
    let started = false;
    // Create a promise that will resolve once the response has drained. See
    // https://nodejs.org/api/stream.html#stream_event_drain
    let drained = new _detachedpromise.DetachedPromise();
    function onDrain() {
        drained.resolve();
    }
    res.on('drain', onDrain);
    // If the finish event fires, it means we shouldn't block and wait for the
    // drain event.
    res.once('close', ()=>{
        res.off('drain', onDrain);
        drained.resolve();
    });
    // Create a promise that will resolve once the response has finished. See
    // https://nodejs.org/api/http.html#event-finish_1
    const finished = new _detachedpromise.DetachedPromise();
    res.once('finish', ()=>{
        finished.resolve();
    });
    // Create a writable stream that will write to the response.
    return new WritableStream({
        write: async (chunk)=>{
            // You'd think we'd want to use `start` instead of placing this in `write`
            // but this ensures that we don't actually flush the headers until we've
            // started writing chunks.
            if (!started) {
                started = true;
                if ('performance' in globalThis && process.env.NEXT_OTEL_PERFORMANCE_PREFIX) {
                    const metrics = (0, _clientcomponentrendererlogger.getClientComponentLoaderMetrics)();
                    if (metrics) {
                        performance.measure(`${process.env.NEXT_OTEL_PERFORMANCE_PREFIX}:next-client-component-loading`, {
                            start: metrics.clientComponentLoadStart,
                            end: metrics.clientComponentLoadStart + metrics.clientComponentLoadTimes
                        });
                    }
                }
                res.flushHeaders();
                (0, _tracer.getTracer)().trace(_constants.NextNodeServerSpan.startResponse, {
                    spanName: 'start response'
                }, ()=>undefined);
            }
            try {
                const ok = res.write(chunk);
                // Added by the `compression` middleware, this is a function that will
                // flush the partially-compressed response to the client.
                if ('flush' in res && typeof res.flush === 'function') {
                    res.flush();
                }
                // If the write returns false, it means there's some backpressure, so
                // wait until it's streamed before continuing.
                if (!ok) {
                    await drained.promise;
                    // Reset the drained promise so that we can wait for the next drain event.
                    drained = new _detachedpromise.DetachedPromise();
                }
            } catch (err) {
                res.end();
                throw Object.defineProperty(new Error('failed to write chunk to response', {
                    cause: err
                }), "__NEXT_ERROR_CODE", {
                    value: "E321",
                    enumerable: false,
                    configurable: true
                });
            }
        },
        abort: (err)=>{
            if (res.writableFinished) return;
            res.destroy(err);
        },
        close: async ()=>{
            // if a waitUntil promise was passed, wait for it to resolve before
            // ending the response.
            if (waitUntilForEnd) {
                await waitUntilForEnd;
            }
            if (res.writableFinished) return;
            res.end();
            return finished.promise;
        }
    });
}
async function pipeToNodeResponse(readable, res, waitUntilForEnd) {
    try {
        // If the response has already errored, then just return now.
        const { errored, destroyed } = res;
        if (errored || destroyed) return;
        // Create a new AbortController so that we can abort the readable if the
        // client disconnects.
        const controller = (0, _nextrequest.createAbortController)(res);
        const writer = createWriterFromResponse(res, waitUntilForEnd);
        await readable.pipeTo(writer, {
            signal: controller.signal
        });
    } catch (err) {
        // If this isn't related to an abort error, re-throw it.
        if (isAbortError(err)) return;
        throw Object.defineProperty(new Error('failed to pipe response', {
            cause: err
        }), "__NEXT_ERROR_CODE", {
            value: "E180",
            enumerable: false,
            configurable: true
        });
    }
}

//# sourceMappingURL=pipe-readable.js.map

/***/ }),

/***/ 80020:
/***/ ((module) => {

(()=>{"use strict";var e={695:e=>{
/*!
 * fresh
 * Copyright(c) 2012 TJ Holowaychuk
 * Copyright(c) 2016-2017 Douglas Christopher Wilson
 * MIT Licensed
 */
var r=/(?:^|,)\s*?no-cache\s*?(?:,|$)/;e.exports=fresh;function fresh(e,a){var t=e["if-modified-since"];var s=e["if-none-match"];if(!t&&!s){return false}var i=e["cache-control"];if(i&&r.test(i)){return false}if(s&&s!=="*"){var f=a["etag"];if(!f){return false}var n=true;var u=parseTokenList(s);for(var _=0;_<u.length;_++){var o=u[_];if(o===f||o==="W/"+f||"W/"+o===f){n=false;break}}if(n){return false}}if(t){var p=a["last-modified"];var v=!p||!(parseHttpDate(p)<=parseHttpDate(t));if(v){return false}}return true}function parseHttpDate(e){var r=e&&Date.parse(e);return typeof r==="number"?r:NaN}function parseTokenList(e){var r=0;var a=[];var t=0;for(var s=0,i=e.length;s<i;s++){switch(e.charCodeAt(s)){case 32:if(t===r){t=r=s+1}break;case 44:a.push(e.substring(t,r));t=r=s+1;break;default:r=s+1;break}}a.push(e.substring(t,r));return a}}};var r={};function __nccwpck_require__(a){var t=r[a];if(t!==undefined){return t.exports}var s=r[a]={exports:{}};var i=true;try{e[a](s,s.exports,__nccwpck_require__);i=false}finally{if(i)delete r[a]}return s.exports}if(typeof __nccwpck_require__!=="undefined")__nccwpck_require__.ab=__dirname+"/";var a=__nccwpck_require__(695);module.exports=a})();

/***/ }),

/***/ 80237:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "RouteKind", ({
    enumerable: true,
    get: function() {
        return RouteKind;
    }
}));
var RouteKind = /*#__PURE__*/ function(RouteKind) {
    /**
   * `PAGES` represents all the React pages that are under `pages/`.
   */ RouteKind["PAGES"] = "PAGES";
    /**
   * `PAGES_API` represents all the API routes under `pages/api/`.
   */ RouteKind["PAGES_API"] = "PAGES_API";
    /**
   * `APP_PAGE` represents all the React pages that are under `app/` with the
   * filename of `page.{j,t}s{,x}`.
   */ RouteKind["APP_PAGE"] = "APP_PAGE";
    /**
   * `APP_ROUTE` represents all the API routes and metadata routes that are under `app/` with the
   * filename of `route.{j,t}s{,x}`.
   */ RouteKind["APP_ROUTE"] = "APP_ROUTE";
    /**
   * `IMAGE` represents all the images that are generated by `next/image`.
   */ RouteKind["IMAGE"] = "IMAGE";
    return RouteKind;
}({});

//# sourceMappingURL=route-kind.js.map

/***/ }),

/***/ 80413:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   config: () => (/* binding */ config),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   getServerSideProps: () => (/* binding */ getServerSideProps),
/* harmony export */   getStaticPaths: () => (/* binding */ getStaticPaths),
/* harmony export */   getStaticProps: () => (/* binding */ getStaticProps),
/* harmony export */   handler: () => (/* binding */ handler),
/* harmony export */   reportWebVitals: () => (/* binding */ reportWebVitals),
/* harmony export */   routeModule: () => (/* binding */ routeModule),
/* harmony export */   unstable_getServerProps: () => (/* binding */ unstable_getServerProps),
/* harmony export */   unstable_getServerSideProps: () => (/* binding */ unstable_getServerSideProps),
/* harmony export */   unstable_getStaticParams: () => (/* binding */ unstable_getStaticParams),
/* harmony export */   unstable_getStaticPaths: () => (/* binding */ unstable_getStaticPaths),
/* harmony export */   unstable_getStaticProps: () => (/* binding */ unstable_getStaticProps)
/* harmony export */ });
/* harmony import */ var next_dist_server_route_modules_pages_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(63885);
/* harmony import */ var next_dist_server_route_modules_pages_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_pages_module_compiled__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(80237);
/* harmony import */ var next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(81413);
/* harmony import */ var next_dist_pages_document__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(65611);
/* harmony import */ var next_dist_pages_document__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_dist_pages_document__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var next_dist_pages_app__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(625);
/* harmony import */ var next_dist_pages_app__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(next_dist_pages_app__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(11590);
/* harmony import */ var next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var next_dist_server_route_modules_pages_pages_handler__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(12289);



// Import the app and document modules.


// Import the userland code.


// Re-export the component (should be the default export).
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .M)(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__, 'default'));
// Re-export methods.
const getStaticProps = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .M)(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__, 'getStaticProps');
const getStaticPaths = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .M)(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__, 'getStaticPaths');
const getServerSideProps = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .M)(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__, 'getServerSideProps');
const config = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .M)(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__, 'config');
const reportWebVitals = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .M)(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__, 'reportWebVitals');
// Re-export legacy methods.
const unstable_getStaticProps = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .M)(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__, 'unstable_getStaticProps');
const unstable_getStaticPaths = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .M)(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__, 'unstable_getStaticPaths');
const unstable_getStaticParams = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .M)(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__, 'unstable_getStaticParams');
const unstable_getServerProps = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .M)(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__, 'unstable_getServerProps');
const unstable_getServerSideProps = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__/* .hoist */ .M)(next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__, 'unstable_getServerSideProps');
// Create and export the route module that will be consumed.
const routeModule = new next_dist_server_route_modules_pages_module_compiled__WEBPACK_IMPORTED_MODULE_0__.PagesRouteModule({
    definition: {
        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.PAGES,
        page: "/_error",
        pathname: "/_error",
        // The following aren't used in production.
        bundlePath: '',
        filename: ''
    },
    distDir: ".next-production-clean" || 0,
    relativeProjectDir:  false || '',
    components: {
        // default export might not exist when optimized for data only
        App: (next_dist_pages_app__WEBPACK_IMPORTED_MODULE_4___default()),
        Document: (next_dist_pages_document__WEBPACK_IMPORTED_MODULE_3___default())
    },
    userland: next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__
});
const handler = (0,next_dist_server_route_modules_pages_pages_handler__WEBPACK_IMPORTED_MODULE_6__/* .getHandler */ .U)({
    srcPage: "/_error",
    config,
    userland: next_dist_pages_error__WEBPACK_IMPORTED_MODULE_5__,
    routeModule,
    getStaticPaths,
    getStaticProps,
    getServerSideProps
});

//# sourceMappingURL=pages.js.map


/***/ }),

/***/ 81413:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
var __webpack_unused_export__;
/**
 * Hoists a name from a module or promised module.
 *
 * @param module the module to hoist the name from
 * @param name the name to hoist
 * @returns the value on the module (or promised module)
 */ 
__webpack_unused_export__ = ({
    value: true
});
Object.defineProperty(exports, "M", ({
    enumerable: true,
    get: function() {
        return hoist;
    }
}));
function hoist(module, name) {
    // If the name is available in the module, return it.
    if (name in module) {
        return module[name];
    }
    // If a property called `then` exists, assume it's a promise and
    // return a promise that resolves to the name.
    if ('then' in module && typeof module.then === 'function') {
        return module.then((mod)=>hoist(mod, name));
    }
    // If we're trying to hoise the default export, and the module is a function,
    // return the module itself.
    if (typeof module === 'function' && name === 'default') {
        return module;
    }
    // Otherwise, return undefined.
    return undefined;
}

//# sourceMappingURL=helpers.js.map

/***/ }),

/***/ 82015:
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ 82578:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
// ISC License
// Copyright (c) 2021 Alexey Raspopov, Kostiantyn Denysov, Anton Verinov
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
//
// https://github.com/alexeyraspopov/picocolors/blob/b6261487e7b81aaab2440e397a356732cad9e342/picocolors.js#L1

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    bgBlack: function() {
        return bgBlack;
    },
    bgBlue: function() {
        return bgBlue;
    },
    bgCyan: function() {
        return bgCyan;
    },
    bgGreen: function() {
        return bgGreen;
    },
    bgMagenta: function() {
        return bgMagenta;
    },
    bgRed: function() {
        return bgRed;
    },
    bgWhite: function() {
        return bgWhite;
    },
    bgYellow: function() {
        return bgYellow;
    },
    black: function() {
        return black;
    },
    blue: function() {
        return blue;
    },
    bold: function() {
        return bold;
    },
    cyan: function() {
        return cyan;
    },
    dim: function() {
        return dim;
    },
    gray: function() {
        return gray;
    },
    green: function() {
        return green;
    },
    hidden: function() {
        return hidden;
    },
    inverse: function() {
        return inverse;
    },
    italic: function() {
        return italic;
    },
    magenta: function() {
        return magenta;
    },
    purple: function() {
        return purple;
    },
    red: function() {
        return red;
    },
    reset: function() {
        return reset;
    },
    strikethrough: function() {
        return strikethrough;
    },
    underline: function() {
        return underline;
    },
    white: function() {
        return white;
    },
    yellow: function() {
        return yellow;
    }
});
var _globalThis;
const { env, stdout } = ((_globalThis = globalThis) == null ? void 0 : _globalThis.process) ?? {};
const enabled = env && !env.NO_COLOR && (env.FORCE_COLOR || (stdout == null ? void 0 : stdout.isTTY) && !env.CI && env.TERM !== 'dumb');
const replaceClose = (str, close, replace, index)=>{
    const start = str.substring(0, index) + replace;
    const end = str.substring(index + close.length);
    const nextIndex = end.indexOf(close);
    return ~nextIndex ? start + replaceClose(end, close, replace, nextIndex) : start + end;
};
const formatter = (open, close, replace = open)=>{
    if (!enabled) return String;
    return (input)=>{
        const string = '' + input;
        const index = string.indexOf(close, open.length);
        return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
    };
};
const reset = enabled ? (s)=>`\x1b[0m${s}\x1b[0m` : String;
const bold = formatter('\x1b[1m', '\x1b[22m', '\x1b[22m\x1b[1m');
const dim = formatter('\x1b[2m', '\x1b[22m', '\x1b[22m\x1b[2m');
const italic = formatter('\x1b[3m', '\x1b[23m');
const underline = formatter('\x1b[4m', '\x1b[24m');
const inverse = formatter('\x1b[7m', '\x1b[27m');
const hidden = formatter('\x1b[8m', '\x1b[28m');
const strikethrough = formatter('\x1b[9m', '\x1b[29m');
const black = formatter('\x1b[30m', '\x1b[39m');
const red = formatter('\x1b[31m', '\x1b[39m');
const green = formatter('\x1b[32m', '\x1b[39m');
const yellow = formatter('\x1b[33m', '\x1b[39m');
const blue = formatter('\x1b[34m', '\x1b[39m');
const magenta = formatter('\x1b[35m', '\x1b[39m');
const purple = formatter('\x1b[38;2;173;127;168m', '\x1b[39m');
const cyan = formatter('\x1b[36m', '\x1b[39m');
const white = formatter('\x1b[37m', '\x1b[39m');
const gray = formatter('\x1b[90m', '\x1b[39m');
const bgBlack = formatter('\x1b[40m', '\x1b[49m');
const bgRed = formatter('\x1b[41m', '\x1b[49m');
const bgGreen = formatter('\x1b[42m', '\x1b[49m');
const bgYellow = formatter('\x1b[43m', '\x1b[49m');
const bgBlue = formatter('\x1b[44m', '\x1b[49m');
const bgMagenta = formatter('\x1b[45m', '\x1b[49m');
const bgCyan = formatter('\x1b[46m', '\x1b[49m');
const bgWhite = formatter('\x1b[47m', '\x1b[49m');

//# sourceMappingURL=picocolors.js.map

/***/ }),

/***/ 83493:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "InvariantError", ({
    enumerable: true,
    get: function() {
        return InvariantError;
    }
}));
class InvariantError extends Error {
    constructor(message, options){
        super("Invariant: " + (message.endsWith('.') ? message : message + '.') + " This is a bug in Next.js.", options);
        this.name = 'InvariantError';
    }
} //# sourceMappingURL=invariant-error.js.map


/***/ }),

/***/ 83709:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "getRevalidateReason", ({
    enumerable: true,
    get: function() {
        return getRevalidateReason;
    }
}));
function getRevalidateReason(params) {
    if (params.isOnDemandRevalidate) {
        return 'on-demand';
    }
    if (params.isRevalidate) {
        return 'stale';
    }
    return undefined;
}

//# sourceMappingURL=utils.js.map

/***/ }),

/***/ 87054:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    bootstrap: function() {
        return bootstrap;
    },
    error: function() {
        return error;
    },
    event: function() {
        return event;
    },
    info: function() {
        return info;
    },
    prefixes: function() {
        return prefixes;
    },
    ready: function() {
        return ready;
    },
    trace: function() {
        return trace;
    },
    wait: function() {
        return wait;
    },
    warn: function() {
        return warn;
    },
    warnOnce: function() {
        return warnOnce;
    }
});
const _picocolors = __webpack_require__(82578);
const _lrucache = __webpack_require__(20051);
const prefixes = {
    wait: (0, _picocolors.white)((0, _picocolors.bold)('○')),
    error: (0, _picocolors.red)((0, _picocolors.bold)('⨯')),
    warn: (0, _picocolors.yellow)((0, _picocolors.bold)('⚠')),
    ready: '▲',
    info: (0, _picocolors.white)((0, _picocolors.bold)(' ')),
    event: (0, _picocolors.green)((0, _picocolors.bold)('✓')),
    trace: (0, _picocolors.magenta)((0, _picocolors.bold)('»'))
};
const LOGGING_METHOD = {
    log: 'log',
    warn: 'warn',
    error: 'error'
};
function prefixedLog(prefixType, ...message) {
    if ((message[0] === '' || message[0] === undefined) && message.length === 1) {
        message.shift();
    }
    const consoleMethod = prefixType in LOGGING_METHOD ? LOGGING_METHOD[prefixType] : 'log';
    const prefix = prefixes[prefixType];
    // If there's no message, don't print the prefix but a new line
    if (message.length === 0) {
        console[consoleMethod]('');
    } else {
        // Ensure if there's ANSI escape codes it's concatenated into one string.
        // Chrome DevTool can only handle color if it's in one string.
        if (message.length === 1 && typeof message[0] === 'string') {
            console[consoleMethod](' ' + prefix + ' ' + message[0]);
        } else {
            console[consoleMethod](' ' + prefix, ...message);
        }
    }
}
function bootstrap(...message) {
    // logging format: ' <prefix> <message>'
    // e.g. ' ✓ Compiled successfully'
    // Add spaces to align with the indent of other logs
    console.log('   ' + message.join(' '));
}
function wait(...message) {
    prefixedLog('wait', ...message);
}
function error(...message) {
    prefixedLog('error', ...message);
}
function warn(...message) {
    prefixedLog('warn', ...message);
}
function ready(...message) {
    prefixedLog('ready', ...message);
}
function info(...message) {
    prefixedLog('info', ...message);
}
function event(...message) {
    prefixedLog('event', ...message);
}
function trace(...message) {
    prefixedLog('trace', ...message);
}
const warnOnceCache = new _lrucache.LRUCache(10000, (value)=>value.length);
function warnOnce(...message) {
    const key = message.join(' ');
    if (!warnOnceCache.has(key)) {
        warnOnceCache.set(key, key);
        warn(...message);
    }
}

//# sourceMappingURL=log.js.map

/***/ }),

/***/ 88647:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/**
 * Interop between "export default" and "module.exports".
 */ 
Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "interopDefault", ({
    enumerable: true,
    get: function() {
        return interopDefault;
    }
}));
function interopDefault(mod) {
    return mod.default || mod;
}

//# sourceMappingURL=interop-default.js.map

/***/ }),

/***/ 91504:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    atLeastOneTask: function() {
        return atLeastOneTask;
    },
    scheduleImmediate: function() {
        return scheduleImmediate;
    },
    scheduleOnNextTick: function() {
        return scheduleOnNextTick;
    },
    waitAtLeastOneReactRenderTask: function() {
        return waitAtLeastOneReactRenderTask;
    }
});
const scheduleOnNextTick = (cb)=>{
    // We use Promise.resolve().then() here so that the operation is scheduled at
    // the end of the promise job queue, we then add it to the next process tick
    // to ensure it's evaluated afterwards.
    //
    // This was inspired by the implementation of the DataLoader interface: https://github.com/graphql/dataloader/blob/d336bd15282664e0be4b4a657cb796f09bafbc6b/src/index.js#L213-L255
    //
    Promise.resolve().then(()=>{
        if (false) {} else {
            process.nextTick(cb);
        }
    });
};
const scheduleImmediate = (cb)=>{
    if (false) {} else {
        setImmediate(cb);
    }
};
function atLeastOneTask() {
    return new Promise((resolve)=>scheduleImmediate(resolve));
}
function waitAtLeastOneReactRenderTask() {
    if (false) {} else {
        return new Promise((r)=>setImmediate(r));
    }
}

//# sourceMappingURL=scheduler.js.map

/***/ }),

/***/ 92329:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/**
 * Find the starting index of Uint8Array `b` within Uint8Array `a`.
 */ 
Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    indexOfUint8Array: function() {
        return indexOfUint8Array;
    },
    isEquivalentUint8Arrays: function() {
        return isEquivalentUint8Arrays;
    },
    removeFromUint8Array: function() {
        return removeFromUint8Array;
    }
});
function indexOfUint8Array(a, b) {
    if (b.length === 0) return 0;
    if (a.length === 0 || b.length > a.length) return -1;
    // start iterating through `a`
    for(let i = 0; i <= a.length - b.length; i++){
        let completeMatch = true;
        // from index `i`, iterate through `b` and check for mismatch
        for(let j = 0; j < b.length; j++){
            // if the values do not match, then this isn't a complete match, exit `b` iteration early and iterate to next index of `a`.
            if (a[i + j] !== b[j]) {
                completeMatch = false;
                break;
            }
        }
        if (completeMatch) {
            return i;
        }
    }
    return -1;
}
function isEquivalentUint8Arrays(a, b) {
    if (a.length !== b.length) return false;
    for(let i = 0; i < a.length; i++){
        if (a[i] !== b[i]) return false;
    }
    return true;
}
function removeFromUint8Array(a, b) {
    const tagIndex = indexOfUint8Array(a, b);
    if (tagIndex === 0) return a.subarray(b.length);
    if (tagIndex > -1) {
        const removed = new Uint8Array(a.length - b.length);
        removed.set(a.slice(0, tagIndex));
        removed.set(a.slice(tagIndex + b.length), tagIndex);
        return removed;
    } else {
        return a;
    }
}

//# sourceMappingURL=uint8array-helpers.js.map

/***/ }),

/***/ 95000:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "normalizeDataPath", ({
    enumerable: true,
    get: function() {
        return normalizeDataPath;
    }
}));
const _pathhasprefix = __webpack_require__(23403);
function normalizeDataPath(pathname) {
    if (!(0, _pathhasprefix.pathHasPrefix)(pathname || '/', '/_next/data')) {
        return pathname;
    }
    pathname = pathname.replace(/\/_next\/data\/[^/]{1,}/, '').replace(/\.json$/, '');
    if (pathname === '/index') {
        return '/';
    }
    return pathname;
} //# sourceMappingURL=normalize-data-path.js.map


/***/ }),

/***/ 97589:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
0 && (0);
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    getClientComponentLoaderMetrics: function() {
        return getClientComponentLoaderMetrics;
    },
    wrapClientComponentLoader: function() {
        return wrapClientComponentLoader;
    }
});
// Combined load times for loading client components
let clientComponentLoadStart = 0;
let clientComponentLoadTimes = 0;
let clientComponentLoadCount = 0;
function wrapClientComponentLoader(ComponentMod) {
    if (!('performance' in globalThis)) {
        return ComponentMod.__next_app__;
    }
    return {
        require: (...args)=>{
            const startTime = performance.now();
            if (clientComponentLoadStart === 0) {
                clientComponentLoadStart = startTime;
            }
            try {
                clientComponentLoadCount += 1;
                return ComponentMod.__next_app__.require(...args);
            } finally{
                clientComponentLoadTimes += performance.now() - startTime;
            }
        },
        loadChunk: (...args)=>{
            const startTime = performance.now();
            const result = ComponentMod.__next_app__.loadChunk(...args);
            // Avoid wrapping `loadChunk`'s result in an extra promise in case something like React depends on its identity.
            // We only need to know when it's settled.
            result.finally(()=>{
                clientComponentLoadTimes += performance.now() - startTime;
            });
            return result;
        }
    };
}
function getClientComponentLoaderMetrics(options = {}) {
    const metrics = clientComponentLoadStart === 0 ? undefined : {
        clientComponentLoadStart,
        clientComponentLoadTimes,
        clientComponentLoadCount
    };
    if (options.reset) {
        clientComponentLoadStart = 0;
        clientComponentLoadTimes = 0;
        clientComponentLoadCount = 0;
    }
    return metrics;
}

//# sourceMappingURL=client-component-renderer-logger.js.map

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [611], () => (__webpack_exec__(80413)));
module.exports = __webpack_exports__;

})();
//# sourceMappingURL=_error.js.map