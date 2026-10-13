import type { AnalysisRequest, AnalysisResponse } from '../types/analysis';

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

export async function fetchAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE}/analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorDetail = `Server error (${response.status})`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        if (typeof errorJson.detail === 'string') {
          errorDetail = errorJson.detail;
        } else if (Array.isArray(errorJson.detail)) {
          errorDetail = errorJson.detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', ');
        }
      }
    } catch {
      // Fallback to text
      const errorText = await response.text();
      if (errorText) errorDetail = errorText;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
