'use client'

import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { SkeletonList } from '@/components/Skeleton'
import ConfirmModal from '@/components/ConfirmModal'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/useOrg'
import type { Deal, DealStatus } from '@/lib/types'
import { DEAL_STATUSES } from '@/lib/types'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

function DealCard({ deal, onEdit, onDelete }: { deal: Deal; onEdit: (d: Deal) => void; onDelete: (id: string) => void }) {
  const today = new Date().toISOString().split('T')[0]
  const isFollowUpDue = deal.follow_up_date && deal.follow_up_date <= today && deal.status !== 'won' && deal.status !== 'lost'

  return (
    <div className={`bg-white rounded-lg shadow-sm p-3 mb-2 border-l-4 ${isFollowUpDue ? 'border-red-500' : 'border-transparent'}`}>
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-sm text-gray-800 flex-1">{deal.deal_name}</h4>
        <div className="flex gap-1 ml-1">
          <button onClick={() => onEdit(deal)} className="text-xs text-blue-600 px-1" aria-label={`${deal.deal_name}を編集`}>編集</button>
          <button onClick={() => onDelete(deal.id)} className="text-xs text-red-400 px-1" aria-label={`${deal.deal_name}を削除`}>✕</button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">{deal.facility_name}</p>
      {deal.contact_name && <p className="text-xs text-gray-400">担当: {deal.contact_name}</p>}
      {deal.amount > 0 && (
        <p className="text-sm font-bold text-green-600 mt-1">{deal.amount.toLocaleString()}円</p>
      )}
      {deal.expected_close_date && (
        <p className="text-xs text-gray-400 mt-1">成約予定: {deal.expected_close_date}</p>
      )}
      {isFollowUpDue && (
        <p className="text-xs text-red-600 font-bold mt-1">フォローアップ期限: {deal.follow_up_date}</p>
      )}
    </div>
  )
}

