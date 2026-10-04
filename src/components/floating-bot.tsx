'use client'

import * as React from 'react'
import { io } from 'socket.io-client'
import {
  Bot, X, Send, Mic, MicOff, Volume2, Trash2, Info, Languages, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { LANGUAGES } from '@/lib/constants'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  ts: number
  isVoice?: boolean
}



const LANG_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ne: 'ne-NP',
  as: 'as-IN',
}

const SUGGESTED = [
  'What are landslide warning signs?',
  'What should I do during a flash flood?',
  'How do I prepare an emergency kit?',
  'Is it safe to travel now?',
]

export function FloatingBot() {
  const { language, location } = useApp()
  const [open, setOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [listening, setListening] = React.useState(false)
  const [voiceSupported, setVoiceSupported] = React.useState(false)
  const [interimText, setInterimText] = React.useState('')
  const speechListenerRef = React.useRef<{ remove: () => Promise<void> } | null>(null)
  const speechStateListenerRef = React.useRef<any>(null)
  
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  // Load persisted chat
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('purvaguard-chat')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setMessages(parsed)
      }
    } catch {}
  }, [])

  // Save chat
  React.useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('purvaguard-chat', JSON.stringify(messages.slice(-30)))
    }
  }, [messages])

  // Check voice support
  React.useEffect(() => {
    let mounted = true

  const checkVoice = async () => {
    try {
      const { available } = await SpeechRecognition.available()
      if (mounted) setVoiceSupported(available)
    } catch {
      if (mounted) setVoiceSupported(false)
    }
  }

  checkVoice()

  return () => {
    mounted = false
  }
  }, [])

  // Auto-scroll
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, interimText])

  const send = React.useCallback(async (text: string, isVoice = false) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed, ts: Date.now(), isVoice }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setInterimText('')
    setSending(true)

    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
      const res = await apiPost<{ reply: string; modelStatus: string; sources?: string[] }>('/api/assistant', {
        message: trimmed,
        history,
        language,
      })
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.reply,
        ts: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])

      // If voice input, speak the response (optional)
      if (isVoice && 'speechSynthesis' in window) {
        try {
          const utter = new SpeechSynthesisUtterance(res.reply)
          utter.lang = LANG_MAP[language] || 'en-IN'
          utter.rate = 0.95
          window.speechSynthesis.speak(utter)
        } catch {}
      }
    } catch (e: any) {
      const fallback: ChatMessage = {
        role: 'assistant',
        content: 'I cannot reach the assistant service right now. For imminent danger, contact your local emergency services directly. (Fallback: move to higher ground for floods; move away from slopes for landslides; Drop-Cover-Hold for earthquakes.)',
        ts: Date.now(),
      }
      setMessages((prev) => [...prev, fallback])
      toast.error('Assistant unavailable — using fallback guidance')
    } finally {
      setSending(false)
    }
  }, [messages, sending, language])

const toggleVoice = React.useCallback(async () => {
  try {
    // If already listening, stop recognition.
    // The listeningState listener below will automatically send
    // the final recognized text.
    if (listening) {
  await SpeechRecognition.forceStop()


  return
}

    const permission = await SpeechRecognition.requestPermissions()

    if (permission.speechRecognition !== 'granted') {
      toast.error('Microphone permission is required for voice input.')
      return
    }

    const { available } = await SpeechRecognition.available()

    if (!available) {
      toast.error('Speech recognition is not available on this device.')
      return
    }

    // Remove listeners from the previous voice session.
    await speechListenerRef.current?.remove()
    speechListenerRef.current = null

    // Receive live transcription.
    speechListenerRef.current = await SpeechRecognition.addListener(
      'partialResults',
       async (event) => {
        const text =
          event.accumulatedText?.trim() ||
          event.matches?.[0]?.trim() ||
          ''

        if (text) {
          setInterimText(text)
          if (event.forced) {
    setListening(false)
    await send(text, true)
    setInterimText('')
  }
        }
      }
    )

    // Automatically send when recognition stops.
    

    setInterimText('')
    setListening(true)

    await SpeechRecognition.start({
      language: LANG_MAP[language] || 'en-IN',
      maxResults: 3,
      partialResults: true,
      popup: false,
    })
  } catch (error) {
    console.error('Native speech recognition error:', error)
    setListening(false)
    setInterimText('')
    toast.error('Voice recognition failed. Please try again.')
  }
}, [listening, language, send])
  const clearChat = () => {
    setMessages([])
    localStorage.removeItem('purvaguard-chat')
    toast.success('Chat history cleared')
  }

  const langLabel = LANGUAGES.find((l) => l.code === language)?.label || 'English'

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all lg:bottom-6',
          'bg-primary text-primary-foreground hover:scale-105 hover:shadow-xl',
          listening && 'animate-pulse ring-4 ring-red-400/50'
        )}
        aria-label="Open AI assistant"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-36 right-4 z-50 w-[calc(100vw-2rem)] max-w-md lg:bottom-24 lg:right-6">
          <div className="flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden h-[min(70vh,560px)]">
            {/* Header */}
            <div className="flex items-center gap-2 border-b bg-primary p-3 text-primary-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                <Bot className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold leading-tight">PurvaGuard AI Assistant</div>
                <div className="flex items-center gap-1 text-[10px] opacity-90">
                  <Languages className="h-3 w-3" />
                  {langLabel}
                  <span className="mx-1">·</span>
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{location.name}</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={clearChat} aria-label="Clear chat">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-1.5 bg-amber-50 dark:bg-amber-900/20 p-2 text-[10px] text-amber-800 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              <span>General preparedness guidance only. Not an official warning. For emergencies, contact local authorities directly.</span>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3 bg-muted/30">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <Bot className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Ask me about disaster safety, preparedness, or current risks.</p>
                  <div className="flex flex-col gap-1.5">
                    {SUGGESTED.map((s) => (
                      <button key={s} onClick={() => send(s)} className="rounded-lg border border-border bg-card px-3 py-2 text-left text-xs hover:bg-muted transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border border-border rounded-bl-sm'
                  )}>
                    {m.isVoice && <Mic className="inline h-3 w-3 mr-1 opacity-60" />}
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}
              {interimText && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-primary/50 text-primary-foreground italic">
                    {interimText}…
                  </div>
                </div>
              )}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-3 py-2 bg-card border border-border">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t bg-card p-2">
              <div className="flex items-end gap-1.5">
                <Button
                  size="icon"
                  variant={listening ? 'destructive' : 'outline'}
                  className="h-9 w-9 shrink-0"
                  onClick={toggleVoice}
                  aria-label="Voice input"
                  title={voiceSupported ? `Voice input (${langLabel})` : 'Voice not supported'}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Textarea
                  ref={inputRef}
                  value={input || interimText}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send(input || interimText)
                    }
                  }}
                  placeholder={listening ? 'Listening…' : 'Ask about disaster safety…'}
                  className="min-h-[36px] max-h-24 resize-none text-sm"
                  rows={1}
                  disabled={sending}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => send(input || interimText)}
                  disabled={sending || (!input.trim() && !interimText)}
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {listening && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-red-600 dark:text-red-400">
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Recording in {langLabel}… Click mic to stop & send
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
