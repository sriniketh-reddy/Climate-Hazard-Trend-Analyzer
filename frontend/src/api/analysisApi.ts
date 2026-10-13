import type { AnalysisRequest, AnalysisResponse } from '../types/analysis';

// Trim any trailing slashes from the backend URL
const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';
const cleanBase = rawBase.replace(/\/+$/, '');
const API_BASE = cleanBase ? `${cleanBase}/api` : '/api';

export async function fetchAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
  let response: Response;
  const targetUrl = `${API_BASE}/analysis`;

  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg === 'Failed to fetch' || (err instanceof TypeError && err.message.includes('fetch'))) {
      if (!cleanBase && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        throw new Error(
          'Missing Backend URL: VITE_API_BASE_URL is not configured in Vercel. Add your Render URL to Environment Variables in Vercel and redeploy.'
        );
      }
      throw new Error(
        'Cannot reach backend server. If using Render free-tier, the server may be waking up from sleep (~40s) or check your connection.'
      );
    }
    throw err;
  }

  if (!response.ok) {
    let errorDetail = `Server error (${response.status})`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        if (typeof errorJson.detail === 'string') {
          errorDetail = errorJson.detail;
        } else if (Array.isArray(errorJson.detail)) {
          errorDetail = errorJson.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(', ');
        }
      }
    } catch {
      const errorText = await response.text();
      if (errorText) errorDetail = errorText;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

