'use client'

// PurvaGuard AI — AI Preparedness Assistant view
//
// Multilingual chat interface backed by /api/assistant (which in turn calls
// z-ai-web-dev-sdk on the server). Designed to degrade gracefully: if the
// model is unavailable, a deterministic fallback reply is shown and a yellow
// banner explains the situation. Chat history persists to localStorage so it
// survives view switches.

import * as React from 'react'
import { Bot, Send, Trash2, Info, AlertTriangle, Languages, ShieldAlert, MessageSquare } from 'lucide-react'
import { useApp } from '@/lib/store'
import { LANGUAGES } from '@/lib/constants'
import { apiPost } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// --- types ----------------------------------------------------------------

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** present for assistant messages after the API responds */
  sources?: string[]
  /** present for assistant messages; reflects whether the live model was used */
  modelStatus?: 'online' | 'unavailable'
  /** ISO timestamp of when the message was added */
  ts: string
}

interface AssistantApiResponse {
  reply: string
  sources?: string[]
  modelStatus: 'online' | 'unavailable'
  language: string
}

// --- constants ------------------------------------------------------------

const STORAGE_KEY = 'purvaguard-chat'

const SUGGESTED_PROMPTS = [
  'What are landslide warning signs?',
  'What should I do during a flash flood?',
  'How do I prepare a household emergency kit?',
  'Is it safe to travel on NH-10 tonight?',
]

const DISCLAIMER_TEXT =
  'This assistant provides general preparedness guidance only. It is NOT an official warning. In imminent danger, contact local emergency services directly.'

// --- helpers --------------------------------------------------------------

function loadChat(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m): m is ChatMessage =>
        m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string'
    )
  } catch {
    return []
  }
}

function saveChat(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return
  try {
    // Keep only the last 50 messages to avoid blowing through localStorage.
    const trimmed = messages.slice(-50)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // best-effort; ignore quota errors silently
  }
}

function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? 'English'
}

/**
 * Splits an assistant reply into its body and an optional trailing
 * "Source: ..." line so we can render the source as a citation chip
 * instead of plain text inside the bubble.
 */
function splitSourceLine(reply: string): { body: string; source?: string } {
  const match = reply.match(/\n\s*Source:\s*(.+?)\s*$/i)
  if (!match) return { body: reply }
  const body = reply.slice(0, match.index).replace(/\s+$/, '')
  const source = match[1].trim()
  return { body, source }
}

// --- component ------------------------------------------------------------

