(() => {
var exports = {};
exports.id = 220;
exports.ids = [220];
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

/***/ 10846:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.prod.js");

/***/ }),

/***/ 15489:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GlobalError: () => (/* reexport default from dynamic */ next_dist_client_components_builtin_global_error_js__WEBPACK_IMPORTED_MODULE_26___default.a),
/* harmony export */   __next_app__: () => (/* binding */ __next_app__),
/* harmony export */   handler: () => (/* binding */ handler),
/* harmony export */   pages: () => (/* binding */ pages),
/* harmony export */   routeModule: () => (/* binding */ routeModule),
/* harmony export */   tree: () => (/* binding */ tree)
/* harmony export */ });
/* harmony import */ var next_dist_server_route_modules_app_page_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(49754);
/* harmony import */ var next_dist_server_route_modules_app_page_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_page_module_compiled__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(9117);
/* harmony import */ var next_dist_server_instrumentation_utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(46595);
/* harmony import */ var next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(32324);
/* harmony import */ var next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(39326);
/* harmony import */ var next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(38928);
/* harmony import */ var next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var next_dist_server_app_render_interop_default__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(20175);
/* harmony import */ var next_dist_server_app_render_strip_flight_headers__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(12);
/* harmony import */ var next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(54290);
/* harmony import */ var next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_8__);
/* harmony import */ var next_dist_server_lib_experimental_ppr__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(12696);
/* harmony import */ var next_dist_server_lib_experimental_ppr__WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_experimental_ppr__WEBPACK_IMPORTED_MODULE_9__);
/* harmony import */ var next_dist_server_lib_is_rsc_request__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(52574);
/* harmony import */ var next_dist_server_request_fallback_params__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(82802);
/* harmony import */ var next_dist_server_app_render_encryption_utils__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(77533);
/* harmony import */ var next_dist_server_app_render_encryption_utils__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_app_render_encryption_utils__WEBPACK_IMPORTED_MODULE_12__);
/* harmony import */ var next_dist_server_lib_streaming_metadata__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(45229);
/* harmony import */ var next_dist_server_lib_streaming_metadata__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_streaming_metadata__WEBPACK_IMPORTED_MODULE_13__);
/* harmony import */ var next_dist_server_app_render_action_utils__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(32822);
/* harmony import */ var next_dist_server_app_render_action_utils__WEBPACK_IMPORTED_MODULE_14___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_app_render_action_utils__WEBPACK_IMPORTED_MODULE_14__);
/* harmony import */ var next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(261);
/* harmony import */ var next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_15___default = /*#__PURE__*/__webpack_require__.n(next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_15__);
/* harmony import */ var next_dist_server_lib_server_action_request_meta__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(26453);
/* harmony import */ var next_dist_server_lib_server_action_request_meta__WEBPACK_IMPORTED_MODULE_16___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_server_action_request_meta__WEBPACK_IMPORTED_MODULE_16__);
/* harmony import */ var next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(52474);
/* harmony import */ var next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17___default = /*#__PURE__*/__webpack_require__.n(next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__);
/* harmony import */ var next_dist_shared_lib_router_utils_is_bot__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(26713);
/* harmony import */ var next_dist_shared_lib_router_utils_is_bot__WEBPACK_IMPORTED_MODULE_18___default = /*#__PURE__*/__webpack_require__.n(next_dist_shared_lib_router_utils_is_bot__WEBPACK_IMPORTED_MODULE_18__);
/* harmony import */ var next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(51356);
/* harmony import */ var next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__);
/* harmony import */ var next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(62685);
/* harmony import */ var next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20___default = /*#__PURE__*/__webpack_require__.n(next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__);
/* harmony import */ var next_dist_server_render_result__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(36225);
/* harmony import */ var next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(63446);
/* harmony import */ var next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22___default = /*#__PURE__*/__webpack_require__.n(next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__);
/* harmony import */ var next_dist_server_stream_utils_encoded_tags__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(2762);
/* harmony import */ var next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(45742);
/* harmony import */ var next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__);
/* harmony import */ var next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(86439);
/* harmony import */ var next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_25___default = /*#__PURE__*/__webpack_require__.n(next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_25__);
/* harmony import */ var next_dist_client_components_builtin_global_error_js__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(81170);
/* harmony import */ var next_dist_client_components_builtin_global_error_js__WEBPACK_IMPORTED_MODULE_26___default = /*#__PURE__*/__webpack_require__.n(next_dist_client_components_builtin_global_error_js__WEBPACK_IMPORTED_MODULE_26__);
/* harmony import */ var next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(62506);
/* harmony import */ var next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27__);
/* harmony import */ var next_dist_client_components_redirect_status_code__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(91203);
/* harmony import */ var next_dist_client_components_redirect_status_code__WEBPACK_IMPORTED_MODULE_28___default = /*#__PURE__*/__webpack_require__.n(next_dist_client_components_redirect_status_code__WEBPACK_IMPORTED_MODULE_28__);
/* harmony reexport (unknown) */ var __WEBPACK_REEXPORT_OBJECT__ = {};
/* harmony reexport (unknown) */ for(const __WEBPACK_IMPORT_KEY__ in next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27__) if(["default","tree","pages","GlobalError","__next_app__","routeModule","handler"].indexOf(__WEBPACK_IMPORT_KEY__) < 0) __WEBPACK_REEXPORT_OBJECT__[__WEBPACK_IMPORT_KEY__] = () => next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27__[__WEBPACK_IMPORT_KEY__]
/* harmony reexport (unknown) */ __webpack_require__.d(__webpack_exports__, __WEBPACK_REEXPORT_OBJECT__);
const module0 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 16953));
const module1 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 81170, 23));
const module2 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 87028, 23));
const module3 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 90461, 23));
const module4 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.t.bind(__webpack_require__, 32768, 23));
const page5 = () => Promise.resolve(/* import() eager */).then(__webpack_require__.bind(__webpack_require__, 46856));


























// We inject the tree and pages here so that we can use them in the route
// module.
const tree = {
        children: [
        '',
        {
        children: [
        'about',
        {
        children: ['__PAGE__', {}, {
          page: [page5, "C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\app\\about\\page.tsx"],
          
        }]
      },
        {
        
        
      }
      ]
      },
        {
        'layout': [module0, "C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\app\\layout.tsx"],
'global-error': [module1, "next/dist/client/components/builtin/global-error.js"],
'not-found': [module2, "next/dist/client/components/builtin/not-found.js"],
'forbidden': [module3, "next/dist/client/components/builtin/forbidden.js"],
'unauthorized': [module4, "next/dist/client/components/builtin/unauthorized.js"],
        
      }
      ]
      }.children;
