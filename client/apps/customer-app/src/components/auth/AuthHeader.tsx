type AuthHeaderProps = {
  title: string
  description: string
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className="mb-8 text-center md:text-left">
      <img src="/logo.svg" alt="Voro" className="mx-auto size-16 md:mx-0" />
      <h2 className="mt-6 text-2xl font-bold tracking-normal text-content">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
