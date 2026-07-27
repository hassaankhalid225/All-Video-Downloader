import type { Metadata } from 'next'

import { ProsePage } from '@/components/sections/ProsePage'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms you accept by using AllDown.',
  alternates: { canonical: '/terms' },
}

export const dynamic = 'force-static'

export default function TermsPage() {
  return (
    <ProsePage title="Terms of Service" path="/terms" updated="27 July 2026">
      <p>By using AllDown you accept these terms. If you do not, please do not use the service.</p>

      <h2>What the service is</h2>
      <p>
        AllDown retrieves publicly accessible media from third-party platforms at your request and
        delivers it to your browser. It is provided free of charge, as is, with no guarantee of
        availability, accuracy or fitness for any particular purpose.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>
          You are responsible for what you download and what you do with it. Copyright, platform
          terms and local law all continue to apply.
        </li>
        <li>
          Only download content you own, content you have permission to use, or content whose licence
          permits what you intend to do with it.
        </li>
        <li>
          Do not use the service to circumvent access controls, download private content, or process
          material that is illegal in your jurisdiction.
        </li>
        <li>
          Do not automate requests beyond the published rate limits, or attempt to disrupt the
          service for others.
        </li>
      </ul>

      <h2>What we do not permit</h2>
      <p>
        Reselling access to AllDown, wrapping it in another service, or scraping it at volume is not
        permitted. The rate limits are enforced technically; exceeding them repeatedly may result in
        your address being blocked.
      </p>

      <h2>Availability</h2>
      <p>
        The service depends on third-party platforms that change without notice. Extraction for any
        given platform may break at any time, and we make no commitment to uptime, to supporting any
        particular platform, or to continuing the service at all.
      </p>

      <h2>Liability</h2>
      <p>
        To the fullest extent permitted by law, AllDown is not liable for any damages arising from
        use of the service, including loss of data, loss of profit, or any claim brought by a
        rights holder in connection with content you downloaded.
      </p>

      <h2>Copyright</h2>
      <p>
        AllDown hosts no content. If you believe material has been accessed through this service in a
        way that infringes your rights, see the <a href="/dmca">DMCA page</a>.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may change. Continued use after a change constitutes acceptance of the revised
        terms.
      </p>
    </ProsePage>
  )
}
