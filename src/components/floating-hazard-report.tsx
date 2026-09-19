'use client'

import * as React from 'react'
import {
  Megaphone, X, Mic, MicOff, MapPin, Loader2, Camera, Send, AlertTriangle,
  Navigation, CheckCircle2, Type, Volume2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/store'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'

type DisasterType = 'FLOOD' | 'EARTHQUAKE' | 'LANDSLIDE' | 'FIRE' | 'CYCLONE' | 'OTHER'

const DISASTER_TYPES: { id: DisasterType; label: string; icon: string }[] = [
  { id: 'FLOOD', label: 'Flood', icon: '🌊' },
  { id: 'EARTHQUAKE', label: 'Earthquake', icon: '🌍' },
  { id: 'LANDSLIDE', label: 'Landslide', icon: '⛰️' },
  { id: 'FIRE', label: 'Fire', icon: '🔥' },
  { id: 'CYCLONE', label: 'Cyclone', icon: '🌀' },
  { id: 'OTHER', label: 'Other', icon: '⚠️' },
]

// Web Speech API types
interface SpeechRecognitionEvent {
  results: { [key: number]: { [key: number]: { transcript: string; confidence: number }; isFinal: boolean }[] }
  resultIndex: number
}
interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

const LANG_MAP: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', ne: 'ne-NP', as: 'as-IN',
}

