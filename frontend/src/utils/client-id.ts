let fallbackSequence = 0

export const createClientId = () => {
  const randomUuid = globalThis.crypto?.randomUUID
  if (randomUuid) return randomUuid.call(globalThis.crypto)

  fallbackSequence += 1
  const randomPart = Math.random().toString(36).slice(2) || '0'
  return `${Date.now().toString(36)}-${fallbackSequence.toString(36)}-${randomPart}`
}
