import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface CaseDeliveryProps {
  pdf_url?: string
  language?: string
}

type Lang = 'ru' | 'uk' | 'en'

const COPY: Record<Lang, { preview: string; heading: string; greeting: string; body: string; download: string; thanks: string; boundary: string; signoff: string; name: string }> = {
  ru: {
    preview: 'Ваш результат готов',
    heading: 'Ваш результат готов',
    greeting: 'Здравствуйте.',
    body: 'Ваш результат подготовлен.',
    download: 'Скачать результат PDF',
    thanks: 'Благодарю за обращение.',
    boundary: 'Если потребуется уточнение в рамках исходного запроса, вы можете просто ответить на это письмо.\n\nЕсли потребуется новая постановка задачи или расширение объёма работы, это оформляется как новый кейс.',
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
    boundary: 'Якщо знадобиться уточнення в межах початкового запиту, ви можете просто відповісти на цей лист.\n\nЯкщо буде потрібне нове формулювання задачі або розширення обсягу роботи, це оформлюється як новий кейс.',
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
    boundary: 'If clarification is needed within the scope of the original request, you can simply reply to this email.\n\nIf a new task definition or expanded scope is required, it will be handled as a new case.',
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
              <Link href={pdf_url} style={link}>
                {c.download}
              </Link>
            </Text>
          ) : null}
          <Text style={text}>{c.thanks}</Text>
          <Text style={{ ...text, marginTop: '18px' }}>{c.boundary.split('\n\n')[0]}</Text>
          <Text style={text}>{c.boundary.split('\n\n')[1]}</Text>
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
const link = {
  color: '#1A1A1A',
  fontSize: '14px',
  textDecoration: 'underline',
}
