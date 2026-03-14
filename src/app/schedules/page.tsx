'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/useOrg'
import type { Facility, VisitSchedule } from '@/lib/types'

interface Member {
  user_id: string
  role: string
}

export default function SchedulesPage() {
  const supabase = createClient()
  const { orgId, role } = useOrg()
  const [schedules, setSchedules] = useState<VisitSchedule[]>([])
  const [facilities, setFacilities] = useState<Pick<Facility, 'id' | 'name' | 'business_category'>[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [filterUser, setFilterUser] = useState('')

  // 新規スケジュール追加用
  const [showAdd, setShowAdd] = useState(false)
  const [addFacilityId, setAddFacilityId] = useState('')
  const [addUserId, setAddUserId] = useState('')
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!orgId || orgId === 'demo') {
      setLoading(false)
      return
    }
    const load = async () => {
      const { data: s } = await supabase
        .from('visit_schedules')
        .select('*, facility:facilities(name, address, business_category)')
        .gte('scheduled_date', selectedDate)
        .order('scheduled_date')
        .limit(100)

      setSchedules(s || [])

      const { data: f } = await supabase.from('facilities').select('id, name, business_category').order('name')
      setFacilities(f || [])

      const { data: m } = await supabase.from('org_memberships').select('user_id, role').eq('org_id', orgId)
      setMembers(m || [])

      setLoading(false)
    }
    load()
  }, [orgId, selectedDate])

  const handleAdd = async () => {
    if (!addFacilityId || !addUserId || !addDate || !orgId) return
    setSaving(true)

    const { error } = await supabase.from('visit_schedules').insert({
      org_id: orgId,
      facility_id: addFacilityId,
      user_id: addUserId,
      scheduled_date: addDate,
    })

    if (!error) {
      setShowAdd(false)
      setAddFacilityId('')
      setAddUserId('')
      // リロード
      const { data: s } = await supabase
        .from('visit_schedules')
        .select('*, facility:facilities(name, address, business_category)')
        .gte('scheduled_date', selectedDate)
        .order('scheduled_date')
        .limit(100)
      setSchedules(s || [])
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('visit_schedules').delete().eq('id', id)
    setSchedules(schedules.filter(s => s.id !== id))
  }

  const filtered = filterUser
    ? schedules.filter(s => s.user_id === filterUser)
    : schedules

  // 日付ごとにグループ化
  const grouped: Record<string, VisitSchedule[]> = {}
  for (const s of filtered) {
    if (!grouped[s.scheduled_date]) grouped[s.scheduled_date] = []
    grouped[s.scheduled_date].push(s)
  }

  const isAdmin = role === 'admin'

  return (
    <AppShell>
      <Header title="スケジュール管理" />
      <div className="px-4 py-4 max-w-lg mx-auto">

        {/* フィルタ */}
        <div className="flex gap-2 mb-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">全担当者</option>
            {members.map(m => (
              <option key={m.user_id} value={m.user_id}>
                {m.user_id.slice(0, 8)}...
              </option>
            ))}
          </select>
        </div>

        {/* スケジュール追加ボタン（管理者のみ） */}
        {isAdmin && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold mb-4"
          >
            {showAdd ? '閉じる' : '+ スケジュールを追加'}
          </button>
        )}

        {/* 追加フォーム */}
        {showAdd && isAdmin && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4 space-y-3">
            <select
              value={addFacilityId}
              onChange={(e) => setAddFacilityId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">事業所を選択</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}（{f.business_category}）</option>
              ))}
            </select>
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">担当者を選択</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_id.slice(0, 8)}...（{m.role === 'admin' ? '管理者' : 'メンバー'}）
                </option>
              ))}
            </select>
            <input
              type="date"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !addFacilityId || !addUserId}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-bold disabled:opacity-50"
            >
              {saving ? '追加中...' : '追加'}
            </button>
          </div>
        )}

        {/* スケジュール一覧 */}
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-gray-400 text-center py-8">スケジュールがありません</p>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-4">
              <h3 className="text-sm font-bold text-gray-600 mb-2 sticky top-14 bg-gray-50 py-1">
                {new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                <span className="ml-2 text-gray-400 font-normal">{items.length}件</span>
              </h3>
              <div className="space-y-2">
                {items.map((schedule) => {
                  const facility = schedule.facility as unknown as { name: string; address: string; business_category: string }
                  return (
                    <div key={schedule.id} className={`bg-white rounded-lg shadow-sm p-3 flex justify-between items-center
                      ${schedule.status === 'completed' ? 'opacity-50' : ''}`}
                    >
                      <div>
                        <p className="font-bold text-sm text-gray-800">{facility?.name}</p>
                        <p className="text-xs text-gray-500">
                          {facility?.business_category}
                          <span className="ml-2">担当: {schedule.user_id.slice(0, 8)}...</span>
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          schedule.status === 'completed' ? 'bg-green-100 text-green-700' :
                          schedule.status === 'skipped' ? 'bg-gray-100 text-gray-500' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {schedule.status === 'completed' ? '完了' : schedule.status === 'skipped' ? 'スキップ' : '予定'}
                        </span>
                        {isAdmin && schedule.status === 'pending' && (
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="text-xs text-red-400 px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  )
}