function SortableDealCard({ deal, onEdit, onDelete }: { deal: Deal; onEdit: (d: Deal) => void; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: 'none' as const,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function DroppableColumn({ status, children, count, totalAmount }: {
  status: DealStatus
  children: React.ReactNode
  count: number
  totalAmount: number
}) {
  const statusInfo = DEAL_STATUSES.find(s => s.value === status)!
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[280px] max-w-[320px] flex-shrink-0 rounded-xl p-3 transition-colors ${
        isOver ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-bold ${statusInfo.bgColor} ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <span className="text-xs text-gray-400">{count}件</span>
        </div>
        {totalAmount > 0 && (
          <span className="text-xs text-gray-500 font-bold">{totalAmount.toLocaleString()}円</span>
        )}
      </div>
      <div className="min-h-[100px]">
        {children}
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const supabase = createClient()
  const { orgId, loading: orgLoading } = useOrg()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [formTouched, setFormTouched] = useState<Record<string, boolean>>({})

  // フォームstate
  const [form, setForm] = useState({
    deal_name: '',
    facility_name: '',
    contact_name: '',
    amount: '',
    status: 'lead' as DealStatus,
    expected_close_date: '',
    follow_up_date: '',
    notes: '',
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const loadDeals = useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
    setDeals(data || [])
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    if (orgLoading) return
    loadDeals()
  }, [orgLoading, loadDeals])

  const resetForm = () => {
    setForm({
      deal_name: '',
      facility_name: '',
      contact_name: '',
      amount: '',
      status: 'lead',
      expected_close_date: '',
      follow_up_date: '',
      notes: '',
    })
    setEditingDeal(null)
    setFormTouched({})
  }

  const handleSubmit = async () => {
    if (!form.deal_name.trim() || !orgId) return

    const payload = {
      org_id: orgId,
      deal_name: form.deal_name.trim(),
      facility_name: form.facility_name.trim(),
      contact_name: form.contact_name.trim(),
      amount: parseInt(form.amount) || 0,
      status: form.status,
      expected_close_date: form.expected_close_date || null,
      follow_up_date: form.follow_up_date || null,
      notes: form.notes.trim(),
      updated_at: new Date().toISOString(),
    }

    if (editingDeal) {
      await supabase.from('deals').update(payload).eq('id', editingDeal.id)
    } else {
      await supabase.from('deals').insert(payload)
    }

    resetForm()
    setShowForm(false)
    loadDeals()
  }

  const handleEdit = (deal: Deal) => {
    setForm({
      deal_name: deal.deal_name,
      facility_name: deal.facility_name,
      contact_name: deal.contact_name,
      amount: deal.amount ? String(deal.amount) : '',
      status: deal.status,
      expected_close_date: deal.expected_close_date || '',
      follow_up_date: deal.follow_up_date || '',
      notes: deal.notes,
    })
    setEditingDeal(deal)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    setDeleteTarget(id)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await supabase.from('deals').delete().eq('id', deleteTarget)
    setDeals(deals.filter(d => d.id !== deleteTarget))
    setDeleteTarget(null)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id)
    setActiveDeal(deal || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDeal(null)

    if (!over) return

    const dealId = active.id as string
    const newStatus = over.id as DealStatus

    // ステータス名にドロップされた場合
    if (DEAL_STATUSES.some(s => s.value === newStatus)) {
      const deal = deals.find(d => d.id === dealId)
      if (!deal || deal.status === newStatus) return

      // 楽観的更新
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: newStatus } : d))

      await supabase
        .from('deals')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', dealId)
    }
  }

  // CSVエクスポート
  const handleExportCSV = () => {
    if (deals.length === 0) return

    const statusMap: Record<string, string> = {}
    DEAL_STATUSES.forEach(s => { statusMap[s.value] = s.label })

    const headers = ['商談名', '事業所名', '担当者', '金額', 'ステータス', '成約予定日', 'フォローアップ日', '備考', '作成日']
    const rows = deals.map(d => [
      d.deal_name,
      d.facility_name,
      d.contact_name,
      String(d.amount),
      statusMap[d.status] || d.status,
      d.expected_close_date || '',
      d.follow_up_date || '',
      d.notes,
      d.created_at ? new Date(d.created_at).toLocaleDateString('ja-JP') : '',
    ])

    const BOM = '\uFEFF'
    const csv = BOM + [headers.join(','), ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `商談一覧_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const dealsByStatus = (status: DealStatus) => deals.filter(d => d.status === status)

  return (
    <AppShell>
      <Header title="商談パイプライン" />
      <div className="px-4 py-4 max-w-full mx-auto">

        {/* アクションバー */}
        <div className="flex gap-2 mb-4 max-w-lg mx-auto">
          <button
            onClick={() => { resetForm(); setShowForm(!showForm) }}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-sm"
          >
            {showForm ? '閉じる' : '+ 商談を追加'}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={deals.length === 0}
            className="bg-green-600 text-white px-4 py-3 rounded-lg font-bold text-sm disabled:opacity-50"
          >
            CSV出力
          </button>
        </div>

        {/* 追加/編集フォーム */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4 max-w-lg mx-auto space-y-3">
            <h3 className="font-bold">{editingDeal ? '商談を編集' : '新規商談'}</h3>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">商談名 *</label>
              <input
                type="text"
                value={form.deal_name}
                onChange={(e) => setForm({ ...form, deal_name: e.target.value })}
                onBlur={() => setFormTouched(prev => ({ ...prev, deal_name: true }))}
                placeholder="例: A病院との契約交渉"
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  formTouched.deal_name && !form.deal_name.trim()
                    ? 'border-red-400'
                    : 'border-gray-300'
                }`}
                aria-required="true"
                aria-invalid={formTouched.deal_name && !form.deal_name.trim() ? 'true' : undefined}
              />
              {formTouched.deal_name && !form.deal_name.trim() && (
                <p className="text-red-500 text-xs mt-1" role="alert">商談名は必須です</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">事業所名</label>
                <input
                  type="text"
                  value={form.facility_name}
                  onChange={(e) => setForm({ ...form, facility_name: e.target.value })}
                  placeholder="A病院"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">担当者</label>
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="山田太郎"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">金額（円）</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="100000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ステータス</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as DealStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {DEAL_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">成約予定日</label>
                <input
                  type="date"
                  value={form.expected_close_date}
                  onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">フォローアップ日</label>
                <input
                  type="date"
                  value={form.follow_up_date}
                  onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">備考</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="メモ..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!form.deal_name.trim()}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold disabled:opacity-50"
            >
              {editingDeal ? '更新する' : '追加する'}
            </button>
          </div>
        )}

        {/* かんばんボード */}
        {loading ? (
          <div className="max-w-lg mx-auto"><SkeletonList count={3} lines={2} /></div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4">
              {DEAL_STATUSES.map(status => {
                const statusDeals = dealsByStatus(status.value)
                const totalAmount = statusDeals.reduce((sum, d) => sum + d.amount, 0)
                return (
                  <DroppableColumn
                    key={status.value}
                    status={status.value}
                    count={statusDeals.length}
                    totalAmount={totalAmount}
                  >
                    {statusDeals.map(deal => (
                      <SortableDealCard
                        key={deal.id}
                        deal={deal}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </DroppableColumn>
                )
              })}
            </div>
            <DragOverlay>
              {activeDeal && (
                <div className="opacity-80">
                  <DealCard deal={activeDeal} onEdit={() => {}} onDelete={() => {}} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* 合計サマリー */}
        {!loading && deals.length > 0 && (
          <div className="max-w-lg mx-auto mt-4 bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-bold text-sm text-gray-700 mb-2">パイプライン集計</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">進行中</p>
                <p className="font-bold text-blue-700">
                  {deals.filter(d => !['won', 'lost'].includes(d.status)).reduce((s, d) => s + d.amount, 0).toLocaleString()}円
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">成約済み</p>
                <p className="font-bold text-green-700">
                  {deals.filter(d => d.status === 'won').reduce((s, d) => s + d.amount, 0).toLocaleString()}円
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-xs text-gray-500">失注</p>
                <p className="font-bold text-red-700">
                  {deals.filter(d => d.status === 'lost').reduce((s, d) => s + d.amount, 0).toLocaleString()}円
                </p>
              </div>
            </div>
          </div>
        )}
        <ConfirmModal
          open={deleteTarget !== null}
          title="商談の削除"
          message="この商談を削除しますか？この操作は元に戻せません。"
          confirmLabel="削除する"
          cancelLabel="キャンセル"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </AppShell>
  )
}
