import type { Metadata } from 'next'

import { ProsePage } from '@/components/sections/ProsePage'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What AllDown collects, what it does not, and how long anything is kept.',
  alternates: { canonical: '/privacy' },
}

export const dynamic = 'force-static'

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy Policy" path="/privacy" updated="27 July 2026">
      <p>
        This policy describes what AllDown collects and what it does not. It is short because the
        service is built to need very little.
      </p>

      <h2>What we do not collect</h2>
      <ul>
        <li>No account, so no name, email address or password.</li>
        <li>
          No record of the links you paste. URLs are used to fulfil the request and are not written
          to our application logs.
        </li>
        <li>No copies of the files you download.</li>
        <li>No advertising or cross-site tracking identifiers.</li>
      </ul>

      <h2>What is processed</h2>
      <p>
        <strong>Your IP address.</strong> Used to apply rate limits — twenty metadata requests and
        ten downloads per minute — so one visitor cannot exhaust the service for everyone. It is held
        in memory for the length of the rate-limit window and not stored afterwards.
      </p>
      <p>
        <strong>Extraction results.</strong> The title, thumbnail URL and format list for a video are
        cached in memory for five minutes so that a link shared with several people is only extracted
        once. The cache is keyed by URL, holds no information about who requested it, and is lost on
        restart.
      </p>
      <p>
        <strong>Temporary files.</strong> Some downloads — MP3 conversions, and video that needs its
        picture and sound merged — are written to a temporary file on our server, streamed to you,
        and deleted immediately afterwards.
      </p>
      <p>
        <strong>Standard server logs.</strong> Our hosting providers record request timestamps, paths
        and status codes as part of running the infrastructure. These do not contain the URLs you
        submit, which travel in the request body rather than the path.
      </p>

      <h2>Cookies</h2>
      <p>
        AllDown sets no cookies and uses no local storage. Nothing about your visit persists in your
        browser between sessions.
      </p>

      <h2>Third parties</h2>
      <p>
        When you download, your browser connects to our server, and our server connects to the
        platform that hosts the video. That platform will see our server’s request, not yours. We do
        not sell, share or transfer data to anyone else, because we do not hold data that could be
        transferred.
      </p>

      <h2>Children</h2>
      <p>
        The service is not directed at children under 13 and we do not knowingly collect information
        from them.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the date at the top of this page changes with it. Material changes
        will be noted on the homepage.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can go to the address on the <a href="/contact">contact page</a>.
      </p>
    </ProsePage>
  )
}
