import { createClientId } from './client-id'

export type AuthSessionEventType = 'login' | 'logout' | 'password-changed' | 'expired'

type AuthSessionEvent = {
  id: string
  sourceTabId: string
  type: AuthSessionEventType
  createdAt: number
}

const CHANNEL_NAME = 'badminton-auth-session'
const STORAGE_KEY = 'badminton-auth-session-event'
const sourceTabId = createClientId()

const createEvent = (type: AuthSessionEventType): AuthSessionEvent => ({
  id: createClientId(),
  sourceTabId,
  type,
  createdAt: Date.now(),
})

export const publishAuthSessionEvent = (type: AuthSessionEventType) => {
  const event = createEvent(type)

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.postMessage(event)
    channel.close()
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(event))
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export const subscribeToAuthSessionEvents = (listener: (event: AuthSessionEvent) => void) => {
  const deliveredIds = new Set<string>()
  const deliver = (event: AuthSessionEvent) => {
    if (event.sourceTabId === sourceTabId || deliveredIds.has(event.id)) return
    deliveredIds.add(event.id)
    listener(event)
    window.setTimeout(() => deliveredIds.delete(event.id), 60_000)
  }

  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null
  if (channel)
    channel.onmessage = (message: MessageEvent<AuthSessionEvent>) => deliver(message.data)

  const onStorage = (storageEvent: StorageEvent) => {
    if (storageEvent.key !== STORAGE_KEY || !storageEvent.newValue) return
    try {
      deliver(JSON.parse(storageEvent.newValue) as AuthSessionEvent)
    } catch {
      // Ignore malformed events from unrelated scripts or old app versions.
    }
  }
  window.addEventListener('storage', onStorage)

  return () => {
    channel?.close()
    window.removeEventListener('storage', onStorage)
  }
}
