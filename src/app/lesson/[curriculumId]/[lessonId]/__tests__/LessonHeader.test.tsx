import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonHeader } from '../components/LessonHeader';

describe('LessonHeader', () => {
  const mockPush = vi.fn();
  
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push: mockPush,
    }),
  }));

  const typeCfg = {
    icon: '📚',
    label: 'Flashcard',
    color: 'bg-blue-500',
  };

  it('renders curriculum title and lesson title', () => {
    render(
      <LessonHeader
        curriculumTitle="Spanish Basics"
        lessonTitle="Vocabulary 1"
        lessonType="flashcard"
        xp={10}
        alreadyComplete={false}
        onBack={vi.fn()}
        typeCfg={typeCfg}
      />
    );

    expect(screen.getByText('Spanish Basics')).toBeInTheDocument();
    expect(screen.getByText('Vocabulary 1')).toBeInTheDocument();
  });

  it('renders lesson type and XP', () => {
    render(
      <LessonHeader
        curriculumTitle="Spanish Basics"
        lessonTitle="Vocabulary 1"
        lessonType="flashcard"
        xp={10}
        alreadyComplete={false}
        onBack={vi.fn()}
        typeCfg={typeCfg}
      />
    );

    expect(screen.getByText('📚')).toBeInTheDocument();
    expect(screen.getByText('Flashcard')).toBeInTheDocument();
    expect(screen.getByText('+10 XP')).toBeInTheDocument();
  });

  it('renders completed badge when alreadyComplete is true', () => {
    render(
      <LessonHeader
        curriculumTitle="Spanish Basics"
        lessonTitle="Vocabulary 1"
        lessonType="flashcard"
        xp={10}
        alreadyComplete={true}
        onBack={vi.fn()}
        typeCfg={typeCfg}
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /check/i })).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(
      <LessonHeader
        curriculumTitle="Spanish Basics"
        lessonTitle="Vocabulary 1"
        lessonType="flashcard"
        xp={10}
        alreadyComplete={false}
        onBack={onBack}
        typeCfg={typeCfg}
      />
    );

    const backBtn = screen.getByRole('button', { name: /back/i });
    userEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});
