import React from 'react';
import { AlertTriangle, RotateCw, X, Clock } from 'lucide-react';

interface RateLimitBannerProps {
  error: string;
  cooldownSeconds: number;
  onRetry: () => void;
  onDismiss: () => void;
}

export const RateLimitBanner: React.FC<RateLimitBannerProps> = ({
  error,
  cooldownSeconds,
  onRetry,
  onDismiss,
}) => {
  const is429 = error.includes('429') || error.toLowerCase().includes('rate limit') || error.toLowerCase().includes('limit exceeded');

  return (
    <div
      className={`rounded-2xl p-4 border transition-all mb-5 flex flex-wrap items-center justify-between gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl ${
        is429
          ? 'bg-[#1c1c1e]/90 border-[#0071e3]/30 text-[#f5f5f7]'
          : 'bg-[#1c1c1e]/90 border-[#ff453a]/30 text-[#f5f5f7]'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <div
          className={`p-2.5 rounded-2xl border ${
            is429
              ? 'bg-[#0071e3]/15 border-[#0071e3]/30 text-[#2997ff]'
              : 'bg-[#ff453a]/15 border-[#ff453a]/30 text-[#ff453a]'
          }`}
        >
          {is429 ? <Clock className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2.5">
            <span>{is429 ? 'Weather Service Busy' : 'Request Notice'}</span>
            {cooldownSeconds > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-[#0071e3]/20 text-[#2997ff] border border-[#0071e3]/30">
                Auto-retry in {cooldownSeconds}s
              </span>
            )}
          </h4>
          <p className="text-sm text-[#86868b] mt-1 max-w-2xl font-normal leading-relaxed">
            {is429
              ? 'The weather service is taking a brief breather to prevent overload. Saved locations open instantly, and new searches will automatically resume in a few moments.'
              : error}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          disabled={cooldownSeconds > 40}
          className="px-4.5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white text-sm font-medium transition-all cursor-pointer flex items-center gap-2 shadow-[0_2px_12px_rgba(0,113,227,0.4)] disabled:opacity-50"
        >
          <RotateCw className="w-4 h-4" />
          <span>{cooldownSeconds > 0 ? `Wait (${cooldownSeconds}s)` : 'Retry Now'}</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 rounded-full hover:bg-white/10 text-[#86868b] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

