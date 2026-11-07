'use client';

import { useState } from 'react';
import { T, useT } from './language-provider';
import { Button } from './ui/button';
import {
  courseCodeKey,
  sessionGroup,
  sessionKinds,
  sessionDateChoices,
  type SessionKind,
  type SyllabusSession,
  type SyllabusException,
  type SyllabusTiming,
  type SessionDateChoice,
} from '@/lib/syllabus-schedule';

export type SessionGroups = Partial<Record<SessionKind, string>>;
const kindLabels = { LECTURE: 'Lecture section', TUTORIAL: 'Tutorial section', LAB: 'Lab section' };
const weekdayLabel = (weekday: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2026, 0, 4 + weekday)),
  );

export function SyllabusSessions({
  sessions,
  courseCode,
  onChange,
  onConfirm,
}: {
  sessions: SyllabusSession[];
  courseCode: string;
  onChange: (kind: SessionKind) => void;
  onConfirm: (groups: SessionGroups) => void;
}) {
  const t = useT();
  const [groups, setGroups] = useState<SessionGroups>({});
  const available = sessions.filter(
    (s) => courseCodeKey(s.courseCode) === courseCodeKey(courseCode),
  );
  if (!available.length) return null;
  return (
    <div className="space-y-4 rounded-sm border border-[var(--primary)] p-4">
      <h3 className="font-semibold">
        <T text="Confirm your sessions" />
      </h3>
      <p className="muted text-sm">
        <T text="Choose your sections to turn scheduled weeks into dates. Nothing is saved until you review and save the assessments." />
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {sessionKinds.map((kind) => {
          const options = Array.from(
            new Map(
              available.filter((s) => s.kind === kind).map((s) => [sessionGroup(s), s]),
            ).values(),
          );
          return (
            options.length > 0 && (
              <label key={kind} className="space-y-2 text-sm">
                <span>{t(kindLabels[kind])}</span>
                <select
                  className="input"
                  value={groups[kind] || ''}
                  onChange={(event) => {
                    setGroups((current) => ({ ...current, [kind]: event.target.value }));
                    onChange(kind);
                  }}
                >
                  <option value="">{t('Choose your section')}</option>
                  {options.map((session) => (
                    <option key={sessionGroup(session)} value={sessionGroup(session)}>
                      {session.courseCode} · {session.section}
                      {' · '}
                      {available
                        .filter((s) => s.kind === kind && sessionGroup(s) === sessionGroup(session))
                        .map(
                          (s) =>
                            `${weekdayLabel(s.weekday, t.locale)} ${s.startTime || t('Time unknown')}`,
                        )
                        .join(' / ')}
                    </option>
                  ))}
                </select>
              </label>
            )
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={!Object.values(groups).some(Boolean)}
        onClick={() => onConfirm(groups)}
      >
        <T text="Confirm session dates" />
      </Button>
      <p className="muted text-xs">
        <T text="Only unambiguous dates are filled. Holidays, multiple possible sessions and unknown weeks need your review below. Dates you entered manually are preserved." />
      </p>
    </div>
  );
}

export function SyllabusSessionDate({
  timing,
  sessions,
  exceptions,
  courseCode,
  chosen,
  onChoose,
}: {
  timing: SyllabusTiming;
  sessions: SyllabusSession[];
  exceptions: SyllabusException[];
  courseCode: string;
  chosen?: SessionDateChoice | null;
  onChoose: (choice: SessionDateChoice | null) => void;
}) {
  const t = useT();
  const choices = sessionDateChoices(timing, sessions, courseCode, exceptions);
  return (
    <div className="space-y-3 rounded-sm bg-[var(--muted)] p-4 text-sm">
      <p className="font-medium">
        <T text="Scheduled session" />: {timing.label}
      </p>
      {timing.startDate && timing.endDate && (
        <p>
          {timing.startDate} – {timing.endDate}
        </p>
      )}
      {choices.length ? (
        <label className="block space-y-2">
          <span>
            <T text="Confirm a session date" />
          </span>
          <select
            className="input"
            value={chosen?.key || ''}
            onChange={(event) =>
              onChoose(
                choices.find((c) => c.key === event.target.value && !c.conflicts.length) || null,
              )
            }
          >
            <option value="">{t('Choose a session, or enter a date manually')}</option>
            {choices.map((choice) => (
              <option key={choice.key} value={choice.key} disabled={choice.conflicts.length > 0}>
                {choice.session.section} · {choice.date} {choice.time}
                {' · '}
                {weekdayLabel(choice.session.weekday, t.locale)}
                {choice.conflicts.length
                  ? ` · ${t('Schedule conflict')}: ${choice.conflicts.join(', ')}`
                  : ''}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="muted">
          <T text="A date cannot be calculated yet. Check the course code, session and week, or enter a date manually." />
        </p>
      )}
      {chosen && (
        <p className="text-primary">
          <T text="Date inferred from your confirmed session. Check it against course announcements." />
        </p>
      )}
      {choices.some((c) => c.conflicts.length) && (
        <p className="muted">
          <T text="Some sessions overlap a holiday or break. Confirm any exception with your instructor before entering a date manually." />
        </p>
      )}
      <details>
        <summary className="cursor-pointer text-primary">
          <T text="View schedule evidence" />
        </summary>
        <p className="muted mt-2 whitespace-pre-wrap">
          {timing.page ? `${t('Page')} ${timing.page}: ` : ''}
          {timing.source}
        </p>
        {chosen && (
          <p className="muted mt-2 whitespace-pre-wrap">
            {chosen.session.page ? `${t('Page')} ${chosen.session.page}: ` : ''}
            {chosen.session.source}
          </p>
        )}
      </details>
    </div>
  );
}
