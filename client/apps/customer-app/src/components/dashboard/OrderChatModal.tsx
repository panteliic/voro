import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { createSocketClient } from '@voro/socket'
import { useI18n } from '../../i18n/i18n'
import { customerApi } from '../../services/customerApi'
import type { CustomerOrderMessage } from '../../types/customer'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function mergeMessages(current: CustomerOrderMessage[], incoming: CustomerOrderMessage[]) {
  const messagesById = new Map(current.map((message) => [message.id, message]))
  incoming.forEach((message) => messagesById.set(message.id, message))
  return [...messagesById.values()].sort((left, right) => left.id - right.id)
}

// Full customer-workspace conversation view. The desktop sidebar stays visible.
export function OrderChatModal({ orderId, onClose }: { orderId: number; onClose: () => void }) {
  const { language, t } = useI18n()
  const [messages, setMessages] = useState<CustomerOrderMessage[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    const appendMessages = (incoming: CustomerOrderMessage[]) => {
      if (active) setMessages((current) => mergeMessages(current, incoming))
    }

    void customerApi.getOrderMessages(orderId)
      .then((result) => {
        appendMessages(result.messages)
        if (active) setError('')
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : t('chat.unavailable'))
      })

    const token = window.localStorage.getItem('voro_access_token') || ''
    if (!token) return () => { active = false }

    const socket = createSocketClient(SOCKET_URL, { auth: { token } })
    socket.on('connect', () => {
      socket.emit('order:join', { orderId }, (result: { ok: boolean; message?: string }) => {
        if (active && !result.ok) setError(result.message || t('chat.notFound'))
      })
    })
    socket.on('order:message', (message: CustomerOrderMessage) => {
      if (message.orderId === orderId) appendMessages([message])
    })
    socket.connect()

    return () => {
      active = false
      socket.disconnect()
    }
  }, [orderId, t])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  async function send() {
    const text = body.trim()
    if (!text || isSending) return
    setIsSending(true)
    try {
      const result = await customerApi.sendOrderMessage(orderId, text)
      setMessages((current) => mergeMessages(current, [result.message]))
      setBody('')
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('chat.sendError'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="fixed inset-y-0 left-0 right-0 z-[1200] flex flex-col bg-background lg:left-[var(--customer-sidebar-width)]" aria-label={t('chat.courierTitle')}>
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-card px-4 py-3 sm:px-6">
        <button aria-label={t('chat.backToOrder')} className="grid size-10 shrink-0 place-items-center rounded-voro-md hover:bg-muted" onClick={onClose} type="button"><ArrowLeft className="size-4" /></button>
        <div className="min-w-0"><h2 className="font-bold">{t('chat.courierTitle')}</h2><p className="truncate text-xs text-muted-foreground">{t('chat.orderSubtitle', { id: orderId })}</p></div>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/25 p-4 sm:px-6">
        {error ? <p className="rounded-voro-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        {messages.length === 0 && !error ? <p className="py-10 text-center text-sm text-muted-foreground">{t('chat.emptyCourier')}</p> : null}
        {messages.map((message) => {
          const own = message.senderRole === 'customer'
          return <div className={`flex ${own ? 'justify-end' : 'justify-start'}`} key={message.id}><article className={`w-fit min-w-32 max-w-[84%] rounded-voro-lg px-3 py-2 text-sm sm:max-w-xl ${own ? 'bg-action text-action-text' : 'border border-line bg-card text-content shadow-voro-sm'}`}>
            <p className={`mb-1 text-[0.65rem] font-bold ${own ? 'text-white/70' : 'text-muted-foreground'}`}>{own ? t('chat.you') : message.senderName}</p>
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            <p className={`mt-1 text-[0.65rem] ${own ? 'text-white/70' : 'text-muted-foreground'}`}>{new Date(message.createdAt).toLocaleTimeString(language === 'sr' ? 'sr-RS' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          </article></div>
        })}
        <div ref={endRef} />
      </div>
      <form className="flex shrink-0 gap-2 border-t border-line bg-card p-3 sm:px-6" onSubmit={(event) => { event.preventDefault(); void send() }}>
        <input className="min-w-0 flex-1 rounded-voro-md border border-line bg-background px-3 text-sm outline-none ring-action/30 focus:ring-2" maxLength={1000} onChange={(event) => setBody(event.target.value)} placeholder={t('chat.messageCourier')} value={body} />
        <button aria-label={t('chat.send')} className="grid size-10 place-items-center rounded-voro-md bg-action text-action-text disabled:opacity-50" disabled={!body.trim() || isSending} type="submit"><Send className="size-4" /></button>
      </form>
    </section>
  )
}
