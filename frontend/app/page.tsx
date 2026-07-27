import { HeroSection } from '@/components/hero/HeroSection'
import { FAQ } from '@/components/sections/FAQ'
import { Features } from '@/components/sections/Features'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { SupportedPlatforms } from '@/components/sections/SupportedPlatforms'
import { JsonLd } from '@/components/ui/JsonLd'
import { faqSchema, howToSchema, webApplicationSchema } from '@/lib/structured-data'

/**
 * Static apart from one Client Component island (`DownloaderTool`, inside the hero).
 * Everything below the fold is server-rendered HTML with no hydration cost.
 */
export const dynamic = 'force-static'

export default function HomePage() {
  return (
    <>
      <JsonLd schemas={[webApplicationSchema(), faqSchema(), howToSchema()]} />

      <HeroSection
        titleLead="Download"
        titleAccent="anything."
        titleTail="From anywhere."
        subtitle="Paste a link from TikTok, Instagram, YouTube, X or eight more. Pick a quality. Save the file. No watermark, no account, no limit."
      />

      <HowItWorks />
      <SupportedPlatforms />
      <Features />
      <FAQ />
    </>
  )
}
