export class FluxClient {
    private endpoint: string;
    private projectId: string;
    private apiKey: string;
    private isClientSide: boolean;

    constructor() {
        this.isClientSide = typeof window !== 'undefined';

        // If on the server, we use true env vars.
        this.endpoint = process.env.FLUX_API_URL || process.env.NEXT_PUBLIC_FLUX_API_URL || '';
        this.projectId = process.env.FLUX_PROJECT_ID || process.env.NEXT_PUBLIC_FLUX_PROJECT_ID || '';
        this.apiKey = process.env.FLUX_API_KEY || process.env.NEXT_PUBLIC_FLUX_API_KEY || '';

        if (!this.isClientSide && (!this.endpoint || !this.projectId || !this.apiKey)) {
            console.warn("Fluxbase API configuration is incomplete on server. Missing URL, Project ID, or API Key.");
        }
    }

    public async sql(query: string, scope?: string) {
        const isClient = typeof window !== 'undefined';
        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                let res;

                if (isClient) {
                    // Running in browser - proxy via our internal Next.js API to bypass CORS
                    const baseUrl = window.location.origin;
                    res = await fetch(`${baseUrl}/api/sql`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query }),
                        cache: 'no-store'
                    });
                } else {
                    // Running on Server - call actual Fluxbase backend directly
                    if (!this.endpoint || !this.projectId || !this.apiKey) {
                        throw new Error("FluxClient is missing required configuration on the server.");
                    }

                    let finalEndpoint = this.endpoint;
                    if (!finalEndpoint.endsWith('/execute-sql')) {
                        finalEndpoint = finalEndpoint.replace(/\/+$/, '') + '/execute-sql';
                    }

                    res = await fetch(finalEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.apiKey}`
                        },
                        body: JSON.stringify({
                            query: query,
                            projectId: this.projectId
                        }),
                        cache: 'no-store'
                    });
                }

                if (!res.ok) {
                    let errMessage = `HTTP error! status: ${res.status}`;
                    try {
                        const errText = await res.text();
                        errMessage += ` - ${errText}`;
                    } catch (e) { }
                    throw new Error(errMessage);
                }

                const data = await res.json();

                // Ensure consistent return format
                if (data && Array.isArray(data)) {
                    return { rows: data, error: null };
                } else if (data && typeof data === 'object' && Array.isArray(data.rows)) {
                    return { rows: data.rows, error: null };
                } else if (data && data.success && Array.isArray(data.data)) {
                    return { rows: data.data, error: null };
                } else if (data && data.success && data.result && Array.isArray(data.result.rows)) {
                    return { rows: data.result.rows, error: null };
                }

                // Mutation without rows attached
                return { rows: [], error: null, raw: data };

            } catch (error) {
                retries++;
                console.error(`FluxClient Error (Attempt ${retries}/${maxRetries}): Query: ${query}`, error);

                if (retries >= maxRetries) {
                    return { rows: [], error: error instanceof Error ? error : new Error(String(error)) };
                }
                await new Promise(res => setTimeout(res, 1000 * retries));
            }
        }
        return { rows: [], error: new Error("FluxClient max retries reached") };
    }
}

export const flux = new FluxClient();
