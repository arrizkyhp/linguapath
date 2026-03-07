import type { RenderOptions } from '@testing-library/react'
import { render as overridenRender } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

export * from '@testing-library/react'

type UserEvent = ReturnType<typeof userEvent.setup>

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  user?: UserEvent
}

export function render(
  ui: React.ReactElement,
  { user: customUser, ...renderOptions }: ExtendedRenderOptions = {},
) {
  const user = customUser || userEvent.setup()
  return {
    user,
    ...overridenRender(ui, renderOptions),
  }
}
