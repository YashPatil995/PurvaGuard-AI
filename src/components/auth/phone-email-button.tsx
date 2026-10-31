'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Phone, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PHONE_EMAIL_CLIENT_ID = '13522777929565162259'
const SCRIPT_URL = 'https://www.phone.email/sign_in_button_v1.js'

declare global {
  interface Window {
    phoneEmailListener?: (userObj: { user_json_url: string }) => void
  }
}

interface PhoneEmailButtonProps {
  flow?: 'signin' | 'signup'
  onSuccess: (userData: any) => void
  onError?: (errorMsg: string) => void
  onAccountNotFound?: (maskedPhone?: string) => void
  onAccountExists?: (maskedPhone?: string) => void
}

export function PhoneEmailButton({
  flow = 'signin',
  onSuccess,
  onError,
  onAccountNotFound,
  onAccountExists,
}: PhoneEmailButtonProps) {
  const [verifying, setVerifying] = React.useState(false)
  const [scriptLoaded, setScriptLoaded] = React.useState(false)
  const [scriptError, setScriptError] = React.useState<string | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Keep latest flow in ref so listener always submits the current mode
  const flowRef = React.useRef(flow)
  React.useEffect(() => {
    flowRef.current = flow
  }, [flow])

  // Attach Phone.email callback and load script
  React.useEffect(() => {
    // 1. Define global listener expected by Phone.email SDK
    window.phoneEmailListener = async (userObj) => {
      if (!userObj || !userObj.user_json_url) {
        toast.error('Authentication cancelled or invalid token received.')
        onError?.('Invalid response from phone verification service.')
        return
      }

      const activeFlow = flowRef.current
      setVerifying(true)
      const toastId = toast.loading(
        activeFlow === 'signup'
          ? 'Creating account with verified phone...'
          : 'Verifying phone credentials with PurvaGuard security...'
      )

      try {
        const response = await fetch('/api/auth/phone-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_json_url: userObj.user_json_url,
            flow: activeFlow,
          }),
        })

        const result = await response.json()

        // Distinguish flow-specific account mismatches
        if (response.status === 404 && result.error === 'ACCOUNT_NOT_FOUND') {
          toast.warning(result.message || 'No account found with this phone number. Please create an account.', { id: toastId })
          onAccountNotFound?.(result.phone)
          return
        }

        if (response.status === 409 && result.error === 'ACCOUNT_EXISTS') {
          toast.info(result.message || 'An account with this phone number already exists. Please sign in.', { id: toastId })
          onAccountExists?.(result.phone)
          return
        }

        if (!response.ok || !result.success) {
          throw new Error(result.error || result.message || 'Server failed to verify phone identity')
        }

        toast.success(
          result.isNewUser
            ? 'Account created and verified successfully!'
            : 'Welcome back! Signed in with verified phone.',
          { id: toastId }
        )

        onSuccess(result.user)
      } catch (err: any) {
        console.error('Phone.email verification failed:', err.message)
        toast.error(err.message || 'Phone verification failed', { id: toastId })
        onError?.(err.message)
      } finally {
        setVerifying(false)
      }
    }

    // 2. Load script if not already in document
    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`)
    if (existingScript) {
      setScriptLoaded(true)
    } else {
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.async = true
      script.onload = () => {
        setScriptLoaded(true)
      }
      script.onerror = () => {
        setScriptError('Failed to load Phone.email script. Please check your network connection.')
      }
      document.body.appendChild(script)
    }

    return () => {
      // Keep listener available while modal is open
    }
  }, [onSuccess, onError, onAccountNotFound, onAccountExists])

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-3">
      {verifying && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-primary py-2 animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>
            {flow === 'signup' ? 'Registering new account...' : 'Authenticating existing user...'}
          </span>
        </div>
      )}

      {scriptError && (
        <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{scriptError}</span>
        </div>
      )}

      {/* Official Phone.email button container */}
      <div
        ref={containerRef}
        className="w-full flex justify-center items-center min-h-[44px]"
      >
        <div
          className="pe_signin_button"
          data-client-id={PHONE_EMAIL_CLIENT_ID}
        />
      </div>

      <div className="text-[11px] text-muted-foreground text-center">
        {flow === 'signup'
          ? 'Fast, verified registration powered by '
          : 'Instant, OTP-free login powered by '}
        <strong>Phone.email</strong>.
      </div>
    </div>
  )
}
