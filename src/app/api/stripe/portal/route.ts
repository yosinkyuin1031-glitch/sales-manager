import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('org_memberships')
      .select('org_id, role, organization:organizations(stripe_customer_id)')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみアクセスできます' }, { status: 403 })
    }

    const org = membership.organization as unknown as { stripe_customer_id: string | null }

    if (!org.stripe_customer_id) {
      return NextResponse.json({ error: 'サブスクリプションが見つかりません' }, { status: 404 })
    }

    const origin = request.headers.get('origin') || 'https://sales-manager-orpin.vercel.app'

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${origin}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json({ error: 'ポータルの作成に失敗しました' }, { status: 500 })
  }
}
