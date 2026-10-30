import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()

if (dsn && !import.meta.env.TEST) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim() || import.meta.env.MODE,
    tracesSampleRate: 0,
    beforeSend(event) {
      delete event.request
      delete event.user
      delete event.breadcrumbs
      return event
    },
  })
}

export const captureFrontendError = (error: unknown): void => {
  if (dsn && !import.meta.env.TEST) Sentry.captureException(error)
}
