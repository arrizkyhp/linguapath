'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, List } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { Lesson, FlashcardContent } from '@/types/curriculum';

type FlashcardLessonProps = {
  lesson: Lesson;
  curriculumId: string;
  curriculumTitle: string;
  alreadyComplete: boolean;
  onComplete: () => void;
  onNavigateBack: () => void;
};

export function FlashcardLesson({
  lesson,
  curriculumId,
  curriculumTitle,
  alreadyComplete,
  onComplete,
  onNavigateBack,
}: FlashcardLessonProps) {
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledCardOrder, setShuffledCardOrder] = useState<number[]>([]);
  const [difficultCardIndices, setDifficultCardIndices] = useState<number[]>([]);

  const content = lesson.content as FlashcardContent;
  const cardIndex = isShuffled ? shuffledCardOrder[cardIdx] : cardIdx;
  const card = content.cards[cardIndex];
  const isLast = cardIdx === content.cards.length - 1;

  function toggleShuffle() {
    if (isShuffled) {
      setIsShuffled(false);
      setShuffledCardOrder([]);
    } else {
      const order = Array.from({ length: content.cards.length }, (_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      setIsShuffled(true);
      setShuffledCardOrder(order);
      setCardIdx(0);
      setFlipped(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="text-center text-sm text-neutral-400 mb-6">
        {cardIdx + 1} / {content.cards.length}
      </div>
      <Progress
        value={((cardIdx + 1) / content.cards.length) * 100}
        className="mb-8"
      />
      <div
        onClick={() => setFlipped(!flipped)}
        className="cursor-pointer bg-white border border-neutral-200 rounded-2xl p-10 text-center shadow-sm hover:shadow-md transition-all min-h-48 flex flex-col items-center justify-center mb-6"
      >
        {!flipped ? (
          <>
            <div className="font-serif text-3xl font-semibold text-neutral-900 mb-2">
              {card.front}
            </div>
            <div className="text-xs text-neutral-400">Click to reveal</div>
          </>
        ) : (
          <>
            <div className="font-serif text-2xl text-neutral-700 mb-3">
              {card.back}
            </div>
            {card.example && (
              <div className="text-sm text-neutral-400 italic border-t border-neutral-100 pt-3 mt-2">
                &ldquo;{card.example}&rdquo;
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex gap-3 items-center justify-center">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setFlipped(false);
            setCardIdx(Math.max(0, cardIdx - 1));
          }}
          disabled={cardIdx === 0}
        >
          <ChevronRight size={16} className="rotate-180" /> Previous
        </Button>
         <Button
           variant="ghost"
           size="icon"
           onClick={() => setFlipped(false)}
         >
           <RotateCcw size={16} />
         </Button>
         <Button
           variant="ghost"
           size="icon"
           onClick={toggleShuffle}
           className={isShuffled ? "text-orange-600" : ""}
         >
           {isShuffled ? <List size={16} /> : <Shuffle size={16} />}
         </Button>
        {isLast ? (
          <Button className="flex-1" onClick={onComplete}>
            Complete Lesson ✓
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              onClick={() => {
                setDifficultCardIndices(prev => [...prev, cardIndex]);
                setFlipped(false);
                setCardIdx(cardIdx + 1);
              }}
            >
              Don't Know
            </Button>
            <Button
              className="flex-1 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300"
              onClick={() => {
                setFlipped(false);
                setCardIdx(cardIdx + 1);
              }}
            >
              Know It ✓
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
