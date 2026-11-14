'use client';
import { displayTaskTitle } from '@/lib/study-tasks';
import { T, useT } from '@/components/language-provider';

import { useState } from 'react';
import { scopeWorkspace } from '@/lib/workspace-scope';
import { SemesterFilter } from './semester-filter';
import { AssessmentWork } from './assessment-work';
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Circle,
  ListChecks,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Timer,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspace } from '@/components/workspace-provider';
import { dueLabel, formatTime, isOverdue } from '@/lib/dates';
import { filterTasks, sortTasks, type TaskSort, type TaskView } from '@/lib/tasks';
import type { Priority, Task, TaskStatus } from '@/lib/types';
import { statusLabel } from '@/components/editors/fields';

const views: { id: TaskView; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All tasks' },
];
const sortOptions: { id: string; label: string; sort: TaskSort; direction: 'asc' | 'desc' }[] = [
  { id: 'due-asc', label: 'Due date · earliest first', sort: 'due', direction: 'asc' },
  { id: 'due-desc', label: 'Due date · latest first', sort: 'due', direction: 'desc' },
  { id: 'priority-asc', label: 'Priority · highest first', sort: 'priority', direction: 'asc' },
  { id: 'priority-desc', label: 'Priority · lowest first', sort: 'priority', direction: 'desc' },
  { id: 'created-asc', label: 'Recently created', sort: 'created', direction: 'asc' },
  { id: 'created-desc', label: 'Oldest created', sort: 'created', direction: 'desc' },
  { id: 'title-asc', label: 'Title · A–Z', sort: 'title', direction: 'asc' },
  { id: 'title-desc', label: 'Title · Z–A', sort: 'title', direction: 'desc' },
];

