import { Button } from '@voro/ui'
import googleIcon from '../../../../../packages/ui/src/assets/google.svg'
import facebookIcon from '../../../../../packages/ui/src/assets/facebook.svg'

export function SocialButtons() {
  return (
    <div className="grid gap-2">
      <Button variant="outline" className="w-full cursor-pointer gap-2 text-content" type="button">
        <img src={googleIcon} alt="" aria-hidden="true" className="size-4" />
        Sign in with Google
      </Button>
      <Button variant="outline" className="w-full cursor-pointer gap-2 text-content" type="button">
        <img src={facebookIcon} alt="" aria-hidden="true" className="size-4" />
        Sign in with Facebook
      </Button>
    </div>
  )
}