export function FloatingHazardReport() {
  const { location, language } = useApp()
  const [open, setOpen] = React.useState(false)
  const [disasterType, setDisasterType] = React.useState<DisasterType>('FLOOD')
  const [description, setDescription] = React.useState('')
  const [lat, setLat] = React.useState(location.lat.toString())
  const [lng, setLng] = React.useState(location.lng.toString())
  const [locationLabel, setLocationLabel] = React.useState(location.name)
  const [locating, setLocating] = React.useState(false)
  const [photoName, setPhotoName] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [submittedReport, setSubmittedReport] = React.useState<any>(null)

  // Voice
  const [listening, setListening] = React.useState(false)
  const [interimText, setInterimText] = React.useState('')
  const [voiceSupported, setVoiceSupported] = React.useState(false)
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null)

  React.useEffect(() => {
    const w = typeof window !== 'undefined' ? (window as any) : null
    setVoiceSupported(!!(w && (w.SpeechRecognition || w.webkitSpeechRecognition)))
  }, [])

  // Sync location when app location changes
  React.useEffect(() => {
    setLat(location.lat.toString())
    setLng(location.lng.toString())
    setLocationLabel(location.name)
  }, [location.lat, location.lng, location.name])

  const useMyLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5))
        setLng(pos.coords.longitude.toFixed(5))
        setLocationLabel('My current location (GPS)')
        setLocating(false)
        toast.success('Location captured.')
      },
      (err) => {
        setLocating(false)
        toast.error('Location permission denied. Enter coordinates manually.')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  const toggleVoice = React.useCallback(() => {
    if (!voiceSupported) {
      toast.error('Voice not supported. Use Chrome/Edge.')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    const rec = new SR() as SpeechRecognitionInstance
    rec.lang = LANG_MAP[language] || 'en-IN'
    rec.continuous = true
    rec.interimResults = true

    let baseText = description
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = ''
      let interim = ''
      for (let i = e.resultIndex; i < (e.results as any).length; i++) {
        const r = (e.results as any)[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      if (finalText) {
        baseText = (baseText + ' ' + finalText).trim()
        setDescription(baseText)
        setInterimText('')
      } else {
        setInterimText(interim)
      }
    }
    rec.onerror = () => {
      setListening(false)
      setInterimText('')
      toast.error('Voice recognition error.')
    }
    rec.onend = () => {
      setListening(false)
      setInterimText('')
    }
    recognitionRef.current = rec
    rec.start()
    setListening(true)
    toast.success(`Listening in ${language.toUpperCase()}…`)
  }, [voiceSupported, listening, language, description])

  const handleSubmit = React.useCallback(async () => {
    const latN = Number(lat)
    const lngN = Number(lng)
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      toast.error('Valid location is required.')
      return
    }
    if (!description.trim()) {
      toast.error('Please describe the emergency.')
      return
    }
    setSubmitting(true)
    try {
      // 1. Submit the report
      const reportRes = await apiPost<{ report: any }>('/api/reports', {
        category: disasterType === 'FLOOD' ? 'FLOOD' : disasterType === 'EARTHQUAKE' ? 'OTHER' : disasterType === 'LANDSLIDE' ? 'LANDSLIDE' : disasterType === 'FIRE' ? 'FIRE' : 'OTHER',
        description: `[${disasterType}] ${description.trim()}`,
        lat: latN,
        lng: lngN,
        severity: 'HIGH',
      })

      // 2. Trigger AI disaster verification (auto SMS if verified HIGH/CRITICAL)
      toast.info('AI is analyzing your emergency report…')
      const verifyRes = await apiPost<{ analysis: any; alertCreated: any; smsResult: any; autoActionTaken: boolean }>('/api/disaster-verify', {
        text: `${disasterType}: ${description.trim()}`,
        language,
        reportId: reportRes.report.id,
        lat: latN,
        lng: lngN,
      })

      setSubmittedReport({
        report: reportRes.report,
        verification: verifyRes,
      })
      setSubmitted(true)
      toast.success('Emergency report submitted!', {
        description: verifyRes.autoActionTaken
          ? `AI verified ${verifyRes.analysis.disasterType}. Alert created + SMS dispatched.`
          : 'Report received. Authorities will review.',
        duration: 6000,
      })
    } catch (e: any) {
      toast.error('Failed to submit report', { description: e?.message })
    } finally {
      setSubmitting(false)
    }
  }, [disasterType, description, lat, lng, language])

  const reset = () => {
    setOpen(false)
    setSubmitted(false)
    setSubmittedReport(null)
    setDescription('')
    setPhotoName(null)
    setDisasterType('FLOOD')
  }

  return (
    <>
      {/* Floating button — visible on all pages, above mobile nav */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-20 left-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all lg:bottom-6',
          'bg-red-600 text-white hover:scale-105 hover:shadow-xl'
        )}
        aria-label="Report a hazard / emergency"
      >
        <Megaphone className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>
      </button>

      {/* Emergency reporting dialog */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between border-b bg-red-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <div className="text-sm font-bold">Report an Emergency</div>
                  <div className="text-[10px] opacity-90">Your report goes to the admin dashboard + AI verification</div>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {submitted ? (
              <div className="p-6 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Report Submitted</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your emergency report has been received. {submittedReport?.verification?.autoActionTaken ? 'AI verified it as a real disaster — an alert was auto-created and SMS dispatched to all recipients.' : 'Authorities will review it shortly.'}
                  </p>
                </div>
                {submittedReport?.verification?.analysis && (
                  <div className="rounded-lg border bg-muted/50 p-3 text-left text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">AI Disaster Type:</span><span className="font-medium">{submittedReport.verification.analysis.disasterType}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">AI Severity:</span><span className="font-medium">{submittedReport.verification.analysis.severity}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Confidence:</span><span className="font-medium">{Math.round((submittedReport.verification.analysis.confidence || 0) * 100)}%</span></div>
                    {submittedReport?.verification?.smsResult && (
                      <div className="flex justify-between"><span className="text-muted-foreground">SMS Dispatched:</span><span className="font-medium">{submittedReport.verification.smsResult.sent}/{submittedReport.verification.smsResult.total} (provider: {submittedReport.verification.smsResult.provider || 'test'})</span></div>
                    )}
                  </div>
                )}
                <Button onClick={reset} className="w-full">Done</Button>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Disaster type */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Disaster Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {DISASTER_TYPES.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDisasterType(d.id)}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-colors',
                          disasterType === d.id ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'hover:bg-muted'
                        )}
                      >
                        <span className="text-xl">{d.icon}</span>
                        <span className="text-[10px] font-medium">{d.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Location</Label>
                  <div className="flex items-center gap-2">
                    <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" className="flex-1 text-sm" />
                    <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" className="flex-1 text-sm" />
                    <Button size="icon" variant="outline" onClick={useMyLocation} disabled={locating} className="shrink-0">
                      {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {locationLabel}
                  </div>
                </div>

                {/* Voice + description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Describe the Emergency</Label>
                    <Button size="sm" variant={listening ? 'destructive' : 'outline'} onClick={toggleVoice} className="h-7 gap-1 text-xs">
                      {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                      {listening ? 'Stop' : 'Voice'}
                    </Button>
                  </div>
                  {listening && (
                    <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-[11px] text-red-700 dark:text-red-300">
                      <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      Recording in {language.toUpperCase()}… speak now
                    </div>
                  )}
                  <Textarea
                    value={description || interimText}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={listening ? 'Listening…' : 'e.g. "Severe flooding near my village, people trapped on rooftops. Water rising fast."'}
                    className="min-h-[100px] text-sm"
                    disabled={submitting}
                  />
                  {interimText && !description && (
                    <p className="text-[10px] text-muted-foreground italic">Transcribing… review before sending.</p>
                  )}
                  {!voiceSupported && (
                    <p className="text-[10px] text-muted-foreground">Voice input not supported in this browser. Type your report instead.</p>
                  )}
                </div>

                {/* Photo (optional, demo — filename only) */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Photo (optional)</Label>
                  <label className="flex items-center gap-2 rounded-lg border border-dashed p-2.5 cursor-pointer hover:bg-muted/50">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{photoName || 'Tap to attach a photo (optional)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? null)}
                    />
                  </label>
                </div>

                {/* Submit */}
                <div className="space-y-2 pt-2 border-t">
                  <Button onClick={handleSubmit} disabled={submitting || !description.trim()} className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? 'Submitting…' : 'Submit Emergency Report'}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Your report triggers AI verification. If verified as a real disaster, an alert is auto-created and SMS is sent to all registered recipients.
                    <br />This is NOT a substitute for calling local emergency services directly.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
