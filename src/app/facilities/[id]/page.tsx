'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/useOrg'
import type { Facility, DailyReport } from '@/lib/types'

export default function FacilityDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { role } = useOrg()
  const [facility, setFacility] = useState<Facility | null>(null)
  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [editingInterval, setEditingInterval] = useState(false)
  const [intervalValue, setIntervalValue] = useState('')
  const [assignedUserName, setAssignedUserName] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: f } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', id)
        .single()

      setFacility(f)
      if (f?.revisit_interval_days) {
        setIntervalValue(String(f.revisit_interval_days))
      }

      // 担当者名を取得
      if (f?.assigned_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', f.assigned_user_id)
          .single()
        if (profile) setAssignedUserName(profile.display_name)
      }

      const { data: r } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('facility_id', id)
        .order('visit_date', { ascending: false })

      setReports(r || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <AppShell>
        <Header title="事業所詳細" />
        <p className="text-center text-gray-400 py-8">読み込み中...</p>
      </AppShell>
    )
  }

  if (!facility) {
    return (
      <AppShell>
        <Header title="事業所詳細" />
        <p className="text-center text-gray-400 py-8">施設が見つかりません</p>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="事業所詳細" />
      <div className="px-4 py-4 max-w-lg mx-auto">
        <button onClick={() => router.back()} className="text-blue-600 text-sm mb-4">
          ← 戻る
        </button>

        {/* 施設情報 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <h2 className="text-xl font-bold text-gray-800 mb-3">{facility.name}</h2>

          <div className="space-y-2 text-sm">
            <InfoRow label="市区町村" value={facility.city} />
            <InfoRow label="住所" value={facility.address} />
            <InfoRow label="事業種別" value={facility.business_type} />
            <InfoRow label="カテゴリ" value={facility.business_category} />
            <InfoRow label="電話" value={facility.phone} />
            <InfoRow label="担当者" value={facility.staff_names} />
            <InfoRow label="管理者" value={facility.manager} />
            <InfoRow label="訪問日" value={facility.visit_date || '未訪問'} />
            <InfoRow label="訪問回数" value={`${facility.visit_count}回`} />
            <InfoRow label="評価" value={facility.rating ? `${'★'.repeat(facility.rating)}${'☆'.repeat(5 - facility.rating)}` : '未評価'} />
            <InfoRow label="通信" value={facility.newsletter} />
            <InfoRow label="担当者ID" value={assignedUserName || (facility.assigned_user_id ? facility.assigned_user_id : '')} />
            <InfoRow label="次回訪問" value={facility.next_visit_date || '未定'} />
            {/* 再訪問間隔 */}
            <div className="flex">
              <span className="text-gray-500 w-20 flex-shrink-0">再訪間隔</span>
              {editingInterval ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={intervalValue}
                    onChange={(e) => setIntervalValue(e.target.value)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    min="1"
                  />
                  <span className="text-sm text-gray-600">日</span>
                  <button
                    onClick={async () => {
                      const days = parseInt(intervalValue)
                      if (!days || days < 1) return
                      await supabase
                        .from('facilities')
                        .update({ revisit_interval_days: days })
                        .eq('id', facility.id)
                      setFacility({ ...facility, revisit_interval_days: days })
                      setEditingInterval(false)
                    }}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setIntervalValue(String(facility.revisit_interval_days || ''))
                      setEditingInterval(false)
                    }}
                    className="text-xs text-gray-500"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-gray-800">
                    {facility.revisit_interval_days ? `${facility.revisit_interval_days}日` : '未設定'}
                  </span>
                  {role === 'admin' && (
                    <button
                      onClick={() => setEditingInterval(true)}
                      className="text-xs text-blue-600 underline"
                    >
                      編集
                    </button>
                  )}
                </div>
              )}
            </div>
            {facility.notes && <InfoRow label="備考" value={facility.notes} />}
          </div>

          {/* Googleマップボタン */}
          {facility.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-4 bg-green-500 text-white text-center py-3 rounded-lg font-bold"
            >
              🗺️ Googleマップで開く
            </a>
          )}
        </div>

        {/* 日報入力ボタン */}
        <Link
          href={`/reports/new?facility_id=${facility.id}`}
          className="block bg-blue-600 text-white text-center py-3 rounded-lg font-bold mb-4"
        >
          📝 この施設の日報を入力
        </Link>

        {/* 過去の日報 */}
        <h3 className="text-lg font-bold text-gray-800 mb-3">訪問日報履歴</h3>
        {reports.length === 0 ? (
          <p className="text-gray-400 text-sm">まだ日報がありません</p>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-bold text-gray-700">{report.visit_date}</span>
                </div>
                {report.atmosphere && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mb-1 inline-block">
                    雰囲気: {report.atmosphere}
                  </span>
                )}
                <p className="text-sm text-gray-600 mb-1">{report.talk_content}</p>
                {report.memo && (
                  <p className="text-xs text-gray-400">メモ: {report.memo}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex">
      <span className="text-gray-500 w-20 flex-shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}