export function TasksView() {
  const t = useT();
  const { data: workspace, now, save, openEditor } = useWorkspace();
  const [semesterId, setSemesterId] = useState('active');
  const [includeArchived, setIncludeArchived] = useState(false);
  const data = scopeWorkspace(workspace, { semesterId, includeArchived });
  const [view, setView] = useState<TaskView>('today');
  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('all');
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [sortId, setSortId] = useState('due-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const sort = sortOptions.find((option) => option.id === sortId) ?? sortOptions[0];
  const filterCount =
    Number(courseId !== 'all') +
    Number(priority !== 'all') +
    Number(status !== 'all') +
    Number(Boolean(dueFrom || dueTo));
  const hasFilters = filterCount > 0 || Boolean(search);
  const filtered = filterTasks(
    data.tasks,
    {
      view,
      courseId: courseId === 'personal' ? null : courseId,
      priority,
      status,
      search,
      dueFrom: dueFrom || undefined,
      dueTo: dueTo || undefined,
      showCompleted: view === 'all',
    },
    now,
  );
  const tasks = sortTasks(filtered, sort.sort, sort.direction);
  const dateError = dueFrom && dueTo && dueTo < dueFrom;
  const counts = Object.fromEntries(
    views.map((item) => [
      item.id,
      filterTasks(data.tasks, { view: item.id, showCompleted: item.id === 'all' }, now).length,
    ]),
  );
  const openCount = data.tasks.filter((task) => task.status !== 'COMPLETED').length;

  function clearFilters() {
    setSearch('');
    setCourseId('all');
    setPriority('all');
    setStatus('all');
    setDueFrom('');
    setDueTo('');
  }
  async function toggleTask(task: Task) {
    if (pending.has(task.id)) return;
    setPending((ids) => new Set(ids).add(task.id));
    setError('');
    try {
      await save(
        'tasks',
        { status: task.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED' },
        task.id,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to update this task. Please try again.',
      );
    } finally {
      setPending((ids) => {
        const next = new Set(ids);
        next.delete(task.id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-5">
      <header data-tour="tasks" className="page-header">
        <div>
          <p className="eyebrow mb-2">
            <T text="ONE STEP AT A TIME" />
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            <T text="Tasks" />
          </h1>
          <p className="muted mt-2 text-sm">
            <T text="A clear head starts with a clear list." /> {openCount}{' '}
            {openCount === 1 ? t('task') : t('tasks')} <T text="to go." />
          </p>
        </div>
        <Button data-tour="task-add" onClick={() => openEditor('tasks')}>
          <Plus size={16} />
          <T text="New task" />
        </Button>
      </header>
      <div className="flex flex-wrap items-center gap-4">
        <SemesterFilter
          semesters={workspace.semesters}
          value={semesterId}
          onChange={(value) => {
            setSemesterId(value);
            setCourseId('all');
          }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => {
              setIncludeArchived(event.target.checked);
              setCourseId('all');
            }}
          />
          <T text="Include archived courses" />
        </label>
      </div>
      <AssessmentWork assessments={data.assessments} courses={data.courses} />
      <div className="border-t border-border pt-5">
        <h2 className="section-title">{t('Study & personal tasks')}</h2>
        <p className="muted text-sm">{t('Study reminders, preparation and your own to-dos.')}</p>
      </div>
      <div data-tour="task-views" className="tabs overflow-x-auto" aria-label={t('Task views')}>
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab whitespace-nowrap ${view === item.id ? 'active' : ''}`}
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
          >
            {t(item.label)}
            <span
              className={`ml-2 text-xs ${item.id === 'overdue' && counts[item.id] > 0 ? 'text-[var(--destructive)]' : 'text-[var(--muted-foreground)]'}`}
            >
              {counts[item.id]}
            </span>
          </button>
        ))}
      </div>
      <section className="card overflow-hidden" aria-label={t('Your tasks')}>
        <div
          data-tour="task-filters"
          className="space-y-4 border-b border-[var(--border)] p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[180px] flex-1">
              <Search
                size={16}
                className="muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              />
              <Input
                aria-label={t('Search tasks')}
                placeholder={t('Search tasks…')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input-with-icon"
              />
            </div>
            <Button
              variant="outline"
              aria-expanded={showFilters}
              aria-controls="task-filters"
              onClick={() => setShowFilters((value) => !value)}
            >
              <SlidersHorizontal size={15} />
              <T text="Filters" />
              {filterCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-sm bg-[var(--primary)] text-[10px] text-[var(--primary-foreground)]">
                  {filterCount}
                </span>
              )}
              <ChevronDown size={13} className={showFilters ? 'rotate-180' : ''} />
            </Button>
            <select
              className="input w-full sm:w-auto sm:max-w-56"
              aria-label={t('Sort tasks')}
              value={sortId}
              onChange={(event) => setSortId(event.target.value)}
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {t(option.label)}
                </option>
              ))}
            </select>
          </div>
          {showFilters && (
            <div
              id="task-filters"
              className="grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-2 xl:grid-cols-5"
            >
              <div className="field">
                <Label htmlFor="task-course-filter">
                  <T text="Course" />
                </Label>
                <select
                  id="task-course-filter"
                  className="input"
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                >
                  <option value="all">
                    <T text="All courses" />
                  </option>
                  <option value="personal">
                    <T text="Personal / no course" />
                  </option>
                  {data.courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <Label htmlFor="task-priority-filter">
                  <T text="Priority" />
                </Label>
                <select
                  id="task-priority-filter"
                  className="input"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Priority | 'all')}
                >
                  <option value="all">
                    <T text="All priorities" />
                  </option>
                  {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((value) => (
                    <option key={value} value={value}>
                      {t(statusLabel(value))}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <Label htmlFor="task-status-filter">
                  <T text="Status" />
                </Label>
                <select
                  id="task-status-filter"
                  className="input"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as TaskStatus | 'all')}
                >
                  <option value="all">
                    <T text="All statuses" />
                  </option>
                  {['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].map((value) => (
                    <option key={value} value={value}>
                      {t(statusLabel(value))}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <Label htmlFor="task-date-from">
                  <T text="Due from" />
                </Label>
                <Input
                  id="task-date-from"
                  type="date"
                  value={dueFrom}
                  onChange={(event) => setDueFrom(event.target.value)}
                  max={dueTo || undefined}
                />
              </div>
              <div className="field">
                <Label htmlFor="task-date-to">
                  <T text="Due through" />
                </Label>
                <Input
                  id="task-date-to"
                  type="date"
                  value={dueTo}
                  onChange={(event) => setDueTo(event.target.value)}
                  min={dueFrom || undefined}
                />
              </div>
            </div>
          )}
          {hasFilters && (
            <div className="flex items-center justify-between gap-3 text-xs">
              <p className="muted">
                {tasks.length} {tasks.length === 1 ? t('match') : t('matches')}
                {filterCount > 0
                  ? ` · ${filterCount} active ${filterCount === 1 ? 'filter' : 'filters'}`
                  : ''}
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 font-medium text-[var(--primary)]"
                onClick={clearFilters}
              >
                <X size={12} />
                <T text="Clear filters" />
              </button>
            </div>
          )}
          {dateError && (
            <p role="alert" className="text-sm text-[var(--destructive)]">
              <T text="The end of the date range must be on or after its start." />
            </p>
          )}
        </div>
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/10 px-5 py-3 text-sm text-[var(--destructive)]"
          >
            <p>{t(error)}</p>
            <button type="button" aria-label={t('Dismiss error')} onClick={() => setError('')}>
              <X size={15} />
            </button>
          </div>
        )}
        {tasks.length ? (
          <ul data-tour="task-list" className="divide-y divide-[var(--border)]">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                busy={pending.has(task.id)}
                onToggle={() => toggleTask(task)}
              />
            ))}
          </ul>
        ) : (
          <div data-tour="task-list" className="empty-state px-6 py-8">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-sm bg-[var(--muted)] text-[var(--primary)]">
              {view === 'overdue' || view === 'completed' ? (
                <CheckCheck size={26} />
              ) : (
                <ListChecks size={26} />
              )}
            </div>
            <h2 className="text-lg font-semibold">
              {hasFilters
                ? t('No tasks match your filters')
                : view === 'today'
                  ? t('A fresh start for today')
                  : view === 'overdue'
                    ? t('You’re right on track')
                    : view === 'completed'
                      ? t('Small steps add up')
                      : view === 'upcoming'
                        ? t('A little room to plan ahead')
                        : t('Make space for what matters')}
            </h2>
            <p className="muted mx-auto mt-2 max-w-sm text-sm leading-relaxed">
              {hasFilters
                ? t('Try another search or clear your filters to see more tasks.')
                : view === 'overdue'
                  ? t('No overdue tasks. Enjoy the breathing room.')
                  : view === 'completed'
                    ? t('Completed tasks will collect here as you make progress.')
                    : view === 'today'
                      ? t('Nothing is due today. Choose your next small step.')
                      : t('Capture your next task and give it a place in your week.')}
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={hasFilters ? clearFilters : () => openEditor('tasks')}
            >
              {hasFilters ? <X size={15} /> : <Plus size={15} />}
              {hasFilters ? t('Clear filters') : t('Add a task')}
            </Button>
          </div>
        )}
        {tasks.length > 0 && (
          <div className="muted border-t border-[var(--border)] px-5 py-3 text-xs">
            {tasks.length} {tasks.length === 1 ? t('task') : t('tasks')}{' '}
            <T text="· Select a title to edit the details." />
          </div>
        )}
      </section>
    </div>
  );
}

function TaskRow({ task, busy, onToggle }: { task: Task; busy: boolean; onToggle: () => void }) {
  const t = useT();
  const { data, now, openEditor } = useWorkspace();
  const course = data.courses.find((item) => item.id === task.courseId);
  const completed = task.status === 'COMPLETED';
  const overdue = isOverdue(task.dueDate, task.status, now);
  const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;
  const priorityClass = {
    URGENT: 'text-destructive dark:text-destructive',
    HIGH: 'text-[var(--warning)] dark:text-[var(--warning)]',
    MEDIUM: 'text-[var(--warning)] dark:text-[var(--warning)]',
    LOW: 'text-[var(--muted-foreground)]',
  }[task.priority];
  return (
    <li className="group flex items-start gap-3 px-4 py-5 transition-colors hover:bg-[var(--muted)]/40 sm:gap-4 sm:px-5">
      <button
        type="button"
        role="checkbox"
        aria-checked={completed}
        aria-label={`${completed ? 'Reopen' : 'Complete'} ${task.title}`}
        disabled={busy}
        onClick={onToggle}
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm border transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] disabled:opacity-50 ${completed ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]' : 'border-[var(--control-border)] hover:border-[var(--primary)]'}`}
      >
        {busy ? (
          <Loader2 size={12} className="animate-spin" />
        ) : completed ? (
          <Check size={13} />
        ) : null}
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className={`text-left text-sm font-medium leading-6 transition-colors hover:text-[var(--primary)] ${completed ? 'text-[var(--muted-foreground)] line-through' : ''}`}
          onClick={() => openEditor('tasks', task.id)}
        >
          {displayTaskTitle(task, t.locale)}
        </button>
        <div className="muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          {course ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1"
              style={{ color: 'var(--foreground)', backgroundColor: 'var(--muted)' }}
            >
              <span
                className="size-1.5 rounded-sm"
                style={{
                  backgroundColor: `color-mix(in srgb, ${course.color} 70%, var(--muted-foreground))`,
                }}
              />
              {course.code}
            </span>
          ) : (
            <span>
              <T text="Personal" />
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 ${priorityClass}`}>
            <span className="size-1.5 rounded-sm bg-current" />
            {t(statusLabel(task.priority))}
          </span>
          {task.status === 'IN_PROGRESS' && (
            <span className="inline-flex items-center gap-1.5">
              <Circle size={11} className="text-[var(--primary)]" />
              <T text="In progress" />
            </span>
          )}
          {task.estimatedMinutes && (
            <span className="inline-flex items-center gap-1">
              <Timer size={12} />
              {task.estimatedMinutes >= 60
                ? `${Math.floor(task.estimatedMinutes / 60)}h${task.estimatedMinutes % 60 ? ` ${task.estimatedMinutes % 60}m` : ''}`
                : `${task.estimatedMinutes} min`}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span
              className="inline-flex items-center gap-1"
              aria-label={`${completedSubtasks} of ${task.subtasks.length} subtasks complete`}
            >
              <ListChecks size={13} />
              {completedSubtasks}/{task.subtasks.length}
            </span>
          )}
          <span className={`sm:hidden ${overdue ? 'text-[var(--destructive)]' : ''}`}>
            {overdue ? t('Overdue · ') : ''}
            {dueLabel(task.dueDate, now, t.locale)}
            {task.dueDate
              ? `, ${formatTime(task.dueDate, data.settings.timeFormat, t.locale)}`
              : ''}
          </span>
        </div>
      </div>
      <div
        className={`hidden shrink-0 pt-1 text-right text-xs sm:block ${overdue ? 'text-[var(--destructive)]' : 'muted'}`}
      >
        <p className="font-medium">
          {overdue ? t('Overdue · ') : ''}
          {dueLabel(task.dueDate, now, t.locale)}
        </p>
        {task.dueDate && (
          <p className="mt-1.5">{formatTime(task.dueDate, data.settings.timeFormat, t.locale)}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        aria-label={`Edit ${task.title}`}
        onClick={() => openEditor('tasks', task.id)}
      >
        <ArrowUpRight size={16} className="muted" />
      </Button>
    </li>
  );
}
