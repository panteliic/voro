import { Button } from '@voro/ui'
import googleIcon from '../../../../../packages/ui/src/assets/google.svg'
import { useI18n } from '../../i18n/i18n'

// Google remains part of the normal login screen. The flag is only an escape
// hatch for an operator who explicitly needs to turn it off.
export const googleAuthEnabled = import.meta.env.VITE_AUTH0_GOOGLE_ENABLED !== 'false'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

type SocialButtonsProps = {
  action?: 'signin' | 'signup'
}

export function SocialButtons({ action = 'signin' }: SocialButtonsProps) {
  const { t } = useI18n()

  function handleGoogleLogin() {
    window.location.assign(`${API_URL}/auth/auth0/google`)
  }

  if (!googleAuthEnabled) return null

  return (
    <div className="grid gap-3">
      <Button
        variant="outline"
        size="lg"
        className="w-full cursor-pointer justify-start gap-3 border-line/80 bg-card px-3 text-content transition-all duration-200 hover:-translate-y-0.5 hover:border-action/45 hover:bg-accent"
        onClick={handleGoogleLogin}
        type="button"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-voro-md bg-accent ring-1 ring-action/15">
          <img
            src={googleIcon}
            alt=""
            aria-hidden="true"
            className="size-4 opacity-90 dark:invert"
          />
        </span>
        <span className="flex-1 text-left text-sm font-bold">
          {t(action === 'signin' ? 'auth.social.signInWith' : 'auth.social.signUpWith', {
            provider: 'Google',
          })}
        </span>
      </Button>
    </div>
  )
}
