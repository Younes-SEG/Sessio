export const policyUpdated = 'November 15, 2026';
export const calendarNoticeVersion = '2026-10-07';

export type LegalText = {
  title: string;
  introduction: string;
  sections: readonly { title: string; paragraphs: readonly string[] }[];
};

// The French versions in legal-fr.ts must keep the same documents and section structure
// (tests/legal-translations.test.ts). Update both together.
export const legalDocuments = {
  privacy: {
    title: 'Privacy policy',
    introduction:
      'This policy explains what personal information Command collects, why, where it is processed, how long it is kept and the choices you have. It covers the hosted edition and notes where the downloadable local edition differs.',
    sections: [
      {
        title: 'Who is responsible',
        paragraphs: [
          'The hosted edition of Command is operated from Ontario, Canada, by the operator named under “Account deletion and support” at the bottom of this page. The operator is responsible for the personal information described here and has designated a person in charge of protecting it, the Privacy Officer.',
          'Write to the Privacy Officer at the support email shown below for privacy questions, requests to access or correct your information, account deletion, complaints, or to report a security concern. We answer within 30 days.',
          'The downloadable local edition runs on your own computer. Its data stays there unless you use an optional online feature described below, and whoever installs it controls that copy.',
        ],
      },
      {
        title: 'What we collect and why',
        paragraphs: [
          'Account: your email address, an optional name and sign-in records, so you can sign in and keep your workspace private.',
          'Workspace: the courses, assessments, grades, tasks, notes, calendar entries, terms and preferences you enter or import, so Command can organize your studies.',
          'Optional connections: a private calendar link you choose to connect, a syllabus you choose to read, chat messages you send to Ask Command and school email notices from a Gmail account you connect (in the hosted edition, only for invited testers). Each is used only for the feature you started.',
          'Service records: content-free AI usage records, deletion records and short security logs, so we can enforce fair-use limits, honour deletions and protect the service.',
          'We collect only what each feature needs. We do not sell personal information, show ads, build marketing profiles or use your information to train AI models.',
        ],
      },
      {
        title: 'Where your information is processed',
        paragraphs: [
          'Hosted Command relies on these service providers, which process information on our behalf: Vercel runs the application (United States, Washington, D.C. region); Neon stores the database and handles sign-in (United States, Virginia); Render runs the syllabus reader (United States, Ohio); and Google provides the Gemini AI used by Ask Command and syllabus reading (United States and other Google locations). Calendar providers you connect, such as Brightspace, receive requests from our server.',
          'Because these providers are outside Canada, your information is stored and processed in the United States and can be subject to the laws of that country, including lawful access by its courts and authorities. We chose providers with strong security practices, limit what each one receives, and assessed these transfers before offering the service to students in Quebec.',
        ],
      },
      {
        title: 'Your workspace and account',
        paragraphs: [
          'Your workspace is stored in PostgreSQL. In the local edition that database is on your computer and no account is required. In the hosted edition, Vercel processes application requests and Neon stores workspace data. Server-side ownership checks restrict workspace access to the signed-in account. This does not prevent access by authorized service operators or infrastructure providers.',
          'Hosted sign-in uses Neon Auth to process your email, optional name, password authentication and sessions. Verification and password-reset emails are transactional, not marketing. Command does not store plaintext passwords in its workspace tables. A verified account identifier links your workspace to your login. No date of birth, student ID, payment details or marketing profile is required.',
        ],
      },
      {
        title: 'Ask Command',
        paragraphs: [
          'Sending a chat message sends its text, recent conversation context, your language and device time zone to Google Gemini through the application server. Context can include course or assessment names Command suggests. Your full workspace and email contents are not sent automatically. The server checks each interpreted request and your ownership before reading or changing workspace records.',
          'The hosted edition uses Google’s paid Gemini API. Under Google’s terms for paid services, Google does not use these prompts or responses to improve its products; it keeps them for a limited time to detect abuse. A local installation uses whatever key its owner configures. On Google’s free tier, content may be used to improve Google products and reviewed by people, so do not send private information through a free-tier setup.',
          'Chat titles, messages, replies and recent conversation context are saved in your workspace so you can reopen a conversation later. Conversations remain until you delete them or erase the workspace. Only recent relevant context from the selected conversation is sent to Gemini, not your whole chat history. Each conversation holds up to 200 exchanges. Action receipts support confirmation and Undo for 24 hours and are removed once they are 30 days old, during the next chat request. Deleting a conversation removes its messages, title, context, pending actions and Undo data, while keeping grades and events already saved. Content-free request identifiers, statuses and timestamps can remain until the next cleanup to prevent repeated actions and enforce limits. Chats and receipts are included in exports and removed by workspace erasure.',
        ],
      },
      {
        title: 'Syllabus imports',
        paragraphs: [
          'Choosing a file does not start reading. When you click Read syllabus for a PDF, DOCX, JPG, PNG or TXT file, or submit pasted text, Command sends its content, the selected term dates and, for an existing course, its code and name to Command’s reader and then to Google Gemini. Your other courses, saved grades, notes and calendar links are not included. You do not need an AI account or key; the operator manages and pays for the connection, and request allowances apply.',
          'The hosted reader runs on Render in Ohio, United States. Files and previews are processed in memory and are not saved by the reader. Its usage database keeps aggregate request counts and daily-rotating keyed hashes of network addresses to enforce allowances; daily identifiers are deleted after the next UTC day and monthly counters the following month. Content is sent inline, never as a stored provider file. Word documents are read in memory; macros and links are never run or fetched. Hosted reading uses Google’s paid Gemini API, so content is not used to improve Google products; Google keeps it briefly for abuse detection. A local installation can be configured with another provider, such as OpenAI, under that provider’s terms.',
          'Saving reviewed assessments stores their dates and weights in your workspace; new assessments also keep the source excerpt and page reference in their notes. Discarding a preview saves nothing, but cannot undo a request already sent. Erasing your workspace does not erase copies held by the AI provider, hosting logs or temporary usage counters.',
        ],
      },
      {
        title: 'Calendar connections',
        paragraphs: [
          'Previewing a subscription sends the link to the Command server running your edition, which requests the calendar from its provider. For the hosted edition this means Vercel processes the private link and Neon stores it after connection. The calendar provider receives the request and may log the server network address and feed credential. Preview data is not saved unless you choose Connect and import.',
          'Connecting saves the private feed URL, selected dates and time zone, imported entries, sync status and the date and version of the connection notice you accepted. Local servers check about every 15 minutes while running. Hosted connections are checked when you use the app, at most once per 15 minutes automatically, or when you ask for a manual sync. Feed links can grant calendar access; do not publish or share them.',
          'Disconnect stops checks but keeps the link for reconnection. Forget link removes the saved connection and sync mapping while keeping imported academic entries. You can delete those entries individually or erase your workspace. Reimporting a forgotten connection can create duplicates.',
        ],
      },
      {
        title: 'Optional Gmail connection',
        paragraphs: [
          'In the local edition, anyone running Command can connect Gmail. In the hosted edition, Gmail connection is open only to invited testers listed with Google while Google has not verified Command; Google shows an unverified-app warning and asks you to reconnect about every seven days. Command’s use and transfer of information received from Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements. Gmail data is not used to train general AI models, target ads or build profiles for sale.',
          'Connecting Gmail grants read-only mailbox access through Google OAuth. Command uses your chosen search filter to retrieve matching school notifications and their text. It does not send mail, change Gmail, fetch attachments or linked pages, or send email to an AI service.',
          'The database stores your Gmail address, an encrypted refresh token, search preferences, consent date and version, sync status, and review records with message IDs, sender, subject, date, readable text (up to 100,000 characters) and proposed grade matches. Raw email HTML is processed in memory only. Google receives API requests and may keep its own logs.',
          'Automatic checks run about every five minutes while a Command page is open and visible. Clear grade matches are saved automatically; uncertain results stay for your review, and deadline changes always need your approval. Read notices, reviewed metadata and ignored-message identifiers are deleted after 90 days. Disconnecting deletes the connection and reviews, keeps saved grades and attempts to revoke Google access. Neither action deletes emails in Gmail.',
        ],
      },
      {
        title: 'AI allowances and deletion records',
        paragraphs: [
          'Hosted AI uses content-free usage records: a pseudonymous account reference, feature and model, timestamps, provider token counts when available, pricing configuration and spending reservations. They contain no chat text, grades, documents or emails. They survive chat deletion and workspace erasure so those actions cannot reset spending limits. Records from the current and previous calendar month are kept; older ones are deleted by a cleanup the operator runs at least monthly. Your own usage records are included in workspace exports.',
          'A deleted hosted account keeps a minimal account identifier and deletion status so that requests already in progress and restored backups cannot recreate its data. These markers contain no academic records and are removed once no backup could still contain the account.',
        ],
      },
      {
        title: 'Tracking, cookies and third parties',
        paragraphs: [
          'Command has no advertising, analytics, session replay, marketing SDKs or tracking cookies, and does not sell workspace data or send marketing email. The study buddy’s mouse reactions are calculated in browser memory; pointer positions are not stored or sent anywhere.',
          'Application code, icons, graphics and fonts are served by Command itself; no third-party font or script service is contacted. Calendar connections contact their providers, and syllabus imports contact Command’s reader and Google Gemini when you start them. Checking reader availability contacts the reader without sending syllabus content.',
        ],
      },
      {
        title: 'Your choices and rights',
        paragraphs: [
          'You can view and edit your information in Command at any time. Settings → Your data downloads a complete JSON copy (private calendar links excluded) and permanently erases your workspace.',
          'Deleting a course moves it to Deleted courses, where it can be restored; this is not permanent erasure. Erasing the workspace permanently deletes active and deleted courses, AI receipts, saved feed links and preferences from the live database and stops syncing. It cannot erase files you downloaded or copies made by other software.',
          'Workspace erasure keeps your login so you can start again. To delete your account entirely, write to the support contact below from the email you sign in with. We verify the request, delete the workspace and your sign-in account with our providers, and confirm what was removed. Never send your password.',
          'You can withdraw consent for optional features at any time: disconnect a calendar or Gmail, or stop using Ask Command and syllabus reading. You can also ask what personal information we hold about you and how it has been used. If you are not satisfied with our answer, you can complain to the Office of the Privacy Commissioner of Canada (priv.gc.ca) or, in Quebec, the Commission d’accès à l’information (cai.gouv.qc.ca).',
        ],
      },
      {
        title: 'How long we keep information',
        paragraphs: [
          'Workspace records stay until you delete them or erase the workspace; there is no automatic expiry. Erased data leaves the live database immediately. It can remain in the database’s rolling restore history for up to 6 hours, and in a manual backup taken before a database change for up to 60 days, after which that backup is deleted. Testing a change to Command uses a temporary copy of the database that only the operator can reach; it is deleted when the change is finished, usually within a few days.',
          'Other records have shorter limits: chat action receipts 30 days; read email notices and reviewed email metadata 90 days; AI usage records about two months; syllabus reader counters one day or one month. Hosting and sign-in providers keep short operational and security logs under their own policies. The local edition keeps everything on your computer until you delete it.',
        ],
      },
      {
        title: 'Security and incidents',
        paragraphs: [
          'The local edition binds to your computer and rejects public workspace requests. The hosted edition requires a verified session and limits reads, writes, exports and erasure to your own workspace. Connections are encrypted, and application error logs leave out database details and calendar links. Protect your device and sign out on shared computers.',
          'We record every incident involving personal information, such as unauthorized access, use, disclosure or loss, and keep that record for at least five years. If an incident creates a real risk of significant harm, or for Quebec residents a risk of serious injury, we promptly notify the people affected and the Office of the Privacy Commissioner of Canada, and the Commission d’accès à l’information for Quebec residents, explaining what happened and what you can do.',
        ],
      },
      {
        title: 'Age and audience',
        paragraphs: [
          'Command is designed for postsecondary students and general personal planning. It is not directed to children and does not collect age records.',
          'Google’s terms for its Gemini API allow it only for people 18 or older. You must be at least 18 to use Ask Command or syllabus reading. If you are under 18, you can use Command without these AI features.',
        ],
      },
      {
        title: 'Changes to this policy',
        paragraphs: [
          'We update this policy when our practices change and show the date at the top. For significant changes, such as a new kind of information or a new provider, we tell you in the app before the change applies and ask for your consent where the law requires it.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of use',
    introduction:
      'These terms apply when you use Command. By using it, you agree to them. The hosted edition is provided from Ontario, Canada, by the operator named under “Account deletion and support” below.',
    sections: [
      {
        title: 'The service',
        paragraphs: [
          'Command helps you organize your own studies. The hosted edition is a free, invitation-only preview that may change as it develops. You may also run the downloadable local edition on your own device for lawful personal use. Third-party software remains subject to its own licences, listed in Credits.',
        ],
      },
      {
        title: 'Your account',
        paragraphs: [
          'You must be able to agree to these terms, and at least 18 to use Ask Command or syllabus reading, because our AI provider requires it. Keep your sign-in details private, and tell us right away if you think someone else has used your account. You are responsible for activity in your account.',
        ],
      },
      {
        title: 'Using Command responsibly',
        paragraphs: [
          'Only enter or connect information you are allowed to use. Do not use Command to obtain someone else’s calendar or data, bypass an institution’s access controls, violate another person’s privacy, or upload documents you have no right to share.',
          'Do not try to access other accounts, probe or overload the service, get around usage limits, or use Command for anything unlawful.',
        ],
      },
      {
        title: 'Your content',
        paragraphs: [
          'You keep ownership of your notes and academic information. You allow us to store and process it only to provide Command to you, as described in the Privacy policy. We do not claim ownership of it.',
        ],
      },
      {
        title: 'AI features, dates and grade estimates',
        paragraphs: [
          'Ask Command and syllabus reading use AI and can be wrong: they may miss assessments, misread dates or weights, or misunderstand a request. Review suggestions before saving and confirm important dates, submissions and results with your institution. Usage allowances apply.',
          'Calendar feeds can omit work, delay updates or change their date range. Grade calculations and target estimates are planning aids, not official academic records or guarantees.',
        ],
      },
      {
        title: 'Your copies',
        paragraphs: [
          'Keep private backups if you need them; a JSON export is a readable copy, not an automatic restore tool. Deleting your workspace cannot remove backups you made yourself or records held by other services. The local edition has no accounts or hosted recovery.',
        ],
      },
      {
        title: 'Charges',
        paragraphs: [
          'Command is free. It has no checkout, subscription, trial or in-app fees, and the AI features are funded by the operator. If paid features are ever offered, their price, taxes, cancellation and refund terms will be shown before any purchase.',
        ],
      },
      {
        title: 'Availability, suspension and ending',
        paragraphs: [
          'We work to keep Command running, but it can contain errors and there is no promise of uninterrupted service or a particular academic outcome.',
          'We may suspend an account that breaks these terms or puts the service or other users at risk. You can stop using Command at any time and delete your data. If we decide to close the hosted edition, we will give reasonable notice, where possible, so you can export your workspace.',
        ],
      },
      {
        title: 'Liability',
        paragraphs: [
          'Command is provided as is. To the extent the law allows, the operator is not responsible for indirect losses, or for missed deadlines or grades that result from relying on the app instead of your institution’s official information. Nothing in these terms limits rights you have under consumer protection laws that cannot be waived.',
        ],
      },
      {
        title: 'Governing law and changes',
        paragraphs: [
          'These terms are governed by the laws of Ontario and the federal laws of Canada that apply there. They do not require arbitration, waive class proceedings or remove consumer protections that apply where you live, including in Quebec.',
          'We may update these terms. The date at the top shows the latest version, and we will tell you in the app before a significant change applies.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookies and device storage',
    introduction:
      'Command does not use advertising or analytics cookies. Hosted accounts use necessary authentication cookies to keep you signed in.',
    sections: [
      {
        title: 'What the app uses',
        paragraphs: [
          'Academic data and preferences are stored in the database for your edition. Hosted authentication uses secure, HTTP-only session cookies and signed session-cache cookies, with SameSite protections. The authentication library may use browser storage and tab messages to coordinate session changes. These support sign-in rather than advertising. Temporary workspace state, previews and mouse positions live in browser memory.',
          'Command also stores your chosen interface language in a first-party command-language cookie for up to one year. It contains only en or fr, works without an account, and is not used for tracking. You can change it with the language switch or clear it in your browser.',
          'A first-party command-theme cookie remembers LIGHT, DARK or SYSTEM for up to one year so pages can display your theme before the app loads. It contains no account or academic data and is not used for tracking. Change your theme in Command or clear the cookie in your browser.',
          'Choosing Connect Gmail creates a temporary HTTP-only command-gmail-state cookie lasting at most ten minutes. It ties Google’s response to the browser that started the connection and is removed afterwards. It is not an advertising or analytics cookie.',
          'Your browser may cache application files as part of ordinary browsing. Workspace responses are marked private and no-store.',
        ],
      },
      {
        title: 'Why there is no cookie banner',
        paragraphs: [
          'Command has no optional analytics or advertising storage to accept or reject; every cookie above is needed for a feature you use. If optional tracking is ever introduced, its purpose and controls will be explained and you will be asked before it runs.',
        ],
      },
    ],
  },
  accessibility: {
    title: 'Accessibility',
    introduction:
      'Command aims to be usable with a keyboard, readable in either theme, and comfortable with reduced motion. This is an implementation statement, not a certification of full WCAG conformance.',
    sections: [
      {
        title: 'Keyboard and forms',
        paragraphs: [
          'Use Tab and Shift+Tab to move through controls, Enter or Space to activate them, Escape to close dialogs, and Ctrl+K or Cmd+K to open the command palette. Dialogs keep keyboard focus within their controls. A skip link goes directly to the page content.',
          'Forms have visible labels. Required inputs are identified; optional fields can be left empty. Buttons and selected states are not distinguished only by colour.',
        ],
      },
      {
        title: 'Visuals and motion',
        paragraphs: [
          'Light and dark themes use contrast-tested text and control colours. Decorative illustrations are hidden from assistive technology, while the study buddy has a concise accessible name. You can select Off or disable Gentle movement in Appearance.',
          'Device reduced-motion preferences disable card entrances, buddy movement and decorative animation. The buddy does not intercept clicks or make sounds. Calendar information is also available in the selected-day agenda.',
        ],
      },
      {
        title: 'Known limits and feedback',
        paragraphs: [
          'Automated checks cannot establish complete accessibility. Calendar layouts can require horizontal scrolling on small screens. Screen-reader combinations, high magnification and other assistive technologies still need more manual testing.',
          'Report an accessibility barrier or a security concern to the support contact below; we aim to reply within 30 days. No feedback form collects personal information.',
        ],
      },
    ],
  },
  about: {
    title: 'About this edition',
    introduction:
      'Command is a study planner available as a local installation or a hosted application with private user workspaces. Optional syllabus imports use a separate hosted reading service.',
    sections: [
      {
        title: 'Publisher details',
        paragraphs: [
          'The hosted edition is operated from Ontario, Canada, by the operator named under “Account deletion and support” below, which is also the privacy and support contact. No business address or registration number is published yet. No business identity or contact address has been invented.',
        ],
      },
      {
        title: 'No paid or promotional features',
        paragraphs: [
          'There is no payment collection, automatic renewal, paid trial, marketing mailing list or review/testimonial system. Command makes no claims about fake customers, ratings or guaranteed academic outcomes.',
        ],
      },
      {
        title: 'Data requests',
        paragraphs: [
          'In either edition, Settings → Your data exports or erases your workspace directly, without identity documents or emails. For hosted account deletion and other privacy requests, write to the support contact below. Files and backups outside the app must be managed separately.',
        ],
      },
    ],
  },
  credits: {
    title: 'Credits and licences',
    introduction:
      'Command bundles open-source components and locally drawn graphics. No advertising or analytics SDK is included.',
    sections: [
      {
        title: 'Fonts, icons and characters',
        paragraphs: [
          'Command bundles Lora and Plus Jakarta Sans under the SIL Open Font License 1.1. Their copyright and licence notices are included at /fonts/Lora-OFL.txt and /fonts/Plus-Jakarta-Sans-OFL.txt and must remain with redistributed font files. Interface icons come from Lucide under the ISC licence. UI primitives from Radix and the shadcn-style component patterns use permissive licences documented in the notices.',
          'The Command mark and Mochi, Sprout and Nimbus pixel illustrations were created within this project with coding-assistant help. They do not use stock photos, external character sprites or purchased image libraries. No claim of exclusive copyright or trademark clearance is made.',
        ],
      },
      {
        title: 'Software notices',
        paragraphs: [
          'The bundled third-party notices identify installed production dependencies, their declared licences and available licence texts. These include Next.js, React, Prisma, PostgreSQL client components and ical.js. ical.js is MPL-2.0; its source modules are included by its package. Preserve relevant notices and make covered source available when distributing a built app.',
          'The download package must also retain licences for tools or database binaries it includes. The automated notices are an inventory, not a legal determination that all distribution obligations have been satisfied.',
        ],
      },
    ],
  },
} as const satisfies Record<string, LegalText>;

export type LegalDocument = keyof typeof legalDocuments;
