import type { Metadata } from 'next'

import { ProsePage } from '@/components/sections/ProsePage'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'How to reach AllDown about a bug, a broken platform or a legal notice.',
  alternates: { canonical: '/contact' },
}

export const dynamic = 'force-static'

export default function ContactPage() {
  return (
    <ProsePage title="Get in touch" label="Contact" path="/contact">
      <p>
        There is no support queue and no ticket system. One address handles everything, and it is
        read by a person.
      </p>

      <h2>Email</h2>
      <p>
        <a href="mailto:hello@alldown.app">hello@alldown.app</a>
      </p>

      <h2>Reporting a broken platform</h2>
      <p>
        Extraction breaks when a platform changes how it serves media, which happens regularly. If a
        link that used to work has stopped, that is worth reporting. Include:
      </p>
      <ul>
        <li>The exact link you pasted</li>
        <li>The error message and the code shown beneath it</li>
        <li>Roughly when it last worked, if you know</li>
      </ul>
      <p>
        The error code is the useful part — it tells us whether the platform refused us, whether the
        content is gone, or whether something failed on our side.
      </p>

      <h2>Legal notices</h2>
      <p>
        Copyright complaints should follow the process on the <a href="/dmca">DMCA page</a>. Notices
        sent without the required elements cannot be acted on.
      </p>

      <h2>What we cannot help with</h2>
      <ul>
        <li>Recovering content that a platform has deleted. Once it is gone at the source, it is gone.</li>
        <li>Accessing private accounts or restricted posts. That is a deliberate limit, not a bug.</li>
        <li>
          Bulk or automated access. The published rate limits apply to everyone and are not raised on
          request.
        </li>
      </ul>
    </ProsePage>
  )
}