const pages = ["C:\\NDT\\PJ\\Ai_Security-main\\frontend\\web\\app\\about\\page.tsx"];



const __next_app_require__ = __webpack_require__
const __next_app_load_chunk__ = () => Promise.resolve()
const __next_app__ = {
    require: __next_app_require__,
    loadChunk: __next_app_load_chunk__
};



// Create and export the route module that will be consumed.
const routeModule = new next_dist_server_route_modules_app_page_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppPageRouteModule({
    definition: {
        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_PAGE,
        page: "/about/page",
        pathname: "/about",
        // The following aren't used in production.
        bundlePath: '',
        filename: '',
        appPaths: []
    },
    userland: {
        loaderTree: tree
    },
    distDir: ".next-production-clean" || 0,
    relativeProjectDir:  false || ''
});
async function handler(req, res, ctx) {
    var _this;
    let srcPage = "/about/page";
    // turbopack doesn't normalize `/index` in the page name
    // so we need to to process dynamic routes properly
    // TODO: fix turbopack providing differing value from webpack
    if (false) {} else if (srcPage === '/index') {
        // we always normalize /index specifically
        srcPage = '/';
    }
    const multiZoneDraftMode = false;
    const initialPostponed = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'postponed');
    // TODO: replace with more specific flags
    const minimalMode = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'minimalMode');
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
    const { buildId, query, params, parsedUrl, pageIsDynamic, buildManifest, nextFontManifest, reactLoadableManifest, serverActionsManifest, clientReferenceManifest, subresourceIntegrityManifest, prerenderManifest, isDraftMode, resolvedPathname, revalidateOnlyGenerated, routerServerContext, nextConfig, interceptionRoutePatterns } = prepareResult;
    const pathname = parsedUrl.pathname || '/';
    const normalizedSrcPage = (0,next_dist_shared_lib_router_utils_app_paths__WEBPACK_IMPORTED_MODULE_15__.normalizeAppPath)(srcPage);
    let { isOnDemandRevalidate } = prepareResult;
    const prerenderInfo = routeModule.match(pathname, prerenderManifest);
    const isPrerendered = !!prerenderManifest.routes[resolvedPathname];
    let isSSG = Boolean(prerenderInfo || isPrerendered || prerenderManifest.routes[normalizedSrcPage]);
    const userAgent = req.headers['user-agent'] || '';
    const botType = (0,next_dist_shared_lib_router_utils_is_bot__WEBPACK_IMPORTED_MODULE_18__.getBotType)(userAgent);
    const isHtmlBot = (0,next_dist_server_lib_streaming_metadata__WEBPACK_IMPORTED_MODULE_13__.isHtmlBotRequest)(req);
    /**
   * If true, this indicates that the request being made is for an app
   * prefetch request.
   */ const isPrefetchRSCRequest = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'isPrefetchRSCRequest') ?? req.headers[next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.NEXT_ROUTER_PREFETCH_HEADER] === '1' // exclude runtime prefetches, which use '2'
    ;
    // NOTE: Don't delete headers[RSC] yet, it still needs to be used in renderToHTML later
    const isRSCRequest = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'isRSCRequest') ?? (0,next_dist_server_lib_is_rsc_request__WEBPACK_IMPORTED_MODULE_10__/* .isRSCRequestHeader */ .f)(req.headers[next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.RSC_HEADER]);
    const isPossibleServerAction = (0,next_dist_server_lib_server_action_request_meta__WEBPACK_IMPORTED_MODULE_16__.getIsPossibleServerAction)(req);
    /**
   * If the route being rendered is an app page, and the ppr feature has been
   * enabled, then the given route _could_ support PPR.
   */ const couldSupportPPR = (0,next_dist_server_lib_experimental_ppr__WEBPACK_IMPORTED_MODULE_9__.checkIsAppPPREnabled)(nextConfig.experimental.ppr);
    // When enabled, this will allow the use of the `?__nextppronly` query to
    // enable debugging of the static shell.
    const hasDebugStaticShellQuery =  false && 0;
    // When enabled, this will allow the use of the `?__nextppronly` query
    // to enable debugging of the fallback shell.
    const hasDebugFallbackShellQuery = hasDebugStaticShellQuery && query.__nextppronly === 'fallback';
    // This page supports PPR if it is marked as being `PARTIALLY_STATIC` in the
    // prerender manifest and this is an app page.
    const isRoutePPREnabled = couldSupportPPR && (((_this = prerenderManifest.routes[normalizedSrcPage] ?? prerenderManifest.dynamicRoutes[normalizedSrcPage]) == null ? void 0 : _this.renderingMode) === 'PARTIALLY_STATIC' || // Ideally we'd want to check the appConfig to see if this page has PPR
    // enabled or not, but that would require plumbing the appConfig through
    // to the server during development. We assume that the page supports it
    // but only during development.
    hasDebugStaticShellQuery && (routeModule.isDev === true || (routerServerContext == null ? void 0 : routerServerContext.experimentalTestProxy) === true));
    const isDebugStaticShell = hasDebugStaticShellQuery && isRoutePPREnabled;
    // We should enable debugging dynamic accesses when the static shell
    // debugging has been enabled and we're also in development mode.
    const isDebugDynamicAccesses = isDebugStaticShell && routeModule.isDev === true;
    const isDebugFallbackShell = hasDebugFallbackShellQuery && isRoutePPREnabled;
    // If we're in minimal mode, then try to get the postponed information from
    // the request metadata. If available, use it for resuming the postponed
    // render.
    const minimalPostponed = isRoutePPREnabled ? initialPostponed : undefined;
    // If PPR is enabled, and this is a RSC request (but not a prefetch), then
    // we can use this fact to only generate the flight data for the request
    // because we can't cache the HTML (as it's also dynamic).
    const isDynamicRSCRequest = isRoutePPREnabled && isRSCRequest && !isPrefetchRSCRequest;
    // Need to read this before it's stripped by stripFlightHeaders. We don't
    // need to transfer it to the request meta because it's only read
    // within this function; the static segment data should have already been
    // generated, so we will always either return a static response or a 404.
    const segmentPrefetchHeader = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'segmentPrefetchRSCRequest');
    // TODO: investigate existing bug with shouldServeStreamingMetadata always
    // being true for a revalidate due to modifying the base-server this.renderOpts
    // when fixing this to correct logic it causes hydration issue since we set
    // serveStreamingMetadata to true during export
    let serveStreamingMetadata = !userAgent ? true : (0,next_dist_server_lib_streaming_metadata__WEBPACK_IMPORTED_MODULE_13__.shouldServeStreamingMetadata)(userAgent, nextConfig.htmlLimitedBots);
    if (isHtmlBot && isRoutePPREnabled) {
        isSSG = false;
        serveStreamingMetadata = false;
    }
    // In development, we always want to generate dynamic HTML.
    let supportsDynamicResponse = // If we're in development, we always support dynamic HTML, unless it's
    // a data request, in which case we only produce static HTML.
    routeModule.isDev === true || // If this is not SSG or does not have static paths, then it supports
    // dynamic HTML.
    !isSSG || // If this request has provided postponed data, it supports dynamic
    // HTML.
    typeof initialPostponed === 'string' || // If this is a dynamic RSC request, then this render supports dynamic
    // HTML (it's dynamic).
    isDynamicRSCRequest;
    // When html bots request PPR page, perform the full dynamic rendering.
    const shouldWaitOnAllReady = isHtmlBot && isRoutePPREnabled;
    let ssgCacheKey = null;
    if (!isDraftMode && isSSG && !supportsDynamicResponse && !isPossibleServerAction && !minimalPostponed && !isDynamicRSCRequest) {
        ssgCacheKey = resolvedPathname;
    }
    // the staticPathKey differs from ssgCacheKey since
    // ssgCacheKey is null in dev since we're always in "dynamic"
    // mode in dev to bypass the cache, but we still need to honor
    // dynamicParams = false in dev mode
    let staticPathKey = ssgCacheKey;
    if (!staticPathKey && routeModule.isDev) {
        staticPathKey = resolvedPathname;
    }
    // If this is a request for an app path that should be statically generated
    // and we aren't in the edge runtime, strip the flight headers so it will
    // generate the static response.
    if (!routeModule.isDev && !isDraftMode && isSSG && isRSCRequest && !isDynamicRSCRequest) {
        (0,next_dist_server_app_render_strip_flight_headers__WEBPACK_IMPORTED_MODULE_7__/* .stripFlightHeaders */ .d)(req.headers);
    }
    const ComponentMod = {
        ...next_dist_server_app_render_entry_base__WEBPACK_IMPORTED_MODULE_27__,
        tree,
        pages,
        GlobalError: (next_dist_client_components_builtin_global_error_js__WEBPACK_IMPORTED_MODULE_26___default()),
        handler,
        routeModule,
        __next_app__
    };
    // Before rendering (which initializes component tree modules), we have to
    // set the reference manifests to our global store so Server Action's
    // encryption util can access to them at the top level of the page module.
    if (serverActionsManifest && clientReferenceManifest) {
        (0,next_dist_server_app_render_encryption_utils__WEBPACK_IMPORTED_MODULE_12__.setReferenceManifestsSingleton)({
            page: srcPage,
            clientReferenceManifest,
            serverActionsManifest,
            serverModuleMap: (0,next_dist_server_app_render_action_utils__WEBPACK_IMPORTED_MODULE_14__.createServerModuleMap)({
                serverActionsManifest
            })
        });
    }
    const method = req.method || 'GET';
    const tracer = (0,next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_3__.getTracer)();
    const activeSpan = tracer.getActiveScopeSpan();
    try {
        const varyHeader = routeModule.getVaryHeader(resolvedPathname, interceptionRoutePatterns);
        res.setHeader('Vary', varyHeader);
        const invokeRouteModule = async (span, context)=>{
            const nextReq = new next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_8__.NodeNextRequest(req);
            const nextRes = new next_dist_server_base_http_node__WEBPACK_IMPORTED_MODULE_8__.NodeNextResponse(res);
            // TODO: adapt for putting the RDC inside the postponed data
            // If we're in dev, and this isn't a prefetch or a server action,
            // we should seed the resume data cache.
            if (false) {}
            return routeModule.render(nextReq, nextRes, context).finally(()=>{
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
                if (rootSpanAttributes.get('next.span_type') !== next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_5__.BaseServerSpan.handleRequest) {
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
        const doRender = async ({ span, postponed, fallbackRouteParams })=>{
            const context = {
                query,
                params,
                page: normalizedSrcPage,
                sharedContext: {
                    buildId
                },
                serverComponentsHmrCache: (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'serverComponentsHmrCache'),
                fallbackRouteParams,
                renderOpts: {
                    App: ()=>null,
                    Document: ()=>null,
                    pageConfig: {},
                    ComponentMod,
                    Component: (0,next_dist_server_app_render_interop_default__WEBPACK_IMPORTED_MODULE_6__/* .interopDefault */ .T)(ComponentMod),
                    params,
                    routeModule,
                    page: srcPage,
                    postponed,
                    shouldWaitOnAllReady,
                    serveStreamingMetadata,
                    supportsDynamicResponse: typeof postponed === 'string' || supportsDynamicResponse,
                    buildManifest,
                    nextFontManifest,
                    reactLoadableManifest,
                    subresourceIntegrityManifest,
                    serverActionsManifest,
                    clientReferenceManifest,
                    setIsrStatus: routerServerContext == null ? void 0 : routerServerContext.setIsrStatus,
                    dir:  true ? (__webpack_require__(33873).join)(/* turbopackIgnore: true */ process.cwd(), routeModule.relativeProjectDir) : 0,
                    isDraftMode,
                    isRevalidate: isSSG && !postponed && !isDynamicRSCRequest,
                    botType,
                    isOnDemandRevalidate,
                    isPossibleServerAction,
                    assetPrefix: nextConfig.assetPrefix,
                    nextConfigOutput: nextConfig.output,
                    crossOrigin: nextConfig.crossOrigin,
                    trailingSlash: nextConfig.trailingSlash,
                    previewProps: prerenderManifest.preview,
                    deploymentId: nextConfig.deploymentId,
                    enableTainting: nextConfig.experimental.taint,
                    htmlLimitedBots: nextConfig.htmlLimitedBots,
                    devtoolSegmentExplorer: nextConfig.experimental.devtoolSegmentExplorer,
                    reactMaxHeadersLength: nextConfig.reactMaxHeadersLength,
                    multiZoneDraftMode,
                    incrementalCache: (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'incrementalCache'),
                    cacheLifeProfiles: nextConfig.experimental.cacheLife,
                    basePath: nextConfig.basePath,
                    serverActions: nextConfig.experimental.serverActions,
                    ...isDebugStaticShell || isDebugDynamicAccesses ? {
                        nextExport: true,
                        supportsDynamicResponse: false,
                        isStaticGeneration: true,
                        isRevalidate: true,
                        isDebugDynamicAccesses: isDebugDynamicAccesses
                    } : {},
                    experimental: {
                        isRoutePPREnabled,
                        expireTime: nextConfig.expireTime,
                        staleTimes: nextConfig.experimental.staleTimes,
                        cacheComponents: Boolean(nextConfig.experimental.cacheComponents),
                        clientSegmentCache: Boolean(nextConfig.experimental.clientSegmentCache),
                        clientParamParsing: Boolean(nextConfig.experimental.clientParamParsing),
                        dynamicOnHover: Boolean(nextConfig.experimental.dynamicOnHover),
                        inlineCss: Boolean(nextConfig.experimental.inlineCss),
                        authInterrupts: Boolean(nextConfig.experimental.authInterrupts),
                        clientTraceMetadata: nextConfig.experimental.clientTraceMetadata || []
                    },
                    waitUntil: ctx.waitUntil,
                    onClose: (cb)=>{
                        res.on('close', cb);
                    },
                    onAfterTaskError: ()=>{},
                    onInstrumentationRequestError: (error, _request, errorContext)=>routeModule.onRequestError(req, error, errorContext, routerServerContext),
                    err: (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'invokeError'),
                    dev: routeModule.isDev
                }
            };
            const result = await invokeRouteModule(span, context);
            const { metadata } = result;
            const { cacheControl, headers = {}, // Add any fetch tags that were on the page to the response headers.
            fetchTags: cacheTags } = metadata;
            if (cacheTags) {
                headers[next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER] = cacheTags;
            }
            // Pull any fetch metrics from the render onto the request.
            ;
            req.fetchMetrics = metadata.fetchMetrics;
            // we don't throw static to dynamic errors in dev as isSSG
            // is a best guess in dev since we don't have the prerender pass
            // to know whether the path is actually static or not
            if (isSSG && (cacheControl == null ? void 0 : cacheControl.revalidate) === 0 && !routeModule.isDev && !isRoutePPREnabled) {
                const staticBailoutInfo = metadata.staticBailoutInfo;
                const err = Object.defineProperty(new Error(`Page changed from static to dynamic at runtime ${resolvedPathname}${(staticBailoutInfo == null ? void 0 : staticBailoutInfo.description) ? `, reason: ${staticBailoutInfo.description}` : ``}` + `\nsee more here https://nextjs.org/docs/messages/app-static-to-dynamic-error`), "__NEXT_ERROR_CODE", {
                    value: "E132",
                    enumerable: false,
                    configurable: true
                });
                if (staticBailoutInfo == null ? void 0 : staticBailoutInfo.stack) {
                    const stack = staticBailoutInfo.stack;
                    err.stack = err.message + stack.substring(stack.indexOf('\n'));
                }
                throw err;
            }
            return {
                value: {
                    kind: next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__.CachedRouteKind.APP_PAGE,
                    html: result,
                    headers,
                    rscData: metadata.flightData,
                    postponed: metadata.postponed,
                    status: metadata.statusCode,
                    segmentData: metadata.segmentData
                },
                cacheControl
            };
        };
        const responseGenerator = async ({ hasResolved, previousCacheEntry, isRevalidating, span })=>{
            const isProduction = routeModule.isDev === false;
            const didRespond = hasResolved || res.writableEnded;
            // skip on-demand revalidate if cache is not present and
            // revalidate-if-generated is set
            if (isOnDemandRevalidate && revalidateOnlyGenerated && !previousCacheEntry && !minimalMode) {
                if (routerServerContext == null ? void 0 : routerServerContext.render404) {
                    await routerServerContext.render404(req, res);
                } else {
                    res.statusCode = 404;
                    res.end('This page could not be found');
                }
                return null;
            }
            let fallbackMode;
            if (prerenderInfo) {
                fallbackMode = (0,next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.parseFallbackField)(prerenderInfo.fallback);
            }
            // When serving a HTML bot request, we want to serve a blocking render and
            // not the prerendered page. This ensures that the correct content is served
            // to the bot in the head.
            if (fallbackMode === next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.PRERENDER && (0,next_dist_shared_lib_router_utils_is_bot__WEBPACK_IMPORTED_MODULE_18__.isBot)(userAgent)) {
                if (!isRoutePPREnabled || isHtmlBot) {
                    fallbackMode = next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.BLOCKING_STATIC_RENDER;
                }
            }
            if ((previousCacheEntry == null ? void 0 : previousCacheEntry.isStale) === -1) {
                isOnDemandRevalidate = true;
            }
            // TODO: adapt for PPR
            // only allow on-demand revalidate for fallback: true/blocking
            // or for prerendered fallback: false paths
            if (isOnDemandRevalidate && (fallbackMode !== next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.NOT_FOUND || previousCacheEntry)) {
                fallbackMode = next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.BLOCKING_STATIC_RENDER;
            }
            if (!minimalMode && fallbackMode !== next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.BLOCKING_STATIC_RENDER && staticPathKey && !didRespond && !isDraftMode && pageIsDynamic && (isProduction || !isPrerendered)) {
                // if the page has dynamicParams: false and this pathname wasn't
                // prerendered trigger the no fallback handling
                if (// In development, fall through to render to handle missing
                // getStaticPaths.
                (isProduction || prerenderInfo) && // When fallback isn't present, abort this render so we 404
                fallbackMode === next_dist_lib_fallback__WEBPACK_IMPORTED_MODULE_20__.FallbackMode.NOT_FOUND) {
                    throw new next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_25__.NoFallbackError();
                }
                let fallbackResponse;
                if (isRoutePPREnabled && !isRSCRequest) {
                    const cacheKey = typeof (prerenderInfo == null ? void 0 : prerenderInfo.fallback) === 'string' ? prerenderInfo.fallback : isProduction ? normalizedSrcPage : null;
                    // We use the response cache here to handle the revalidation and
                    // management of the fallback shell.
                    fallbackResponse = await routeModule.handleResponse({
                        cacheKey,
                        req,
                        nextConfig,
                        routeKind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_PAGE,
                        isFallback: true,
                        prerenderManifest,
                        isRoutePPREnabled,
                        responseGenerator: async ()=>doRender({
                                span,
                                // We pass `undefined` as rendering a fallback isn't resumed
                                // here.
                                postponed: undefined,
                                fallbackRouteParams: // If we're in production or we're debugging the fallback
                                // shell then we should postpone when dynamic params are
                                // accessed.
                                isProduction || isDebugFallbackShell ? (0,next_dist_server_request_fallback_params__WEBPACK_IMPORTED_MODULE_11__/* .getFallbackRouteParams */ .u)(normalizedSrcPage) : null
                            }),
                        waitUntil: ctx.waitUntil
                    });
                    // If the fallback response was set to null, then we should return null.
                    if (fallbackResponse === null) return null;
                    // Otherwise, if we did get a fallback response, we should return it.
                    if (fallbackResponse) {
                        // Remove the cache control from the response to prevent it from being
                        // used in the surrounding cache.
                        delete fallbackResponse.cacheControl;
                        return fallbackResponse;
                    }
                }
            }
            // Only requests that aren't revalidating can be resumed. If we have the
            // minimal postponed data, then we should resume the render with it.
            const postponed = !isOnDemandRevalidate && !isRevalidating && minimalPostponed ? minimalPostponed : undefined;
            // When we're in minimal mode, if we're trying to debug the static shell,
            // we should just return nothing instead of resuming the dynamic render.
            if ((isDebugStaticShell || isDebugDynamicAccesses) && typeof postponed !== 'undefined') {
                return {
                    cacheControl: {
                        revalidate: 1,
                        expire: undefined
                    },
                    value: {
                        kind: next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__.CachedRouteKind.PAGES,
                        html: next_dist_server_render_result__WEBPACK_IMPORTED_MODULE_21__["default"].EMPTY,
                        pageData: {},
                        headers: undefined,
                        status: undefined
                    }
                };
            }
            // If this is a dynamic route with PPR enabled and the default route
            // matches were set, then we should pass the fallback route params to
            // the renderer as this is a fallback revalidation request.
            const fallbackRouteParams = pageIsDynamic && isRoutePPREnabled && ((0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'renderFallbackShell') || isDebugFallbackShell) ? (0,next_dist_server_request_fallback_params__WEBPACK_IMPORTED_MODULE_11__/* .getFallbackRouteParams */ .u)(pathname) : null;
            // Perform the render.
            return doRender({
                span,
                postponed,
                fallbackRouteParams
            });
        };
        const handleResponse = async (span)=>{
            var _cacheEntry_value, _cachedData_headers;
            const cacheEntry = await routeModule.handleResponse({
                cacheKey: ssgCacheKey,
                responseGenerator: (c)=>responseGenerator({
                        span,
                        ...c
                    }),
                routeKind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_PAGE,
                isOnDemandRevalidate,
                isRoutePPREnabled,
                req,
                nextConfig,
                prerenderManifest,
                waitUntil: ctx.waitUntil
            });
            if (isDraftMode) {
                res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
            }
            // In dev, we should not cache pages for any reason.
            if (routeModule.isDev) {
                res.setHeader('Cache-Control', 'no-store, must-revalidate');
            }
            if (!cacheEntry) {
                if (ssgCacheKey) {
                    // A cache entry might not be generated if a response is written
                    // in `getInitialProps` or `getServerSideProps`, but those shouldn't
                    // have a cache key. If we do have a cache key but we don't end up
                    // with a cache entry, then either Next.js or the application has a
                    // bug that needs fixing.
                    throw Object.defineProperty(new Error('invariant: cache entry required but not generated'), "__NEXT_ERROR_CODE", {
                        value: "E62",
                        enumerable: false,
                        configurable: true
                    });
                }
                return null;
            }
            if (((_cacheEntry_value = cacheEntry.value) == null ? void 0 : _cacheEntry_value.kind) !== next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__.CachedRouteKind.APP_PAGE) {
                var _cacheEntry_value1;
                throw Object.defineProperty(new Error(`Invariant app-page handler received invalid cache entry ${(_cacheEntry_value1 = cacheEntry.value) == null ? void 0 : _cacheEntry_value1.kind}`), "__NEXT_ERROR_CODE", {
                    value: "E707",
                    enumerable: false,
                    configurable: true
                });
            }
            const didPostpone = typeof cacheEntry.value.postponed === 'string';
            if (isSSG && // We don't want to send a cache header for requests that contain dynamic
            // data. If this is a Dynamic RSC request or wasn't a Prefetch RSC
            // request, then we should set the cache header.
            !isDynamicRSCRequest && (!didPostpone || isPrefetchRSCRequest)) {
                if (!minimalMode) {
                    // set x-nextjs-cache header to match the header
                    // we set for the image-optimizer
                    res.setHeader('x-nextjs-cache', isOnDemandRevalidate ? 'REVALIDATED' : cacheEntry.isMiss ? 'MISS' : cacheEntry.isStale ? 'STALE' : 'HIT');
                }
                // Set a header used by the client router to signal the response is static
                // and should respect the `static` cache staleTime value.
                res.setHeader(next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.NEXT_IS_PRERENDER_HEADER, '1');
            }
            const { value: cachedData } = cacheEntry;
            // Coerce the cache control parameter from the render.
            let cacheControl;
            // If this is a resume request in minimal mode it is streamed with dynamic
            // content and should not be cached.
            if (minimalPostponed) {
                cacheControl = {
                    revalidate: 0,
                    expire: undefined
                };
            } else if (minimalMode && isRSCRequest && !isPrefetchRSCRequest && isRoutePPREnabled) {
                cacheControl = {
                    revalidate: 0,
                    expire: undefined
                };
            } else if (!routeModule.isDev) {
                // If this is a preview mode request, we shouldn't cache it
                if (isDraftMode) {
                    cacheControl = {
                        revalidate: 0,
                        expire: undefined
                    };
                } else if (!isSSG) {
                    if (!res.getHeader('Cache-Control')) {
                        cacheControl = {
                            revalidate: 0,
                            expire: undefined
                        };
                    }
                } else if (cacheEntry.cacheControl) {
                    // If the cache entry has a cache control with a revalidate value that's
                    // a number, use it.
                    if (typeof cacheEntry.cacheControl.revalidate === 'number') {
                        var _cacheEntry_cacheControl;
                        if (cacheEntry.cacheControl.revalidate < 1) {
                            throw Object.defineProperty(new Error(`Invalid revalidate configuration provided: ${cacheEntry.cacheControl.revalidate} < 1`), "__NEXT_ERROR_CODE", {
                                value: "E22",
                                enumerable: false,
                                configurable: true
                            });
                        }
                        cacheControl = {
                            revalidate: cacheEntry.cacheControl.revalidate,
                            expire: ((_cacheEntry_cacheControl = cacheEntry.cacheControl) == null ? void 0 : _cacheEntry_cacheControl.expire) ?? nextConfig.expireTime
                        };
                    } else {
                        cacheControl = {
                            revalidate: next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.CACHE_ONE_YEAR,
                            expire: undefined
                        };
                    }
                }
            }
            cacheEntry.cacheControl = cacheControl;
            if (typeof segmentPrefetchHeader === 'string' && (cachedData == null ? void 0 : cachedData.kind) === next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__.CachedRouteKind.APP_PAGE && cachedData.segmentData) {
                var _cachedData_headers1;
                // This is a prefetch request issued by the client Segment Cache. These
                // should never reach the application layer (lambda). We should either
                // respond from the cache (HIT) or respond with 204 No Content (MISS).
                // Set a header to indicate that PPR is enabled for this route. This
                // lets the client distinguish between a regular cache miss and a cache
                // miss due to PPR being disabled. In other contexts this header is used
                // to indicate that the response contains dynamic data, but here we're
                // only using it to indicate that the feature is enabled — the segment
                // response itself contains whether the data is dynamic.
                res.setHeader(next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.NEXT_DID_POSTPONE_HEADER, '2');
                // Add the cache tags header to the response if it exists and we're in
                // minimal mode while rendering a static page.
                const tags = (_cachedData_headers1 = cachedData.headers) == null ? void 0 : _cachedData_headers1[next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER];
                if (minimalMode && isSSG && tags && typeof tags === 'string') {
                    res.setHeader(next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER, tags);
                }
                const matchedSegment = cachedData.segmentData.get(segmentPrefetchHeader);
                if (matchedSegment !== undefined) {
                    // Cache hit
                    return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                        req,
                        res,
                        generateEtags: nextConfig.generateEtags,
                        poweredByHeader: nextConfig.poweredByHeader,
                        result: next_dist_server_render_result__WEBPACK_IMPORTED_MODULE_21__["default"].fromStatic(matchedSegment, next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.RSC_CONTENT_TYPE_HEADER),
                        cacheControl: cacheEntry.cacheControl
                    });
                }
                // Cache miss. Either a cache entry for this route has not been generated
                // (which technically should not be possible when PPR is enabled, because
                // at a minimum there should always be a fallback entry) or there's no
                // match for the requested segment. Respond with a 204 No Content. We
                // don't bother to respond with 404, because these requests are only
                // issued as part of a prefetch.
                res.statusCode = 204;
                return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                    req,
                    res,
                    generateEtags: nextConfig.generateEtags,
                    poweredByHeader: nextConfig.poweredByHeader,
                    result: next_dist_server_render_result__WEBPACK_IMPORTED_MODULE_21__["default"].EMPTY,
                    cacheControl: cacheEntry.cacheControl
                });
            }
            // If there's a callback for `onCacheEntry`, call it with the cache entry
            // and the revalidate options.
            const onCacheEntry = (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'onCacheEntry');
            if (onCacheEntry) {
                const finished = await onCacheEntry({
                    ...cacheEntry,
                    // TODO: remove this when upstream doesn't
                    // always expect this value to be "PAGE"
                    value: {
                        ...cacheEntry.value,
                        kind: 'PAGE'
                    }
                }, {
                    url: (0,next_dist_server_request_meta__WEBPACK_IMPORTED_MODULE_4__.getRequestMeta)(req, 'initURL')
                });
                if (finished) {
                    // TODO: maybe we have to end the request?
                    return null;
                }
            }
            // If the request has a postponed state and it's a resume request we
            // should error.
            if (didPostpone && minimalPostponed) {
                throw Object.defineProperty(new Error('Invariant: postponed state should not be present on a resume request'), "__NEXT_ERROR_CODE", {
                    value: "E396",
                    enumerable: false,
                    configurable: true
                });
            }
            if (cachedData.headers) {
                const headers = {
                    ...cachedData.headers
                };
                if (!minimalMode || !isSSG) {
                    delete headers[next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER];
                }
                for (let [key, value] of Object.entries(headers)){
                    if (typeof value === 'undefined') continue;
                    if (Array.isArray(value)) {
                        for (const v of value){
                            res.appendHeader(key, v);
                        }
                    } else if (typeof value === 'number') {
                        value = value.toString();
                        res.appendHeader(key, value);
                    } else {
                        res.appendHeader(key, value);
                    }
                }
            }
            // Add the cache tags header to the response if it exists and we're in
            // minimal mode while rendering a static page.
            const tags = (_cachedData_headers = cachedData.headers) == null ? void 0 : _cachedData_headers[next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER];
            if (minimalMode && isSSG && tags && typeof tags === 'string') {
                res.setHeader(next_dist_lib_constants__WEBPACK_IMPORTED_MODULE_22__.NEXT_CACHE_TAGS_HEADER, tags);
            }
            // If the request is a data request, then we shouldn't set the status code
            // from the response because it should always be 200. This should be gated
            // behind the experimental PPR flag.
            if (cachedData.status && (!isRSCRequest || !isRoutePPREnabled)) {
                res.statusCode = cachedData.status;
            }
            // Redirect information is encoded in RSC payload, so we don't need to use redirect status codes
            if (!minimalMode && cachedData.status && next_dist_client_components_redirect_status_code__WEBPACK_IMPORTED_MODULE_28__.RedirectStatusCode[cachedData.status] && isRSCRequest) {
                res.statusCode = 200;
            }
            // Mark that the request did postpone.
            if (didPostpone) {
                res.setHeader(next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.NEXT_DID_POSTPONE_HEADER, '1');
            }
            // we don't go through this block when preview mode is true
            // as preview mode is a dynamic request (bypasses cache) and doesn't
            // generate both HTML and payloads in the same request so continue to just
            // return the generated payload
            if (isRSCRequest && !isDraftMode) {
                // If this is a dynamic RSC request, then stream the response.
                if (typeof cachedData.rscData === 'undefined') {
                    if (cachedData.postponed) {
                        throw Object.defineProperty(new Error('Invariant: Expected postponed to be undefined'), "__NEXT_ERROR_CODE", {
                            value: "E372",
                            enumerable: false,
                            configurable: true
                        });
                    }
                    return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                        req,
                        res,
                        generateEtags: nextConfig.generateEtags,
                        poweredByHeader: nextConfig.poweredByHeader,
                        result: cachedData.html,
                        // Dynamic RSC responses cannot be cached, even if they're
                        // configured with `force-static` because we have no way of
                        // distinguishing between `force-static` and pages that have no
                        // postponed state.
                        // TODO: distinguish `force-static` from pages with no postponed state (static)
                        cacheControl: isDynamicRSCRequest ? {
                            revalidate: 0,
                            expire: undefined
                        } : cacheEntry.cacheControl
                    });
                }
                // As this isn't a prefetch request, we should serve the static flight
                // data.
                return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                    req,
                    res,
                    generateEtags: nextConfig.generateEtags,
                    poweredByHeader: nextConfig.poweredByHeader,
                    result: next_dist_server_render_result__WEBPACK_IMPORTED_MODULE_21__["default"].fromStatic(cachedData.rscData, next_dist_client_components_app_router_headers__WEBPACK_IMPORTED_MODULE_17__.RSC_CONTENT_TYPE_HEADER),
                    cacheControl: cacheEntry.cacheControl
                });
            }
            // This is a request for HTML data.
            let body = cachedData.html;
            // If there's no postponed state, we should just serve the HTML. This
            // should also be the case for a resume request because it's completed
            // as a server render (rather than a static render).
            if (!didPostpone || minimalMode || isRSCRequest) {
                // If we're in test mode, we should add a sentinel chunk to the response
                // that's between the static and dynamic parts so we can compare the
                // chunks and add assertions.
                if (false) {}
                return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                    req,
                    res,
                    generateEtags: nextConfig.generateEtags,
                    poweredByHeader: nextConfig.poweredByHeader,
                    result: body,
                    cacheControl: cacheEntry.cacheControl
                });
            }
            // If we're debugging the static shell or the dynamic API accesses, we
            // should just serve the HTML without resuming the render. The returned
            // HTML will be the static shell so all the Dynamic API's will be used
            // during static generation.
            if (isDebugStaticShell || isDebugDynamicAccesses) {
                // Since we're not resuming the render, we need to at least add the
                // closing body and html tags to create valid HTML.
                body.push(new ReadableStream({
                    start (controller) {
                        controller.enqueue(next_dist_server_stream_utils_encoded_tags__WEBPACK_IMPORTED_MODULE_23__.ENCODED_TAGS.CLOSED.BODY_AND_HTML);
                        controller.close();
                    }
                }));
                return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                    req,
                    res,
                    generateEtags: nextConfig.generateEtags,
                    poweredByHeader: nextConfig.poweredByHeader,
                    result: body,
                    cacheControl: {
                        revalidate: 0,
                        expire: undefined
                    }
                });
            }
            // If we're in test mode, we should add a sentinel chunk to the response
            // that's between the static and dynamic parts so we can compare the
            // chunks and add assertions.
            if (false) {}
            // This request has postponed, so let's create a new transformer that the
            // dynamic data can pipe to that will attach the dynamic data to the end
            // of the response.
            const transformer = new TransformStream();
            body.push(transformer.readable);
            // Perform the render again, but this time, provide the postponed state.
            // We don't await because we want the result to start streaming now, and
            // we've already chained the transformer's readable to the render result.
            doRender({
                span,
                postponed: cachedData.postponed,
                // This is a resume render, not a fallback render, so we don't need to
                // set this.
                fallbackRouteParams: null
            }).then(async (result)=>{
                var _result_value;
                if (!result) {
                    throw Object.defineProperty(new Error('Invariant: expected a result to be returned'), "__NEXT_ERROR_CODE", {
                        value: "E463",
                        enumerable: false,
                        configurable: true
                    });
                }
                if (((_result_value = result.value) == null ? void 0 : _result_value.kind) !== next_dist_server_response_cache__WEBPACK_IMPORTED_MODULE_19__.CachedRouteKind.APP_PAGE) {
                    var _result_value1;
                    throw Object.defineProperty(new Error(`Invariant: expected a page response, got ${(_result_value1 = result.value) == null ? void 0 : _result_value1.kind}`), "__NEXT_ERROR_CODE", {
                        value: "E305",
                        enumerable: false,
                        configurable: true
                    });
                }
                // Pipe the resume result to the transformer.
                await result.value.html.pipeTo(transformer.writable);
            }).catch((err)=>{
                // An error occurred during piping or preparing the render, abort
                // the transformers writer so we can terminate the stream.
                transformer.writable.abort(err).catch((e)=>{
                    console.error("couldn't abort transformer", e);
                });
            });
            return (0,next_dist_server_send_payload__WEBPACK_IMPORTED_MODULE_24__.sendRenderResult)({
                req,
                res,
                generateEtags: nextConfig.generateEtags,
                poweredByHeader: nextConfig.poweredByHeader,
                result: body,
                // We don't want to cache the response if it has postponed data because
                // the response being sent to the client it's dynamic parts are streamed
                // to the client on the same request.
                cacheControl: {
                    revalidate: 0,
                    expire: undefined
                }
            });
        };
        // TODO: activeSpan code path is for when wrapped by
        // next-server can be removed when this is no longer used
        if (activeSpan) {
            await handleResponse(activeSpan);
        } else {
            return await tracer.withPropagatedContext(req.headers, ()=>tracer.trace(next_dist_server_lib_trace_constants__WEBPACK_IMPORTED_MODULE_5__.BaseServerSpan.handleRequest, {
                    spanName: `${method} ${req.url}`,
                    kind: next_dist_server_lib_trace_tracer__WEBPACK_IMPORTED_MODULE_3__.SpanKind.SERVER,
                    attributes: {
                        'http.method': method,
                        'http.target': req.url
                    }
                }, handleResponse));
        }
    } catch (err) {
        if (!(err instanceof next_dist_shared_lib_no_fallback_error_external__WEBPACK_IMPORTED_MODULE_25__.NoFallbackError)) {
            await routeModule.onRequestError(req, err, {
                routerKind: 'App Router',
                routePath: srcPage,
                routeType: 'render',
                revalidateReason: (0,next_dist_server_instrumentation_utils__WEBPACK_IMPORTED_MODULE_2__/* .getRevalidateReason */ .c)({
                    isRevalidate: isSSG,
                    isOnDemandRevalidate
                })
            }, routerServerContext);
        }
        // rethrow so that we can handle serving error page
        throw err;
    }
}
// TODO: omit this from production builds, only test builds should include it
/**
 * Creates a readable stream that emits a PPR boundary sentinel.
 *
 * @returns A readable stream that emits a PPR boundary sentinel.
 */ function createPPRBoundarySentinel() {
    return new ReadableStream({
        start (controller) {
            controller.enqueue(new TextEncoder().encode('<!-- PPR_BOUNDARY_SENTINEL -->'));
            controller.close();
        }
    });
}

