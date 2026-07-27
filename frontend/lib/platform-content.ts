import type { PlatformId } from './types'

/**
 * Per-platform page content.
 *
 * The guides are written to be genuinely useful rather than keyword-stuffed: each one
 * answers the questions someone actually arrives with (where is the link, what quality
 * will I get, why did it fail). Search rewards that and so do readers.
 */

export interface GuideSection {
  heading: string
  body: string[]
}

export interface PlatformContent {
  metaTitle: string
  metaDescription: string
  /** Split so the middle word can take the gradient treatment. */
  titleLead: string
  titleAccent: string
  titleTail?: string
  subtitle: string
  /** Quick facts strip under the hero. */
  facts: Array<{ label: string; value: string }>
  guideTitle: string
  guide: GuideSection[]
  faqs: Array<{ q: string; a: string }>
}

export const PLATFORM_CONTENT: Record<string, PlatformContent> = {
  tiktok: {
    metaTitle: 'TikTok Video Downloader — No Watermark, Free, HD',
    metaDescription:
      'Download TikTok videos without the watermark in full HD. Paste a link, pick a quality, save the MP4. Free, no app, no account.',
    titleLead: 'TikTok videos,',
    titleAccent: 'no watermark',
    subtitle:
      'The clean source file, not the re-render with the logo baked in. Up to 1080p, plus MP3 if you only want the sound.',
    facts: [
      { label: 'Max quality', value: '1080p' },
      { label: 'Watermark', value: 'None' },
      { label: 'Audio', value: 'MP3 · M4A' },
    ],
    guideTitle: 'How to download TikTok videos without a watermark',
    guide: [
      {
        heading: 'Getting the link',
        body: [
          'Open the video in the TikTok app and tap the arrow on the right-hand side, then choose “Copy link”. On the web, the address bar already holds what you need — a URL shaped like tiktok.com/@username/video/7301234567890123456.',
          'Short links work too. If a friend shared something as vm.tiktok.com/ZMxxxxxxx or vt.tiktok.com/ZSxxxxxxx, paste it exactly as it is. Those addresses redirect to the full one, and the resolution happens on our side before extraction starts.',
        ],
      },
      {
        heading: 'Why the watermark matters',
        body: [
          'TikTok stores two versions of every upload. One is the original the creator submitted. The other is a re-encode with the moving TikTok logo and the creator’s username burned into the frame — that is the file the app’s own “Save video” button gives you.',
          'AllDown asks for the first one. The clean file is also the higher-quality of the two, because the watermarked version is re-encoded a second time to composite the overlay. So removing the watermark is not a separate processing step that degrades the picture; it is simply a matter of requesting the right file.',
          'There is no cropping, no blurring, and no AI inpainting involved. Anything advertising watermark “removal” through those techniques is working on the wrong file and will visibly damage the edges of the frame.',
        ],
      },
      {
        heading: 'Choosing a quality',
        body: [
          'Most TikToks are shot vertically at 1080×1920, which everyone — including TikTok — calls 1080p. That is the number AllDown shows, measured on the short side of the frame. Some older or heavily compressed uploads only exist at 720p or 540p, in which case those are the options you will see. Nothing is ever upscaled to make the list look better.',
          'Every option displays its approximate size before you commit, so a slow connection can knowingly take the 720p file. If you only want the audio — a sound to reuse, or a song you want to identify — the MP3 option strips the video entirely and comes in at a fraction of the size.',
        ],
      },
      {
        heading: 'When a link does not work',
        body: [
          'Private accounts cannot be downloaded. If the creator has restricted who can see their videos, the extraction fails and you will get a message saying so rather than a broken file.',
          'Photo carousels are not videos. TikTok’s slideshow posts contain still images with a soundtrack, and AllDown will tell you there is no video in the post instead of guessing.',
          'Occasionally a video that worked yesterday fails today. That usually means TikTok has changed something on their side; the extraction engine is updated regularly, and retrying after a while is often enough.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Does the downloaded file have the TikTok watermark?',
        a: 'No. TikTok keeps a clean copy of every upload alongside the watermarked one, and AllDown requests the clean copy. The logo and username are never composited into the file you receive.',
      },
      {
        q: 'What resolution will I get?',
        a: 'Whatever the creator uploaded, up to 1080p. Vertical videos are labelled by their short side, so a 1080×1920 clip is shown as 1080p. Nothing is upscaled.',
      },
      {
        q: 'Can I download a TikTok as an MP3?',
        a: 'Yes. Every video with sound offers an MP3 at 192 kbps. The video track is discarded, so the file is typically under two megabytes.',
      },
      {
        q: 'Do TikTok photo posts work?',
        a: 'Not yet. Slideshow posts contain images rather than a video track, and AllDown returns a clear message rather than an empty file.',
      },
      {
        q: 'Will the creator know I downloaded their video?',
        a: 'No. The download does not register as a view, a like or any other interaction, and nothing is sent to the creator’s account.',
      },
    ],
  },

  instagram: {
    metaTitle: 'Instagram Video Downloader — Reels, Posts & Stories',
    metaDescription:
      'Download Instagram Reels, feed videos and public Stories in full quality. Paste the link, pick a format, save the file. Free and no login.',
    titleLead: 'Save Instagram',
    titleAccent: 'Reels',
    titleTail: 'and posts.',
    subtitle:
      'Reels, feed videos and public Stories at the resolution they were uploaded. No login, no browser extension.',
    facts: [
      { label: 'Works with', value: 'Reels · Posts · Stories' },
      { label: 'Max quality', value: '1080p' },
      { label: 'Login', value: 'Not required' },
    ],
    guideTitle: 'How to download Instagram Reels and videos',
    guide: [
      {
        heading: 'Copying the right link',
        body: [
          'In the app, tap the three dots above or beside the post and choose “Copy link”. For a Reel, the share sheet has the same option. What you want looks like instagram.com/reel/CxxxxxxxxxX/ or instagram.com/p/CxxxxxxxxxX/.',
          'A profile link — instagram.com/username — is not enough. It points at an account, not at a specific post, and there is no single video to extract. AllDown will say as much rather than failing silently.',
        ],
      },
      {
        heading: 'What can and cannot be downloaded',
        body: [
          'Anything you can view while logged out can be downloaded: public Reels, public feed videos, IGTV uploads and public Stories that have not yet expired.',
          'Private accounts cannot. Instagram requires an authenticated session to serve that content, and AllDown does not hold accounts or ask you to hand over yours. If you paste a link to a private post, the result is a clear 403 rather than an attempt to work around the restriction.',
          'Carousel posts — the ones you swipe through — contain several items. AllDown extracts the first video in the carousel. If the video you want is the third slide, there is currently no way to select it.',
        ],
      },
      {
        heading: 'Quality and formats',
        body: [
          'Instagram serves video as separate picture and sound streams for most uploads. Combining them into a single playable MP4 happens on our server, which is why an Instagram download usually takes a few seconds longer to start than a TikTok one. The wait is the merge, not a queue.',
          'The tool lists every resolution Instagram has for the post, typically topping out at 1080p. Audio-only options are available for anything with a soundtrack, which is useful when you want the audio from a Reel without the video.',
        ],
      },
      {
        heading: 'Stories and their time limit',
        body: [
          'Stories disappear twenty-four hours after they are posted, and once they are gone they are gone from Instagram’s servers too — there is nothing left to extract. Download a Story while it is still live.',
          'Story links look like instagram.com/stories/username/1234567890123456789. You can get one from the desktop site by opening the Story and copying the address bar, or from the app’s share menu.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I download private Instagram videos?',
        a: 'No. Private content requires a logged-in session, and AllDown does not use accounts. If a post is not visible while logged out, it cannot be downloaded.',
      },
      {
        q: 'Do Instagram Stories work?',
        a: 'Public Stories work while they are live. After twenty-four hours Instagram removes them entirely, so there is nothing left to download.',
      },
      {
        q: 'Why does Instagram take longer than TikTok?',
        a: 'Instagram serves picture and sound as separate streams. They are merged into a single MP4 on our server before the transfer starts, which adds a few seconds.',
      },
      {
        q: 'Can I download a whole carousel?',
        a: 'Not as a set. AllDown extracts the first video from a carousel post; individual slide selection is not supported.',
      },
      {
        q: 'Does the account owner get notified?',
        a: 'No. Downloading does not create a view, a like or any other visible interaction.',
      },
    ],
  },

  youtube: {
    metaTitle: 'YouTube Video Downloader — MP4 up to 4K & MP3',
    metaDescription:
      'Download YouTube videos and Shorts as MP4 up to 4K, or pull the audio as MP3. Every resolution shown with its file size. Free, no signup.',
    titleLead: 'YouTube to',
    titleAccent: 'MP4 or MP3',
    subtitle:
      'Every resolution the upload actually has, with its file size shown before you choose. Shorts, music and long videos all work.',
    facts: [
      { label: 'Max quality', value: 'Up to 4K' },
      { label: 'Audio', value: 'MP3 192kbps · M4A' },
      { label: 'Works with', value: 'Videos · Shorts' },
    ],
    guideTitle: 'How to download YouTube videos and Shorts',
    guide: [
      {
        heading: 'Any YouTube link works',
        body: [
          'Paste the full watch URL, the youtu.be short link from the Share button, a Shorts address, or a music.youtube.com link. All four resolve to the same video. Playlist parameters are ignored — AllDown takes the single video you linked to, not the whole list.',
          'Timestamps and tracking parameters are stripped before extraction, so a link copied at 2:14 with a share identifier attached behaves identically to a clean one.',
        ],
      },
      {
        heading: 'Understanding the quality list',
        body: [
          'YouTube stores anything above 720p as separate video and audio streams — a design decision that lets it serve different resolutions without duplicating the soundtrack. To hand you a single playable file, those two streams have to be merged, which happens on our server. That is what the “merged on our server” note on some options means, and why they take a few extra seconds to start.',
          'The 1080p option is pre-selected rather than the highest available. On a ten-minute 4K video the difference is roughly 275 MB against 700 MB, and 1080p is what most people actually want on a phone or a laptop screen. The higher tiers are one click away if you want them.',
          'Options larger than the service’s transfer ceiling are not shown at all. Offering a file we would refuse to send only moves the failure to after you have picked it and waited.',
        ],
      },
      {
        heading: 'Audio-only downloads',
        body: [
          'The MP3 option extracts the soundtrack and encodes it at 192 kbps, which is transparent for speech and close to it for music. A ten-minute video comes out around 14 MB rather than several hundred.',
          'Where YouTube already has an AAC audio stream, an M4A option appears alongside. That one is a straight passthrough with no re-encoding, so it is both faster and technically higher fidelity than the MP3 — worth taking if your player handles M4A.',
        ],
      },
      {
        heading: 'What will not download',
        body: [
          'Age-restricted videos require a signed-in session to confirm the viewer’s age, and AllDown does not hold accounts. The same applies to members-only uploads and anything behind YouTube Premium.',
          'Private and unlisted-with-restrictions videos cannot be reached. Deleted videos, and videos removed on copyright grounds, return a clear “no longer exists” message.',
          'Live streams can only be downloaded once the broadcast has ended and YouTube has published the replay.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I download YouTube videos in 4K?',
        a: 'Yes, when the video was uploaded in 4K and the resulting file is within our transfer limit. Above 720p YouTube stores picture and sound separately, so those options are merged on our server before the download starts.',
      },
      {
        q: 'How do I get just the audio?',
        a: 'Pick the MP3 option for a 192 kbps file, or M4A where it appears — M4A is a direct copy of YouTube’s own audio stream with no re-encoding.',
      },
      {
        q: 'Do YouTube Shorts work?',
        a: 'Yes. Paste the /shorts/ link exactly as it appears. Shorts are handled the same way as any other video.',
      },
      {
        q: 'Why is 1080p selected instead of 4K?',
        a: 'Because 4K is usually the wrong default. A ten-minute 4K download is several hundred megabytes and needs a server-side merge. The higher options are still there if you want them.',
      },
      {
        q: 'Can I download age-restricted videos?',
        a: 'No. Those require a signed-in account to verify age, and AllDown works without accounts.',
      },
    ],
  },

  twitter: {
    metaTitle: 'X (Twitter) Video Downloader — Save Videos & GIFs',
    metaDescription:
      'Download videos and GIFs from X (Twitter) in the best available quality. Paste the post link and save the MP4. Free, no login.',
    titleLead: 'Save videos',
    titleAccent: 'from X',
    subtitle:
      'Videos and GIFs from any public post, at the quality they were uploaded. Old twitter.com links work exactly the same.',
    facts: [
      { label: 'Works with', value: 'Videos · GIFs' },
      { label: 'Domains', value: 'x.com · twitter.com' },
      { label: 'Login', value: 'Not required' },
    ],
    guideTitle: 'How to download videos from X (Twitter)',
    guide: [
      {
        heading: 'Both domains still work',
        body: [
          'Twitter became X, but twitter.com links were never retired — they redirect. AllDown accepts either, along with mobile.twitter.com and the t.co short links that appear when a post is shared from the app. You do not need to convert anything before pasting.',
          'The link you want points at a specific post: x.com/username/status/1234567890123456789. A profile link has no single video attached and will be rejected with an explanation.',
        ],
      },
      {
        heading: 'Videos, GIFs, and the difference',
        body: [
          'X does not actually host GIFs. When someone posts one, the platform converts it to a silent looping MP4 — which is why they play smoothly and are far smaller than a real GIF would be. AllDown gives you that MP4. It will have no audio track, because there was never one to begin with.',
          'Native video uploads keep their soundtrack and are offered at every resolution X holds, usually up to 720p or 1080p depending on how the poster uploaded.',
        ],
      },
      {
        heading: 'Quoted posts and threads',
        body: [
          'If a post quotes another post that contains the video, link to the post that actually holds the video rather than the quote. Clicking through to the original and copying its address is the reliable path.',
          'In a thread, each post has its own link. Open the specific post with the video — the timestamp beneath it is a link to exactly that entry — and copy that.',
        ],
      },
      {
        heading: 'Protected accounts and deleted posts',
        body: [
          'Accounts with protected posts require an approved follower session. That content cannot be reached without logging in, so it cannot be downloaded here.',
          'Deleted posts and suspended accounts return a “no longer exists” message. There is no cached copy to fall back on — once X removes the media, it is gone from the servers AllDown can reach.',
          'Some videos are geo-restricted by the rights holder. If the content is unavailable in the region our servers run in, you will get a specific message saying so rather than a generic failure.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Do old twitter.com links still work?',
        a: 'Yes. twitter.com, x.com, mobile.twitter.com and t.co short links are all accepted and handled identically.',
      },
      {
        q: 'Why does the downloaded GIF have no sound?',
        a: 'Because it never had any. X converts uploaded GIFs into silent looping MP4s, and that silent file is what you receive.',
      },
      {
        q: 'Can I download from a protected account?',
        a: 'No. Protected posts need an approved follower session, and AllDown works without logging in.',
      },
      {
        q: 'What quality will I get?',
        a: 'Every resolution X holds for the post, typically up to 720p or 1080p. The list shows what is genuinely available rather than a fixed set of options.',
      },
      {
        q: 'The video is in a quoted post. What do I paste?',
        a: 'Open the original post that contains the video and copy its link. A quote-post link points at the quote, not the media.',
      },
    ],
  },

  facebook: {
    metaTitle: 'Facebook Video Downloader — HD Videos, Reels & Watch',
    metaDescription:
      'Download Facebook videos, Reels and Watch clips in HD. Paste the link and save the MP4. Free, no extension, no account.',
    titleLead: 'Facebook videos',
    titleAccent: 'in HD',
    subtitle:
      'Watch clips, Reels and page videos at full quality. fb.watch short links work too.',
    facts: [
      { label: 'Works with', value: 'Videos · Reels · Watch' },
      { label: 'Max quality', value: '1080p' },
      { label: 'Visibility', value: 'Public posts' },
    ],
    guideTitle: 'How to download Facebook videos',
    guide: [
      {
        heading: 'Finding a usable link',
        body: [
          'On desktop, click the timestamp or the three dots on the post and choose “Copy link”. In the app, the share sheet has the same option. A working link looks like facebook.com/pagename/videos/1234567890/, facebook.com/reel/1234567890, or the short fb.watch/xxxxxxx/ form.',
          'Links copied from the address bar while a video plays in the feed sometimes point at the feed rather than the post. If a paste is rejected, open the video on its own page first — the URL will change to include /videos/ or /reel/ — and copy that.',
        ],
      },
      {
        heading: 'Public means logged-out visible',
        body: [
          'The test for whether a Facebook video can be downloaded is simple: open it in a private browsing window. If it plays without asking you to log in, AllDown can reach it. If it shows a login wall, it cannot.',
          'That rules out friends-only posts, private group content, and anything from an account with restricted visibility. Facebook enforces these server-side and there is no way around it that does not involve handing over an account, which AllDown does not do.',
        ],
      },
      {
        heading: 'Quality options',
        body: [
          'Facebook typically stores an SD and an HD rendition of each upload, and serves them as separate picture and sound streams. AllDown lists what is present — commonly 720p and 1080p for recent uploads, less for older ones — and merges the streams into a single MP4 before sending.',
          'Reels behave like other short-form vertical video: expect 1080p on the short side for anything recent, and file sizes in the low tens of megabytes.',
        ],
      },
      {
        heading: 'Live videos and expired content',
        body: [
          'A live broadcast can only be downloaded after it ends and Facebook publishes the recording. While it is still live there is no complete file to fetch.',
          'Stories expire after twenty-four hours, exactly as they do on Instagram. Once expired the media is removed and cannot be recovered.',
          'Videos removed for copyright reasons return a “no longer exists” message. This is Facebook’s removal, not a limitation of the tool.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Can I download private Facebook videos?',
        a: 'No. If the video does not play in a logged-out private browsing window, it cannot be downloaded. Friends-only and private group posts are out of reach.',
      },
      {
        q: 'Do fb.watch links work?',
        a: 'Yes. Short links are resolved to the full post address before extraction starts.',
      },
      {
        q: 'Can I download Facebook Reels?',
        a: 'Yes, provided the Reel is public. Paste the /reel/ link exactly as copied.',
      },
      {
        q: 'What about live videos?',
        a: 'Only after the broadcast ends and Facebook publishes the replay. A stream in progress has no complete file to download.',
      },
      {
        q: 'Why does my link get rejected?',
        a: 'Usually because it points at a feed or a profile rather than a specific video. Open the video on its own page and copy the address from there.',
      },
    ],
  },

  pinterest: {
    metaTitle: 'Pinterest Video Downloader — Save Pins & Idea Pins',
    metaDescription:
      'Download Pinterest video Pins and Idea Pins in full quality. Paste the Pin link and save the MP4. Free, no account needed.',
    titleLead: 'Download',
    titleAccent: 'Pinterest',
    titleTail: 'video Pins.',
    subtitle:
      'Video Pins and Idea Pins without the app. pin.it short links work as well as full addresses.',
    facts: [
      { label: 'Works with', value: 'Video Pins · Idea Pins' },
      { label: 'Short links', value: 'pin.it supported' },
      { label: 'Account', value: 'Not required' },
    ],
    guideTitle: 'How to download Pinterest videos',
    guide: [
      {
        heading: 'Getting the Pin link',
        body: [
          'Open the Pin and use the share icon, then “Copy link”. You will get either a full address like pinterest.com/pin/1234567890123456789/ or a short pin.it/xxxxxxx link. Both work.',
          'Regional domains are handled too — pinterest.co.uk, pinterest.de, pinterest.ca and the rest all resolve to the same Pin. There is no need to convert a regional link to the .com form first.',
        ],
      },
      {
        heading: 'Video Pins and Idea Pins',
        body: [
          'A video Pin is a single clip and downloads as one MP4. An Idea Pin is Pinterest’s multi-page format, closer to a Story: several pages, each of which may be a video or a still. AllDown extracts the first video page from an Idea Pin.',
          'If a Pin turns out to contain only still images, you will get a message saying there is no video in it rather than an empty file. Pinterest surfaces stills and video in the same visual grid, so it is easy to click one expecting the other.',
        ],
      },
      {
        heading: 'Quality',
        body: [
          'Pinterest re-encodes uploads for its own delivery, so the resolution you get is the one Pinterest holds rather than whatever the creator originally uploaded. In practice that is usually 720p, sometimes 1080p for recent Pins.',
          'Every available option is listed with its approximate size. Because Pinterest videos tend to be short, the files are typically small enough that the highest option is a reasonable default on any connection.',
        ],
      },
      {
        heading: 'Common problems',
        body: [
          'Pins on secret boards are only visible to the board owner. Those cannot be downloaded without an account, and AllDown does not use one.',
          'Deleted Pins return a “no longer exists” message. Pinterest also occasionally removes Pins that link to content it has flagged, with the same result.',
          'A board link is not a Pin link. Boards contain many Pins and no single video; open the specific Pin you want and copy its address.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Do pin.it short links work?',
        a: 'Yes. They are resolved to the full Pin address before extraction begins.',
      },
      {
        q: 'Can I download an Idea Pin?',
        a: 'The first video page of an Idea Pin, yes. Individual page selection within a multi-page Idea Pin is not supported.',
      },
      {
        q: 'Why does my Pin say there is no video?',
        a: 'Because it is a still image Pin. Pinterest shows stills and videos in the same grid, so it is easy to pick one expecting the other.',
      },
      {
        q: 'What quality do Pinterest downloads come in?',
        a: 'Whatever Pinterest stores after its own re-encode, usually 720p and sometimes 1080p. Every available option is shown with its size.',
      },
      {
        q: 'Can I download from a secret board?',
        a: 'No. Secret boards are visible only to their owner and require a logged-in session.',
      },
    ],
  },
}

export function getPlatformContent(id: PlatformId): PlatformContent | null {
  return PLATFORM_CONTENT[id] ?? null
}
