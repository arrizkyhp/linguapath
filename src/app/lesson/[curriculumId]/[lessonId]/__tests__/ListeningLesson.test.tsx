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
    lessonId: mockLessons.listening.id
  }))
}))

describe('ListeningLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(completeLesson).mockClear()
  })

  it('renders correctly', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Listening Comprehension')).toBeInTheDocument()
    })

    expect(screen.getByText('Audio Passage')).toBeInTheDocument()
  })

  it('audio player displays', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Audio Passage')).toBeInTheDocument()
    })

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('listen to continue locked until listened', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Audio Passage')).toBeInTheDocument()
    })

    const listenBtn = screen.getByText(/Listen to continue/)
    expect(listenBtn).toBeDisabled()
  })

  it('questions after listening', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Audio Passage')).toBeInTheDocument()
    })

    const listenBtn = screen.getByText(/Listen to continue/)
    expect(listenBtn).toBeInTheDocument()
    expect(listenBtn).toBeDisabled()

    vi.mocked(require('@/lib/store').loadState).mockImplementation(() => ({
      curriculums: [mockCurriculum],
      progress: [],
      current_level: 'A1'
    }))

    const contBtn = screen.getByText(/Continue to Questions/)
    expect(contBtn).toBeInTheDocument()
  })

  it('navigates correctly', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Audio Passage')).toBeInTheDocument()
    })

    const backBtn = screen.getByRole('button', { name: /Back to Curriculum|Back to Review|dashboard/i })
    await user.click(backBtn)

    expect(mockPush).toHaveBeenCalledWith('/curriculum/test-curriculum')
  })

  it('completes lesson correctly', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Audio Passage')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[1]
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
      expect(screen.getByText('Audio Passage')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[1]
    await user.click(correctOption)

    await user.click(screen.getByText(/Complete Lesson/))

    await waitFor(() => {
      expect(screen.getByText(`+${mockLessons.listening.xp} XP`)).toBeInTheDocument()
    })
  })

  it('replay functionality', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Audio Passage')).toBeInTheDocument()
    })

    const replayBtn = screen.getByRole('button', { name: /play/i })
    expect(replayBtn).toBeInTheDocument()
  })

  it('navigates back correctly', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Audio Passage')).toBeInTheDocument()
    })

    const backBtn = screen.getByRole('button', { name: /Back to Curriculum|Back to Review|dashboard/i })
    await user.click(backBtn)

    expect(mockPush).toHaveBeenCalledWith('/curriculum/test-curriculum')
  })

  it('shows explanation for questions', async () => {
    const user = userEvent.setup()
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Audio Passage')).toBeInTheDocument()
    })

    const options = screen.getAllByRole('button')
    const correctOption = options[1]
    await user.click(correctOption)

    expect(screen.getByText('💡 The speaker mentions hydration.')).toBeInTheDocument()
  })

  it('checks hasListened state', async () => {
    render(<LessonPage />)

    await waitFor(() => {
      expect(screen.getByText('Audio Passage')).toBeInTheDocument()
    })

    const listenBtn = screen.getByText(/Listen to continue/)
    expect(listenBtn).toBeDisabled()
  })
})
