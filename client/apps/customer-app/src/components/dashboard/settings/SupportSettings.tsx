import { useState } from 'react'
import { Button, Input, Textarea } from '@voro/ui'
import { CircleHelp } from 'lucide-react'
import { useI18n } from '../../../i18n/i18n'
import { customerApi } from '../../../services/customerApi'
import { SettingsSectionLayout } from './SettingsSectionLayout'

export function SupportSettings() {
  const { t } = useI18n()
  const [category, setCategory] = useState<'order' | 'payment' | 'account' | 'other'>('order')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const [isSending, setIsSending] = useState(false)

  async function submit() {
    setIsSending(true)
    setStatus('')
    try {
      await customerApi.createSupportTicket({ category, subject, body })
      setSubject('')
      setBody('')
      setStatus(t('support.sent'))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('support.error'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <SettingsSectionLayout description={t('support.description')} icon={CircleHelp} title={t('settings.support.label')}>
      <div className="grid gap-4 rounded-voro-lg border border-line bg-background p-4">
        <label className="grid gap-2 text-sm font-bold text-content">
          {t('support.category')}
          <select className="h-10 rounded-voro-md border border-line bg-card px-3 text-sm" onChange={(event) => setCategory(event.target.value as typeof category)} value={category}>
            <option value="order">{t('support.order')}</option>
            <option value="payment">{t('support.payment')}</option>
            <option value="account">{t('support.account')}</option>
            <option value="other">{t('support.other')}</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-content">
          {t('support.subject')}
          <Input maxLength={160} onChange={(event) => setSubject(event.target.value)} value={subject} />
        </label>
        <label className="grid gap-2 text-sm font-bold text-content">
          {t('support.message')}
          <Textarea className="min-h-32" maxLength={2_000} onChange={(event) => setBody(event.target.value)} value={body} />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{status}</p>
          <Button disabled={isSending || !subject.trim() || body.trim().length < 10} onClick={() => void submit()} type="button">
            {isSending ? t('support.sending') : t('support.send')}
          </Button>
        </div>
      </div>
    </SettingsSectionLayout>
  )
}
