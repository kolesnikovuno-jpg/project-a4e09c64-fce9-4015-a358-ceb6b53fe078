import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface PaymentRequestProps {
  language?: string
}

type Lang = 'ru' | 'uk' | 'en'

const COPY: Record<Lang, { preview: string; heading: string; greeting: string; body: string; cta: string; after: string; signoff: string; name: string }> = {
  ru: {
    preview: 'Подтверждение принятия запроса и оплата',
    heading: 'Подтверждение принятия запроса и оплата',
    greeting: 'Здравствуйте.',
    body: 'Ваш запрос рассмотрен и принят в работу.\n\nДля продолжения, пожалуйста, выполните оплату по ссылке:',
    cta: 'Оплатить через Monobank',
    after: 'После поступления оплаты работа будет переведена в производственный этап.',
    signoff: 'С уважением,',
    name: 'Ростислав Колесников',
  },
  uk: {
    preview: 'Підтвердження прийняття запиту та оплата',
    heading: 'Підтвердження прийняття запиту та оплата',
    greeting: 'Доброго дня.',
    body: 'Ваш запит розглянуто та прийнято в роботу.\n\nДля продовження, будь ласка, виконайте оплату за посиланням:',
    cta: 'Оплатити через Monobank',
    after: 'Після надходження оплати робота буде переведена у виробничий етап.',
    signoff: 'З повагою,',
    name: 'Ростислав Колесников',
  },
  en: {
    preview: 'Request accepted and payment',
    heading: 'Request accepted and payment',
    greeting: 'Hello.',
    body: 'Your request has been reviewed and accepted.\n\nTo continue, please complete payment using the link below:',
    cta: 'Pay via Monobank',
    after: 'After payment is received, work will move into the production stage.',
    signoff: 'Best regards,',
    name: 'Rostyslav Kolesnikov',
  },
}

const pickLang = (language?: string): Lang => {
  const l = (language || '').toLowerCase()
  if (l === 'ru' || l === 'uk' || l === 'en') return l
  return 'en'
}

const MONOBANK_URL = 'https://send.monobank.ua/jar/3n87AKuU87'

const PaymentRequestEmail = ({ language }: PaymentRequestProps) => {
  const lang = pickLang(language)
  const c = COPY[lang]
  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{c.heading}</Heading>
          <Text style={text}>{c.greeting}</Text>
          <Text style={{ ...text, whiteSpace: 'pre-line' }}>{c.body}</Text>
          <Text style={text}>
            <Link href={MONOBANK_URL} style={link}>
              {c.cta}
            </Link>
          </Text>
          <Text style={text}>{c.after}</Text>
          <Text style={text}>
            {c.signoff}
            <br />
            {c.name}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PaymentRequestEmail,
  subject: (data: Record<string, any>) => COPY[pickLang(data?.language)].preview,
  displayName: 'Payment request',
  previewData: {
    language: 'ru',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', Menlo, ui-monospace, monospace",
  color: '#3A3A3A',
}
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '20px', fontWeight: 400, color: '#1A1A1A', margin: '0 0 18px', letterSpacing: '0.02em' }
const text = { fontSize: '14px', color: '#1F1F1F', margin: '0 0 14px', lineHeight: '1.6' }
const link = {
  color: '#1A1A1A',
  fontSize: '14px',
  textDecoration: 'underline',
}
