'use client';
import '@/app/assistant.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Undo2, CalendarDays, Clock3, GraduationCap, ArrowUpRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from './language-provider';
import { useWorkspace } from './workspace-provider';
import { say, type AssistantReply, type ChatMessage } from '@/lib/assistant';

type Entry = { key: string; role: 'user' | 'assistant'; text: string; reply?: AssistantReply };

function AssistantMark({ className = '' }: { className?: string }) {
  return (
    <span className={`assistant-mark ${className}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <ellipse cx="24" cy="24" rx="18" ry="9" transform="rotate(-40 24 24)" />
        <ellipse cx="24" cy="24" rx="18" ry="9" transform="rotate(40 24 24)" />
        <circle cx="24" cy="24" r="5" />
        <circle cx="38" cy="13" r="2" className="assistant-mark-satellite" />
      </svg>
    </span>
  );
}
type RequestBody =
  | {
      action: 'message';
      id: string;
      language: 'en' | 'fr';
      timeZone: string;
      messages: ChatMessage[];
    }
  | { action: 'confirm' | 'cancel' | 'undo'; id: string };
export function AssistantPanel() {
  const { language } = useLanguage();
  const s = (en: string, fr: string) => say(language, en, fr);
  const { refresh } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState<RequestBody | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const context = useRef<ChatMessage[]>([]);
  const sending = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch('/api/assistant', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (active) setConfigured(result.configured === true);
      })
      .catch(() => {
        if (active) setConfigured(null);
      });
    return () => {
      active = false;
    };
  }, [open]);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = entries.length ? scroll.current.scrollHeight : 0;
  }, [entries, busy, open]);
  async function request(body: RequestBody) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    setRetry(null);
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || s('Please try again.', 'Réessaie.'));
      const reply = result as AssistantReply;
      setEntries((current) => {
        const entry: Entry = { key: reply.id, role: 'assistant', text: reply.text, reply };
        return current.some((e) => e.key === reply.id)
          ? current.map((e) => (e.key === reply.id ? entry : e))
          : [...current, entry];
      });
      // Keep conversational/read context, but clear completed write actions so they cannot replay.
      if (body.action === 'message')
        context.current =
          reply.context || reply.status === 'clarify'
            ? ([
                ...body.messages,
                { role: 'model', text: (reply.context || reply.text).slice(0, 2000) },
              ].slice(-10) as ChatMessage[])
            : [];
      if (reply.status === 'saved' || reply.status === 'undone') {
        try {
          await refresh();
        } catch {
          setError(
            s(
              'Saved, but the page could not refresh. Refresh the page to see your change.',
              'Enregistré, mais la page n’a pas pu s’actualiser. Actualise la page pour voir la modification.',
            ),
          );
        }
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : s('Unable to send. Try again.', 'Envoi impossible. Réessaie.'),
      );
      setRetry(body); // Retry the same ID; the server cannot apply it twice.
    } finally {
      sending.current = false;
      setBusy(false);
      field.current?.focus();
    }
  }
  async function send() {
    const text = input.trim();
    if (!text || busy || configured === false) return;
    if (entries.some((e) => e.reply?.status === 'confirm')) {
      setError(
        s(
          'Confirm or cancel the pending change first.',
          'Confirme ou annule d’abord la modification en attente.',
        ),
      );
      return;
    }
    const messages = [...context.current, { role: 'user' as const, text }].slice(-11);
    setEntries((current) => [
      ...current,
      { key: `user:${crypto.randomUUID()}`, role: 'user', text },
    ]);
    setInput('');
    await request({
      action: 'message',
      id: crypto.randomUUID(),
      language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      messages,
    });
  }
  const examples = [
    s('What’s planned this week?', 'Qu’est-ce qui est prévu cette semaine ?'),
    s(
      'Schedule a study session tomorrow at 6 pm for one hour.',
      'Planifie une séance d’étude demain à 18 h pour une heure.',
    ),
    s('I got 9/10 on Assignment 1 in SEG3102.', 'J’ai eu 9/10 au devoir 1 de SEG3102.'),
  ];
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="assistant-trigger"
      >
        <AssistantMark />
        <span>{s('Ask Command', 'Demander à Command')}</span>
        <span className="assistant-trigger-badge" aria-hidden="true">
          AI
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="assistant-panel" overlayClassName="assistant-overlay">
          <header className="assistant-heading">
            <div className="assistant-heading-brand">
              <AssistantMark />
              <span>
                COMMAND <b>AI</b>
              </span>
            </div>
            <DialogTitle>{s('Ask Command', 'Demander à Command')}</DialogTitle>
            <DialogDescription>
              {s(
                'Your week, your study plans, your grades.',
                'Ta semaine, tes séances d’étude, tes notes.',
              )}
            </DialogDescription>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <Link
                href="/guide#assistant"
                onClick={() => setOpen(false)}
                className="text-primary underline underline-offset-4"
              >
                {s('What can I ask?', 'Que puis-je demander ?')}
              </Link>
              <button
                type="button"
                disabled={busy || entries.some((e) => e.reply?.status === 'confirm')}
                className="text-muted-foreground underline underline-offset-4 disabled:opacity-50"
                onClick={() => {
                  setEntries([]);
                  context.current = [];
                  setError('');
                  setRetry(null);
                }}
              >
                {s('New chat', 'Nouvelle conversation')}
              </button>
            </div>
          </header>
          <div
            ref={scroll}
            className="assistant-messages"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {!entries.length && (
              <div className="assistant-welcome">
                <div className="assistant-hero-art" aria-hidden="true">
                  <AssistantMark />
                  <span className="assistant-orbit assistant-orbit-one" />
                  <span className="assistant-orbit assistant-orbit-two" />
                </div>
                <p className="assistant-eyebrow">
                  {s('YOUR STUDY SIDEKICK', 'TON ALLIÉ POUR ÉTUDIER')}
                </p>
                <h3 className="assistant-welcome-title">
                  {s(
                    'What would make today a little easier?',
                    'Comment rendre ta journée un peu plus facile ?',
                  )}
                </h3>
                <div className="assistant-examples">
                  {examples.map((example, index) => (
                    <button
                      type="button"
                      className="assistant-example"
                      key={example}
                      onClick={() => {
                        setInput(example);
                        field.current?.focus();
                      }}
                    >
                      <span className="assistant-example-icon" aria-hidden="true">
                        {index === 0 ? (
                          <CalendarDays size={18} />
                        ) : index === 1 ? (
                          <Clock3 size={18} />
                        ) : (
                          <GraduationCap size={18} />
                        )}
                      </span>
                      <span>{example}</span>
                      <ArrowUpRight
                        className="assistant-example-arrow"
                        size={15}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
                <p className="assistant-welcome-hint">
                  {s(
                    'Pick an example to edit before sending. Changes show a result and an Undo button.',
                    'Choisis un exemple à modifier avant l’envoi. Chaque modification affiche son résultat et un bouton Annuler.',
                  )}
                </p>
              </div>
            )}
            {entries.map((entry) => (
              <article
                key={entry.key}
                className={`assistant-message assistant-message-${entry.role}`}
              >
                <p className="assistant-message-author">
                  {entry.role === 'assistant' && <AssistantMark />}
                  {entry.role === 'user' ? s('You', 'Toi') : 'Command'}
                  {entry.role === 'assistant' && (
                    <span className="assistant-message-badge" aria-hidden="true">
                      AI
                    </span>
                  )}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {entry.text}
                </p>
                {!!entry.reply?.items?.length && (
                  <div className="assistant-result-list">
                    {entry.reply.items.map((item, index) => (
                      <div className="assistant-result-card" key={`${item.title}:${index}`}>
                        <span className="assistant-result-icon" aria-hidden="true">
                          <CalendarDays size={17} />
                        </span>
                        <div>
                          <p className="assistant-result-title">
                            {item.href ? (
                              <Link href={item.href} onClick={() => setOpen(false)}>
                                {item.title}
                              </Link>
                            ) : (
                              item.title
                            )}
                          </p>
                          <p className="assistant-result-detail">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {entry.reply && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {entry.reply.status === 'confirm' && (
                      <>
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => request({ action: 'confirm', id: entry.reply!.id })}
                        >
                          {s('Confirm change', 'Confirmer')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => request({ action: 'cancel', id: entry.reply!.id })}
                        >
                          {s('Cancel', 'Annuler')}
                        </Button>
                      </>
                    )}
                    {entry.reply.status === 'saved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => request({ action: 'undo', id: entry.reply!.id })}
                      >
                        <Undo2 size={14} />
                        {s('Undo', 'Annuler')}
                      </Button>
                    )}
                    {entry.reply.href && (
                      <Link
                        className="text-xs text-primary underline underline-offset-4"
                        href={entry.reply.href}
                        onClick={() => setOpen(false)}
                      >
                        {entry.reply.href === '/grades'
                          ? s('Open grades', 'Voir les notes')
                          : entry.reply.href.startsWith('/courses')
                            ? s('Open courses', 'Voir les cours')
                            : s('Open calendar', 'Voir le calendrier')}
                      </Link>
                    )}
                  </div>
                )}
              </article>
            ))}
            {busy && (
              <p role="status" className="assistant-thinking">
                <AssistantMark />
                {s('Working on it…', 'Un instant…')}
                <span className="assistant-thinking-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </p>
            )}
          </div>
          <div className="assistant-composer">
            {configured === false && (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {s(
                  'Gemini isn’t configured yet. See Ask Command in the user guide.',
                  'Gemini n’est pas encore configuré. Consulte le guide.',
                )}
              </p>
            )}
            {error && (
              <div role="alert" className="mb-3 text-sm text-destructive">
                {error}
                {retry && (
                  <button className="ml-2 underline" disabled={busy} onClick={() => request(retry)}>
                    {s('Retry', 'Réessayer')}
                  </button>
                )}
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
              className="assistant-input-shell"
            >
              <label className="sr-only" htmlFor="assistant-message">
                {s('Message Command', 'Message à Command')}
              </label>
              <textarea
                ref={field}
                id="assistant-message"
                rows={2}
                maxLength={2000}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={s(
                  'Ask about your week or tell me what to save…',
                  'Pose une question ou indique quoi enregistrer…',
                )}
                className="assistant-input"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="assistant-send"
                disabled={busy || !input.trim() || configured === false}
                aria-label={s('Send message', 'Envoyer')}
              >
                <Send size={17} />
              </Button>
            </form>
            <p className="assistant-privacy">
              {s(
                'Messages and recent conversation context are sent to Google Gemini, without your full workspace or emails. Google may use free-tier messages to improve its products. Chat clears on refresh.',
                'Les messages et le contexte récent de la conversation sont envoyés à Google Gemini, sans ton espace complet ni tes courriels. Google peut utiliser les messages gratuits pour améliorer ses produits. La conversation disparaît à l’actualisation.',
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
