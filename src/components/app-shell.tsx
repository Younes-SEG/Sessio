'use client';
import { OnboardingProvider, useOnboarding } from './onboarding';
import { T, useT } from '@/components/language-provider';
import { useState, type ReactNode } from 'react';
import { LanguageSwitch } from './language-provider';
import Link from 'next/link';
import { scopeWorkspace } from '@/lib/workspace-scope';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  Bell,
  CalendarDays,
  CheckSquare2,
  ChevronRight,
  Home,
  GraduationCap,
  CircleHelp,
  Menu,
  Moon,
  Plus,
  Search,
  Settings2,
  Sun,
  Terminal,
} from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { CommandPalette } from './command-palette';
import { EditorHost } from './editors/editor-host';
import { useCardEntrance } from './use-card-entrance';
import { StudyBuddy } from './study-buddy';
import { LegalFooter } from './legal-footer';
import { SignOutButton } from './auth-panel';
import { SchoolUpdatesBadge } from './email-updates';
import { addDays, isOverdue, toDate } from '@/lib/dates';
const navigation = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare2 },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/grades', label: 'Grades', icon: GraduationCap },
  { href: '/updates', label: 'Updates', icon: Bell },
];
function Sidebar({ onNavigate, onQuickAdd }: { onNavigate?: () => void; onQuickAdd: () => void }) {
  const t = useT();
  const { navigationTarget } = useOnboarding();
  const { data: workspace, now } = useWorkspace();
  const data = scopeWorkspace(workspace);
  const path = usePathname();
  const semester = data.semesters.find((s) => s.isActive);
  const courses = data.courses.filter(
    (c) => !c.archived && (!semester || c.semesterId === semester.id),
  );
  const archivedIds = new Set(data.courses.filter((c) => c.archived).map((c) => c.id));
  const awaitingGrades = data.assessments.filter(
    (a) => a.status === 'SUBMITTED' && !archivedIds.has(a.courseId),
  ).length;
  const overdue = data.tasks.filter(
    (t) => (!t.courseId || !archivedIds.has(t.courseId)) && isOverdue(t.dueDate, t.status, now),
  ).length;
  const start = toDate(semester?.startDate);
  const end = toDate(semester?.endDate);
  const progress =
    start && end
      ? Math.max(
          0,
          Math.min(
            100,
            ((now.getTime() - start.getTime()) / (addDays(end, 1).getTime() - start.getTime())) *
              100,
          ),
        )
      : 0;
  return (
    <div className="sidebar-inner">
      <Link className="brand" href="/" onClick={onNavigate}>
        <span className="brand-symbol" aria-hidden>
          <Terminal size={19} strokeWidth={2.2} />
        </span>
        Command
      </Link>
      <div className="workspace-label">
        <T text="A little more clarity." />
      </div>
      <Button variant="outline" className="sidebar-add" onClick={onQuickAdd}>
        <Plus size={15} />
        <T text="Quick add" />
        <kbd className="ml-auto">⌘ K</kbd>
      </Button>
      <div className="nav-label">
        <T text="Your workspace" />
      </div>
      <nav aria-label={t('Main navigation')}>
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link
            data-tour={`nav-${label.toLowerCase()}`}
            data-tour-active={navigationTarget === `nav-${label.toLowerCase()}` || undefined}
            key={href}
            href={href}
            onClick={onNavigate}
            className={`nav-link ${path === href || (href !== '/' && path.startsWith(href)) ? 'active' : ''}`}
            aria-current={path === href ? 'page' : undefined}
          >
            <Icon />
            {t(label)}
            {href === '/updates' && <SchoolUpdatesBadge />}
            {href === '/grades' && awaitingGrades > 0 && (
              <span className="nav-count" aria-label={`${awaitingGrades} awaiting grades`}>
                {awaitingGrades}
              </span>
            )}
            {href === '/tasks' && overdue > 0 && (
              <span className="nav-count" title={`${overdue} overdue tasks`}>
                {overdue}
              </span>
            )}
          </Link>
        ))}
      </nav>
      {courses.length > 0 && (
        <div className="sidebar-courses">
          <div className="nav-label flex justify-between">
            <T text="This semester" />
            <Link href="/courses" onClick={onNavigate} aria-label={t('View courses')}>
              <ArrowUpRight size={12} />
            </Link>
          </div>
          {courses.slice(0, 7).map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              onClick={onNavigate}
              className="nav-link"
            >
              <span className="course-dot" style={{ background: course.color }} />
              {course.code}
            </Link>
          ))}
        </div>
      )}
      <div className="sidebar-bottom">
        <LanguageSwitch />
        <Link
          href="/guide"
          onClick={onNavigate}
          className={`nav-link ${path === '/guide' ? 'active' : ''}`}
        >
          <CircleHelp />
          <T text="User guide" />
        </Link>
        <Link
          href="/settings"
          onClick={onNavigate}
          className={`nav-link ${path === '/settings' ? 'active' : ''}`}
        >
          <Settings2 />
          <T text="Settings" />
        </Link>
        {data.hosted && <SignOutButton className="nav-link w-full" />}
        {semester && (
          <div className="semester-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold">{semester.name}</span>
              <span className="size-1.5 rounded-full bg-[var(--green)]" />
            </div>
            <p className="text-[9px] muted mb-3">
              <T text="One day at a time. You've got this." />
            </p>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-[9px] muted mt-2">
              {Math.round(progress)}
              <T text="% through the semester" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <OnboardingProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </OnboardingProvider>
  );
}
function WorkspaceShell({ children }: { children: ReactNode }) {
  const { active: onboarding, navigationTarget } = useOnboarding();
  const t = useT();
  const { data, save } = useWorkspace();
  const path = usePathname();
  const contentRef = useCardEntrance(path, !onboarding);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState('');
  const name =
    path === '/guide'
      ? 'User guide'
      : path === '/settings'
        ? 'Settings'
        : navigation.find((n) => (n.href === '/' ? path === '/' : path.startsWith(n.href)))
            ?.label || 'Workspace';
  async function toggleTheme() {
    try {
      const dark = document.documentElement.classList.contains('dark');
      await save('settings', { theme: dark ? 'LIGHT' : 'DARK' }, 'preferences');
      setError('');
    } catch {
      setError('Could not save theme. Try again.');
    }
  }
  function quickAdd() {
    setMobileOpen(false);
    setCommandOpen(true);
  }
  return (
    <>
      <a href="#main-content" className="skip-link">
        <T text="Skip to content" />
      </a>
      <aside className="app-sidebar" data-tour-navigation={Boolean(navigationTarget) || undefined}>
        <Sidebar onQuickAdd={quickAdd} />
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-location flex min-w-0 items-center gap-3">
            <Button
              className="min-[761px]:hidden"
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label={t('Open navigation')}
            >
              <Menu />
            </Button>
            <div className="breadcrumbs">
              <span className="workspace-crumb">
                <T text="Personal workspace" />
              </span>
              <ChevronRight className="workspace-crumb" size={12} />
              <strong>{t(name)}</strong>
              {path.startsWith('/courses/') && (
                <>
                  <ChevronRight size={12} />
                  <span>{data.courses.find((c) => c.id === path.split('/')[2])?.code}</span>
                </>
              )}
            </div>
          </div>
          <div className="topbar-actions flex shrink-0 items-center gap-2 sm:gap-4">
            <LanguageSwitch />
            <button
              aria-label={t('Search your workspace')}
              className="global-search"
              onClick={() => setCommandOpen(true)}
            >
              <Search size={15} />
              <span className="desktop-search-label">
                <T text="Search your workspace" />
              </span>
              <kbd className="hidden sm:inline">Ctrl K</kbd>
            </button>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={t('Toggle color theme')}
            >
              <Sun className="hidden dark:block" />
              <Moon className="dark:hidden" />
            </Button>
            <Link
              href="/settings"
              className="flex size-8 items-center justify-center rounded-full bg-[var(--accent)] text-primary text-xs font-semibold"
              aria-label={t('Personal settings')}
            >
              {data.settings.displayName?.[0]?.toUpperCase() || 'Y'}
            </Link>
          </div>
        </header>
        {error && (
          <p role="alert" className="px-8 pt-3 text-destructive text-xs">
            {t(error)}
          </p>
        )}
        <main ref={contentRef} id="main-content" tabIndex={-1} className="page-content">
          {children}
        </main>
        <LegalFooter />
      </div>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="mobile-nav">
          <DialogTitle className="sr-only">
            <T text="Navigation" />
          </DialogTitle>
          <DialogDescription className="sr-only">
            <T text="Navigate your personal workspace." />
          </DialogDescription>
          <Sidebar onNavigate={() => setMobileOpen(false)} onQuickAdd={quickAdd} />
        </DialogContent>
      </Dialog>
      {!onboarding && (
        <>
          <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
          <EditorHost />
          <StudyBuddy />
        </>
      )}
    </>
  );
}
