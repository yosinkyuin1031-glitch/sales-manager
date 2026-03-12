'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/useOrg'

interface Member {
  id: string
  user_id: string
  role: string
}

function SettingsContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { orgId, orgName, role, subscriptionStatus, trialEndsAt } = useOrg()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const paymentResult = searchParams.get('payment')

  useEffect(() => {
    if (!orgId) return
    const load = async () => {
      const { data } = await supabase
        .from('org_memberships')
        .select('id, user_id, role')
        .eq('org_id', orgId)

      setMembers(data || [])
      setLoading(false)
    }
    load()
  }, [orgId])

  const isAdmin = role === 'admin'

  const getTrialDaysLeft = () => {
    if (!trialEndsAt) return 0
    const diff = new Date(trialEndsAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const getPlanLabel = () => {
    if (subscriptionStatus === 'active') return '有料プラン（スタンダード）'
    if (subscriptionStatus === 'trial') {
      const days = getTrialDaysLeft()
      return `無料トライアル（残り${days}日）`
    }
    if (subscriptionStatus === 'past_due') return '支払い遅延中'
    if (subscriptionStatus === 'cancelled') return '解約済み'
    return '未設定'
  }

  const getPlanColor = () => {
    if (subscriptionStatus === 'active') return 'bg-green-100 text-green-700'
    if (subscriptionStatus === 'trial') return 'bg-yellow-100 text-yellow-700'
    if (subscriptionStatus === 'past_due') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-600'
  }

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      alert(data.error || 'エラーが発生しました')
      setCheckoutLoading(false)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      alert(data.error || 'エラーが発生しました')
      setPortalLoading(false)
    }
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <button onClick={() => router.push('/')} className="text-blue-600 text-sm mb-4">
        ← ホームへ
      </button>

      {/* 支払い結果の通知 */}
      {paymentResult === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <p className="text-green-700 font-bold">お支払いが完了しました！</p>
          <p className="text-green-600 text-sm">有料プランが有効になりました。</p>
        </div>
      )}
      {paymentResult === 'cancelled' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <p className="text-yellow-700 text-sm">お支払いがキャンセルされました。</p>
        </div>
      )}

      {/* プラン・課金情報 */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h2 className="text-lg font-bold mb-3">プラン情報</h2>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-sm px-3 py-1 rounded-full font-bold ${getPlanColor()}`}>
            {getPlanLabel()}
          </span>
        </div>

        {isAdmin && subscriptionStatus !== 'active' && (
          <div className="mt-3">
            <p className="text-sm text-gray-500 mb-3">
              有料プランに切り替えると、トライアル終了後も継続利用できます。
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-3">
              <p className="font-bold text-blue-800">スタンダードプラン</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">¥5,000<span className="text-sm text-gray-500">/月</span></p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>- 施設データ無制限</li>
                <li>- メンバー5人まで</li>
                <li>- 日報・ルート機能</li>
                <li>- CSV一括取り込み</li>
              </ul>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkoutLoading ? '処理中...' : '有料プランに申し込む'}
            </button>
          </div>
        )}

        {isAdmin && subscriptionStatus === 'active' && (
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold mt-2
              disabled:opacity-50"
          >
            {portalLoading ? '処理中...' : '請求・プラン管理'}
          </button>
        )}
      </div>

      {/* 組織情報 */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h2 className="text-lg font-bold mb-2">組織情報</h2>
        <div className="text-sm space-y-1">
          <p><span className="text-gray-500">組織名:</span> {orgName}</p>
          <p><span className="text-gray-500">あなたの権限:</span> {role === 'admin' ? '管理者' : 'メンバー'}</p>
        </div>
      </div>

      {/* メンバー一覧 */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h2 className="text-lg font-bold mb-3">メンバー一覧</h2>
        {loading ? (
          <p className="text-gray-400 text-sm">読み込み中...</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm text-gray-800">{member.user_id.slice(0, 8)}...</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  member.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {member.role === 'admin' ? '管理者' : 'メンバー'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AppShell>
      <Header title="設定" />
      <Suspense fallback={<p className="text-center py-8 text-gray-400">読み込み中...</p>}>
        <SettingsContent />
      </Suspense>
    </AppShell>
  )
}
