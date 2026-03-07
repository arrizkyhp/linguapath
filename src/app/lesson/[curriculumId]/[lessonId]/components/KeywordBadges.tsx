'use client';

import { CheckCircle2 } from 'lucide-react';

type KeywordBadgesProps = {
  keywords: string[];
  detectedKeywords: string[];
};

export function KeywordBadges({ keywords, detectedKeywords }: KeywordBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((kw) => {
        const isDetected = detectedKeywords.includes(kw);
        return (
          <span
            key={kw}
            className={`px-3 py-2 rounded-lg text-sm border transition-all font-medium ${
              isDetected
                ? 'bg-green-100 text-green-700 border-green-300'
                : 'bg-neutral-100 text-neutral-500 border-neutral-200'
            }`}
          >
            {isDetected && <CheckCircle2 size={14} className="inline mr-1" />}
            {kw}
          </span>
        );
      })}
    </div>
  );
}
