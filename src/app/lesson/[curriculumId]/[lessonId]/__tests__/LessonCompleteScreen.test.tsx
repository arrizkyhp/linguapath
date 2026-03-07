import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import LessonPage from '../page'
import { mockCurriculum, mockLessons } from '@/test/mocks/curriculum'
import { completeLesson } from '@/lib/store'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

vi.mock('@/lib/store', () => ({
  completeLesson: vi.fn(),
  loadState: vi.fn(() => ({ 
    curriculums: [mockCurriculum],
    progress: [],
    current_level: 'A1'
  })),
  getLessonProgress: vi.fn(() => null),
  setLastLesson: vi.fn()
}))

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useParams: vi.fn(() => ({
    curriculumId: 'test-curriculum',
    lessonId: mockLessons.quiz.id
  }))
}))

describe('LessonCompleteScreen', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(completeLesson).mockClear()
    mockPush.mockClear()
  })

  it('shows Next Lesson button when nextLesson exists', async () => {
    vi.mocked(completeLesson).mockImplementation(() => {
      // No-op
    })

    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    expect(screen.getByText('Lesson Complete!')).toBeInTheDocument()
    expect(screen.getByText(`+${mockLessons.quiz.xp} XP`)).toBeInTheDocument()
    expect(screen.getByText('Next Lesson')).toBeInTheDocument()
    expect(screen.getByText(/Back to Curriculum/)).toBeInTheDocument()
  })

  it('shows Curriculum Complete message when no next lesson', async () => {
    vi.mocked(completeLesson).mockImplementation(() => {
      // No-op
    })

    const mockReplace = vi.fn()
    vi.mocked(require('next/navigation').useRouter as any).mockImplementation(() => ({
      push: mockReplace
    }))

    vi.mocked(require('next/navigation').useParams as any).mockImplementation(() => ({
      curriculumId: 'test-curriculum',
      lessonId: 'last-lesson-id'
    }))

    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    expect(screen.getByText('Curriculum Complete!')).toBeInTheDocument()
    expect(screen.getByText(/Amazing job/)).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('allows confetti replay', async () => {
    const confetti = require('canvas-confetti')
    
    vi.mocked(completeLesson).mockImplementation(() => {
      // No-op
    })

    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    const replayBtn = screen.getByTitle('Play confetti again')
    await user.click(replayBtn)

    expect(confetti.default).toHaveBeenCalledTimes(2)
  })

  it('navigates to dashboard button', async () => {
    const mockReplace = vi.fn()
    vi.mocked(require('next/navigation').useRouter as any).mockImplementation(() => ({
      push: mockReplace
    }))

    vi.mocked(completeLesson).mockImplementation(() => {
      // No-op
    })

    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    const dashboardBtn = screen.getByText('Dashboard')
    await user.click(dashboardBtn)

    expect(mockReplace).toHaveBeenCalledWith('/dashboard')
  })
})
