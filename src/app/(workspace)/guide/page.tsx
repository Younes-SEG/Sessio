import { GmailSetupGuide } from '@/components/gmail-setup-guide';
import { TourReplay } from '@/components/onboarding';
import { GuideLanguage } from '@/components/guide-language';
import Link from 'next/link';
import { BookOpen, CalendarDays, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'User guide' };
const topics = [
  ['start', 'Get started'],
  ['calendar', 'Connect and sync a calendar'],
  ['syllabus', 'Import a syllabus'],
  ['assignments', 'Complete assignments'],
  ['grades', 'Enter and track grades'],
  ['email', 'Connect grade emails'],
  ['planning', 'Tasks, classes and events'],
  ['appearance', 'Appearance and study buddies'],
  ['data', 'Your data'],
  ['troubleshooting', 'Troubleshooting'],
] as const;

export default function GuidePage() {
  return (
    <GuideLanguage>
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="page-header">
          <div>
            <p className="eyebrow mb-2">A LITTLE HELP GETTING SETTLED</p>
            <h1>User guide</h1>
            <p>How to plan your semester, finish your work and keep your grades up to date.</p>
          </div>
          <BookOpen aria-hidden size={28} className="text-primary" />
        </header>
        <TourReplay />
        <section className="card space-y-4 p-6">
          <h2 className="section-title">Your everyday routine</h2>
          <p className="muted leading-relaxed">
            Check Home for upcoming work, mark assignments Completed after you finish and submit
            them, then visit Grades when results arrive. Completed assessments stay on the
            awaiting-grades list so you can find them weeks later.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/settings#calendar-connections">
                <CalendarDays />
                Connect calendar
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/grades">
                <GraduationCap />
                Enter grades
              </Link>
            </Button>
          </div>
        </section>
        <nav aria-label="Guide topics" className="grid gap-2 sm:grid-cols-2">
          {topics.map(([id, title]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-lg px-3 py-2 text-sm text-primary underline underline-offset-4"
            >
              {title}
            </a>
          ))}
        </nav>
        <section id="start" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">1. Get started</h2>
          <ol className="list-decimal space-y-3 pl-5 leading-relaxed">
            <li>
              Open{' '}
              <Link href="/settings" className="underline">
                Settings
              </Link>{' '}
              to choose your name, theme and time format. Use Save preferences for those changes.
            </li>
            <li>
              Connect your calendar to create courses and dated assessments, or add a semester in
              Settings and create your courses manually under Courses.
            </li>
            <li>
              Open each course to add the assessment weights from your syllabus, weekly class
              schedule and any work your calendar feed does not include.
            </li>
          </ol>
          <p className="muted text-sm">
            Calendar changes have their own Save calendar button. You do not need to save
            preferences to connect a feed.
          </p>
          <p className="muted leading-relaxed">
            Home, Tasks, Calendar, and Grades show your active semester by default. Use the Semester
            filter to view another term or all semesters. Personal tasks and events stay visible.
            Archiving a course hides it from the default views but keeps its records. Deleting a
            course permanently removes its grades, assessments, recurring classes, linked tasks, and
            linked events; unlinked personal items remain.
          </p>
          <p className="muted leading-relaxed">
            Choose Manage terms on Courses or Import syllabus to open Settings → Terms. Select a
            term to rename it, edit its dates, or make it active. Deleting a term also permanently
            deletes all its courses and their linked work after confirmation. Move courses you want
            to keep into another term first.
          </p>
        </section>
        <section id="calendar" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">2. Connect and sync a calendar</h2>
          <ol className="list-decimal space-y-3 pl-5 leading-relaxed">
            <li>
              In Brightspace, open Calendar → Settings and enable calendar feeds. Use Subscribe to
              copy the subscription link. Choose all calendars if you want every course.
            </li>
            <li>
              Paste the link in{' '}
              <Link className="underline" href="/settings#calendar-connections">
                Settings → Connect your calendar
              </Link>
              . Check Import dates for the term you want.
            </li>
            <li>
              Choose Save calendar directly below the link. To inspect the events first, choose
              Preview calendar, then Connect and import.
            </li>
            <li>
              Connected calendars are checked approximately every 15 minutes while the Command
              server is running. Use Sync now to request a check sooner; repeated requests are
              limited to once a minute.
            </li>
          </ol>
          <p className="muted leading-relaxed">
            An .ics download is a snapshot; the subscription link allows future refreshes. The feed
            only provides what your school publishes there. It does not supply your gradebook,
            assessment weights or every announcement. Dates outside the selected import range stay
            out.
          </p>
          <p className="muted leading-relaxed">
            Saving an already connected link updates its import dates and reuses its existing import
            mapping. Sync preserves your scores, completion status, weights and notes. Missing feed
            entries are retained; explicit cancellations are labelled.
          </p>
          <p className="muted leading-relaxed">
            Disconnect pauses syncing and retains the saved link. Forget link removes the connection
            and its mapping while keeping imported entries; importing again after forgetting may
            create duplicates.
          </p>
        </section>
        <section id="syllabus" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">Import a syllabus</h2>
          <p className="leading-relaxed">
            Open{' '}
            <Link href="/syllabus" className="underline">
              Import syllabus
            </Link>{' '}
            from Courses or a course page. Choose Create a course from syllabus and a term, or
            select Existing course. Choose a PDF, DOCX, JPG/PNG or TXT file, then click Read
            syllabus. Reading opens the review list. Compare the suggestions with the original, then
            save the reviewed rows. To paste an outline instead, open Or paste syllabus text and
            select Find assessments from text. Both paths use the same AI reader.
          </p>
          <p className="muted leading-relaxed">
            For a new course, review the detected code and name, filling in anything missing. The
            course and selected assessments are saved together only after confirmation. If the code
            already exists in that term, use Existing course to avoid a duplicate. You can save a
            new course even when no assessments were found.
          </p>
          <p className="muted leading-relaxed">
            The model reads the original PDF, including text, tables and scanned page images. Clear
            scans give better results; unreadable content may be missed. Older Word (.doc) files can
            be saved as .docx or exported to PDF. Add missed assessments, correct names and dates,
            and uncheck unwanted rows. Source excerpts and page references help you check
            suggestions, but can also be mistaken.
          </p>
          <p className="muted leading-relaxed">
            The reader is instructed to infer a missing year only when there is a single match in
            the selected semester, and to flag ambiguity. Check all inferred dates. Times use your
            device time zone; a date without a time uses 23:59. Grouped or conditional weights start
            deselected and blank: split “five quizzes worth 20% total” into individual rows when
            each weight is confirmed. For a best-of rule, enter an instructor note such as “Best 4
            of 5 quizzes count” in the review, then confirm the assessments and combined weight.
            This averages the highest percentages equally; it never treats unknown grades as zero.
            Manage or remove saved rules in the course’s Grades tab. Other instructions remain notes
            and do not change calculations automatically. When a syllabus gives a week and a
            lecture, tutorial or lab instead of an exact date, confirm your section in the review
            screen. Command fills only unambiguous session dates, labels them as inferred, and flags
            holidays or breaks. You can override a date manually or save an assessment without a
            date. Session choices do not create recurring classes.
          </p>
          <p className="muted leading-relaxed">
            Match suggestions to existing assessments under Save as to avoid duplicates from
            calendar imports. Matched entries update only dates and weights, preserving grades,
            progress and notes; blank fields keep their existing values. New entries with blank
            weights use 0%, and blank dates have no deadline. Course weights cannot exceed 100%.
            Calendar sync may replace dates on calendar-linked entries. A syllabus import is a
            snapshot, so review later revisions again.
          </p>
        </section>
        <section id="syllabus-setup" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">Syllabus reading: no setup needed</h2>
          <p className="leading-relaxed">
            Choose your term, select your syllabus and click Read syllabus. Command connects to its
            online reader automatically; you do not need an AI account, API key or model download.
            Internet access is needed for reading. Your planner and grades stay in your workspace;
            they are not sent to the AI reader.
          </p>
          <p className="muted text-sm">
            If the reader is unavailable, choose Try again later or add assessments manually from
            your course page. Usage allowances keep the service available; people on a shared
            network may share an allowance. A failed read does not save assessments or charge you.
          </p>
        </section>
        <section id="syllabus-privacy" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">How your syllabus is handled</h2>
          <p className="muted leading-relaxed">
            Uploading a syllabus or submitting pasted text sends its content and the selected course
            code/name and term dates to Command’s reader and its configured provider, Google Gemini
            or OpenAI. Your other academic records and private calendar links are not sent.
            Command’s operator manages the AI connection and its usage costs. The service uses
            temporary network-based usage counters to limit abuse, without saving your document or
            grades. Command keeps the original document only in memory and saves reviewed assessment
            details and source excerpts only after you confirm.
          </p>
          <p className="muted leading-relaxed">
            Command sends PDFs inline without creating persistent file uploads. OpenAI requests
            disable response storage; neither provider guarantees zero retention through this setup.
            Google’s free tier may use submitted content to improve its products and may involve
            human review. Only use non-sensitive syllabi with the free tier. Read{' '}
            <a className="underline" href="https://ai.google.dev/gemini-api/terms">
              Google’s data-use terms
            </a>{' '}
            and{' '}
            <a className="underline" href="https://developers.openai.com/api/docs/guides/your-data">
              OpenAI’s data controls
            </a>{' '}
            for current retention rules. Discarding a preview or erasing your workspace cannot undo
            a request already sent to the provider.
          </p>
        </section>
        <section id="assignments" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">3. Complete assignments</h2>
          <p className="leading-relaxed">
            Click an assignment on Home, Calendar or a course’s Assessments tab to open its editor.
            Tick Completed above the Status dropdown, then save the assessment.
          </p>
          <p className="muted leading-relaxed">
            Completed uses the Submitted status: it removes the work from unfinished deadline lists
            and puts it in Grades → Awaiting grades. It does not submit anything to Brightspace for
            you. The status dropdown remains available for Not started, In progress, Submitted and
            Graded.
          </p>
          <p className="muted leading-relaxed">
            Recorded grades already count as completed. Entering a score sets Graded automatically.
            Changing a graded assessment to an ungraded status clears its score, so use that only
            when you intend to remove the grade.
          </p>
        </section>
        <section id="grades" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">4. Enter and track grades</h2>
          <ol className="list-decimal space-y-3 pl-5 leading-relaxed">
            <li>
              Open{' '}
              <Link href="/grades" className="underline">
                Grades
              </Link>{' '}
              in the sidebar, or Enter grades on Home.
            </li>
            <li>
              Use Awaiting grades to find submitted work without a recorded score. Use All
              assessments if you have a grade for work you never marked completed.
            </li>
            <li>
              Enter Score received and Out of—for example, 18 out of 20—then click that row’s Save
              grade. You can enter grades for different courses on the same page.
            </li>
            <li>
              Use Recorded to review or update saved grades. Edit details opens the full assessment
              editor, including its course weight and notes. Select an older semester or All
              semesters to find previous work; enable Include archived courses when needed.
            </li>
          </ol>
          <p className="muted leading-relaxed">
            A blank score means no grade has been recorded; a zero is a real grade. Course averages
            use graded work and its course weights. Calendar imports start at 0% weight, so enter
            the weights from your syllabus before relying on the course average. Grade estimates are
            planning aids, not official results.
          </p>
          <p className="muted leading-relaxed">
            The awaiting-grades count is a reminder list, not confirmation that your instructor has
            published a result. Gmail notifications can be reviewed under Grades → Grade emails;
            Command does not directly access your Brightspace gradebook.
          </p>
        </section>
        <section id="email" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">Connect grade emails</h2>
          <p>
            Open Grades → Grade emails, connect the Gmail account receiving your forwarded school
            emails, and select Check emails now. Automatic checks run every five minutes while
            Command is open and visible. Review the suggested assessment and score before saving.
            Emails without a score remain notifications; Command cannot retrieve a score behind a
            Brightspace login.
          </p>
          <p>
            Use Email preferences to change the Gmail search filter or pause automatic checks.
            Disconnect Gmail removes email reviews while keeping saved grades.
          </p>
          <p>
            Grades only shows grade results and release notices. Open Updates in the sidebar for
            course announcements and assessment changes. For a deadline change, open Review an
            assessment deadline, confirm the matching assessment, date and time, then save. This
            updates the existing assessment and its calendar date without creating a duplicate or
            changing its grade. Other changes stay as notices for you to review in Gmail.
          </p>
          <GmailSetupGuide />
        </section>
        <section id="planning" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">5. Tasks, classes and events</h2>
          <ul className="list-disc space-y-3 pl-5 leading-relaxed">
            <li>
              Brightspace assignments, labs and quizzes import as assessments. They do not create
              tasks. Use Tasks for studying, preparing a report or working on an assignment, with
              priorities, time estimates and subtasks. Link a task to a course or assessment when
              useful. Check Completed to finish a task; this does not submit its linked assessment.
              Calendar sync does not change your planning tasks. Quizzes, midterms and finals with
              known dates get one study task when they are within 10 days. Find these in Your focus
              → Study ahead and in Tasks. Completing or deleting a study task prevents it from being
              recreated. Its name and date follow the assessment; editing its title, date or linked
              assessment turns it into a personal task.
            </li>
            <li>
              Use a course’s Schedule tab for recurring weekly classes. The semester dates determine
              when those classes appear.
            </li>
            <li>
              Use Calendar for your combined month/week view. Add personal events or study sessions;
              for all-day events, Last day is inclusive.
            </li>
            <li>
              Press Ctrl+K on Windows or Cmd+K on macOS to search commands, open pages and quickly
              add entries. Tab moves between controls; Escape closes a dialog.
            </li>
          </ul>
        </section>
        <section id="appearance" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">6. Appearance and study buddies</h2>
          <p className="leading-relaxed">
            In Settings → Appearance, choose Light, Dark or System, and pick Mochi, Sprout, Nimbus
            or Off. Disable Gentle movement for a still companion. Click Save preferences to keep
            your choices.
          </p>
          <p className="muted leading-relaxed">
            Your device’s reduced-motion setting also turns off decorative motion. The study buddy
            does not make sounds or block clicks.
          </p>
        </section>
        <section id="data" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">7. Your data</h2>
          <p className="leading-relaxed">
            Settings → Your data offers Download my data and Erase workspace data. The JSON download
            is a readable copy, not an automatic restore backup, and it excludes private calendar
            links.
          </p>
          <p className="muted leading-relaxed">
            Erasure removes records from the active database and stops calendar syncing. It cannot
            remove independent backups, previously downloaded files or your school’s calendar. Keep
            your private feed link and local database files out of public repositories.{' '}
            <Link href="/legal/privacy" className="underline">
              Read the privacy policy
            </Link>
            .
          </p>
        </section>
        <section id="troubleshooting" className="card scroll-mt-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold">8. Troubleshooting</h2>
          <details className="border-b border-[var(--border)] pb-3">
            <summary className="cursor-pointer py-2 font-medium">
              The calendar will not connect
            </summary>
            <p className="muted pt-2 leading-relaxed">
              Use the HTTPS or webcal subscription link, not a Brightspace sign-in page. Confirm
              feeds are still enabled at school. If Command reports blocked network access, restart
              it normally outside a restricted development session and check its network
              permissions. Re-pasting cannot fix blocked internet access. If no events appear, check
              the import dates.
            </p>
          </details>
          <details className="border-b border-[var(--border)] pb-3">
            <summary className="cursor-pointer py-2 font-medium">
              New school work is missing
            </summary>
            <p className="muted pt-2 leading-relaxed">
              Make sure the subscription includes the right courses and dates, then check its Last
              synced time in Settings. Some school work is not included in calendar feeds; add those
              assessments manually. Command can refresh while its browser tab is closed only if its
              local server is still running if you use the downloaded edition. On the hosted
              edition, open Command to trigger due checks or choose Sync now.
            </p>
          </details>
          <details>
            <summary className="cursor-pointer py-2 font-medium">
              The app will not open after restarting my computer
            </summary>
            <p className="muted pt-2 leading-relaxed">
              The current local version needs both its database and app server running. In the
              Command project folder, run npm run db:local in one terminal and npm start in another,
              then open http://127.0.0.1:3000 on that computer. Keep both running. A desktop
              installer is not included yet.
            </p>
          </details>
        </section>
      </div>
    </GuideLanguage>
  );
}
