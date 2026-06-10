import { Button } from '@voro/ui'

export function SocialButtons() {
  return (
    <div className="grid gap-2">
      <Button variant="outline" className="w-full cursor-pointer gap-2 text-content">
        Sign in with Google
      </Button>
      <Button variant="outline" className="w-full cursor-pointer gap-2 text-content">
        Sign in with Facebook
      </Button>
    </div>
  )
}
