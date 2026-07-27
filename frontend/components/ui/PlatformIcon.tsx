import type { ComponentType } from 'react'
// Simple Icons dropped the LinkedIn mark over trademark policy, so that one comes from
// Font Awesome instead. Everything else stays in the `si` set for a consistent weight.
import { FaLinkedinIn } from 'react-icons/fa6'
import {
  SiDailymotion,
  SiFacebook,
  SiInstagram,
  SiPinterest,
  SiReddit,
  SiSnapchat,
  SiTiktok,
  SiTwitch,
  SiVimeo,
  SiX,
  SiYoutube,
} from 'react-icons/si'

import type { PlatformId } from '@/lib/types'

const ICONS: Record<PlatformId, ComponentType<{ className?: string }>> = {
  tiktok: SiTiktok,
  instagram: SiInstagram,
  youtube: SiYoutube,
  twitter: SiX,
  facebook: SiFacebook,
  pinterest: SiPinterest,
  reddit: SiReddit,
  snapchat: SiSnapchat,
  linkedin: FaLinkedinIn,
  vimeo: SiVimeo,
  dailymotion: SiDailymotion,
  twitch: SiTwitch,
}

export function PlatformIcon({
  id,
  className,
}: {
  id: PlatformId
  className?: string
}) {
  const Icon = ICONS[id]
  return <Icon className={className} />
}
