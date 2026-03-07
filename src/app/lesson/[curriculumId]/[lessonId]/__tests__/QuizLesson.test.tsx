import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import LessonPage from '../page'
import { mockCurriculum, mockLessons } from '@/test/mocks/curriculum'
import { completeLesson } from '@/lib/store'
import { dispatchStateUpdate } from '@/components/AppLayout'

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

vi.mock('@/components/AppLayout', () => ({
  dispatchStateUpdate: vi.fn()
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

describe('QuizLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(completeLesson).mockClear()
  })

  it('renders correctly', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Grammar Quiz')).toBeInTheDocument()
    })

    expect(screen.getByText('What is the past tense of go?')).toBeInTheDocument()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('answering questions works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('What is the past tense of go?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[1]
    await user.click(correctOption)

    await waitFor(() => {
      expect(screen.getByText('💡')).toBeInTheDocument()
    })
  })

  it('shows explanation after answering', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('What is the past tense of go?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[1]
    await user.click(correctOption)

    expect(screen.getByText('💡 Go is an irregular verb.')).toBeInTheDocument()
  })

  it('navigates to next question', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('What is the past tense of go?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[1]
    await user.click(correctOption)

    const nextBtn = screen.getByText(/Next Question/)
    await user.click(nextBtn)

    expect(screen.getByText('Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('1 / 1 correct')).toBeInTheDocument()
  })

  it('quiz completion screen shows percentage', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('What is the past tense of go?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[1]
    await user.click(correctOption)

    await user.click(screen.getByText(/Next Question/))

    expect(screen.getByText('Quiz Complete')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText(`Claim ${mockLessons.quiz.xp} XP`)).toBeInTheDocument()
  })

  it('navigates back correctly', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('What is the past tense of go?')).toBeInTheDocument()
    })

    const backBtn = screen.getByRole('button', { name: /Back to Curriculum|Back to Review|dashboard/i })
    await user.click(backBtn)

    expect(mockPush).toHaveBeenCalledWith('/curriculum/test-curriculum')
  })

  it('completes lesson and awards XP', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('What is the past tense of go?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[1]
    await user.click(correctOption)

    await user.click(screen.getByText(/Next Question/))

    const claimBtn = screen.getByText(`Claim ${mockLessons.quiz.xp} XP`)
    await user.click(claimBtn)

    await waitFor(() => {
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    expect(completeLesson).toHaveBeenCalledWith(
      'test-curriculum',
      mockLessons.quiz.id,
      mockLessons.quiz.xp,
      expect.any(Array)
    )
  })

  it('marks incorrect answer', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('What is the past tense of go?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const wrongOption = options[0]
    await user.click(wrongOption)

    await waitFor(() => {
      expect(screen.getByText('💡')).toBeInTheDocument()
    })
  })

  it('marks complete flow with correct answer', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('What is the past tense of go?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[1]
    await user.click(correctOption)

    await user.click(screen.getByText(/Next Question/))

    const claimBtn = screen.getByText(`Claim ${mockLessons.quiz.xp} XP`)
    await user.click(claimBtn)

    await waitFor(() => {
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    expect(completeLesson).toHaveBeenCalled()
  })
})
