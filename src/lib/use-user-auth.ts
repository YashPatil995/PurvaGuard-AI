'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { apiGet, apiPost } from '@/lib/api-client'

export interface AuthenticatedUser {
  id: string
  name: string
  firstName?: string | null
  lastName?: string | null
  phone: string | null
  role: string
  email?: string | null
  status: string
  authProvider?: string
  lastLoginAt?: string | null
}

export function useUserAuth() {
  const [user, setUser] = React.useState<AuthenticatedUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  const checkAuth = React.useCallback(async () => {
    try {
      const res = await apiGet<{ authenticated: boolean; user: AuthenticatedUser | null }>('/api/auth/me')
      if (res.authenticated && res.user) {
        setUser(res.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const logout = React.useCallback(async () => {
    try {
      await apiPost('/api/auth/logout', {})
      setUser(null)
      toast.info('Signed out successfully.')
    } catch (err: any) {
      toast.error('Logout error: ' + err.message)
    }
  }, [])

  return {
    user,
    loading,
    authenticated: !!user,
    setUser,
    refresh: checkAuth,
    logout,
  }
}
