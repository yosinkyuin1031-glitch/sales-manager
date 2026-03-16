'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import type { Facility } from '@/lib/types'

export default function FacilitiesPage() {
  const supabase = createClient()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [cities, setCities] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('facilities')
        .select('*')
        .order('name')

      const list = data || []
      setFacilities(list)

      // フィルタ用の選択肢を作成
      const uniqueCities = [...new Set(list.map(f => f.city).filter(Boolean))]
      const uniqueTypes = [...new Set(list.map(f => f.business_type).filter(Boolean))]
      const uniqueCategories = [...new Set(list.map(f => f.business_category).filter(Boolean))]
      setCities(uniqueCities)
      setTypes(uniqueTypes)
      setCategories(uniqueCategories)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = facilities.filter((f) => {
    const matchSearch = !search ||
      f.name.includes(search) ||
      f.address.includes(search) ||
      f.city.includes(search)
    const matchCity = !filterCity || f.city === filterCity
    const matchType = !filterType || f.business_type === filterType
    const matchCategory = !filterCategory || f.business_category === filterCategory
    return matchSearch && matchCity && matchType && matchCategory
  })

  return (
    <AppShell>
      <Header title="事業所一覧" />
      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* 検索 */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="施設名・住所で検索..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 text-base"
        />

        {/* フィルタ */}
        <div className="flex gap-2 mb-4">
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">全エリア</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">全事業種別</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">全カテゴリ</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* アクション */}
        <div className="flex gap-2 mb-4">
          <Link
            href="/facilities/new"
            className="flex-1 bg-blue-600 text-white text-center py-3 rounded-lg font-bold"
          >
            + 新規事業所登録
          </Link>
          <Link
            href="/facilities/import"
            className="flex-1 bg-purple-600 text-white text-center py-3 rounded-lg font-bold"
          >
            CSV一括登録
          </Link>
        </div>

        {/* 施設リスト */}
        <p className="text-sm text-gray-500 mb-2">{filtered.length}件の施設</p>

        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-8">施設がありません</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((facility) => (
              <div
                key={facility.id}
                className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <Link
                    href={`/facilities/${facility.id}`}
                    className="flex-1 min-w-0"
                  >
                    <h3 className="font-bold text-gray-800">{facility.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{facility.city} {facility.address}</p>
                    <div className="flex gap-2 mt-2">
                      {facility.business_category && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {facility.business_category}
                        </span>
                      )}
                      {facility.visit_count > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          訪問{facility.visit_count}回
                        </span>
                      )}
                    </div>
                  </Link>
                  {facility.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 bg-green-500 text-white text-sm px-4 py-2.5 rounded-lg flex-shrink-0 font-bold"
                    >
                      地図
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
