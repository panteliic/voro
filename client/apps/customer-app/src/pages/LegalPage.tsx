import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

type LegalDocument = {
  title: string
  intro: string
  sections: Array<{ heading: string; body: string }>
}

const documents: Record<string, LegalDocument> = {
  privacy: {
    title: 'Privacy notice',
    intro: 'This draft explains how Voro uses account, delivery, payment-reference and support information to provide food delivery services.',
    sections: [
      { heading: 'Data we use', body: 'We use account details, delivery addresses, order history and support messages to complete orders, provide support and keep the service secure.' },
      { heading: 'Who receives it', body: 'A restaurant receives the order details required to prepare it. The assigned courier receives the delivery details required to complete the delivery.' },
      { heading: 'Your controls', body: 'From Security settings you can download a copy of your data or deactivate your customer account. Contact support for unresolved privacy requests.' },
    ],
  },
  terms: {
    title: 'Terms of use',
    intro: 'This draft sets out the basic rules for using the Voro customer application.',
    sections: [
      { heading: 'Orders', body: 'Orders are requests to the selected restaurant. Availability, preparation and delivery times can change based on restaurant and courier capacity.' },
      { heading: 'Account security', body: 'Keep your sign-in credentials private and provide accurate delivery details. Do not use the service for unlawful, abusive or fraudulent activity.' },
      { heading: 'Support', body: 'Use the in-app Support area for order, account or payment questions. We will investigate reported issues using the order record.' },
    ],
  },
  refunds: {
    title: 'Cancellations and refunds',
    intro: 'This draft describes the cancellation and issue-reporting flow available in Voro.',
    sections: [
      { heading: 'Cancellation', body: 'A customer can cancel a pending order before the restaurant accepts it. Once preparation begins, use Support to report an issue.' },
      { heading: 'Issues and review', body: 'After an order, customers can report missing items, quality, delivery or courier issues. Include clear details so the team can investigate.' },
      { heading: 'Refund decisions', body: 'Refunds and credits must be reviewed against the order record and applicable local consumer rules. Publish your final business policy before launch.' },
    ],
  },
}

export default function LegalPage() {
  const { document = 'privacy' } = useParams()
  const content = documents[document] || documents.privacy

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-content sm:px-8 sm:py-12">
      <article className="mx-auto max-w-3xl rounded-voro-xl border border-line bg-card p-5 sm:p-8">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-action hover:underline" to="/login">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.14em] text-action">Voro legal draft</p>
        <h1 className="mt-2 text-3xl font-bold">{content.title}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{content.intro}</p>
        <p className="mt-4 rounded-voro-md bg-accent px-3 py-2 text-sm text-muted-foreground">Review this draft with legal counsel and replace the business contact, company and policy details before public launch.</p>
        <div className="mt-8 grid gap-6">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-bold">{section.heading}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}
