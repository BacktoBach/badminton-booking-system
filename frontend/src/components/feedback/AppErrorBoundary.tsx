import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../ui/Button'

type State = { failed: boolean }
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Uncaught React error', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="grid min-h-screen place-items-center bg-slate-50 p-4 text-center"><div><p className="text-5xl">🏸</p><h1 className="mt-4 text-2xl font-black">Ứng dụng vừa gặp lỗi</h1><p className="mt-2 text-slate-600">Hãy tải lại trang để tiếp tục.</p><Button className="mt-5" onClick={() => window.location.reload()}>Tải lại trang</Button></div></main>
  }
}
