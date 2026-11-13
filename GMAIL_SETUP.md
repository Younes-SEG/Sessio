# Connect Gmail to Command locally

This is a one-time setup for the person running Command. It is separate from your Gemini API key and from Gmail connected to ChatGPT. After setup, use **Grades → Grade emails → Connect Gmail**.

1. Open [Google Cloud Console](https://console.cloud.google.com/). On the welcome screen, click **Select a project** at the top, then **New Project**. Name it **Command**, keep **No organization** if offered for your personal account, and click **Create**. Once created, open the project selector again and select **Command**. You can also choose an existing project you own. Keep this project selected throughout the remaining steps.
2. Under **APIs & Services → Library**, enable **Gmail API**.
3. Search for **Google Auth Platform** in the top search bar and open it. Click **Get started** if prompted. Under **App Information**, use **Command** for the app name and your email for support. Click **Next**, choose **External** under **Audience**, then **Next**. Enter your email under **Contact Information**. Review the policy and accept it if you agree, then **Continue → Create**. If already configured, check the existing **Branding** and **Audience** pages. In **Audience**, keep publishing status **Testing**. Under **Test users → Add users**, enter the Gmail address that receives your school notifications, then **Save**.
4. Open **Data Access → Add or remove scopes**. Select `https://www.googleapis.com/auth/gmail.readonly` (or add it using the manual scope field), then **Update → Save**.
5. Under **Clients → Create client**, choose **Web application**, name it **Command local**, and add this exact **Authorized redirect URI**:

   ```text
   http://127.0.0.1:3000/api/email/callback
   ```

6. Leave **Authorized JavaScript origins** empty for this server connection. Click **Create** and privately copy its client ID and client secret; the secret may only be displayed when created. Run `node scripts/setup-gmail.mjs` if `.env.local` has not already been prepared. Open `.env.local` in your editor from the Command project folder and replace the values after `=` for these two entries, each on its own line:

   ```dotenv
   GOOGLE_GMAIL_CLIENT_ID=your-client-id
   GOOGLE_GMAIL_CLIENT_SECRET=your-client-secret
   ```

   Keep the generated `GMAIL_TOKEN_ENCRYPTION_KEY` and configured redirect URI. Never put this file in GitHub, screenshots or chat. Command's `.gitignore` excludes it. Changing the encryption key requires reconnecting existing accounts.

7. Restart Command (`npm run dev`), open **http://127.0.0.1:3000**, then **Grades → Grade emails → Connect Gmail**. Use the personal Gmail account receiving your forwarded school notifications. Accept the read-only permission. Connecting is optional; the rest of Command works without it.

## Using it

### Recommended Brightspace notifications

Open **Brightspace → your name/profile → Notifications**. This is a quieter recommended setup, not an automatic change to your Brightspace settings. The same checklist is in **Command → User guide → Connect grade emails → Recommended Brightspace notifications**, in English and French, and linked from **Email preferences**.

Set **Summary of Activity → Never** to reduce overlap between instant emails and daily/weekly digests.

Keep only these six **Email** boxes checked by default:

- Announcements - new announcement available
- Announcements - announcement updated
- Assignments - assignment feedback released
- Assignments - assignment feedback updated
- Grades - grade item released
- Grades - grade item updated

Under **Customize Notifications**, enable **Include my grade value in notifications from Grades**. Automatic grade imports need an explicit score in the email. Leave **Allow future courses to send me notifications** off unless you want messages before courses start.

Leave other instant notifications off: both Activity Feed options; assignment two-day reminders and publish-all completion; all Content and Content Service options; all Discussions and ePortfolio options; and quiz two-day reminders. Enable course-specific Activity Feed posts, discussion mentions/subscriptions or ePortfolio feedback when your instructor relies on them. Keep deadline emails if the assessments are missing from Command or calendar sync is unreliable. Continue checking Brightspace for course content. Click **Save** in Brightspace.

Feedback-only messages go to School updates, while explicit scores and grade-release notices go to Grade emails. Command also groups matching announcement and direct-email copies from the same course received within three days. Only complete, sufficiently detailed messages with identical text after template cleanup are grouped; meaningful dates, numbers and links are preserved in the comparison. Each original stays accessible in the grouped card. Reading a group marks its matching copies read in Command, without changing Gmail. Changed messages, grades, deadline-change notices and activity summaries remain separate. Turning off digests reduces repeated notices but does not remove existing imported copies.

References: [D2L notification descriptions](https://community.d2l.com/brightspace/kb/articles/17244-brightspace-notification-details), [Brightspace settings guide](https://it.stonybrook.edu/help/kb/updating-your-notifications-settings-in-brightspace).

### Checking and reviewing email

- **Grades → Grade emails** contains grade results and grade-release notices only. **Updates** in the sidebar contains announcements and assessment changes, with an unread notification count. Viewing a message for two continuous seconds in the active tab marks it as read in Command. Scrolling past quickly does not. Read cards stay in place, and the manual **Mark as read** button remains available. This does not change Gmail's read status or approve an assessment change.
- Deadline-change emails can suggest explicit dates with a year (ISO dates or full English/French month names). Review the assessment, date, time and time zone before saving. The existing assessment is updated without changing its grade or weight; calendar display and generated study reminders follow its date. Calendar feed sync can later replace a linked deadline. Relative dates, multiple possible dates, cancellations and other changes stay for manual review; no email changes the planner automatically.

- **Check emails now** scans up to 20 matching emails per batch. If more are available, check again. The default filter looks for Brightspace/uOttawa grades, announcements and assessment changes, and includes direct course messages from Brightspace's Email tool even without notification keywords. These professor messages appear under **Updates**. A second content check excludes unrelated email and routine lecture-content notifications. A custom filter such as `label:School` narrows this school search. Existing default filters upgrade automatically and rescan the last 30 days. Old broad-filter results are also filtered out of the review screens. Ignored message IDs are retained for up to 90 days during sync to avoid rereading them; their text, subject and sender are not saved on new imports.
- The first scan covers the last 30 days. Later scans overlap the previous two days to avoid missing arrivals. Message IDs prevent repeated imports. New connections or changing the filter reset the scan window.
- Automatic checks run about every five minutes while a Command page is open and visible. This is not a 24-hour background service or Gmail push subscription.
- Clear assessment and score matches are saved automatically during email checks, including previously imported pending messages. **Automatic grade updates** shows recent results and links to their source emails. Newer emails can correct an unchanged automatically imported grade; older results cannot replace newer ones. Uncertain matches, incomplete messages and conflicts with manually entered grades remain under **Grades to review**. An email that only announces a released grade cannot supply the actual score; enter it after checking Brightspace.
- English/French explicit score formats such as `Score: 18/20` and `Note : 85 %` are supported. Ambiguous scores and unknown matches stay blank. A real sample notification will help tune additional formats. Attachments and linked Brightspace pages are not fetched.
- **Disconnect Gmail** deletes the connection and saved email reviews while keeping grades already saved. It also attempts to revoke Google's grant. If revocation fails, remove Command from [your Google account connections](https://myaccount.google.com/connections).
- Pending reviews remain until read, dismissed, applied, disconnected or erased. Read notifications retain their readable text so you can revisit them; they are removed after 90 days during successful syncs. Applying/dismissing clears the excerpt immediately; minimal reviewed metadata is removed after 90 days during successful syncs. Disconnecting or erasing the workspace deletes these records sooner. Readable message text is stored up to 100,000 characters; incomplete imports show an explicit notice. Raw HTML is processed only in memory. Older short excerpts, including read notifications, are refreshed in batches of 20 on successful checks without creating duplicates or reopening read messages. No email is sent to an AI service.

## Google testing and public hosting

Google's testing status generally expires refresh tokens after seven days for this scope; reconnect when prompted. Use your listed test account. A Gemini API key cannot replace the OAuth client.

For Vercel, set all four variables server-side and use the production HTTPS callback URL registered with Google. Each signed-in workspace connects its own Gmail account. Do not add `NEXT_PUBLIC_` to any secret. Production sharing of an app using Gmail's restricted read-only scope requires Google's verification process; server storage/transmission can require a security assessment. Complete those requirements and publish accurate operator/privacy details before public distribution.

Official references: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes), [OAuth token expiration](https://developers.google.com/identity/protocols/oauth2#expiration).

## Hosted public release gate

Credentials alone no longer enable hosted Gmail. Configure approved testers or public availability only after the applicable Google verification/security review. See [P0 operations](docs/p0-operations.md#gmail-availability). Existing loopback local setup is unchanged.
