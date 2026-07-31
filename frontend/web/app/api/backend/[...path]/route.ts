import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";
const BACKEND_URL = (
    process.env.BACKEND_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    DEFAULT_BACKEND_URL
).replace(/\/+$/, "");

type RouteContext = {
    params: Promise<{ path: string[] }>;
};

const FORWARDED_REQUEST_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "if-none-match",
] as const;

const FORWARDED_RESPONSE_HEADERS = [
    "cache-control",
    "content-disposition",
    "content-type",
    "etag",
    "retry-after",
    "www-authenticate",
] as const;

async function proxyToBackend(
    request: NextRequest,
    context: RouteContext,
): Promise<NextResponse> {
    const { path } = await context.params;
    const upstreamPath = path.map(encodeURIComponent).join("/");
    const upstreamUrl = `${BACKEND_URL}/${upstreamPath}${request.nextUrl.search}`;
    const headers = new Headers();

    for (const name of FORWARDED_REQUEST_HEADERS) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
    }

    const method = request.method.toUpperCase();
    const hasBody = method !== "GET" && method !== "HEAD";

    try {
        const upstream = await fetch(upstreamUrl, {
            method,
            headers,
            body: hasBody ? await request.arrayBuffer() : undefined,
            cache: "no-store",
            redirect: "manual",
        });
        const responseHeaders = new Headers();
        for (const name of FORWARDED_RESPONSE_HEADERS) {
            const value = upstream.headers.get(name);
            if (value) responseHeaders.set(name, value);
        }

        return new NextResponse(upstream.body, {
            status: upstream.status,
            headers: responseHeaders,
        });
    } catch {
        return NextResponse.json(
            {
                detail:
                    "Không thể kết nối dịch vụ phân tích. Vui lòng thử lại sau.",
            },
            {
                status: 503,
                headers: { "Cache-Control": "no-store" },
            },
        );
    }
}

export const GET = proxyToBackend;
export const POST = proxyToBackend;
export const PUT = proxyToBackend;
export const PATCH = proxyToBackend;
export const DELETE = proxyToBackend;
export const OPTIONS = proxyToBackend;
