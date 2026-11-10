'use client';
import '@/app/assistant.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Send,
  Undo2,
  CalendarDays,
  Clock3,
  GraduationCap,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { useLanguage } from './language-provider';
import { useWorkspace } from './workspace-provider';
import {
  say,
  type AssistantReply,
  type ChatMessage,
  type ChatEntry,
  type SavedChat,
} from '@/lib/assistant';

type Entry = ChatEntry;

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
      conversationId?: string;
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
  const [chats, setChats] = useState<Omit<SavedChat, 'entries'>[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const initialized = useRef(false);
  const selectedChat = useRef<string | null>(null);
  useEffect(() => {
    selectedChat.current = chatId;
  }, [chatId]);
  const creating = useRef(false);
  const context = useRef<ChatMessage[]>([]);
  const sending = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  async function historyApi(id?: string, body?: object) {
    const response = await fetch(
      `/api/assistant/chats${id ? `?id=${encodeURIComponent(id)}&language=${language}` : ''}`,
      {
        cache: 'no-store',
        ...(body
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          : {}),
      },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error || s('Unable to load chats.', 'Impossible de charger les conversations.'),
      );
    return result;
  }
  function applyChat(chat: SavedChat) {
    if (!Array.isArray(chat.entries) || typeof chat.id !== 'string')
      throw new Error(s('Unable to load this chat.', 'Impossible de charger cette conversation.'));
    setChatId(chat.id);
    setEntries(chat.entries);
    context.current = [];
    setInput('');
    setRetry(null);
    setError('');
    setHistoryOpen(false);
    setDeleteId(null);
  }
  async function openChat(id: string) {
    setHistoryLoading(true);
    try {
      applyChat(await historyApi(id));
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }
  function newChat() {
    setChatId(null);
    setEntries([]);
    context.current = [];
    setInput('');
    setRetry(null);
    setError('');
    setHistoryOpen(false);
    setDeleteId(null);
    field.current?.focus();
  }
  async function removeChat() {
    if (!deleteId) return;
    setHistoryLoading(true);
    try {
      await historyApi(undefined, { action: 'delete', id: deleteId });
      if (chatId === deleteId) newChat();
      setChats((current) => current.filter((chat) => chat.id !== deleteId));
      setDeleteId(null);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/assistant/chats', { cache: 'no-store' });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!active) return;
        setChats(result.chats);
        const reopenId =
          selectedChat.current || (!initialized.current ? result.chats[0]?.id : null);
        if (reopenId) {
          const detail = await fetch(
            `/api/assistant/chats?id=${encodeURIComponent(reopenId)}&language=${language}`,
            {
              cache: 'no-store',
            },
          );
          if (!detail.ok) throw new Error();
          const chat = await detail.json();
          if (!Array.isArray(chat.entries) || typeof chat.id !== 'string') throw new Error();
          if (active) {
            setChatId(chat.id);
            setEntries(chat.entries);
            context.current = [];
          }
        }
        if (active) initialized.current = true;
      } catch {
        if (active)
          setError(
            language === 'fr'
              ? 'Impossible de charger les conversations. Rouvre le chat pour réessayer.'
              : 'Unable to load saved chats. Reopen the panel to retry.',
          );
      } finally {
        if (active) setHistoryLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, language]);
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
      void historyApi()
        .then((result) => setChats(result.chats))
        .catch(() => {});
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
    if (!text || busy || historyLoading || creating.current || configured === false) return;
    if (entries.some((e) => e.reply?.status === 'confirm' && !e.reply.actionsExpired)) {
      setError(
        s(
          'Confirm or cancel the pending change first.',
          'Confirme ou annule d’abord la modification en attente.',
        ),
      );
      return;
    }
    creating.current = true;
    setBusy(true);
    let conversationId = chatId;
    try {
      if (!conversationId) {
        const chat = await historyApi(undefined, { action: 'create' });
        if (!chat.id)
          throw new Error(s('Unable to start a chat.', 'Impossible de créer une conversation.'));
        conversationId = chat.id;
        setChatId(chat.id);
      }
    } catch (failure) {
      setError((failure as Error).message);
      setBusy(false);
      creating.current = false;
      return;
    }
    const messages = [...context.current, { role: 'user' as const, text }].slice(-11);
    const requestId = crypto.randomUUID();
    setEntries((current) => [...current, { key: `user:${requestId}`, role: 'user', text }]);
    setInput('');
    await request({
      action: 'message',
      id: requestId,
      conversationId: conversationId!,
      language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      messages,
    });
    creating.current = false;
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
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setHistoryLoading(true);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="assistant-trigger">
          <AssistantMark />
          <span>{s('Ask Command', 'Demander à Command')}</span>
          <span className="assistant-trigger-badge" aria-hidden="true">
            AI
          </span>
        </Button>
      </DialogTrigger>
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
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <Link
              href="/guide#assistant"
              onClick={() => setOpen(false)}
              className="text-primary underline underline-offset-4"
            >
              {s('What can I ask?', 'Que puis-je demander ?')}
            </Link>
            <button
              type="button"
              aria-expanded={historyOpen}
              aria-controls="assistant-history"
              disabled={busy || historyLoading}
              onClick={() => {
                setHistoryOpen((value) => !value);
                setDeleteId(null);
              }}
              className="assistant-history-control"
            >
              {s('Recent chats', 'Conversations récentes')}
            </button>
            <button
              type="button"
              disabled={busy || historyLoading}
              className="text-muted-foreground underline underline-offset-4 disabled:opacity-50"
              onClick={newChat}
            >
              {s('New chat', 'Nouvelle conversation')}
            </button>
          </div>
          {chatId && (
            <p className="assistant-chat-title">
              {chats.find((chat) => chat.id === chatId)?.title ||
                s('New chat', 'Nouvelle conversation')}
            </p>
          )}
          {historyLoading && (
            <p role="status" className="text-xs mt-2">
              {s('Loading chats…', 'Chargement des conversations…')}
            </p>
          )}
          {historyOpen && (
            <div id="assistant-history" className="assistant-history">
              {!chats.length && (
                <p>
                  {s('Your conversations will appear here.', 'Tes conversations apparaîtront ici.')}
                </p>
              )}
              {chats.map((chat) => (
                <div className="assistant-history-row" key={chat.id}>
                  <button
                    type="button"
                    disabled={historyLoading || busy}
                    aria-current={chatId === chat.id ? 'true' : undefined}
                    onClick={() => void openChat(chat.id)}
                  >
                    {chat.title || s('New chat', 'Nouvelle conversation')}
                    <small>
                      {new Date(chat.updatedAt).toLocaleDateString(
                        language === 'fr' ? 'fr-CA' : 'en-CA',
                      )}
                    </small>
                  </button>
                  <button
                    type="button"
                    disabled={historyLoading || busy}
                    aria-label={`${s('Delete chat', 'Supprimer la conversation')} : ${chat.title || s('New chat', 'Nouvelle conversation')}`}
                    onClick={() => setDeleteId(chat.id)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {deleteId && (
            <div
              className="assistant-delete-confirm"
              role="group"
              aria-label={s('Delete this chat?', 'Supprimer cette conversation ?')}
            >
              <p>
                {s(
                  'Delete this conversation? Its messages and Undo controls will be removed. Saved grades and calendar events will stay.',
                  'Supprimer cette conversation ? Ses messages et commandes Annuler seront retirés. Les notes et événements enregistrés seront conservés.',
                )}
              </p>
              <button type="button" disabled={historyLoading} onClick={() => void removeChat()}>
                {s('Delete conversation', 'Supprimer la conversation')}
              </button>
              <button type="button" disabled={historyLoading} onClick={() => setDeleteId(null)}>
                {s('Keep chat', 'Garder la conversation')}
              </button>
            </div>
          )}
        </header>
        <div
          ref={scroll}
          className="assistant-messages"
          role="log"
          tabIndex={0}
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
                  {entry.reply.status === 'confirm' && !entry.reply.actionsExpired && (
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
                  {entry.reply.status === 'saved' && !entry.reply.actionsExpired && (
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
                  {entry.reply.actionsExpired &&
                    ['saved', 'confirm'].includes(entry.reply.status) && (
                      <span className="text-xs text-muted-foreground">
                        {s(
                          'Action expired. Open the entry to make changes.',
                          'Action expirée. Ouvre l’élément pour le modifier.',
                        )}
                      </span>
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
              disabled={busy || historyLoading || !input.trim() || configured === false}
              aria-label={s('Send message', 'Envoyer')}
            >
              <Send size={17} />
            </Button>
          </form>
          <p className="assistant-privacy">
            {s(
              'Chats are saved privately in your workspace until you delete them. Only recent context from this chat goes to Google Gemini. Avoid personal or confidential information on the free tier.',
              'Les conversations sont enregistrées dans ton espace privé jusqu’à leur suppression. Seul le contexte récent de cette conversation est envoyé à Google Gemini. Évite les renseignements personnels ou confidentiels avec le niveau gratuit.',
            )}{' '}
            <Link href="/legal/privacy" onClick={() => setOpen(false)} className="underline">
              {s('Privacy details', 'Détails de confidentialité')}
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
