'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/useOrg'
import { BUSINESS_CATEGORIES } from '@/lib/types'

const BUSINESS_TYPES = [
  'CPC',
  'サ高住',
  '特養',
  '認知症GH',
  '介護付き有料',
  'NSホーム',
  '小多機・看多機',
  '包括支援センター',
  'ケアハウス',
  'ヘルパーステーション',
  '病院',
  'クリニック',
  '商店',
  'その他',
]

export default function NewFacilityPage() {
  const supabase = createClient()
  const router = useRouter()
  const { orgId } = useOrg()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [form, setForm] = useState({
    name: '',
    city: '',
    address: '',
    business_type: '',
    business_category: '',
    phone: '',
    staff_names: '',
    manager: '',
    newsletter: '',
    notes: '',
    map_url: '',
  })

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('施設名は必須です')
      return
    }
    setSaving(true)
    setError('')

    const { error: dbError } = await supabase.from('facilities').insert({
      ...form,
      org_id: orgId,
      visit_count: 0,
      rating: 0,
    })

    if (dbError) {
      setError(`保存に失敗しました: ${dbError.message}`)
      setSaving(false)
    } else {
      router.push('/facilities')
    }
  }

  return (
    <AppShell>
      <Header title="新規事業所登録" />
      <div className="px-4 py-4 max-w-lg mx-auto">
        <button onClick={() => router.back()} className="text-blue-600 text-sm mb-4">
          ← 戻る
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold mb-4">基本情報</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  施設名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                  placeholder="例: さんSUNケアプランセンター"
                  className={`w-full px-3 py-2 border rounded-lg text-base ${
                    touched.name && !form.name.trim()
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300'
                  }`}
                  aria-required="true"
                  aria-invalid={touched.name && !form.name.trim() ? 'true' : undefined}
                />
                {touched.name && !form.name.trim() && (
                  <p className="text-red-500 text-xs mt-1" role="alert">施設名は必須です</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">市区町村</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  placeholder="例: 大阪狭山市"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">住所</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder="例: 大阪狭山市今熊1-62-4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">事業種別</label>
                  <select
                    value={form.business_type}
                    onChange={(e) => update('business_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                  >
                    <option value="">選択</option>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">事業カテゴリ</label>
                  <select
                    value={form.business_category}
                    onChange={(e) => update('business_category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                  >
                    <option value="">選択</option>
                    {BUSINESS_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">電話番号</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="例: 072-289-7779"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-bold mb-4">担当者・備考</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">スタッフ・担当者名</label>
                <textarea
                  value={form.staff_names}
                  onChange={(e) => update('staff_names', e.target.value)}
                  placeholder="例: 代表：谷あけみ／管理CM：飯田香織"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">営業担当</label>
                <input
                  type="text"
                  value={form.manager}
                  onChange={(e) => update('manager', e.target.value)}
                  placeholder="例: 安野"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ニュースレター</label>
                <select
                  value={form.newsletter}
                  onChange={(e) => update('newsletter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                >
                  <option value="">未設定</option>
                  <option value="1">配布済み</option>
                  <option value="0">未配布</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">地図URL</label>
                <input
                  type="url"
                  value={form.map_url}
                  onChange={(e) => update('map_url', e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">備考</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="メモ・備考"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '登録する'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}
