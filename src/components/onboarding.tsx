'use client';

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Dialog as Primitive } from 'radix-ui';
import { ArrowLeft, ArrowRight, BookOpen, Compass, Terminal } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { LanguageSwitch, useT } from './language-provider';
import { Button } from './ui/button';

type TourStep = {
  path: string;
  target: string;
  title: string;
  body: string;
  hint?: string;
  navigation?: string;
};
const steps: TourStep[] = [
  {
    path: '/courses',
    target: 'nav-courses',
    navigation: 'Courses',
    title: 'Start with Courses',
    body: 'Click the glowing Courses button on the left. We will explore this page together, one thing at a time.',
  },
  {
    path: '/courses',
    target: 'course-terms',
    title: 'Choose your term',
    body: 'Manage terms lets you create, rename or remove a semester, and choose the one you are working in.',
  },
  {
    path: '/courses',
    target: 'course-import',
    title: 'Start from a syllabus',
    body: 'Import a syllabus to suggest a course, assessments, dates and grade weights. You review the suggestions before saving anything.',
  },
  {
    path: '/courses',
    target: 'course-add',
    title: 'Or add a course yourself',
    body: 'Use Add course when you want to enter the course name and code yourself.',
    hint: 'No need to add anything during this tour.',
  },
  {
    path: '/courses',
    target: 'course-filters',
    title: 'Find the course you need',
    body: 'Search by name or code, choose a semester, or show courses you have archived.',
  },
  {
    path: '/courses',
    target: 'course-list',
    title: 'A home for each subject',
    body: 'Your course cards appear here. Open one to see its assessments, grades and class schedule.',
  },
  {
    path: '/calendar',
    target: 'nav-calendar',
    navigation: 'Calendar',
    title: 'Next, your Calendar',
    body: 'Click Calendar on the left to see where classes and deadlines come together.',
  },
  {
    path: '/calendar',
    target: 'calendar-connect',
    title: 'Bring in your deadlines',
    body: 'Connect your Brightspace calendar using its subscription link. Synced assignments, labs and exams are saved as assessments.',
    hint: 'You can connect it after the tour.',
  },
  {
    path: '/calendar',
    target: 'calendar-add',
    title: 'Make room for personal plans',
    body: 'Add event is for plans such as an appointment or a study group.',
  },
  {
    path: '/calendar',
    target: 'calendar-controls',
    title: 'Look ahead at your pace',
    body: 'Move between dates, return to Today, or switch between Month and Week.',
  },
  {
    path: '/calendar',
    target: 'calendar-filters',
    title: 'Show just what you need',
    body: 'Choose a term or course, show personal events, and include completed work when you need it.',
  },
  {
    path: '/calendar',
    target: 'calendar-grid',
    title: 'Open a calendar item',
    body: 'Click an item to see its details. Brightspace-linked assessments also have a link back to Brightspace.',
  },
  {
    path: '/tasks',
    target: 'nav-tasks',
    navigation: 'Tasks',
    title: 'Now, your Tasks',
    body: 'Click Tasks on the left. This is where your own study plans live.',
  },
  {
    path: '/tasks',
    target: 'task-add',
    title: 'Plan one small step',
    body: 'Create tasks such as studying a chapter or preparing a report. Assignments, quizzes and exams belong in assessments.',
  },
  {
    path: '/tasks',
    target: 'task-views',
    title: 'Pick a useful view',
    body: 'Use these tabs to see the tasks that need your attention or revisit completed work.',
  },
  {
    path: '/tasks',
    target: 'task-filters',
    title: 'Find and sort your tasks',
    body: 'Search for a task, sort the list, or open Filters to narrow it by course, priority, status or due date.',
  },
  {
    path: '/tasks',
    target: 'task-list',
    title: 'Check off your progress',
    body: 'Your tasks appear here. Use the checkbox beside a task to mark it complete.',
    hint: 'A study task appears when a quiz or exam is within 10 days.',
  },
  {
    path: '/grades',
    target: 'nav-grades',
    navigation: 'Grades',
    title: 'Next, your Grades',
    body: 'Click Grades on the left to see where you can record your results.',
  },
  {
    path: '/grades',
    target: 'grades-add',
    title: 'Add an assessment',
    body: 'Add assignments, labs, quizzes and exams here if you have not already imported them.',
  },
  {
    path: '/grades',
    target: 'grades-awaiting',
    title: 'Remember grades that arrive later',
    body: 'Assessments you mark Completed stay on the awaiting-grades list until you record a score.',
    hint: 'This list does not check whether your school has released a grade.',
  },
  {
    path: '/grades',
    target: 'grades-filters',
    title: 'Find an assessment quickly',
    body: 'Search by name or choose a course and term to narrow the list.',
  },
  {
    path: '/grades',
    target: 'grades-views',
    title: 'Separate waiting and recorded grades',
    body: 'Switch between all assessments, those awaiting grades and results you have recorded.',
  },
  {
    path: '/grades',
    target: 'grades-results',
    title: 'Record your results here',
    body: 'Enter your score and the total possible points, then save the grade. Edit details lets you adjust the assessment weight.',
    hint: 'A blank score means ungraded, not zero.',
  },
  {
    path: '/',
    target: 'nav-home',
    navigation: 'Home',
    title: 'Finally, back Home',
    body: 'Click Home on the left for a calmer view of what to do next.',
  },
  {
    path: '/',
    target: 'focus',
    title: 'One clear focus',
    body: 'Your focus brings together your next tasks and study reminders for upcoming quizzes and exams.',
    hint: 'You can replay this tour anytime from the User guide.',
  },
];

