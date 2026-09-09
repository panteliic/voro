import { useState } from 'react'
import { Button } from '@voro/ui'
import { Check, Copy, KeyRound, MailCheck, MailWarning } from 'lucide-react'
import { useI18n } from '../../i18n/i18n'
import type { SetupResult } from '../../types/admin'

type SetupInviteCardProps = {
  invite: SetupResult
}

export function SetupInviteCard({ invite }: SetupInviteCardProps) {
  const { t } = useI18n()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const recipientName = invite.driverName || invite.restaurantName || ''
  const recipientEmail = invite.driverEmail || invite.operatorEmail || ''

  async function copy(value: string, field: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(field)
      window.setTimeout(() => setCopied((current) => current === field ? null : current), 1_800)
    } catch {
      setCopied(null)
    }
  }

  return (
    <section className="grid gap-4 rounded-voro-lg border border-action bg-accent/60 p-4 sm:p-5">
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-voro-md bg-card text-action">
          {invite.inviteEmailSent ? <MailCheck className="size-5" /> : <MailWarning className="size-5" />}
        </span>
        <div className="min-w-0">
          <h2 className="font-bold">{t('invite.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {invite.inviteEmailSent
              ? t('invite.sent', { email: recipientEmail })
              : t('invite.manual', { email: recipientEmail })}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-voro-md border border-line bg-card p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('invite.accessLink')}</p>
          <p className="mt-1 truncate text-sm font-medium" title={invite.setupUrl}>{invite.setupUrl}</p>
          <Button className="mt-3 w-full" disabled={!invite.setupUrl} onClick={() => void copy(invite.setupUrl || '', 'link')} size="sm" type="button" variant="outline">
            {copied === 'link' ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied === 'link' ? t('invite.copied') : t('invite.copyLink')}
          </Button>
        </div>
        <div className="rounded-voro-md border border-line bg-card p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('invite.oneTimeCode')}</p>
          <p className="mt-1 font-mono text-xl font-bold tracking-[0.24em] text-action">{invite.setupCode}</p>
          <Button className="mt-3 w-full" onClick={() => void copy(invite.setupCode, 'code')} size="sm" type="button" variant="outline">
            {copied === 'code' ? <Check className="size-4" /> : <KeyRound className="size-4" />}
            {copied === 'code' ? t('invite.copied') : t('invite.copyCode')}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('invite.instructions', { name: recipientName || recipientEmail })}
      </p>
    </section>
  )
}
