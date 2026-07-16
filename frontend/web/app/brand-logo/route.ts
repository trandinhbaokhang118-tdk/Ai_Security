import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = path.resolve(process.cwd(), "..", "..", "logo-removebg.png");
  try {
    const file = await readFile(filePath);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(file.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
