import { PlatformPage, platformMetadata } from '@/components/sections/PlatformPage'

export const metadata = platformMetadata('youtube')
export const dynamic = 'force-static'

export default function Page() {
  return <PlatformPage id="youtube" />
}