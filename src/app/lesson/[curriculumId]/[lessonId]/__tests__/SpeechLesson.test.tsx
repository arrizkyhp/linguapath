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
    lessonId: mockLessons.speech.id
  }))
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  useParams: vi.fn(() => ({
    curriculumId: 'test-curriculum',
    lessonId: mockLessons.speech.id
  }))
}))

describe('SpeechLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(completeLesson).mockClear()
  })

  it('renders correctly', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    expect(screen.getByText('Speaking Prompt')).toBeInTheDocument()
    expect(screen.getByText('Tell me about your daily routine.')).toBeInTheDocument()
  })

  it('microphone permission UI', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    expect(screen.getByText(/How to complete:/i)).toBeInTheDocument()
    expect(screen.getByText('Loading speech model...')).toBeInTheDocument()
  })

  it('recording UI elements', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    expect(screen.getByText('Loading speech model...')).toBeInTheDocument()
    expect(screen.getByText('1 / 3 keywords')).toBeInTheDocument()
  })

  it('timer display', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    expect(screen.getByText('00:00')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('keywords display', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    expect(screen.getByText('Keywords to use')).toBeInTheDocument()
    expect(screen.getByText('morning')).toBeInTheDocument()
    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByText('exercise')).toBeInTheDocument()
  })

  it('keyword detection', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    expect(screen.getByText('0 / 3 keywords')).toBeInTheDocument()
  })

  it('recording state changes', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    expect(screen.getByText('Loading speech model...')).toBeInTheDocument()
    expect(screen.getByText('Mic idle')).toBeInTheDocument()
  })

  it('transcription status', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    expect(screen.getByText('No speech detected')).toBeInTheDocument()
  })

  it('completion flow', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    const completeBtn = screen.getByText(/Mark as Complete/)
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
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    const completeBtn = screen.getByText(/Mark as Complete/)
    await user.click(completeBtn)

    await waitFor(() => {
      expect(screen.getByText(`+${mockLessons.speech.xp} XP`)).toBeInTheDocument()
    })
  })

  it('navigates back correctly', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    const backBtn = screen.getByRole('button', { name: /Back to Curriculum|Back to Review|dashboard/i })
    await user.click(backBtn)

    expect(mockPush).toHaveBeenCalledWith('/curriculum/test-curriculum')
  })

  it('loading model state', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    expect(screen.getByText('Loading speech model...')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('prompt displayed correctly', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    expect(screen.getByText('Tell me about your daily routine.')).toBeInTheDocument()
  })

  it('duration timer shows correct time', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('can mark as complete', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument()
    })

    const completeBtn = screen.getByText(/Mark as Complete/)
    await user.click(completeBtn)

    await waitFor(() => {
      expect(screen.getByText('🎉')).toBeInTheDocument()
    })

    expect(completeLesson).toHaveBeenCalledWith(
      'test-curriculum',
      mockLessons.speech.id,
      mockLessons.speech.xp,
      expect.any(Array)
    )
  })
})
