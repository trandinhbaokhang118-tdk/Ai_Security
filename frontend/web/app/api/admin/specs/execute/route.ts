import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/admin/specs/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error('Failed to execute tasks');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error executing tasks:', error);
        return NextResponse.json(
            { error: 'Failed to execute tasks' },
            { status: 500 }
        );
    }
}
