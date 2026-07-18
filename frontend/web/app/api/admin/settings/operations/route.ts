import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const dynamic = "force-dynamic";

function headers(request: NextRequest): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: request.headers.get("authorization") || "",
  };
}

export async function GET(request: NextRequest) {
  const response = await fetch(`${BACKEND_URL}/admin/settings/operations`, {
    headers: headers(request),
  });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function PUT(request: NextRequest) {
  const response = await fetch(`${BACKEND_URL}/admin/settings/operations`, {
    method: "PUT",
    headers: headers(request),
    body: JSON.stringify(await request.json()),
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
