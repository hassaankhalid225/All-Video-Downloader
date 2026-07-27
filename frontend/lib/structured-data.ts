import { FAQS, PLATFORMS, SITE, STEPS } from './constants'
import type { AccordionItem } from '@/components/ui/Accordion'

/**
 * JSON-LD builders.
 *
 * Every schema is derived from the same constants the page renders, so the markup Google
 * indexes cannot drift from what a visitor actually sees — which is both the point of
 * structured data and the thing that gets sites penalised when it is hand-maintained.
 */

export function webApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: PLATFORMS.map((platform) => `${platform.name} video downloader`),
  }
}

export function faqSchema(items: readonly AccordionItem[] = FAQS) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
}

export function howToSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to download a social media video',
    description: 'Paste a link, choose a quality, save the file.',
    totalTime: 'PT10S',
    tool: [{ '@type': 'HowToTool', name: 'A web browser' }],
    step: STEPS.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.body,
      url: `${SITE.url}/#how-it-works`,
    })),
  }
}

export function breadcrumbSchema(trail: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE.url}${crumb.path}`,
    })),
  }
}
