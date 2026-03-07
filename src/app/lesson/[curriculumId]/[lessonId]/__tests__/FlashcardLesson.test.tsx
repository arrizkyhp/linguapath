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
    lessonId: mockLessons.flashcard.id
  }))
}))

describe('FlashcardLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(completeLesson).mockClear()
  })

  it('renders correctly', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Vocabulary Set 1')).toBeInTheDocument()
    })

    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('card can be flipped', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    const card = screen.getByText('Hello')
    await user.click(card)

    expect(screen.getByText('Hola')).toBeInTheDocument()
  })

  it('Previous/Next navigation works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    const nextBtn = screen.getByText(/Next/)
    await user.click(nextBtn)

    await waitFor(() => {
      expect(screen.getByText('Goodbye')).toBeInTheDocument()
    })

    const prevBtn = screen.getByText(/Previous/)
    await user.click(prevBtn)

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })
  })

  it('shuffle functionality works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    const shuffleBtn = screen.getByRole('button', { name: /shuffle/i })
    await user.click(shuffleBtn)

    await waitFor(() => {
      expect(screen.getByText('Goodbye')).toBeInTheDocument()
    })
  })

  it('Dont Know button works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    const dontKnowBtn = screen.getByText(/Dont Know/)
    await user.click(dontKnowBtn)

    await waitFor(() => {
      expect(screen.getByText('Goodbye')).toBeInTheDocument()
    })
  })

  it('Know It button works', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    const knowBtn = screen.getByText(/Know It/)
    await user.click(knowBtn)

    await waitFor(() => {
      expect(screen.getByText('Goodbye')).toBeInTheDocument()
    })
  })

  it('completes lesson correctly', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    const knowBtn1 = screen.getByText(/Know It/)
    await user.click(knowBtn1)

    const knowBtn2 = screen.getByText(/Know It/)
    await user.click(knowBtn2)

    await waitFor(() => {
      expect(screen.getByText(/Complete Lesson/)).toBeInTheDocument()
    })

    const completeBtn = screen.getByText(/Complete Lesson/)
    await user.click(completeBtn)

    await waitFor(() => {
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    expect(completeLesson).toHaveBeenCalledWith(
      'test-curriculum',
      mockLessons.flashcard.id,
      mockLessons.flashcard.xp,
      expect.any(Array)
    )
  })

  it('awards XP on completion', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    const knowBtn1 = screen.getByText(/Know It/)
    await user.click(knowBtn1)
    
    const knowBtn2 = screen.getByText(/Know It/)
    await user.click(knowBtn2)

    await waitFor(() => {
      expect(screen.getByText(/Complete Lesson/)).toBeInTheDocument()
    })

    await user.click(screen.getByText(/Complete Lesson/))

    await waitFor(() => {
      expect(screen.getByText(`+${mockLessons.flashcard.xp} XP`)).toBeInTheDocument()
    })
  })
})
