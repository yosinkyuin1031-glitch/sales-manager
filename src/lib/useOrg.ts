'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OrgInfo {
  orgId: string | null
  role: 'admin' | 'member' | null
  orgName: string | null
  userId: string | null
  loading: boolean
}

export function useOrg(): OrgInfo {
  const [info, setInfo] = useState<OrgInfo>({
    orgId: null,
    role: null,
    orgName: null,
    userId: null,
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
        .select('org_id, role, organization:organizations(name)')
        .eq('user_id', user.id)
        .single()

      if (membership) {
        setInfo({
          orgId: membership.org_id,
          role: membership.role as 'admin' | 'member',
          orgName: (membership.organization as unknown as { name: string } | null)?.name || null,
          userId: user.id,
          loading: false,
        })
      } else {
        setInfo({ orgId: null, role: null, orgName: null, userId: user.id, loading: false })
      }
    }
    load()
  }, [])

  return info
}
