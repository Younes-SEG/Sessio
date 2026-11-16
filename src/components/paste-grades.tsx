'use client';
import { useId, useState, type ClipboardEvent } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { T, useT } from './language-provider';
import { useWorkspace } from './workspace-provider';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import {
  cellsFromText,
  describe,
  planPastedGrades,
  readPastedGrades,
  type PastePlanRow,
} from '@/lib/pasted-grades';
import type { Assessment, Course } from '@/lib/types';

/** Reads an HTML table from the clipboard, expanding column spans so columns stay aligned. */
function cellsFromHtml(html: string): string[][] | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = [...doc.querySelectorAll('tr')].map((tr) =>
    [...tr.querySelectorAll('th,td')].flatMap((cell) => {
      const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
      const span = Math.min(Number((cell as HTMLTableCellElement).colSpan) || 1, 10);
      return [text, ...Array(span - 1).fill('')];
    }),
  );
  return rows.length ? rows : null;
}

const notes: Record<PastePlanRow['note'], string> = {
  new: 'No grade in Command yet.',
  same: 'Already saved in Command.',
  different: 'Command already has a different grade. Tick Import to replace it.',
  unmatched: 'No matching assessment. Choose one, or import your syllabus first.',
  duplicate: 'Another row already uses this assessment.',
};

export function PasteGrades({
  course,
  assessments,
}: {
  course: Course;
  assessments: Assessment[];
}) {
  const t = useT();
  const id = useId();
  const { refresh } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [htmlCells, setHtmlCells] = useState<string[][] | null>(null);
  const [plan, setPlan] = useState<PastePlanRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function reset() {
    setText('');
    setHtmlCells(null);
    setPlan(null);
    setError('');
  }
  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const html = event.clipboardData.getData('text/html');
    setHtmlCells(html.includes('<t') ? cellsFromHtml(html) : null);
    setPlan(null);
    setMessage('');
  }
  function read() {
    const rows = readPastedGrades(htmlCells || cellsFromText(text));
    setMessage('');
    if (!rows.length) {
      setPlan(null);
      setError('No grades found. Copy the whole grades table, including the Points column.');
      return;
    }
    setError('');
    setPlan(planPastedGrades(rows, assessments));
  }
  function choose(index: number, assessmentId: string) {
    setPlan((rows) =>
      rows!.map((row, i) => {
        if (i !== index) return row;
        const target = assessments.find((a) => a.id === assessmentId);
        if (!target) return { ...row, assessmentId: '', action: 'skip', note: 'unmatched' };
        const taken = rows!.some((r, j) => j !== i && r.assessmentId === assessmentId);
        return taken
          ? { ...row, assessmentId, action: 'skip', note: 'duplicate' }
          : describe(row.grade, target);
      }),
    );
  }
  async function save() {
    const chosen = plan!.filter((r) => r.action === 'update' && r.assessmentId);
    if (new Set(chosen.map((r) => r.assessmentId)).size !== chosen.length) {
      setError('Choose a different assessment for each grade.');
      return;
    }
    setBusy(true);
    setError('');
    let saved = 0;
    for (const row of chosen) {
      const response = await fetch(`/api/assessments/${encodeURIComponent(row.assessmentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: row.grade.score,
          maxScore: row.grade.maxScore,
          status: 'GRADED',
        }),
      }).catch(() => null);
      if (response?.status === 401 || response?.status === 403) {
        window.location.reload();
        return;
      }
      if (response?.ok) saved++;
    }
    try {
      await refresh();
    } catch {
      /* The next page load shows the saved grades. */
    }
    setBusy(false);
    reset();
    if (saved < chosen.length)
      setError('Some grades could not be saved. Check them and try again.');
    setMessage(`${t('Grades saved:')} ${saved}`);
  }

  const selectable = assessments;
  return (
    <section className="card space-y-4 p-4 sm:p-5" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="section-title">
          <T text="Paste grades from Brightspace" />
        </h2>
        {!open && (
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            <ClipboardPaste aria-hidden />
            <T text="Paste grades" />
          </Button>
        )}
      </div>
      {message && (
        <p role="status" className="text-sm text-primary">
          {message}
        </p>
      )}
      {open && (
        <fieldset disabled={busy} className="space-y-4">
          <p className="text-sm">
            <T text="Open the course's Grades page in Brightspace, select the whole table, copy it and paste it here. Only scores are read; comments and feedback are not saved." />
          </p>
          <label className="block space-y-2 text-sm font-medium">
            <span>
              <T text="Grades table" />
            </span>
            <Textarea
              rows={6}
              maxLength={200000}
              value={text}
              onPaste={onPaste}
              onChange={(e) => {
                setText(e.target.value);
                if (!e.target.value) setHtmlCells(null);
                setPlan(null);
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={read} disabled={!text.trim()}>
              <T text="Read grades" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              <T text="Cancel" />
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {t(error)}
            </p>
          )}
          {plan && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                <T text="Review grades" /> · {course.code}
              </h3>
              <ul className="space-y-3">
                {plan.map((row, index) => {
                  const current = selectable.find((a) => a.id === row.assessmentId);
                  return (
                    <li
                      key={index}
                      className="grid gap-3 rounded-sm border border-[var(--border)] p-3 sm:grid-cols-[1fr_14rem]"
                    >
                      <div className="space-y-1 text-sm">
                        <label className="flex items-center gap-2 font-medium">
                          <input
                            type="checkbox"
                            checked={row.action === 'update'}
                            disabled={!row.assessmentId || row.note === 'duplicate'}
                            onChange={(e) =>
                              setPlan(
                                plan.map((r, i) =>
                                  i === index
                                    ? { ...r, action: e.target.checked ? 'update' : 'skip' }
                                    : r,
                                ),
                              )
                            }
                          />
                          <span>
                            <T text="Import" />: {row.grade.name} · {row.grade.score} /{' '}
                            {row.grade.maxScore}
                          </span>
                        </label>
                        <p className="muted text-xs">
                          {t(notes[row.note])}
                          {current && current.score !== null && (
                            <>
                              {' '}
                              <T text="In Command:" /> {current.score} / {current.maxScore}
                            </>
                          )}
                        </p>
                        {row.grade.dropped && (
                          <p className="muted text-xs">
                            <T text="Dropped in Brightspace. Command applies your best-of rule itself." />
                          </p>
                        )}
                      </div>
                      <label className="space-y-1 text-xs">
                        <span>
                          <T text="Save to" />
                        </span>
                        <select
                          className="input"
                          value={row.assessmentId}
                          onChange={(e) => choose(index, e.target.value)}
                        >
                          <option value="">{t('Not imported')}</option>
                          {selectable.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <Button
                type="button"
                onClick={save}
                disabled={!plan.some((r) => r.action === 'update' && r.assessmentId)}
              >
                <T text="Save selected grades" />
              </Button>
            </div>
          )}
        </fieldset>
      )}
    </section>
  );
}
