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
    lessonId: mockLessons.reading.id
  }))
}))

describe('ReadingLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(completeLesson).mockClear()
  })

  it('Reading Lesson renders correctly', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Short Reading')).toBeInTheDocument()
    })

    expect(screen.getByText('The sun was shining brightly.')).toBeInTheDocument()
    expect(screen.getByText(/Continue to Questions/)).toBeInTheDocument()
  })

  it('passage display works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Short Reading')).toBeInTheDocument()
    })

    expect(screen.getByText('The sun was shining brightly.')).toBeInTheDocument()
  })

  it('continue to questions button', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Short Reading')).toBeInTheDocument()
    })

    const contBtn = screen.getByText(/Continue to Questions/)
    await user.click(contBtn)

    expect(screen.getByText('What was the weather like?')).toBeInTheDocument()
  })

  it('question answering works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Short Reading')).toBeInTheDocument()
    })

    const contBtn = screen.getByText(/Continue to Questions/)
    await user.click(contBtn)

    await waitFor(() => {
      expect(screen.getByText('What was the weather like?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[2]
    await user.click(correctOption)

    expect(screen.getByText('💡')).toBeInTheDocument()
  })

  it('next question navigation', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Short Reading')).toBeInTheDocument()
    })

    const contBtn = screen.getByText(/Continue to Questions/)
    await user.click(contBtn)

    await waitFor(() => {
      expect(screen.getByText('What was the weather like?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[2]
    await user.click(correctOption)

    const nextBtn = screen.getByText(/Complete Lesson/)
    await user.click(nextBtn)

    await waitFor(() => {
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })
  })

  it('completes lesson correctly', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Short Reading')).toBeInTheDocument()
    })

    const contBtn = screen.getByText(/Continue to Questions/)
    await user.click(contBtn)

    await waitFor(() => {
      expect(screen.getByText('What was the weather like?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[2]
    await user.click(correctOption)

    await user.click(screen.getByText(/Complete Lesson/))

    await waitFor(() => {
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    expect(completeLesson).toHaveBeenCalled()
  })

  it('awards XP on completion', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Short Reading')).toBeInTheDocument()
    })

    const contBtn = screen.getByText(/Continue to Questions/)
    await user.click(contBtn)

    await waitFor(() => {
      expect(screen.getByText('What was the weather like?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[2]
    await user.click(correctOption)

    await user.click(screen.getByText(/Complete Lesson/))

    await waitFor(() => {
      expect(screen.getByText(`+${mockLessons.reading.xp} XP`)).toBeInTheDocument()
    })
  })

  it('navigates back correctly', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Short Reading')).toBeInTheDocument()
    })

    const backBtn = screen.getByRole('button', { name: /Back to Curriculum|Back to Review|dashboard/i })
    await user.click(backBtn)

    expect(mockPush).toHaveBeenCalledWith('/curriculum/test-curriculum')
  })

  it('shows explanation for questions', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Short Reading')).toBeInTheDocument()
    })

    const contBtn = screen.getByText(/Continue to Questions/)
    await user.click(contBtn)

    await waitFor(() => {
      expect(screen.getByText('What was the weather like?')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[2]
    await user.click(correctOption)

    expect(screen.getByText('💡 The text says the sun was shining brightly.')).toBeInTheDocument()
  })
})
