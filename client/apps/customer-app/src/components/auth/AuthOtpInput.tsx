import { InputOTP, InputOTPGroup, InputOTPSlot } from '@voro/ui/components/ui/input-otp'

type AuthOtpInputProps = {
  disabled?: boolean
  value: string
  onChange: (value: string) => void
}

export function AuthOtpInput({ disabled, onChange, value }: AuthOtpInputProps) {
  return (
    <InputOTP
      disabled={disabled}
      maxLength={6}
      onChange={(nextValue) => onChange(nextValue.replace(/\D/g, ''))}
      value={value}
    >
      <InputOTPGroup className="w-full justify-between">
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  )
}
