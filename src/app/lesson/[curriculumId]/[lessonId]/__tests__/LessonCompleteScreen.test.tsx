import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonCompleteScreen } from '../components/LessonCompleteScreen';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

describe('LessonCompleteScreen', () => {
  const xp = 10;
  const onBackToCurriculum = vi.fn();
  const onDashboard = vi.fn();
  const onNextLesson = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Next Lesson button when nextLesson exists', () => {
    render(
      <LessonCompleteScreen
        xp={xp}
        nextLesson={{ curriculumId: '1', lessonId: '2' }}
        onBackToCurriculum={onBackToCurriculum}
        onDashboard={onDashboard}
        onNextLesson={onNextLesson}
      />
    );

    expect(screen.getByText('🎉')).toBeInTheDocument();
    expect(screen.getByText('Lesson Complete!')).toBeInTheDocument();
    expect(screen.getByText('+10 XP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next lesson/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to curriculum/i })).toBeInTheDocument();
  });

  it('shows Curriculum Complete message when nextLesson is null', () => {
    render(
      <LessonCompleteScreen
        xp={xp}
        nextLesson={null}
        onBackToCurriculum={onBackToCurriculum}
        onDashboard={onDashboard}
        onNextLesson={onNextLesson}
      />
    );

    expect(screen.getByText('🎉')).toBeInTheDocument();
    expect(screen.getByText('Curriculum Complete!')).toBeInTheDocument();
    expect(screen.getByText(/Amazing job/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
  });

  it('displays XP correctly', () => {
    render(
      <LessonCompleteScreen
        xp={50}
        nextLesson={null}
        onBackToCurriculum={onBackToCurriculum}
        onDashboard={onDashboard}
        onNextLesson={onNextLesson}
      />
    );

    expect(screen.getByText('+50 XP')).toBeInTheDocument();
  });

  it('calls onNextLesson when Next Lesson button is clicked', () => {
    const user = userEvent.setup();
    render(
      <LessonCompleteScreen
        xp={xp}
        nextLesson={{ curriculumId: '1', lessonId: '2' }}
        onBackToCurriculum={onBackToCurriculum}
        onDashboard={onDashboard}
        onNextLesson={onNextLesson}
      />
    );

    const nextBtn = screen.getByRole('button', { name: /next lesson/i });
    user.click(nextBtn);
    expect(onNextLesson).toHaveBeenCalled();
  });

  it('calls onDashboard when Dashboard button is clicked', () => {
    const user = userEvent.setup();
    render(
      <LessonCompleteScreen
        xp={xp}
        nextLesson={null}
        onBackToCurriculum={onBackToCurriculum}
        onDashboard={onDashboard}
        onNextLesson={onNextLesson}
      />
    );

    const dashboardBtn = screen.getByRole('button', { name: /dashboard/i });
    user.click(dashboardBtn);
    expect(onDashboard).toHaveBeenCalled();
  });

  it('allows confetti replay', async () => {
    const confetti = require('canvas-confetti');
    const user = userEvent.setup();
    render(
      <LessonCompleteScreen
        xp={xp}
        nextLesson={null}
        onBackToCurriculum={onBackToCurriculum}
        onDashboard={onDashboard}
        onNextLesson={onNextLesson}
      />
    );

    const replayBtn = screen.getByTitle('Play confetti again');
    await user.click(replayBtn);

    expect(confetti.default).toHaveBeenCalled();
  });

  it('shows custom lesson title', () => {
    render(
      <LessonCompleteScreen
        xp={xp}
        nextLesson={null}
        onBackToCurriculum={onBackToCurriculum}
        onDashboard={onDashboard}
        onNextLesson={onNextLesson}
        lessonTitle="Spanish Course"
      />
    );

    expect(screen.getByText('Spanish Course Complete!')).toBeInTheDocument();
  });
});
