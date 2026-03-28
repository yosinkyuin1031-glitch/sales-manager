'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { SkeletonList } from '@/components/Skeleton'
import { createClient } from '@/lib/supabase/client'
import type { Facility } from '@/lib/types'

export default function RoutesPage() {
  const supabase = createClient()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('facilities')
        .select('*')
        .order('name')
      setFacilities(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = facilities.filter(f =>
    !search || f.name.includes(search) || f.address.includes(search) || f.city.includes(search)
  )

  const toggleSelect = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const openGoogleMaps = () => {
    const selectedFacilities = facilities.filter(f => selected.includes(f.id))
    if (selectedFacilities.length === 0) return

    if (selectedFacilities.length === 1) {
      // 1件の場合は検索で開く
      const addr = selectedFacilities[0].address
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank')
      return
    }

    // 複数件の場合はルート検索で開く
    // origin = 最初, destination = 最後, waypoints = 途中
    const addresses = selectedFacilities.map(f => f.address).filter(Boolean)
    const origin = encodeURIComponent(addresses[0])
    const destination = encodeURIComponent(addresses[addresses.length - 1])
    const waypoints = addresses.slice(1, -1).map(a => encodeURIComponent(a)).join('|')

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
    if (waypoints) {
      url += `&waypoints=${waypoints}`
    }
    url += '&travelmode=driving'

    window.open(url, '_blank')
  }

  const selectedFacilities = facilities.filter(f => selected.includes(f.id))

  return (
    <AppShell>
      <Header title="ルート作成" />
      <div className="px-4 py-4 max-w-lg mx-auto">
        <p className="text-sm text-gray-500 mb-3">
          訪問したい施設を選択して、Googleマップでルートを表示できます
        </p>

        {/* 選択済み */}
        {selected.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-blue-800">選択中: {selected.length}件</span>
              <button
                onClick={() => setSelected([])}
                className="text-xs text-blue-600"
              >
                すべて解除
              </button>
            </div>
            <div className="space-y-1 mb-3">
              {selectedFacilities.map((f, i) => (
                <div key={f.id} className="flex items-center text-sm">
                  <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2">
                    {i + 1}
                  </span>
                  <span className="text-gray-700">{f.name}</span>
                </div>
              ))}
            </div>
            <button
              onClick={openGoogleMaps}
              disabled={selected.length === 0}
              className="w-full bg-green-500 text-white py-3 rounded-lg font-bold
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗺️ Googleマップで開く
            </button>
          </div>
        )}

        {/* 検索 */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="施設名・住所で検索..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 text-base"
          aria-label="施設名・住所で検索"
        />

        {/* 施設リスト */}
        {loading ? (
          <SkeletonList count={4} lines={1} />
        ) : (
          <div className="space-y-2">
            {filtered.map((facility) => {
              const isSelected = selected.includes(facility.id)
              const orderNum = selected.indexOf(facility.id)
              return (
                <button
                  key={facility.id}
                  onClick={() => toggleSelect(facility.id)}
                  className={`w-full text-left rounded-xl p-4 transition
                    ${isSelected
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-white border-2 border-transparent shadow-sm'
                    }`}
                >
                  <div className="flex items-center">
                    {isSelected && (
                      <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3">
                        {orderNum + 1}
                      </span>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-800">{facility.name}</h3>
                      <p className="text-sm text-gray-500">{facility.city} {facility.address}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
