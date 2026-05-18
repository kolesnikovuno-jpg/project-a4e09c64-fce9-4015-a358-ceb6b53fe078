/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as participationRequest } from './participation-request.tsx'
import { template as caseDelivery } from './case-delivery.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'participation-request': participationRequest,
  'case-delivery': caseDelivery,
}