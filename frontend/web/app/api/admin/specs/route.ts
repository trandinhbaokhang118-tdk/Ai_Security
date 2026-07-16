import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const response = await fetch(`${BACKEND_URL}/admin/specs`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': request.headers.get('authorization') || '',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch specs');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching specs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch specs' },
            { status: 500 }
        );
    }
}
