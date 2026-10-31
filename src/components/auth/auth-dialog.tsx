'use client'

import * as React from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PhoneEmailButton } from './phone-email-button'
import { Mountain, Phone, Lock, AlertTriangle, Info } from 'lucide-react'
import { toast } from 'sonner'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (user: any) => void
  initialTab?: 'signin' | 'signup'
}

export function AuthDialog({ open, onOpenChange, onSuccess, initialTab = 'signin' }: AuthDialogProps) {
  const [tab, setTab] = React.useState<'signin' | 'signup'>(initialTab)
  const [notice, setNotice] = React.useState<{ type: 'not_found' | 'exists'; phone?: string } | null>(null)

  React.useEffect(() => {
    setTab(initialTab)
    setNotice(null)
  }, [initialTab, open])

  function handleGoogleOAuth() {
    toast.info('Google OAuth', {
      description: 'Redirecting to Google authentication service...',
    })
    // Preserving Google OAuth endpoint/flow
    window.location.href = '/api/auth/signin/google'
  }

  function handleTabChange(newTab: 'signin' | 'signup') {
    setTab(newTab)
    setNotice(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="text-center sm:text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Mountain className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {tab === 'signin' ? 'Sign in to PurvaGuard AI' : 'Create your Account'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {tab === 'signin'
              ? 'Access your early warning alerts, saved regions, and community responder status.'
              : 'Register for early warning intelligence, volunteer coordination, and emergency response.'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Toggle (Sign In / Register) */}
        <div className="flex rounded-lg bg-muted p-1 text-xs font-semibold">
          <button
            onClick={() => handleTabChange('signin')}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              tab === 'signin'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => handleTabChange('signup')}
            className={`flex-1 py-1.5 rounded-md transition-colors ${
              tab === 'signup'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Flow Notice Banners (When mode mismatch occurs) */}
        {notice?.type === 'not_found' && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-xs">
            <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> No Account Found
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              No account exists for <strong>{notice.phone || 'this number'}</strong> in the database. Please create an account to get started.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-bold border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
              onClick={() => handleTabChange('signup')}
            >
              Switch to Create Account →
            </Button>
          </div>
        )}

        {notice?.type === 'exists' && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 space-y-2 text-xs">
            <div className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Info className="h-4 w-4" /> Account Already Exists
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              An account for <strong>{notice.phone || 'this number'}</strong> is already registered. Please sign in to your existing account.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-bold border-blue-500/50 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
              onClick={() => handleTabChange('signin')}
            >
              Switch to Sign In →
            </Button>
          </div>
        )}

        <div className="space-y-4 pt-1">
          {/* Method 1: Phone.email Authentication */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" />
                {tab === 'signin' ? 'Sign in with Verified Phone' : 'Register with Verified Phone'}
              </span>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold">
                Official
              </Badge>
            </div>

            <p className="text-[11px] text-muted-foreground">
              {tab === 'signin'
                ? 'Authenticate your existing account securely with Phone.email.'
                : 'Create a new account with your phone number. Instant OTP verification.'}
            </p>

            <PhoneEmailButton
              flow={tab}
              onSuccess={(user) => {
                onSuccess?.(user)
                onOpenChange(false)
              }}
              onAccountNotFound={(phone) => setNotice({ type: 'not_found', phone })}
              onAccountExists={(phone) => setNotice({ type: 'exists', phone })}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-background px-2 text-muted-foreground font-semibold">
                Or continue with
              </span>
            </div>
          </div>

          {/* Method 2: Google OAuth (Preserved) */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 text-xs font-semibold gap-2 border-border/80 hover:bg-muted/60"
            onClick={handleGoogleOAuth}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Privacy & Safeguard Footer */}
          <div className="pt-2 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span>End-to-end encrypted session. Your personal credentials are never shared.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