const Context = createContext({ active: false, navigationTarget: '', replay: () => {} });
export const useOnboarding = () => useContext(Context);

export function TourReplay() {
  const t = useT();
  const { replay } = useOnboarding();
  return (
    <Button variant="outline" onClick={replay}>
      <Compass aria-hidden />
      {t('Take the guided tour')}
    </Button>
  );
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { data, save } = useWorkspace();
  const router = useRouter();
  const [phase, setPhase] = useState<'welcome' | 'tour' | null>(() =>
    data.settings.onboardingCompleted ? null : 'welcome',
  );
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function begin() {
    setStep(0);
    setError('');
    setPhase('tour');
  }
  function move(index: number) {
    setStep(index);
    if (!steps[index].navigation) router.push(steps[index].path, { scroll: false });
  }
  async function finish() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (!data.settings.onboardingCompleted)
        await save('settings', { onboardingCompleted: true }, 'preferences');
      setPhase(null);
      router.push('/');
      requestAnimationFrame(() => document.getElementById('main-content')?.focus());
    } catch {
      setError('Could not save your tour preference. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        active: phase !== null,
        navigationTarget: phase === 'tour' && steps[step].navigation ? steps[step].target : '',
        replay: begin,
      }}
    >
      {phase === 'welcome' ? (
        <Welcome onBegin={begin} onSkip={finish} busy={busy} error={error} />
      ) : (
        <>
          <div
            inert={phase === 'tour'}
            data-tour-background
            data-touring={phase === 'tour' || undefined}
          >
            {children}
          </div>
          {phase === 'tour' && (
            <SpotlightTour step={step} onMove={move} onFinish={finish} busy={busy} error={error} />
          )}
        </>
      )}
    </Context.Provider>
  );
}

function Welcome({
  onBegin,
  onSkip,
  busy,
  error,
}: {
  onBegin: () => void;
  onSkip: () => void;
  busy: boolean;
  error: string;
}) {
  const t = useT();
  return (
    <div className="welcome-screen">
      <header className="welcome-topbar">
        <span className="welcome-brand">
          <span className="brand-symbol">
            <Terminal size={20} aria-hidden />
          </span>
          Command
        </span>
        <LanguageSwitch />
      </header>
      <main className="welcome-main" id="main-content">
        <div className="welcome-illustration" aria-hidden>
          <BookOpen size={38} strokeWidth={1.3} />
        </div>
        <p className="welcome-eyebrow">{t('YOUR SPACE, AT YOUR PACE')}</p>
        <h1>{t('Welcome to Command.')}</h1>
        <p className="welcome-description">
          {t('Your courses, deadlines and study plans, with a little more breathing room.')}
        </p>
        <div className="welcome-invitation">
          <p>{t('Let’s get comfortable, one step at a time.')}</p>
          <span>{t('One page at a time. Go at your own pace, or skip anytime.')}</span>
        </div>
        <div className="welcome-actions">
          <Button onClick={onBegin} disabled={busy}>
            {t('Show me around')}
            <ArrowRight aria-hidden />
          </Button>
          <Button variant="outline" onClick={onSkip} disabled={busy}>
            {busy ? t('Saving…') : t('I’ll explore on my own')}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm mt-4">
            {t(error)}
          </p>
        )}
        <p className="welcome-footnote">
          {t('There is nothing to set up right now. You can start small.')}
        </p>
      </main>
      <footer className="welcome-footer">{t('A little more clarity.')}</footer>
    </div>
  );
}

