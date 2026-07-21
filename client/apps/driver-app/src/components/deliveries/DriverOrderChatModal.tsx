import { useEffect, useRef, useState } from 'react'
import { Send, X } from 'lucide-react'
import { getDriverOrderMessages, sendDriverOrderMessage } from '../../services/driverApi'
import type { DriverOrderMessage } from '../../types/driver'

export function DriverOrderChatModal({ orderId, token, onClose }: { orderId: number; token: string; onClose: () => void }) {
  const [messages, setMessages] = useState<DriverOrderMessage[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    const load = () => {
      void getDriverOrderMessages(token, orderId)
        .then((result) => {
          if (active) { setMessages(result.messages); setError('') }
        })
        .catch((requestError: unknown) => {
          if (active) setError(requestError instanceof Error ? requestError.message : 'Messages are unavailable.')
        })
    }
    load()
    const interval = window.setInterval(load, 2_500)
    return () => { active = false; window.clearInterval(interval) }
  }, [orderId, token])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages])

  async function send() {
    const text = body.trim()
    if (!text || isSending) return
    setIsSending(true)
    try {
      const result = await sendDriverOrderMessage(token, orderId, text)
      setMessages((current) => [...current, result.message])
      setBody('')
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Message could not be sent.')
    } finally { setIsSending(false) }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-end bg-content/45 p-0 sm:items-center sm:justify-center sm:p-5" role="dialog" aria-label="Chat with customer" aria-modal="true">
      <section className="flex h-[min(42rem,86dvh)] w-full max-w-lg flex-col overflow-hidden rounded-t-voro-xl border border-line bg-card shadow-2xl sm:rounded-voro-xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3"><div><h2 className="font-bold">Customer chat</h2><p className="text-xs text-muted-foreground">Order #{orderId}</p></div><button aria-label="Close chat" className="grid size-9 place-items-center rounded-voro-md hover:bg-muted" onClick={onClose} type="button"><X className="size-4" /></button></header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/25 p-4">
          {error ? <p className="rounded-voro-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          {messages.length === 0 && !error ? <p className="py-10 text-center text-sm text-muted-foreground">Message the customer about arrival or delivery access.</p> : null}
          {messages.map((message) => {
            const own = message.senderRole === 'courier'
            return <article className={`max-w-[84%] rounded-voro-lg px-3 py-2 text-sm ${own ? 'ml-auto bg-action text-action-text' : 'bg-card text-content shadow-voro-sm'}`} key={message.id}><p className={`mb-1 text-[0.65rem] font-bold ${own ? 'text-white/70' : 'text-muted-foreground'}`}>{own ? 'You' : message.senderName}</p><p className="whitespace-pre-wrap break-words">{message.body}</p><p className={`mt-1 text-[0.65rem] ${own ? 'text-white/70' : 'text-muted-foreground'}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></article>
          })}
          <div ref={endRef} />
        </div>
        <form className="flex gap-2 border-t border-line p-3" onSubmit={(event) => { event.preventDefault(); void send() }}><input className="min-w-0 flex-1 rounded-voro-md border border-line bg-background px-3 text-sm outline-none ring-action/30 focus:ring-2" maxLength={1000} onChange={(event) => setBody(event.target.value)} placeholder="Message customer" value={body} /><button aria-label="Send message" className="grid size-10 place-items-center rounded-voro-md bg-action text-action-text disabled:opacity-50" disabled={!body.trim() || isSending} type="submit"><Send className="size-4" /></button></form>
      </section>
    </div>
  )
}