export default function AssistantView() {
  const { language, location } = useApp()

  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)
  const [showSources, setShowSources] = React.useState(false)
  const [showedUnavailableBanner, setShowedUnavailableBanner] = React.useState(false)
  const [hydrated, setHydrated] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)

  // Hydrate from localStorage on mount.
  React.useEffect(() => {
    const loaded = loadChat()
    setMessages(loaded)
    setHydrated(true)
  }, [])

  // Persist whenever messages change (after hydration).
  React.useEffect(() => {
    if (!hydrated) return
    saveChat(messages)
  }, [messages, hydrated])

  // Auto-scroll to bottom on new messages / typing indicator.
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Use rAF so layout settles before scrolling.
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [messages, isSending])

  // Determine whether to show the "model unavailable" banner:
  // visible only if the most recent assistant message was a fallback.
  const lastAssistant = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i]
    }
    return null
  }, [messages])

  React.useEffect(() => {
    setShowedUnavailableBanner(lastAssistant?.modelStatus === 'unavailable')
  }, [lastAssistant])

  // --- actions -----------------------------------------------------------

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isSending) return

      const userMsg: ChatMessage = {
        role: 'user',
        content: trimmed,
        ts: new Date().toISOString(),
      }

      // Optimistically append the user message; we'll append the assistant
      // reply once the API responds.
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsSending(true)

      // Build the history we forward to the API (everything except the
      // message we just appended).
      const history = [...messages, userMsg]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(0, -1) // exclude the just-added user message
        .map((m) => ({ role: m.role, content: m.content }))

      try {
        const res = await apiPost<AssistantApiResponse>('/api/assistant', {
          message: trimmed,
          history,
          language,
        })

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: res.reply ?? '',
          sources: Array.isArray(res.sources) ? res.sources : undefined,
          modelStatus: res.modelStatus ?? 'online',
          ts: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      } catch (err: any) {
        // The API is designed to never throw 5xx — but if the network is
        // down entirely, surface a graceful fallback locally too.
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content:
            'I cannot reach the assistant service right now. For imminent danger, contact your local emergency services directly. (Fallback guidance: move to higher ground for floods; move away from slopes for landslides; Drop-Cover-Hold for earthquakes.)',
          sources: [
            'Preparedness guidance — landslide/flash-flood/earthquake (reviewed content)',
          ],
          modelStatus: 'unavailable',
          ts: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        toast.error('Assistant unreachable — showing fallback guidance.', {
          description: String(err?.message ?? 'Network error'),
        })
      } finally {
        setIsSending(false)
        // Refocus the input for fast back-and-forth.
        requestAnimationFrame(() => textareaRef.current?.focus())
      }
    },
    [isSending, language, messages]
  )

  const onTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    saveChat([])
    toast.success('Chat history cleared. Minimal history retained.')
  }

  const languageName = languageLabel(language)

  return (
    <div className="mx-auto w-full max-w-4xl px-3 sm:px-4 py-6">
      {/* Header card ------------------------------------------------------ */}
      <Card className="border-border/80">
        <CardHeader className="gap-3 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Bot className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  AI Preparedness Assistant
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1 text-[10px] font-semibold',
                      showedUnavailableBanner
                        ? 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        showedUnavailableBanner ? 'bg-yellow-500' : 'bg-emerald-500'
                      )}
                    />
                    {showedUnavailableBanner ? 'Offline fallback' : 'Online'}
                  </Badge>
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Languages className="h-3 w-3" />
                    {languageName}
                  </span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {messages.length} message{messages.length === 1 ? '' : 's'}
                  </span>
                  {location?.name ? (
                    <>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        {location.name}
                      </span>
                    </>
                  ) : null}
                </CardDescription>
              </div>
            </div>
          </div>

          <Alert className="mt-1 border-amber-200 bg-amber-50/80 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-900 dark:text-amber-200 text-xs font-semibold">
              Not an official warning
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-300 text-xs">
              {DISCLAIMER_TEXT}
            </AlertDescription>
          </Alert>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* Unavailable banner ------------------------------------------ */}
          {showedUnavailableBanner ? (
            <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong className="font-semibold">Assistant model unavailable</strong> — showing
                deterministic fallback guidance. For imminent danger, contact your local emergency
                services directly.
              </div>
            </div>
          ) : null}

          {/* Messages area ---------------------------------------------- */}
          <div
            ref={scrollRef}
            className="h-[55vh] overflow-y-auto scrollbar-thin rounded-lg border border-border/60 bg-muted/20 p-3"
          >
            {messages.length === 0 ? (
              <EmptyState onPick={(p) => void send(p)} disabled={isSending} />
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((m, i) => (
                  <MessageBubble
                    key={`${i}-${m.ts}`}
                    message={m}
                    showSources={showSources}
                  />
                ))}
                {isSending ? <TypingIndicator /> : null}
              </div>
            )}
          </div>

          {/* Suggested prompts ------------------------------------------ */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={isSending}
                onClick={() => void send(p)}
                className={cn(
                  'inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground/80 transition-colors',
                  'hover:bg-muted hover:text-foreground',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input row -------------------------------------------------- */}
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onTextareaKeyDown}
              placeholder="Ask about landslides, flash floods, earthquakes, road safety, household preparedness…"
              rows={2}
              disabled={isSending}
              className="min-h-[44px] resize-none field-sizing-content max-h-40"
              aria-label="Message the assistant"
            />
            <Button
              type="button"
              size="icon"
              onClick={() => void send(input)}
              disabled={isSending || !input.trim()}
              aria-label="Send message"
              className="h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Press <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">Enter</kbd> to send,
            <kbd className="ml-1 rounded border bg-muted px-1 py-0.5 text-[10px]">Shift</kbd>+
            <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">Enter</kbd> for a new line.
          </p>

          <Separator />

          {/* Footer controls -------------------------------------------- */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
              <Switch checked={showSources} onCheckedChange={setShowSources} aria-label="Show source citations" />
              Show source citations
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              disabled={messages.length === 0}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear chat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- subcomponents --------------------------------------------------------

function MessageBubble({ message, showSources }: { message: ChatMessage; showSources: boolean }) {
  const isUser = message.role === 'user'
  const { body, source } = React.useMemo(() => splitSourceLine(message.content), [message.content])

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="flex gap-2 max-w-[90%] sm:max-w-[80%]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm text-foreground shadow-sm whitespace-pre-wrap break-words">
            {body || message.content}
          </div>

          {showSources ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {(message.sources && message.sources.length > 0 ? message.sources : source ? [source] : [])
                .map((s, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[10px] font-medium border-border/70 bg-background text-muted-foreground"
                  >
                    <Info className="h-3 w-3" />
                    {s}
                  </Badge>
                ))}
              {message.modelStatus === 'unavailable' ? (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700"
                >
                  Fallback
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
          <Bot className="h-4 w-4" />
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 shadow-sm">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onPick, disabled }: { onPick: (p: string) => void; disabled: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Bot className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Ask the preparedness assistant</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Get concise, actionable guidance on landslides, flash floods, earthquakes, heavy rain,
          road safety, and household preparedness for the Himalayan &amp; North Eastern Region.
        </p>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 max-w-md">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p)}
            className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
