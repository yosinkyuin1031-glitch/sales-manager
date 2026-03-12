'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'
import type { Facility } from '@/lib/types'

function NewReportForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillFacilityId = searchParams.get('facility_id')

  const [facilities, setFacilities] = useState<Facility[]>([])
  const [facilityId, setFacilityId] = useState(prefillFacilityId || '')
  const [facilitySearch, setFacilitySearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0])
  const [talkContent, setTalkContent] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('facilities')
        .select('*')
        .order('name')
      setFacilities(data || [])

      if (prefillFacilityId && data) {
        const found = data.find(f => f.id === prefillFacilityId)
        if (found) setFacilitySearch(found.name)
      }
    }
    load()
  }, [prefillFacilityId])

  const filteredFacilities = facilities.filter(f =>
    f.name.includes(facilitySearch) || f.address.includes(facilitySearch)
  )

  const handleSelectFacility = (f: Facility) => {
    setFacilityId(f.id)
    setFacilitySearch(f.name)
    setShowDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!facilityId) {
      setError('施設を選択してください')
      return
    }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('ログインが必要です')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('daily_reports').insert({
      user_id: user.id,
      facility_id: facilityId,
      visit_date: visitDate,
      talk_content: talkContent,
      memo,
    })

    // 施設の訪問回数と訪問日を更新
    await supabase.rpc('increment_visit_count', { facility_id_input: facilityId, visit_date_input: visitDate })

    if (insertError) {
      setError('保存に失敗しました: ' + insertError.message)
      setSaving(false)
      return
    }

    router.push('/reports')
    router.refresh()
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <button onClick={() => router.back()} className="text-blue-600 text-sm mb-4">
        ← 戻る
      </button>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 施設選択 */}
        <div className="relative">
          <label className="block text-sm font-bold text-gray-700 mb-1">施設</label>
          <input
            type="text"
            value={facilitySearch}
            onChange={(e) => {
              setFacilitySearch(e.target.value)
              setFacilityId('')
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="施設名で検索..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
          />
          {showDropdown && facilitySearch && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {filteredFacilities.length === 0 ? (
                <p className="p-3 text-gray-400 text-sm">該当する施設がありません</p>
              ) : (
                filteredFacilities.slice(0, 20).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectFacility(f)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b last:border-0"
                  >
                    <span className="font-bold">{f.name}</span>
                    <span className="text-gray-400 ml-2">{f.city}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 訪問日 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">訪問日</label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
            required
          />
        </div>

        {/* トーク内容 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">トーク内容</label>
          <textarea
            value={talkContent}
            onChange={(e) => setTalkContent(e.target.value)}
            placeholder="どんな話をしたか記録..."
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base resize-none"
            required
          />
        </div>

        {/* メモ */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">メモ</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="その他気づいたことなど..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-base
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : '日報を保存'}
        </button>
      </form>
    </div>
  )
}

export default function NewReportPage() {
  return (
    <>
      <Header title="日報入力" />
      <Suspense fallback={<p className="text-center py-8 text-gray-400">読み込み中...</p>}>
        <NewReportForm />
      </Suspense>
    </>
  )
}
