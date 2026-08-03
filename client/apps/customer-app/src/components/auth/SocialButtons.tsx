import { Button } from '@voro/ui'
import googleIcon from '../../../../../packages/ui/src/assets/google.svg'
import facebookIcon from '../../../../../packages/ui/src/assets/facebook.svg'
import { useI18n } from '../../i18n/i18n'

const providers = [
  {
    id: 'google',
    name: 'Google',
    icon: googleIcon,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: facebookIcon,
  },
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

type SocialButtonsProps = {
  action?: 'signin' | 'signup'
}

export function SocialButtons({ action = 'signin' }: SocialButtonsProps) {
  const { t } = useI18n()

  function handleSocialLogin(providerId: string) {
    window.location.assign(`${API_URL}/auth/auth0/${providerId}`)
  }

  return (
    <div className="grid gap-3">
      {providers.map((provider) => (
        <Button
          key={provider.name}
          variant="outline"
          size="lg"
          className="w-full cursor-pointer justify-start gap-3 border-line/80 bg-card px-3 text-content transition-all duration-200 hover:-translate-y-0.5 hover:border-action/45 hover:bg-accent"
          onClick={() => handleSocialLogin(provider.id)}
          type="button"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-voro-md bg-accent ring-1 ring-action/15">
            <img
              src={provider.icon}
              alt=""
              aria-hidden="true"
              className="size-4 opacity-90 dark:invert"
            />
          </span>
          <span className="flex-1 text-left text-sm font-bold">
            {t(action === 'signin' ? 'auth.social.signInWith' : 'auth.social.signUpWith', {
              provider: provider.name,
            })}
          </span>
        </Button>
      ))}
    </div>
  )
}
