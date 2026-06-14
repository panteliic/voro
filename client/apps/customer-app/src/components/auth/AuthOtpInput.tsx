import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@voro/ui/components/ui/input-otp'

type AuthOtpInputProps = {
  disabled?: boolean
  value: string
  onChange: (value: string) => void
}

export function AuthOtpInput({ disabled, onChange, value }: AuthOtpInputProps) {
  return (
    <InputOTP
      autoComplete="one-time-code"
      disabled={disabled}
      id="verification-code"
      inputMode="numeric"
      maxLength={6}
      onChange={(nextValue) => onChange(nextValue.replace(/\D/g, ''))}
      value={value}
      className="w-full"
    >
      <InputOTPGroup className="w-1/2">
        <InputOTPSlot index={0} className="w-1/3" />
        <InputOTPSlot index={1} className="w-1/3" />
        <InputOTPSlot index={2} className="w-1/3" />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup className="w-1/2">
        <InputOTPSlot index={3} className="w-1/3" />
        <InputOTPSlot index={4} className="w-1/3" />
        <InputOTPSlot index={5} className="w-1/3" />
      </InputOTPGroup>
    </InputOTP>
  )
}
