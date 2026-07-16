(() => {
var exports = {};
exports.id = 358;
exports.ids = [358];
exports.modules = {

/***/ 261:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/shared/lib/router/utils/app-paths");

/***/ }),

/***/ 3295:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ 7428:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  handler: () => (/* binding */ handler),
  patchFetch: () => (/* binding */ patchFetch),
  routeModule: () => (/* binding */ routeModule),
  serverHooks: () => (/* binding */ serverHooks),
  workAsyncStorage: () => (/* binding */ workAsyncStorage),
  workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)
});

// NAMESPACE OBJECT: ./app/api/admin/specs/execute/route.ts
var route_namespaceObject = {};
__webpack_require__.r(route_namespaceObject);
__webpack_require__.d(route_namespaceObject, {
  POST: () => (POST),
  dynamic: () => (dynamic)
});

// EXTERNAL MODULE: ./node_modules/next/dist/server/route-modules/app-route/module.compiled.js
var module_compiled = __webpack_require__(95736);
// EXTERNAL MODULE: ./node_modules/next/dist/server/route-kind.js
var route_kind = __webpack_require__(9117);
// EXTERNAL MODULE: ./node_modules/next/dist/server/lib/patch-fetch.js
var patch_fetch = __webpack_require__(4044);
// EXTERNAL MODULE: ./node_modules/next/dist/server/request-meta.js
var request_meta = __webpack_require__(39326);
// EXTERNAL MODULE: ./node_modules/next/dist/server/lib/trace/tracer.js
var trace_tracer = __webpack_require__(32324);
// EXTERNAL MODULE: external "next/dist/shared/lib/router/utils/app-paths"
var app_paths_ = __webpack_require__(261);
// EXTERNAL MODULE: ./node_modules/next/dist/server/base-http/node.js
var node = __webpack_require__(54290);
// EXTERNAL MODULE: ./node_modules/next/dist/server/web/spec-extension/adapters/next-request.js
var next_request = __webpack_require__(85328);
// EXTERNAL MODULE: ./node_modules/next/dist/server/lib/trace/constants.js
var constants = __webpack_require__(38928);
// EXTERNAL MODULE: ./node_modules/next/dist/server/instrumentation/utils.js
var utils = __webpack_require__(46595);
// EXTERNAL MODULE: ./node_modules/next/dist/server/send-response.js
var send_response = __webpack_require__(3421);
// EXTERNAL MODULE: ./node_modules/next/dist/server/web/utils.js
var web_utils = __webpack_require__(17679);
// EXTERNAL MODULE: ./node_modules/next/dist/server/lib/cache-control.js
var cache_control = __webpack_require__(41681);
// EXTERNAL MODULE: ./node_modules/next/dist/lib/constants.js
var lib_constants = __webpack_require__(63446);
// EXTERNAL MODULE: external "next/dist/shared/lib/no-fallback-error.external"
var no_fallback_error_external_ = __webpack_require__(86439);
// EXTERNAL MODULE: ./node_modules/next/dist/server/response-cache/index.js
var response_cache = __webpack_require__(51356);
// EXTERNAL MODULE: ./node_modules/next/dist/api/server.js
var server = __webpack_require__(10641);
;// ./app/api/admin/specs/execute/route.ts

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const dynamic = 'force-dynamic';
async function POST(request) {
    try {
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/admin/specs/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': request.headers.get('authorization') || ''
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            throw new Error('Failed to execute tasks');
        }
        const data = await response.json();
        return server.NextResponse.json(data);
    } catch (error) {
        console.error('Error executing tasks:', error);
        return server.NextResponse.json({
            error: 'Failed to execute tasks'
        }, {
            status: 500
        });
    }
}

;// ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?page=%2Fapi%2Fadmin%2Fspecs%2Fexecute%2Froute&name=app%2Fapi%2Fadmin%2Fspecs%2Fexecute%2Froute&pagePath=private-next-app-dir%2Fapi%2Fadmin%2Fspecs%2Fexecute%2Froute.ts&appDir=C%3A%5CNDT%5CPJ%5CAi_Security-main%5Cfrontend%5Cweb%5Capp&appPaths=%2Fapi%2Fadmin%2Fspecs%2Fexecute%2Froute&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D&isGlobalNotFoundEnabled=!

