type Box = { x: number; y: number; width: number; height: number };
function SpotlightTour({
  step,
  onMove,
  onFinish,
  busy,
  error,
}: {
  step: number;
  onMove: (step: number) => void;
  onFinish: () => void;
  busy: boolean;
  error: string;
}) {
  const t = useT();
  const path = usePathname();
  const current = steps[step];
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [leaving, setLeaving] = useState(false);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (moveTimer.current !== null) clearTimeout(moveTimer.current);
    },
    [],
  );
  const [geometry, setGeometry] = useState<{
    target: string;
    box: Box;
    hit: Box;
    left: number;
    top: number;
    maxHeight: number;
  } | null>(null);
  useLayoutEffect(() => {
    let frame = 0;
    let scrolled = false;
    function measure() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const target =
        current.navigation || path === current.path
          ? document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`)
          : null;
      // Measure hidden incoming content before revealing it. A previous target's
      // geometry must never make the next instruction visible during navigation.
      if (!target || !target.getBoundingClientRect().width) return;
      const panelWidth = panel?.offsetWidth || Math.min(368, width - 32);
      const naturalPanelHeight = panel?.scrollHeight || 300;
      if (!scrolled) {
        scrolled = true;
        if (current.navigation) {
          const sidebar = target.closest('.sidebar-inner');
          if (sidebar)
            sidebar.scrollTop += target.getBoundingClientRect().top - Math.min(180, height / 4);
        } else {
          window.scrollTo({
            top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - 32),
            behavior: 'instant',
          });
        }
      }
      const bounds = target.getBoundingClientRect();
      const x = Math.max(8, bounds.left - 8);
      const y = Math.max(16, bounds.top - 8);
      const spaceAtRight = width - bounds.right >= panelWidth + 40;
      // On short screens, let the instructions scroll rather than cover the target.
      const maxHeight = spaceAtRight
        ? height - 32
        : Math.max(140, height - y - Math.min(bounds.height + 16, 120) - 32);
      const panelHeight = Math.min(naturalPanelHeight + 2, maxHeight);
      const availableHeight = spaceAtRight ? height - y - 16 : height - y - panelHeight - 40;
      const box = {
        x,
        y,
        width: Math.max(0, Math.min(bounds.right + 8, width - 8) - x),
        height: Math.max(24, Math.min(bounds.bottom + 8 - y, availableHeight)),
      };
      const left = spaceAtRight
        ? bounds.right + 24
        : Math.max(16, Math.min(x, width - panelWidth - 16));
      const top = Math.max(
        16,
        Math.min(spaceAtRight ? y : y + box.height + 16, height - panelHeight - 16),
      );
      setGeometry({
        target: current.target,
        box,
        hit: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        left,
        top,
        maxHeight,
      });
    }
    function queue() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }
    measure();
    const observer = new MutationObserver(queue);
    const background = document.querySelector('[data-tour-background]');
    if (background) observer.observe(background, { childList: true, subtree: true });
    const resize = new ResizeObserver(queue);
    if (background) resize.observe(background);
    if (panel) resize.observe(panel);
    window.addEventListener('resize', queue);
    window.addEventListener('scroll', queue, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener('resize', queue);
      window.removeEventListener('scroll', queue, true);
    };
  }, [current, path, t.locale, panel]);
  const ready =
    geometry?.target === current.target && (Boolean(current.navigation) || path === current.path);
  const box = geometry?.box;
  const visible = Boolean(ready && !leaving);
  useEffect(() => {
    if (ready) heading.current?.focus({ preventScroll: true });
  }, [step, ready]);
  function move(index: number) {
    if (busy || !ready || moveTimer.current !== null) return;
    // Fade out the OLD instruction before changing its text, route or position.
    // Reduced-motion users get the same positioning guarantee without a delay.
    setLeaving(true);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
    moveTimer.current = setTimeout(() => {
      moveTimer.current = null;
      setLeaving(false);
      onMove(index);
    }, duration);
  }
  function finish() {
    if (moveTimer.current !== null) clearTimeout(moveTimer.current);
    moveTimer.current = null;
    setLeaving(false);
    onFinish();
  }
  return (
    <Primitive.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) finish();
      }}
    >
      <Primitive.Portal>
        <Primitive.Overlay className="tour-shade">
          <svg width="100%" height="100%" aria-hidden>
            <defs>
              <mask id="command-tour-mask">
                <rect width="100%" height="100%" fill="white" />
                {box && (
                  <rect
                    {...{ x: box.x, y: box.y, width: box.width, height: box.height }}
                    rx="14"
                    className="tour-spotlight"
                    style={{ opacity: visible ? 1 : 0 }}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="#0b0b14"
              fillOpacity="0.78"
              mask="url(#command-tour-mask)"
            />
            {box && (
              <rect
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                rx="14"
                fill="none"
                className="tour-spotlight"
                style={{ opacity: visible ? 1 : 0 }}
                stroke="var(--primary)"
                strokeWidth="2"
              />
            )}
          </svg>
        </Primitive.Overlay>
        <Primitive.Content
          className="tour-dialog"
          style={{ pointerEvents: 'none' }}
          data-step={step}
          data-ready={ready || undefined}
          data-transition={leaving ? 'leaving' : ready ? 'ready' : 'positioning'}
          data-positioned-target={geometry?.target}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            if (!busy) finish();
          }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            heading.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById('main-content')?.focus();
          }}
        >
          {current.navigation && ready && (
            // The modal keeps the rest of the workspace inert. This accessible
            // hit area sits exactly over the real sidebar link, within the focus trap.
            <button
              type="button"
              className="tour-navigation-hit"
              aria-label={t(current.navigation)}
              style={{
                left: geometry.hit.x,
                top: geometry.hit.y,
                width: geometry.hit.width,
                height: geometry.hit.height,
              }}
              onClick={() => move(step + 1)}
              disabled={busy || leaving}
            />
          )}
          <div
            ref={setPanel}
            className="tour-panel"
            aria-hidden={!ready || undefined}
            style={{
              left: geometry?.left ?? 16,
              top: geometry?.top ?? 80,
              visibility: ready ? 'visible' : 'hidden',
              opacity: visible ? 1 : 0,
              maxHeight: geometry?.maxHeight,
            }}
          >
            <div className="tour-progress">
              <span>
                {t('A little tour')} · {step + 1} / {steps.length}
              </span>
              <span aria-hidden className="tour-dots">
                {['/courses', '/calendar', '/tasks', '/grades', '/'].map((route) => (
                  <span key={route} className={route === current.path ? 'current' : ''} />
                ))}
              </span>
            </div>
            <div aria-live="polite" aria-atomic="true">
              <Primitive.Title asChild>
                <h2 ref={heading} tabIndex={-1}>
                  {t(current.title)}
                </h2>
              </Primitive.Title>
              <Primitive.Description className="tour-description">
                {t(current.body)}
              </Primitive.Description>
              {current.hint && <p className="tour-hint">{t(current.hint)}</p>}
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm mb-3">
                {t(error)}
              </p>
            )}
            <div className="tour-controls">
              <Button variant="ghost" size="sm" disabled={busy || leaving} onClick={finish}>
                {t('Skip tour')}
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t('Previous step')}
                    disabled={busy || leaving}
                    onClick={() => move(step - 1)}
                  >
                    <ArrowLeft aria-hidden />
                  </Button>
                )}
                {!current.navigation && (
                  <Button
                    size="sm"
                    disabled={busy || leaving || !ready}
                    onClick={() => (step === steps.length - 1 ? finish() : move(step + 1))}
                  >
                    {busy
                      ? t('Saving…')
                      : step === steps.length - 1
                        ? t('Ready to begin')
                        : t('Next')}
                    <ArrowRight aria-hidden />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
