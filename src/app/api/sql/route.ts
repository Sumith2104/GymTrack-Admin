import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Use the secure server-side environment variables
        const endpoint = process.env.FLUX_API_URL || process.env.NEXT_PUBLIC_FLUX_API_URL || '';
        const projectId = process.env.FLUX_PROJECT_ID || process.env.NEXT_PUBLIC_FLUX_PROJECT_ID || '';
        const apiKey = process.env.FLUX_API_KEY || process.env.NEXT_PUBLIC_FLUX_API_KEY || '';

        if (!endpoint || !projectId || !apiKey) {
            console.error('Missing configuration:', { endpoint: !!endpoint, projectId: !!projectId, apiKey: !!apiKey });
            return NextResponse.json({ error: 'Proxy Configuration Missing' }, { status: 500 });
        }

        let finalEndpoint = endpoint;
        if (!finalEndpoint.endsWith('/execute-sql')) {
            finalEndpoint = finalEndpoint.replace(/\/+$/, '') + '/execute-sql';
        }

        const res = await fetch(finalEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                query: body.query,
                projectId: projectId
            }),
            cache: 'no-store'
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Fluxbase returned error:', res.status, errorText);
            return NextResponse.json({ error: `Fluxbase error: ${res.status}` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('SQL Proxy Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
