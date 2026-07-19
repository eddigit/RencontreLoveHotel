import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  acceptMatchRequestMock,
  executeQueryMock,
  requireSameUserOrAdminMock
} = vi.hoisted(() => ({
  acceptMatchRequestMock: vi.fn(),
  executeQueryMock: vi.fn(),
  requireSameUserOrAdminMock: vi.fn()
}))

vi.mock('@/actions/user-actions', () => ({
  acceptMatchRequest: acceptMatchRequestMock
}))

vi.mock('@/lib/db', () => ({
  executeQuery: executeQueryMock,
  sql: vi.fn()
}))

vi.mock('@/lib/server-auth', () => ({
  requireCurrentUser: vi.fn(),
  requireSameUserOrAdmin: requireSameUserOrAdminMock
}))

import { acceptMatch } from '@/app/actions'

describe('legacy match acceptance consent', () => {
  beforeEach(() => {
    acceptMatchRequestMock.mockReset()
    executeQueryMock.mockReset()
    requireSameUserOrAdminMock.mockReset()
  })

  it('requires the authenticated user to be the request receiver', async () => {
    requireSameUserOrAdminMock.mockRejectedValueOnce(
      new Error('Action limitée à votre propre compte')
    )

    await expect(acceptMatch('requester-1', 'receiver-1')).rejects.toThrow(
      'Action limitée à votre propre compte'
    )
    expect(requireSameUserOrAdminMock).toHaveBeenCalledWith('receiver-1')
    expect(acceptMatchRequestMock).not.toHaveBeenCalled()
    expect(executeQueryMock).not.toHaveBeenCalled()
  })

  it('delegates receiver-authorized acceptance to the secured lifecycle', async () => {
    requireSameUserOrAdminMock.mockResolvedValueOnce({
      id: 'receiver-1',
      role: 'user'
    })
    acceptMatchRequestMock.mockResolvedValueOnce({
      success: true,
      conversationId: 'conversation-1'
    })

    await expect(acceptMatch('requester-1', 'receiver-1')).resolves.toEqual({
      success: true,
      conversationId: 'conversation-1'
    })
    expect(acceptMatchRequestMock).toHaveBeenCalledWith(
      'requester-1',
      'receiver-1'
    )
    expect(executeQueryMock).not.toHaveBeenCalled()
  })
})
