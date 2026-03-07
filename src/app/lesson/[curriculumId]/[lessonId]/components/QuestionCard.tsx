'use client';

type QuestionCardProps = {
  question: string;
  options: string[];
  selectedAnswer: number | null;
  correctAnswer: string | number;
  showExplanation: boolean;
  explanation?: string;
  onSelect: (index: number) => void;
  disabled?: boolean;
};

export function QuestionCard({
  question,
  options,
  selectedAnswer,
  correctAnswer,
  showExplanation,
  explanation,
  onSelect,
  disabled = false,
}: QuestionCardProps) {
  return (
    <div className="max-w-xl mx-auto">
      <h2 className="font-serif text-2xl font-semibold mb-6">
        {question}
      </h2>
      <div className="space-y-3 mb-6">
        {options.map((opt, i) => {
          const isCorrect = correctAnswer === i || correctAnswer === opt;
          let cls =
            'border-neutral-200 text-neutral-700 hover:border-neutral-400 bg-white';
          if (showExplanation) {
            if (isCorrect)
              cls = 'border-green-400 bg-green-50 text-green-700';
            else if (i === selectedAnswer)
              cls = 'border-red-400 bg-red-50 text-red-700';
            else cls = 'border-neutral-100 bg-neutral-50 text-neutral-400';
          }
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              disabled={disabled || showExplanation}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${cls} ${
                (disabled || showExplanation) ? 'cursor-not-allowed opacity-70' : ''
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {showExplanation && explanation && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 mb-4">
          💡 {explanation}
        </div>
      )}
    </div>
  );
}
