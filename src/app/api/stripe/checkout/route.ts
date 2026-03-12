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

    // ユーザーの組織を取得
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('org_id, role, organization:organizations(id, name, stripe_customer_id)')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみ購入できます' }, { status: 403 })
    }

    const org = membership.organization as unknown as {
      id: string
      name: string
      stripe_customer_id: string | null
    }

    // Stripe顧客を作成（まだない場合）
    let customerId = org.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { org_id: org.id },
      })
      customerId = customer.id

      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id)
    }

    // Checkoutセッションを作成
    const origin = request.headers.get('origin') || 'https://sales-manager-orpin.vercel.app'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${origin}/settings?payment=success`,
      cancel_url: `${origin}/settings?payment=cancelled`,
      metadata: { org_id: org.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'チェックアウトの作成に失敗しました' }, { status: 500 })
  }
}