//# sourceMappingURL=app-page.js.map


/***/ }),

/***/ 19121:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/action-async-storage.external.js");

/***/ }),

/***/ 26713:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/shared/lib/router/utils/is-bot");

/***/ }),

/***/ 28354:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ 29294:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ 33873:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 41025:
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/dynamic-access-async-storage.external.js");

/***/ }),

/***/ 46856:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ AboutPage),
/* harmony export */   metadata: () => (/* binding */ metadata)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(75338);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);

/**
 * Trang About — Server Component tĩnh (không "use client", không hook).
 *
 * Render tĩnh để tối ưu tải và SEO (Requirements 10.1, 10.2). Toàn bộ nội dung
 * bằng tiếng Việt, khớp wireframe §1.4:
 *   - Hero/intro "Vì sao chúng tôi xây sản phẩm này"
 *   - Threat model (Attacker → Email/URL → Người & AI Agent) minh họa bằng JSX/CSS
 *   - Đội ngũ (thẻ thành viên placeholder)
 *   - Công nghệ (chips) + nút "Đọc tài liệu kỹ thuật"
 */ const metadata = {
    title: "Về chúng tôi — AI Security Armor",
    description: "Vì sao chúng tôi xây AI Security Armor: khi phishing không chỉ nhắm vào con người mà còn nhắm vào AI agent. Prompt injection chính là phishing dành cho AI."
};
const TEAM = [
    {
        name: "Nguyễn Minh An",
        role: "Trưởng nhóm & Kiến trúc ML",
        initials: "MA"
    },
    {
        name: "Trần Thu Hà",
        role: "Kỹ sư Bảo mật AI",
        initials: "TH"
    },
    {
        name: "Lê Quốc Bảo",
        role: "Kỹ sư Frontend",
        initials: "QB"
    },
    {
        name: "Phạm Gia Linh",
        role: "Nghiên cứu NLP tiếng Việt",
        initials: "GL"
    }
];
const TECH_STACK = [
    "LightGBM",
    "PhoBERT",
    "ONNX",
    "FastAPI",
    "MCP Protocol"
];
function AboutPage() {
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("main", {
        className: "mx-auto max-w-5xl px-6 py-16",
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("section", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", {
                        className: "text-sm font-semibold uppercase tracking-widest text-neutral-500",
                        children: "Về ch\xfang t\xf4i"
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h1", {
                        className: "mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl",
                        children: "V\xec sao ch\xfang t\xf4i x\xe2y sản phẩm n\xe0y"
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                        className: "mx-auto mt-6 max-w-2xl space-y-4 text-lg text-neutral-600",
                        children: [
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", {
                                children: "Trong nhiều năm, phishing nhắm v\xe0o con người: những email giả mạo, đường link đ\xe1nh cắp th\xf4ng tin đăng nhập. Giờ đ\xe2y, khi c\xe1c AI agent thay ch\xfang ta đọc email, truy cập URL v\xe0 tự động h\xe0nh động, kẻ tấn c\xf4ng chuyển hướng nhắm thẳng v\xe0o ch\xednh những AI agent đ\xf3."
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", {
                                className: "text-xl font-semibold text-neutral-900",
                                children: "“Prompt injection = phishing d\xe0nh cho AI.”"
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", {
                                children: "Ch\xfang t\xf4i x\xe2y AI Security Armor để trở th\xe0nh l\xe1 chắn giữa nội dung độc hại v\xe0 c\xe1c quy tr\xecnh AI — đ\xe1nh gi\xe1 rủi ro tức th\xec, lu\xf4n k\xe8m bằng chứng minh bạch, để cả con người lẫn AI agent đều ra quyết định an to\xe0n hơn."
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("section", {
                className: "mt-20",
                children: [
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h2", {
                        className: "text-center text-2xl font-bold tracking-tight text-neutral-900",
                        children: "M\xf4 h\xecnh mối đe dọa"
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", {
                        className: "mt-2 text-center text-neutral-600",
                        children: "Attacker ph\xe1t t\xe1n nội dung độc hại qua Email/URL, nhắm đồng thời v\xe0o con người v\xe0 AI agent."
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                        className: "mt-10 flex flex-col items-center gap-6 md:flex-row md:justify-center",
                        children: [
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                                className: "flex flex-col items-center rounded-xl border border-risk-danger-border bg-risk-danger-bg px-6 py-5 text-center",
                                children: [
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                        className: "text-3xl",
                                        "aria-hidden": "true",
                                        children: "\uD83D\uDD75️"
                                    }),
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                        className: "mt-2 font-semibold text-risk-danger-fg",
                                        children: "Attacker"
                                    }),
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                        className: "text-sm text-risk-danger-fg/80",
                                        children: "Kẻ tấn c\xf4ng"
                                    })
                                ]
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                className: "text-2xl text-neutral-400",
                                "aria-hidden": "true",
                                children: "→"
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                                className: "flex flex-col items-center rounded-xl border border-risk-warn-border bg-risk-warn-bg px-6 py-5 text-center",
                                children: [
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                        className: "text-3xl",
                                        "aria-hidden": "true",
                                        children: "✉️"
                                    }),
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                        className: "mt-2 font-semibold text-risk-warn-fg",
                                        children: "Email / URL"
                                    }),
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                        className: "text-sm text-risk-warn-fg/80",
                                        children: "Nội dung độc hại"
                                    })
                                ]
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                className: "text-2xl text-neutral-400",
                                "aria-hidden": "true",
                                children: "→"
                            }),
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                                className: "flex flex-col gap-4",
                                children: [
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                                        className: "flex flex-col items-center rounded-xl border border-neutral-300 bg-neutral-50 px-6 py-4 text-center",
                                        children: [
                                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                                className: "text-2xl",
                                                "aria-hidden": "true",
                                                children: "\uD83E\uDDD1"
                                            }),
                                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                                className: "mt-1 font-semibold text-neutral-800",
                                                children: "Người"
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                                        className: "flex flex-col items-center rounded-xl border border-neutral-300 bg-neutral-50 px-6 py-4 text-center",
                                        children: [
                                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                                className: "text-2xl",
                                                "aria-hidden": "true",
                                                children: "\uD83E\uDD16"
                                            }),
                                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", {
                                                className: "mt-1 font-semibold text-neutral-800",
                                                children: "AI Agent"
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("section", {
                className: "mt-20",
                children: [
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h2", {
                        className: "text-center text-2xl font-bold tracking-tight text-neutral-900",
                        children: "Đội ngũ"
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
                        className: "mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4",
                        children: TEAM.map((member)=>/*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                                className: "flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm",
                                children: [
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
                                        className: "flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xl font-semibold text-neutral-600",
                                        "aria-hidden": "true",
                                        children: member.initials
                                    }),
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", {
                                        className: "mt-4 font-semibold text-neutral-900",
                                        children: member.name
                                    }),
                                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", {
                                        className: "mt-1 text-sm text-neutral-500",
                                        children: member.role
                                    })
                                ]
                            }, member.name))
                    })
                ]
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("section", {
                className: "mt-20",
                children: [
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h2", {
                        className: "text-center text-2xl font-bold tracking-tight text-neutral-900",
                        children: "C\xf4ng nghệ"
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", {
                        className: "mt-2 text-center text-neutral-600",
                        children: "Nền tảng được x\xe2y tr\xean c\xe1c c\xf4ng nghệ ML v\xe0 hạ tầng hiện đại."
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("ul", {
                        className: "mt-8 flex flex-wrap justify-center gap-3",
                        children: TECH_STACK.map((tech)=>/*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("li", {
                                className: "rounded-full border border-neutral-300 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700",
                                children: tech
                            }, tech))
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", {
                        className: "mt-10 text-center",
                        children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("a", {
                            href: "/demo",
                            className: "inline-flex items-center justify-center rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700",
                            children: "Mở demo kỹ thuật"
                        })
                    })
                ]
            })
        ]
    });
}


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
var __webpack_require__ = require("../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [331,754,837], () => (__webpack_exec__(15489)));
module.exports = __webpack_exports__;

})();
//# sourceMappingURL=page.js.map