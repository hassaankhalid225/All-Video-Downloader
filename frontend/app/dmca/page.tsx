import type { Metadata } from 'next'

import { ProsePage } from '@/components/sections/ProsePage'

export const metadata: Metadata = {
  title: 'DMCA & Copyright',
  description: 'How AllDown handles copyright complaints, and why takedowns belong with the platform.',
  alternates: { canonical: '/dmca' },
}

export const dynamic = 'force-static'

export default function DmcaPage() {
  return (
    <ProsePage title="DMCA & Copyright" path="/dmca" updated="27 July 2026">
      <p>
        AllDown respects copyright. Before filing a notice, it helps to understand what this service
        does and does not hold.
      </p>

      <h2>We host nothing</h2>
      <p>
        AllDown stores no videos. When someone pastes a link, our server fetches the media from the
        platform that hosts it and streams it through to that person’s browser. Nothing is retained
        afterwards, and there is no library, index or archive of past downloads to remove content
        from.
      </p>
      <p>
        This matters for a takedown request: because we hold no copy, there is no copy here for us to
        take down. The effective remedy is to have the content removed at the source, after which it
        immediately becomes unreachable through this service too.
      </p>

      <h2>Removing content at the source</h2>
      <p>
        Every major platform operates its own copyright process, and a successful claim there removes
        the content everywhere at once:
      </p>
      <ul>
        <li>YouTube — the Copyright Removal Request form in YouTube Studio</li>
        <li>TikTok — the Intellectual Property Report form in the Help Center</li>
        <li>Instagram and Facebook — the Meta Intellectual Property reporting flow</li>
        <li>X — the copyright report form in the Help Center</li>
      </ul>

      <h2>If you still want to file with us</h2>
      <p>
        We will act on valid notices concerning anything within our control — for example, removing a
        platform from the supported list. Send a notice through the{' '}
        <a href="/contact">contact page</a> including:
      </p>
      <ul>
        <li>Your contact details and, where you are acting for someone else, your authority to do so</li>
        <li>Identification of the copyrighted work</li>
        <li>The specific URL of the material at issue</li>
        <li>
          A statement that you believe in good faith the use is not authorised by the rights holder or
          the law
        </li>
        <li>A statement, under penalty of perjury, that the information in the notice is accurate</li>
        <li>Your physical or electronic signature</li>
      </ul>

      <h2>Counter-notices</h2>
      <p>
        If you believe a notice was filed in error, you may submit a counter-notice through the same
        channel with an explanation and your contact details.
      </p>

      <h2>Repeat infringement</h2>
      <p>
        The service has no accounts to terminate. Where a pattern of infringing use can be
        identified, we will block the addresses involved.
      </p>
    </ProsePage>
  )
}
