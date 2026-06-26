export type EmailTemplateRenderInput = {
  subject: string
  bodyHtml: string
  bodyText?: string | null
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function renderEmailTemplate(
  template: EmailTemplateRenderInput,
  variables: Record<string, string>
) {
  const render = (value?: string | null) => {
    if (!value) return value || ''
    return Object.entries(variables).reduce(
      (content, [key, replacement]) =>
        content.replace(new RegExp(`\\[${escapeRegExp(key)}\\]`, 'g'), replacement),
      value
    )
  }

  return {
    subject: render(template.subject),
    bodyHtml: render(template.bodyHtml),
    bodyText: render(template.bodyText)
  }
}
