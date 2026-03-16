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
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [assignedUserName, setAssignedUserName] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: f } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', id)
        .single()

      setFacility(f)
      if (f) {
        setEditValues({
          city: f.city || '',
          address: f.address || '',
          business_type: f.business_type || '',
          business_category: f.business_category || '',
          phone: f.phone || '',
          staff_names: f.staff_names || '',
          manager: f.manager || '',
          newsletter: f.newsletter || '',
          notes: f.notes || '',
          rating: String(f.rating || 0),
          revisit_interval_days: String(f.revisit_interval_days || ''),
        })
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
            <EditableRow label="市区町村" field="city" value={facility.city} editingField={editingField} editValues={editValues} setEditValues={setEditValues} setEditingField={setEditingField} isAdmin={role === 'admin'} onSave={async (field, val) => { await supabase.from('facilities').update({ [field]: val }).eq('id', facility.id); setFacility({ ...facility, [field]: val }); setEditingField(null); }} />
            <EditableRow label="住所" field="address" value={facility.address} editingField={editingField} editValues={editValues} setEditValues={setEditValues} setEditingField={setEditingField} isAdmin={role === 'admin'} onSave={async (field, val) => { await supabase.from('facilities').update({ [field]: val }).eq('id', facility.id); setFacility({ ...facility, [field]: val }); setEditingField(null); }} />
            <EditableRow label="事業種別" field="business_type" value={facility.business_type} editingField={editingField} editValues={editValues} setEditValues={setEditValues} setEditingField={setEditingField} isAdmin={role === 'admin'} onSave={async (field, val) => { await supabase.from('facilities').update({ [field]: val }).eq('id', facility.id); setFacility({ ...facility, [field]: val }); setEditingField(null); }} />
            <EditableRow label="カテゴリ" field="business_category" value={facility.business_category} editingField={editingField} editValues={editValues} setEditValues={setEditValues} setEditingField={setEditingField} isAdmin={role === 'admin'} onSave={async (field, val) => { await supabase.from('facilities').update({ [field]: val }).eq('id', facility.id); setFacility({ ...facility, [field]: val }); setEditingField(null); }} />
            <EditableRow label="電話" field="phone" value={facility.phone} editingField={editingField} editValues={editValues} setEditValues={setEditValues} setEditingField={setEditingField} isAdmin={role === 'admin'} onSave={async (field, val) => { await supabase.from('facilities').update({ [field]: val }).eq('id', facility.id); setFacility({ ...facility, [field]: val }); setEditingField(null); }} />
            <EditableRow label="担当者" field="staff_names" value={facility.staff_names} editingField={editingField} editValues={editValues} setEditValues={setEditValues} setEditingField={setEditingField} isAdmin={role === 'admin'} onSave={async (field, val) => { await supabase.from('facilities').update({ [field]: val }).eq('id', facility.id); setFacility({ ...facility, [field]: val }); setEditingField(null); }} />
            <EditableRow label="管理者" field="manager" value={facility.manager} editingField={editingField} editValues={editValues} setEditValues={setEditValues} setEditingField={setEditingField} isAdmin={role === 'admin'} onSave={async (field, val) => { await supabase.from('facilities').update({ [field]: val }).eq('id', facility.id); setFacility({ ...facility, [field]: val }); setEditingField(null); }} />
            <InfoRow label="訪問日" value={facility.visit_date || '未訪問'} />
            <InfoRow label="訪問回数" value={`${facility.visit_count}回`} />
            <EditableRow label="評価" field="rating" value={facility.rating ? `${'★'.repeat(facility.rating)}${'☆'.repeat(5 - facility.rating)}` : '未評価'} editingField={editingField} editValues={editValues} setEditValues={setEditValues} setEditingField={setEditingField} isAdmin={role === 'admin'} inputType="select" selectOptions={[{v:'0',l:'未評価'},{v:'1',l:'★'},{v:'2',l:'★★'},{v:'3',l:'★★★'},{v:'4',l:'★★★★'},{v:'5',l:'★★★★★'}]} onSave={async (field, val) => { const num = parseInt(val); await supabase.from('facilities').update({ rating: num }).eq('id', facility.id); setFacility({ ...facility, rating: num }); setEditingField(null); }} />
            <EditableRow label="通信" field="newsletter" value={facility.newsletter} editingField={editingField} editValues={editValues} setEditValues={setEditValues} setEditingField={setEditingField} isAdmin={role === 'admin'} onSave={async (field, val) => { await supabase.from('facilities').update({ [field]: val }).eq('id', facility.id); setFacility({ ...facility, [field]: val }); setEditingField(null); }} />
            <InfoRow label="担当者ID" value={assignedUserName || (facility.assigned_user_id ? facility.assigned_user_id : '')} />
            <InfoRow label="次回訪問" value={facility.next_visit_date || '未定'} />
            <EditableRow label="再訪間隔" field="revisit_interval_days" value={facility.revisit_interval_days ? `${facility.revisit_interval_days}日` : '未設定'} editingField={editingField} editValues={editValues} setEditValues={setEditValues} setEditingField={setEditingField} isAdmin={role === 'admin'} inputType="number" suffix="日" onSave={async (field, val) => { const days = parseInt(val); if (!days || days < 1) return; await supabase.from('facilities').update({ revisit_interval_days: days }).eq('id', facility.id); setFacility({ ...facility, revisit_interval_days: days }); setEditingField(null); }} />
            <EditableRow label="備考" field="notes" value={facility.notes} editingField={editingField} editValues={editValues} setEditValues={setEditValues} setEditingField={setEditingField} isAdmin={role === 'admin'} onSave={async (field, val) => { await supabase.from('facilities').update({ [field]: val }).eq('id', facility.id); setFacility({ ...facility, [field]: val }); setEditingField(null); }} />
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

function EditableRow({
  label, field, value, editingField, editValues, setEditValues, setEditingField, isAdmin, onSave,
  inputType = 'text', suffix, selectOptions,
}: {
  label: string; field: string; value: string; editingField: string | null;
  editValues: Record<string, string>; setEditValues: (v: Record<string, string>) => void;
  setEditingField: (f: string | null) => void; isAdmin: boolean;
  onSave: (field: string, value: string) => Promise<void>;
  inputType?: 'text' | 'number' | 'select'; suffix?: string;
  selectOptions?: { v: string; l: string }[];
}) {
  const isEditing = editingField === field

  if (isEditing) {
    return (
      <div className="flex items-start">
        <span className="text-gray-500 w-20 flex-shrink-0 pt-1">{label}</span>
        <div className="flex items-center gap-2 flex-1">
          {inputType === 'select' && selectOptions ? (
            <select
              value={editValues[field] || ''}
              onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {selectOptions.map((o) => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>
          ) : (
            <input
              type={inputType}
              value={editValues[field] || ''}
              onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              min={inputType === 'number' ? '1' : undefined}
            />
          )}
          {suffix && <span className="text-sm text-gray-600">{suffix}</span>}
          <button
            onClick={() => onSave(field, editValues[field] || '')}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded flex-shrink-0"
          >
            保存
          </button>
          <button
            onClick={() => setEditingField(null)}
            className="text-xs text-gray-500 flex-shrink-0"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <span className="text-gray-500 w-20 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-800">{value || '未設定'}</span>
        {isAdmin && (
          <button
            onClick={() => setEditingField(field)}
            className="text-xs text-blue-600 underline flex-shrink-0"
          >
            編集
          </button>
        )}
      </div>
    </div>
  )
}
