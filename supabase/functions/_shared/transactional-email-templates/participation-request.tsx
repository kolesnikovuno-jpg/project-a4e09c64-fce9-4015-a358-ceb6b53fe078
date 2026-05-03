import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ParticipationRequestProps {
  name?: string
  email?: string
  message?: string
  model?: string
  locale?: string
}

const ParticipationRequestEmail = ({
  name,
  email,
  message,
  model,
  locale,
}: ParticipationRequestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New participation request{model ? ` — ${model.toUpperCase()}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New participation request</Heading>
        {model ? (
          <Text style={meta}>Model: <strong>{model.toUpperCase()}</strong></Text>
        ) : null}
        {locale ? (
          <Text style={meta}>Locale: {locale}</Text>
        ) : null}
        <Hr style={hr} />
        <Text style={label}>Name</Text>
        <Text style={value}>{name || '—'}</Text>
        <Text style={label}>Email</Text>
        <Text style={value}>{email || '—'}</Text>
        {message ? (
          <>
            <Text style={label}>Message</Text>
            <Text style={value}>{message}</Text>
          </>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>kolesnikov.uno</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ParticipationRequestEmail,
  subject: (data: Record<string, any>) =>
    `New participation request${data?.model ? ` — ${String(data.model).toUpperCase()}` : ''}`,
  to: 'kolesnikov.uno@gmail.com',
  displayName: 'Participation request',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    message: 'Interested in joining the project.',
    model: 'lyra',
    locale: 'en',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'JetBrains Mono', 'IBM Plex Mono', Menlo, ui-monospace, monospace",
  color: '#3A3A3A',
}
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '20px', fontWeight: 400, color: '#1A1A1A', margin: '0 0 18px', letterSpacing: '0.02em' }
const meta = { fontSize: '12px', color: '#6A6A6A', margin: '4px 0' }
const label = { fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: '#8A8A8A', margin: '14px 0 4px' }
const value = { fontSize: '13px', color: '#1F1F1F', margin: '0 0 6px', lineHeight: '1.6', whiteSpace: 'pre-line' as const }
const hr = { borderColor: 'rgba(0,0,0,0.12)', borderStyle: 'dashed', margin: '18px 0' }
const footer = { fontSize: '11px', color: '#9A9A9A', margin: '24px 0 0' }
