import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { createSocketClient } from '@voro/socket'
import { getDriverOrderMessages, sendDriverOrderMessage } from '../../services/driverApi'
import { API_URL, TOKEN_KEY } from '../../services/apiClient'
import type { DriverOrderMessage } from '../../types/driver'
import { translate, type DriverLanguage } from '../../i18n'

function mergeMessages(current: DriverOrderMessage[], incoming: DriverOrderMessage[]) {
  const messagesById = new Map(current.map((message) => [message.id, message]))
  incoming.forEach((message) => messagesById.set(message.id, message))
  return [...messagesById.values()].sort((left, right) => left.id - right.id)
}

// Full delivery-workspace conversation view. The driver navigation remains visible on desktop.
export function DriverOrderChatModal({
  orderId,
  token,
  withinWorkspace = false,
  language,
}: {
  orderId: number
  token: string
  withinWorkspace?: boolean
  language: DriverLanguage
}) {
  const t = (key: string, values?: Record<string, string | number>) => translate(language, key, values)
  const [messages, setMessages] = useState<DriverOrderMessage[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    const appendMessages = (incoming: DriverOrderMessage[]) => {
      if (active) setMessages((current) => mergeMessages(current, incoming))
    }

    void getDriverOrderMessages(token, orderId)
      .then((result) => {
        appendMessages(result.messages)
        if (active) setError('')
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : t('chat.unavailable'))
      })

    const socketToken = window.localStorage.getItem(TOKEN_KEY) || token
    const socket = createSocketClient(API_URL, { auth: { token: socketToken } })
    socket.on('connect', () => {
      socket.emit('order:join', { orderId }, (result: { ok: boolean; message?: string }) => {
        if (active && !result.ok) setError(result.message || t('chat.notFound'))
      })
    })
    socket.on('order:message', (message: DriverOrderMessage) => {
      if (message.orderId === orderId) appendMessages([message])
    })
    socket.connect()

    return () => {
      active = false
      socket.disconnect()
    }
  }, [language, orderId, token])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages])

  async function send() {
    const text = body.trim()
    if (!text || isSending) return
    setIsSending(true)
    try {
      const result = await sendDriverOrderMessage(token, orderId, text)
      setMessages((current) => mergeMessages(current, [result.message]))
      setBody('')
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('chat.sendError'))
    } finally { setIsSending(false) }
  }

  return (
    <section className={`${withinWorkspace ? 'fixed inset-x-0 bottom-0 top-[4.25rem] lg:absolute' : 'fixed inset-0'} z-[1200] flex min-h-0 flex-col bg-background`} aria-label={t('chat.customerTitle')}>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/25 p-4 sm:px-6">
        {error ? <p className="rounded-voro-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        {messages.length === 0 && !error ? <p className="py-10 text-center text-sm text-muted-foreground">{t('chat.empty')}</p> : null}
        {messages.map((message) => {
          const own = message.senderRole === 'courier'
          return <div className={`flex ${own ? 'justify-end' : 'justify-start'}`} key={message.id}><article className={`w-fit min-w-32 max-w-[84%] rounded-voro-lg px-3 py-2 text-sm sm:max-w-xl ${own ? 'bg-action text-action-text' : 'border border-line bg-card text-content shadow-voro-sm'}`}><p className={`mb-1 text-[0.65rem] font-bold ${own ? 'text-white/70' : 'text-muted-foreground'}`}>{own ? t('common.you') : message.senderName}</p><p className="whitespace-pre-wrap break-words">{message.body}</p><p className={`mt-1 text-[0.65rem] ${own ? 'text-white/70' : 'text-muted-foreground'}`}>{new Date(message.createdAt).toLocaleTimeString(language === 'sr' ? 'sr-RS' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p></article></div>
        })}
        <div ref={endRef} />
      </div>
      <form className="flex shrink-0 gap-2 border-t border-line bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6" onSubmit={(event) => { event.preventDefault(); void send() }}><input className="min-w-0 flex-1 rounded-voro-md border border-line bg-background px-3 text-sm outline-none ring-action/30 focus:ring-2" maxLength={1000} onChange={(event) => setBody(event.target.value)} placeholder={t('chat.messageCustomer')} value={body} /><button aria-label={t('chat.send')} className="grid size-10 place-items-center rounded-voro-md bg-action text-action-text disabled:opacity-50" disabled={!body.trim() || isSending} type="submit"><Send className="size-4" /></button></form>
    </section>
  )
}
