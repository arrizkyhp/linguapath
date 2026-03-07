"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadState, getDueReviews, scheduleReview } from "@/lib/store";
import { dispatchStateUpdate } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppState, Lesson, Curriculum } from "@/types/curriculum";
import { Clock, CheckCircle, RotateCcw, Brain, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

type ReviewPerformance = 1 | 2 | 3 | 4 | 5;

interface ReviewItem {
  curriculumId: string;
  lessonId: string;
  lesson: Lesson;
  curriculum: Curriculum;
  nextReviewDate: string;
  intervalDays: number;
  reviewCount: number;
  difficultItemsCount: number;
  totalItems: number;
  accuracy: number;
}

export default function ReviewsPage() {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showPerformanceRating, setShowPerformanceRating] = useState(false);
  const [searchParams, setSearchParams] = useState<{ review?: string; completed?: string }>({});
  const [sessionStartCount, setSessionStartCount] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = sessionStorage.getItem("reviews_session_start");
    return saved ? parseInt(saved, 10) : null;
  });
  const justCompleted = useRef(false);

  useEffect(() => {
    const s = loadState();
    if (!s.onboarding_complete) {
      router.push("/onboarding");
      return;
    }
    setState(s);
  }, [router]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchParams({ 
      review: params.get("review") || undefined,
      completed: params.get("completed") || undefined
    });
    if (params.get("completed") === "true") {
      setShowPerformanceRating(true);
    }
  }, []);

  useEffect(() => {
    if (!state) return;
    if (justCompleted.current) return;

    const dueReviews: ReviewItem[] = [];

    for (const curriculum of state.curriculums) {
      const due = getDueReviews(curriculum.id);
      for (const { lessonId, progress } of due) {
        const lesson = findLesson(curriculum, lessonId);
        if (lesson) {
          const difficultCount = progress.difficult_items?.length || 0;
          const total = progress.total_items || 1;
          const correct = progress.correct_items || 0;
          dueReviews.push({
            curriculumId: curriculum.id,
            lessonId,
            lesson,
            curriculum,
            nextReviewDate: progress.next_review_date!,
            intervalDays: progress.interval_days ?? 1,
            reviewCount: progress.review_count ?? 0,
            difficultItemsCount: difficultCount,
            totalItems: total,
            accuracy: Math.round((correct / total) * 100),
          });
        }
      }
    }

    const sortedReviews = dueReviews.sort((a, b) => 
      new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
    );
    
    setReviews(sortedReviews);
    
    if (sortedReviews.length > 0 && sessionStartCount === null) {
      const newCount = sortedReviews.length;
      setSessionStartCount(newCount);
      sessionStorage.setItem("reviews_session_start", newCount.toString());
    }
    
    justCompleted.current = false;
  }, [state, sessionStartCount]);

  function findLesson(curriculum: Curriculum, lessonId: string): Lesson | null {
    for (const module of curriculum.modules) {
      for (const unit of module.units) {
        const lesson = unit.lessons.find((l) => l.id === lessonId);
        if (lesson) return lesson;
      }
    }
    return null;
  }

  function handleCompleteReview(performance: ReviewPerformance) {
    if (!state) return;
    const currentReview = reviews[currentReviewIndex];
    if (!currentReview) return;

    scheduleReview(currentReview.curriculumId, currentReview.lessonId, performance);
    dispatchStateUpdate();

    justCompleted.current = true;

    const updatedReviews = reviews.filter(
      (_, index) => index !== currentReviewIndex
    );

    if (updatedReviews.length === 0) {
      sessionStorage.removeItem("reviews_session_start");
      setSessionStartCount(null);
      setReviews([]);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1'],
      });
      router.replace("/reviews");
    } else {
      const nextIndex = Math.min(currentReviewIndex, updatedReviews.length - 1);
      setCurrentReviewIndex(nextIndex);
      setReviews(updatedReviews);
      setShowPerformanceRating(false);
    }
  }

  if (!state) return null;

  if (reviews.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="font-serif text-3xl font-bold mb-4">All Caught Up!</h1>
          <p className="text-neutral-500 mb-6">
            You have no reviews due right now. Great job staying on top of your learning!
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push("/curriculum")}>
              Continue Learning
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentReview = reviews[currentReviewIndex];
  const completedCount = sessionStartCount ? sessionStartCount - reviews.length : 0;
  const progress = sessionStartCount ? ((completedCount + 1) / sessionStartCount) * 100 : 0;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="text-purple-600" size={24} />
          <h1 className="font-serif text-3xl font-bold">Spaced Repetition Review</h1>
        </div>
        <p className="text-neutral-500">
          Strengthen your memory by reviewing lessons at the optimal time
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-neutral-500">
            Review {sessionStartCount ? sessionStartCount - reviews.length + 1 : 1} of {sessionStartCount || reviews.length}
          </span>
          <span className="text-neutral-500">
            {Math.round(progress)}% complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-neutral-400 mb-1">
              {currentReview.curriculum.title}
            </div>
            <h2 className="font-serif text-xl font-semibold mb-2">
              {currentReview.lesson.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-neutral-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                Due {getRelativeTime(currentReview.nextReviewDate)}
              </span>
              <span className="flex items-center gap-1">
                <RotateCcw size={14} />
                {currentReview.intervalDays} day interval
              </span>
              <span className="flex items-center gap-1">
                <Sparkles size={14} />
                Review #{currentReview.reviewCount + 1}
              </span>
              {currentReview.difficultItemsCount > 0 && (
                <span className="flex items-center gap-1 text-red-600 font-medium">
                  ⚠️ {currentReview.difficultItemsCount} difficult items
                </span>
              )}
              <span className="flex items-center gap-1">
                📊 {currentReview.accuracy}% accuracy
              </span>
            </div>
          </div>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              {currentReview.lesson.type}
            </Badge>
          </div>

          {!showPerformanceRating ? (
            <div>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="text-sm font-medium text-blue-800 mb-2">
                  Review Focus
                </div>
                {currentReview.difficultItemsCount > 0 ? (
                  <p className="text-sm text-blue-700">
                    This review will focus on <strong>{currentReview.difficultItemsCount} difficult items</strong> from 
                    your previous attempt. Pay extra attention to these!
                  </p>
                ) : (
                  <p className="text-sm text-blue-700">
                    Great job! You mastered all items last time. This review will reinforce your knowledge.
                  </p>
                )}
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  router.push(`/lesson/${currentReview.curriculumId}/${currentReview.lessonId}?review=true`);
                }}
              >
                Start Review Lesson
              </Button>
            </div>
          ) : (
            <div>
              <div className="text-center mb-4">
                <div className="text-lg font-semibold mb-2">
                  How well did you remember this?
                </div>
                <p className="text-sm text-neutral-500">
                  Be honest - this helps schedule your next review optimally
                </p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <button
                  onClick={() => handleCompleteReview(1)}
                  className="p-3 rounded-lg border-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <div className="text-lg font-bold">1</div>
                  <div className="text-xs">Forgot</div>
                </button>
                <button
                  onClick={() => handleCompleteReview(2)}
                  className="p-3 rounded-lg border-2 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  <div className="text-lg font-bold">2</div>
                  <div className="text-xs">Hard</div>
                </button>
                <button
                  onClick={() => handleCompleteReview(3)}
                  className="p-3 rounded-lg border-2 border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
                >
                  <div className="text-lg font-bold">3</div>
                  <div className="text-xs">Good</div>
                </button>
                <button
                  onClick={() => handleCompleteReview(4)}
                  className="p-3 rounded-lg border-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <div className="text-lg font-bold">4</div>
                  <div className="text-xs">Easy</div>
                </button>
                <button
                  onClick={() => handleCompleteReview(5)}
                  className="p-3 rounded-lg border-2 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                >
                  <div className="text-lg font-bold">5</div>
                  <div className="text-xs">Perfect</div>
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Brain className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <div className="text-sm font-medium text-blue-800 mb-1">
              Why Spaced Repetition?
            </div>
            <p className="text-xs text-blue-700">
              Research shows you remember 90% of what you learn when you review at optimal intervals. 
              Each review strengthens the memory and extends the time until your next review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays < 7) return `in ${diffDays} days`;
  return `in ${Math.round(diffDays / 7)} weeks`;
}