// We inject the nextConfigOutput here so that we can use them in the route
// module.
const nextConfigOutput = ""
const routeModule = new module_compiled.AppRouteRouteModule({
    definition: {
        kind: route_kind.RouteKind.APP_ROUTE,
        page: "/api/admin/specs/execute/route",
        pathname: "/api/admin/specs/execute",
        filename: "route",
        bundlePath: "app/api/admin/specs/execute/route"
    },
    distDir: ".next-production-clean" || 0,
    relativeProjectDir:  false || '',
    resolvedPagePath: "C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\app\\api\\admin\\specs\\execute\\route.ts",
    nextConfigOutput,
    userland: route_namespaceObject
});
// Pull out the exports that we need to expose from the module. This should
// be eliminated when we've moved the other routes to the new format. These
// are used to hook into the route.
const { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;
function patchFetch() {
    return (0,patch_fetch.patchFetch)({
        workAsyncStorage,
        workUnitAsyncStorage
    });
}

async function handler(req, res, ctx) {
    var _nextConfig_experimental;
    let srcPage = "/api/admin/specs/execute/route";
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
        return null;
    }
    const { buildId, params, nextConfig, isDraftMode, prerenderManifest, routerServerContext, isOnDemandRevalidate, revalidateOnlyGenerated, resolvedPathname } = prepareResult;
    const normalizedSrcPage = (0,app_paths_.normalizeAppPath)(srcPage);
    let isIsr = Boolean(prerenderManifest.dynamicRoutes[normalizedSrcPage] || prerenderManifest.routes[resolvedPathname]);
    if (isIsr && !isDraftMode) {
        const isPrerendered = Boolean(prerenderManifest.routes[resolvedPathname]);
        const prerenderInfo = prerenderManifest.dynamicRoutes[normalizedSrcPage];
        if (prerenderInfo) {
            if (prerenderInfo.fallback === false && !isPrerendered) {
                throw new no_fallback_error_external_.NoFallbackError();
            }
        }
    }
    let cacheKey = null;
    if (isIsr && !routeModule.isDev && !isDraftMode) {
        cacheKey = resolvedPathname;
        // ensure /index and / is normalized to one key
        cacheKey = cacheKey === '/index' ? '/' : cacheKey;
    }
    const supportsDynamicResponse = // If we're in development, we always support dynamic HTML
    routeModule.isDev === true || // If this is not SSG or does not have static paths, then it supports
    // dynamic HTML.
    !isIsr;
    // This is a revalidation request if the request is for a static
    // page and it is not being resumed from a postponed render and
    // it is not a dynamic RSC request then it is a revalidation
    // request.
    const isRevalidate = isIsr && !supportsDynamicResponse;
    const method = req.method || 'GET';
    const tracer = (0,trace_tracer.getTracer)();
    const activeSpan = tracer.getActiveScopeSpan();
    const context = {
        params,
        prerenderManifest,
        renderOpts: {
            experimental: {
                cacheComponents: Boolean(nextConfig.experimental.cacheComponents),
                authInterrupts: Boolean(nextConfig.experimental.authInterrupts)
            },
            supportsDynamicResponse,
            incrementalCache: (0,request_meta.getRequestMeta)(req, 'incrementalCache'),
            cacheLifeProfiles: (_nextConfig_experimental = nextConfig.experimental) == null ? void 0 : _nextConfig_experimental.cacheLife,
            isRevalidate,
            waitUntil: ctx.waitUntil,
            onClose: (cb)=>{
                res.on('close', cb);
            },
            onAfterTaskError: undefined,
            onInstrumentationRequestError: (error, _request, errorContext)=>routeModule.onRequestError(req, error, errorContext, routerServerContext)
        },
        sharedContext: {
            buildId
        }
    };
    const nodeNextReq = new node.NodeNextRequest(req);
    const nodeNextRes = new node.NodeNextResponse(res);
    const nextReq = next_request.NextRequestAdapter.fromNodeNextRequest(nodeNextReq, (0,next_request.signalFromNodeResponse)(res));
    try {
        const invokeRouteModule = async (span)=>{
            return routeModule.handle(nextReq, context).finally(()=>{
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
                if (rootSpanAttributes.get('next.span_type') !== constants.BaseServerSpan.handleRequest) {
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
        };
        const handleResponse = async (currentSpan)=>{
            var _cacheEntry_value;
            const responseGenerator = async ({ previousCacheEntry })=>{
                try {
                    if (!(0,request_meta.getRequestMeta)(req, 'minimalMode') && isOnDemandRevalidate && revalidateOnlyGenerated && !previousCacheEntry) {
                        res.statusCode = 404;
                        // on-demand revalidate always sets this header
                        res.setHeader('x-nextjs-cache', 'REVALIDATED');
                        res.end('This page could not be found');
                        return null;
                    }
                    const response = await invokeRouteModule(currentSpan);
                    req.fetchMetrics = context.renderOpts.fetchMetrics;
                    let pendingWaitUntil = context.renderOpts.pendingWaitUntil;
                    // Attempt using provided waitUntil if available
                    // if it's not we fallback to sendResponse's handling
                    if (pendingWaitUntil) {
                        if (ctx.waitUntil) {
                            ctx.waitUntil(pendingWaitUntil);
                            pendingWaitUntil = undefined;
                        }
                    }
                    const cacheTags = context.renderOpts.collectedTags;
                    // If the request is for a static response, we can cache it so long
                    // as it's not edge.
                    if (isIsr) {
                        const blob = await response.blob();
                        // Copy the headers from the response.
                        const headers = (0,web_utils.toNodeOutgoingHttpHeaders)(response.headers);
                        if (cacheTags) {
                            headers[lib_constants.NEXT_CACHE_TAGS_HEADER] = cacheTags;
                        }
                        if (!headers['content-type'] && blob.type) {
                            headers['content-type'] = blob.type;
                        }
                        const revalidate = typeof context.renderOpts.collectedRevalidate === 'undefined' || context.renderOpts.collectedRevalidate >= lib_constants.INFINITE_CACHE ? false : context.renderOpts.collectedRevalidate;
                        const expire = typeof context.renderOpts.collectedExpire === 'undefined' || context.renderOpts.collectedExpire >= lib_constants.INFINITE_CACHE ? undefined : context.renderOpts.collectedExpire;
                        // Create the cache entry for the response.
                        const cacheEntry = {
                            value: {
                                kind: response_cache.CachedRouteKind.APP_ROUTE,
                                status: response.status,
                                body: Buffer.from(await blob.arrayBuffer()),
                                headers
                            },
                            cacheControl: {
                                revalidate,
                                expire
                            }
                        };
                        return cacheEntry;
                    } else {
                        // send response without caching if not ISR
                        await (0,send_response/* sendResponse */.I)(nodeNextReq, nodeNextRes, response, context.renderOpts.pendingWaitUntil);
                        return null;
                    }
                } catch (err) {
                    // if this is a background revalidate we need to report
                    // the request error here as it won't be bubbled
                    if (previousCacheEntry == null ? void 0 : previousCacheEntry.isStale) {
                        await routeModule.onRequestError(req, err, {
                            routerKind: 'App Router',
                            routePath: srcPage,
                            routeType: 'route',
                            revalidateReason: (0,utils/* getRevalidateReason */.c)({
                                isRevalidate,
                                isOnDemandRevalidate
                            })
                        }, routerServerContext);
                    }
                    throw err;
                }
            };
            const cacheEntry = await routeModule.handleResponse({
                req,
                nextConfig,
                cacheKey,
                routeKind: route_kind.RouteKind.APP_ROUTE,
                isFallback: false,
                prerenderManifest,
                isRoutePPREnabled: false,
                isOnDemandRevalidate,
                revalidateOnlyGenerated,
                responseGenerator,
                waitUntil: ctx.waitUntil
            });
            // we don't create a cacheEntry for ISR
            if (!isIsr) {
                return null;
            }
            if ((cacheEntry == null ? void 0 : (_cacheEntry_value = cacheEntry.value) == null ? void 0 : _cacheEntry_value.kind) !== response_cache.CachedRouteKind.APP_ROUTE) {
                var _cacheEntry_value1;
                throw Object.defineProperty(new Error(`Invariant: app-route received invalid cache entry ${cacheEntry == null ? void 0 : (_cacheEntry_value1 = cacheEntry.value) == null ? void 0 : _cacheEntry_value1.kind}`), "__NEXT_ERROR_CODE", {
                    value: "E701",
                    enumerable: false,
                    configurable: true
                });
            }
            if (!(0,request_meta.getRequestMeta)(req, 'minimalMode')) {
                res.setHeader('x-nextjs-cache', isOnDemandRevalidate ? 'REVALIDATED' : cacheEntry.isMiss ? 'MISS' : cacheEntry.isStale ? 'STALE' : 'HIT');
            }
            // Draft mode should never be cached
            if (isDraftMode) {
                res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
            }
            const headers = (0,web_utils.fromNodeOutgoingHttpHeaders)(cacheEntry.value.headers);
            if (!((0,request_meta.getRequestMeta)(req, 'minimalMode') && isIsr)) {
                headers.delete(lib_constants.NEXT_CACHE_TAGS_HEADER);
            }
            // If cache control is already set on the response we don't
            // override it to allow users to customize it via next.config
            if (cacheEntry.cacheControl && !res.getHeader('Cache-Control') && !headers.get('Cache-Control')) {
                headers.set('Cache-Control', (0,cache_control.getCacheControlHeader)(cacheEntry.cacheControl));
            }
            await (0,send_response/* sendResponse */.I)(nodeNextReq, nodeNextRes, new Response(cacheEntry.value.body, {
                headers,
                status: cacheEntry.value.status || 200
            }));
            return null;
        };
        // TODO: activeSpan code path is for when wrapped by
        // next-server can be removed when this is no longer used
        if (activeSpan) {
            await handleResponse(activeSpan);
        } else {
            await tracer.withPropagatedContext(req.headers, ()=>tracer.trace(constants.BaseServerSpan.handleRequest, {
                    spanName: `${method} ${req.url}`,
                    kind: trace_tracer.SpanKind.SERVER,
                    attributes: {
                        'http.method': method,
                        'http.target': req.url
                    }
                }, handleResponse));
        }
    } catch (err) {
        if (!(err instanceof no_fallback_error_external_.NoFallbackError)) {
            await routeModule.onRequestError(req, err, {
                routerKind: 'App Router',
                routePath: normalizedSrcPage,
                routeType: 'route',
                revalidateReason: (0,utils/* getRevalidateReason */.c)({
                    isRevalidate,
                    isOnDemandRevalidate
                })
            });
        }
        // rethrow so that we can handle serving error page
        // If this is during static generation, throw the error again.
        if (isIsr) throw err;
        // Otherwise, send a 500 response.
        await (0,send_response/* sendResponse */.I)(nodeNextReq, nodeNextRes, new Response(null, {
            status: 500
        }));
        return null;
    }
}

//# sourceMappingURL=app-route.js.map


/***/ }),

/***/ 10846:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.prod.js");

/***/ }),

/***/ 19121:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/action-async-storage.external.js");

/***/ }),

/***/ 29294:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ 44870:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.prod.js");

/***/ }),

/***/ 63033:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ 78335:
/***/ (() => {



/***/ }),

/***/ 86439:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/shared/lib/no-fallback-error.external");

/***/ }),

/***/ 96487:
/***/ (() => {



/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [331,692], () => (__webpack_exec__(7428)));
module.exports = __webpack_exports__;

})();
//# sourceMappingURL=route.js.map