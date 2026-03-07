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
    lessonId: mockLessons.fill_blank.id
  }))
}))

describe('FillBlankLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(completeLesson).mockClear()
  })

  it('renders correctly', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Fill in the Blanks')).toBeInTheDocument()
    })

    expect(screen.getByText('I ___ to the store yesterday.')).toBeInTheDocument()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
  })

  it('selecting answers works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('I ___ to the store yesterday.')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const answerBtn = options[1]
    await user.click(answerBtn)

    expect(screen.getByText(/I to the store yesterday/)).toBeInTheDocument()
  })

  it('shows explanation after selecting answer', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('I ___ to the store yesterday.')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const answerBtn = options[1]
    await user.click(answerBtn)

    expect(screen.getByText('💡 Past tense of go is went.')).toBeInTheDocument()
  })

  it('navigates to next sentence', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('I ___ to the store yesterday.')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const answerBtn = options[1]
    await user.click(answerBtn)

    const nextBtn = screen.getByText(/Next/)
    await user.click(nextBtn)

    expect(screen.getByText(/Complete Lesson/)).toBeInTheDocument()
  })

  it('completes lesson correctly', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('I ___ to the store yesterday.')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const answerBtn = options[1]
    await user.click(answerBtn)

    const completeBtn = screen.getByText(/Complete Lesson/)
    await user.click(completeBtn)

    await waitFor(() => {
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    expect(completeLesson).toHaveBeenCalled()
  })

  it('awards XP on completion', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('I ___ to the store yesterday.')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const answerBtn = options[1]
    await user.click(answerBtn)

    const completeBtn = screen.getByText(/Complete Lesson/)
    await user.click(completeBtn)

    await waitFor(() => {
      expect(screen.getByText(`+${mockLessons.fill_blank.xp} XP`)).toBeInTheDocument()
    })
  })

  it('navigates back correctly', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('I ___ to the store yesterday.')).toBeInTheDocument()
    })

    const backBtn = screen.getByRole('button', { name: /Back to Curriculum|Back to Review|dashboard/i }) || screen.getByRole('button', { name: /lear/i })
    await user.click(backBtn)

    expect(mockPush).toHaveBeenCalledWith('/curriculum/test-curriculum')
  })

  it('shows correct/incorrect feedback', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('I ___ to the store yesterday.')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const wrongBtn = options[0]
    await user.click(wrongBtn)

    const correctBtn = options[1]
    await user.click(correctBtn)

    expect(screen.getByText(/I to the store yesterday/)).toBeInTheDocument()
  })

  it('handles multiple sentences', async () => {
    vi.resetAllMocks()

    const multiSentenceLesson = {
      ...mockLessons.fill_blank,
      content: {
        sentences: [
          {
            text: 'I ___ to the store yesterday.',
            answer: 'went',
            options: ['go', 'went', 'gone', 'going'],
            explanation: 'Past tense of go is went.'
          },
          {
            text: 'She ___ a book.',
            answer: 'read',
            options: ['read', 'reading', 'reads', 'reader'],
            explanation: 'Past tense of read is read.'
          }
        ]
      }
    }

    vi.mocked(require('@/test/mocks/curriculum').mockLessons.fill_blank).mockReturnValue(multiSentenceLesson)

    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('I ___ to the store yesterday.')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const answerBtn = options[1]
    await userEvent.setup().click(answerBtn)

    const nextBtn = screen.getByText(/Next/)
    await userEvent.setup().click(nextBtn)

    expect(screen.getByText('She ___ a book.')).toBeInTheDocument()
  })
})
