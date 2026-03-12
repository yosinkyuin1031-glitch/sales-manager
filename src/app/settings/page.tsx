'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/useOrg'

interface Member {
  id: string
  user_id: string
  role: string
  user_email?: string
}

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { orgId, orgName, role } = useOrg()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <AppShell>
      <Header title="設定" />
      <div className="px-4 py-4 max-w-lg mx-auto">
        <button onClick={() => router.back()} className="text-blue-600 text-sm mb-4">
          ← 戻る
        </button>

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

        {/* メンバー追加（管理者のみ） */}
        {isAdmin && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold mb-3">メンバーを追加</h2>
            <p className="text-sm text-gray-500 mb-3">
              新しい営業マンを追加するには、管理者にアカウント作成を依頼してください。
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
