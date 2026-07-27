import type { Metadata } from 'next'

import { ProsePage } from '@/components/sections/ProsePage'

export const metadata: Metadata = {
  title: 'About',
  description: 'What AllDown is, how it works, and what it deliberately does not do.',
  alternates: { canonical: '/about' },
}

export const dynamic = 'force-static'

export default function AboutPage() {
  return (
    <ProsePage title="What this is" label="About" path="/about">
      <p>
        AllDown turns a social media link into a file you can keep. Paste a URL, pick a quality,
        save it. That is the whole product.
      </p>

      <h2>How it works</h2>
      <p>
        When you paste a link, our server asks the platform for the list of media files behind that
        post. That list usually contains thirty to eighty entries — different resolutions, codecs and
        stream types, most of which are not directly usable. We reduce it to a handful of real
        choices, show each one with its approximate size, and hand you the bytes when you pick one.
      </p>
      <p>
        Extraction is handled by <a href="https://github.com/yt-dlp/yt-dlp">yt-dlp</a>, an open
        source project that tracks how a thousand-plus sites serve their media. Platforms change
        their delivery constantly; keeping up with that is a full-time effort, and yt-dlp does it
        better than any in-house scraper could.
      </p>

      <h2>What it does not do</h2>
      <ul>
        <li>
          It does not hold accounts or ask for yours. Anything requiring a logged-in session —
          private profiles, members-only videos, protected posts — is out of reach by design.
        </li>
        <li>
          It does not keep your files. Downloads stream straight through. Anything that has to be
          converted on our side is written to a temporary file, sent, and deleted.
        </li>
        <li>
          It does not log the links you paste. The URL is the most sensitive thing you give us, so
          it is not written to our application logs.
        </li>
        <li>
          It does not remove watermarks by cropping or blurring. On TikTok it requests the clean
          source file the platform already stores; on platforms with no such file, the watermark
          stays.
        </li>
      </ul>

      <h2>Cost</h2>
      <p>
        The tool is free and there is no paid tier planned. There is no account to create, no trial
        that expires, and no cap on how many videos you download.
      </p>

      <h2>Responsibility</h2>
      <p>
        AllDown is a tool. What you download and what you do with it is your decision and your
        responsibility. Saving your own uploads, or content licensed for reuse, is generally fine.
        Republishing someone else’s work without permission is not, and no tool changes that.
      </p>
    </ProsePage>
  )
}
