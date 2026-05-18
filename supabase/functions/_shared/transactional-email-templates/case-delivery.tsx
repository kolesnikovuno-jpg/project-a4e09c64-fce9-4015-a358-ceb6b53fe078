import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface CaseDeliveryProps {
  pdf_url?: string
  language?: string
}

type Lang = 'ru' | 'uk' | 'en'

const COPY: Record<Lang, { preview: string; heading: string; greeting: string; body: string; download: string; thanks: string; signoff: string; name: string }> = {
  ru: {
    preview: 'Ваш результат готов',
    heading: 'Ваш результат готов',
    greeting: 'Здравствуйте.',
    body: 'Ваш результат подготовлен.',
    download: 'Скачать PDF',
    thanks: 'Благодарю за обращение.',
    signoff: 'С уважением,',
    name: 'Ростислав Колесников',
  },
  uk: {
    preview: 'Ваш результат готовий',
    heading: 'Ваш результат готовий',
    greeting: 'Доброго дня.',
    body: 'Ваш результат підготовлено.',
    download: 'Завантажити PDF',
    thanks: 'Дякую за звернення.',
    signoff: 'З повагою,',
    name: 'Ростислав Колесников',
  },
  en: {
    preview: 'Your result is ready',
    heading: 'Your result is ready',
    greeting: 'Hello.',
    body: 'Your result has been prepared.',
    download: 'Download PDF',
    thanks: 'Thank you for your request.',
    signoff: 'Best regards,',
    name: 'Rostyslav Kolesnikov',
  },
}

const pickLang = (language?: string): Lang => {
  const l = (language || '').toLowerCase()
  if (l === 'ru' || l === 'uk' || l === 'en') return l
  return 'en'
}

const CaseDeliveryEmail = ({ pdf_url, language }: CaseDeliveryProps) => {
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
          <Text style={text}>{c.body}</Text>
          {pdf_url ? (
            <Text style={text}>
              {c.download}:{' '}
              <Link href={pdf_url} style={link}>{pdf_url}</Link>
            </Text>
          ) : null}
          <Text style={text}>{c.thanks}</Text>
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
  component: CaseDeliveryEmail,
  subject: (data: Record<string, any>) => COPY[pickLang(data?.language)].preview,
  displayName: 'Case delivery',
  previewData: {
    language: 'ru',
    pdf_url: 'https://example.com/case.pdf',
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
const link = { color: '#1A1A1A', textDecoration: 'underline' }
