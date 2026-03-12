'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OrgInfo {
  orgId: string | null
  role: 'admin' | 'member' | null
  orgName: string | null
  userId: string | null
  plan: string | null
  subscriptionStatus: string | null
  trialEndsAt: string | null
  loading: boolean
}

export function useOrg(): OrgInfo {
  const [info, setInfo] = useState<OrgInfo>({
    orgId: null,
    role: null,
    orgName: null,
    userId: null,
    plan: null,
    subscriptionStatus: null,
    trialEndsAt: null,
    loading: true,
  })

  useEffect(() => {
    const supabase = createClient()
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setInfo(prev => ({ ...prev, loading: false }))
        return
      }

      const { data: membership } = await supabase
        .from('org_memberships')
        .select('org_id, role, organization:organizations(name, plan, subscription_status, trial_ends_at)')
        .eq('user_id', user.id)
        .single()

      if (membership) {
        const org = membership.organization as unknown as {
          name: string
          plan: string
          subscription_status: string
          trial_ends_at: string
        } | null
        setInfo({
          orgId: membership.org_id,
          role: membership.role as 'admin' | 'member',
          orgName: org?.name || null,
          userId: user.id,
          plan: org?.plan || null,
          subscriptionStatus: org?.subscription_status || null,
          trialEndsAt: org?.trial_ends_at || null,
          loading: false,
        })
      } else {
        setInfo({ orgId: null, role: null, orgName: null, userId: user.id, plan: null, subscriptionStatus: null, trialEndsAt: null, loading: false })
      }
    }
    load()
  }, [])

  return info
}
