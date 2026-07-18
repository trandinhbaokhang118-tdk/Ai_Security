import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const authorization = request.headers.get("authorization");

        const response = await fetch(`${BACKEND_URL}/v1/demo/url/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authorization ? { Authorization: authorization } : {}),
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error analyzing URL:', error);
        return NextResponse.json(
            { detail: 'Failed to analyze URL' },
            { status: 500 }
        );
    }
}
