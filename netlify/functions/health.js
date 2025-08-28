// Netlify Function: Simple health check (stateless)
// Endpoint (after build): /.netlify/functions/health or via redirect /api/health
export async function handler(event, context) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ status: 'ok', timestamp: Date.now() })
  };
}
