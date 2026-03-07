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
    lessonId: mockLessons.writing.id
  }))
}))

describe('WritingLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(completeLesson).mockClear()
  })

  it('renders correctly', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Paragraph Writing')).toBeInTheDocument()
    })

    expect(screen.getByText('Writing Prompt')).toBeInTheDocument()
    expect(screen.getByText('Write a paragraph about your favorite hobby.')).toBeInTheDocument()
    expect(screen.getByText('50 min')).toBeInTheDocument()
  })

  it('writing textarea works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Paragraph Writing')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Start writing here...')
    await user.type(textarea, 'My favorite hobby is reading books.')

    expect(screen.getByDisplayValue('My favorite hobby is reading books.')).toBeInTheDocument()
  })

  it('word count display works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Paragraph Writing')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Start writing here...')
    await user.type(textarea, 'One two three four five six seven eight nine ten.')

    expect(screen.getByText('10 words / 50 min')).toBeInTheDocument()
  })

  it('submit button disabled when under word count', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Paragraph Writing')).toBeInTheDocument()
    })

    const submitBtn = screen.getByText(/Submit & Complete/)
    expect(submitBtn).toBeDisabled()
  })

  it('completes lesson when word count met', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Paragraph Writing')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Start writing here...')
    await user.type(textarea, 'This is a test paragraph with enough words to satisfy the minimum word count requirement for the writing lesson. It contains multiple sentences and demonstrates proper grammar and structure.')

    const completeBtn = screen.getByText(/Submit & Complete/)
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
      expect(screen.getByText('Paragraph Writing')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Start writing here...')
    await user.type(textarea, 'This is a test paragraph with enough words to satisfy the minimum word count requirement. It has sufficient content to complete the lesson successfully.')

    const completeBtn = screen.getByText(/Submit & Complete/)
    await user.click(completeBtn)

    await waitFor(() => {
      expect(screen.getByText(`+${mockLessons.writing.xp} XP`)).toBeInTheDocument()
    })
  })

  it('navigates back correctly', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Paragraph Writing')).toBeInTheDocument()
    })

    const backBtn = screen.getByRole('button', { name: /Back to Curriculum|Back to Review|dashboard/i })
    await user.click(backBtn)

    expect(mockPush).toHaveBeenCalledWith('/curriculum/test-curriculum')
  })

  it('check grammar button works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Paragraph Writing')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Start writing here...')
    await user.type(textarea, 'This is a test sentence with some words.')

    const checkGrammarBtn = screen.getByText(/Check Grammar/)
    await user.click(checkGrammarBtn)

    expect(checkGrammarBtn).toBeDisabled()
  })

  it('gets AI feedback button works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Paragraph Writing')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Start writing here...')
    await user.type(textarea, 'This is a test paragraph with enough content.')

    const aiFeedbackBtn = screen.getByText(/Get AI Feedback/)
    await user.click(aiFeedbackBtn)

    expect(aiFeedbackBtn).toBeDisabled()
  })

  it('displays prompt correctly', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Paragraph Writing')).toBeInTheDocument()
    })

    expect(screen.getByText('Writing Prompt')).toBeInTheDocument()
    expect(screen.getByText('Minimum: 50 words')).toBeInTheDocument()
  })

  it('handles minimum word count', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Paragraph Writing')).toBeInTheDocument()
    })

    const submitBtn = screen.getByText(/Submit & Complete/)
    expect(submitBtn).toBeDisabled()

    const textarea = screen.getByPlaceholderText('Start writing here...')
    await userEvent.setup().type(textarea, ' '.repeat(250))

    expect(submitBtn).not.toBeDisabled()
  })
})
