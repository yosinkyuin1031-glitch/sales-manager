'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'

interface Reminder {
  id: string
  user_name: string
  facility_name: string | null
  title: string
  memo: string | null
  remind_date: string
  remind_time: string
  is_done: boolean
  priority: string
  created_at: string
}

const PRIORITIES = [
  { value: 'low', label: '低', color: 'bg-gray-100 text-gray-600' },
  { value: 'normal', label: '中', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: '高', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: '緊急', color: 'bg-red-100 text-red-700' },
]

export default function RemindersPage() {
  const supabase = createClient()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showDone, setShowDone] = useState(false)

  // 入力フォーム
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [facilityName, setFacilityName] = useState('')
  const [userName, setUserName] = useState('')
  const [remindDate, setRemindDate] = useState(new Date().toISOString().split('T')[0])
  const [remindTime, setRemindTime] = useState('09:00')
  const [priority, setPriority] = useState('normal')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadReminders()
  }, [showDone])

  async function loadReminders() {
    let query = supabase
      .from('reminders')
      .select('*')
      .order('remind_date', { ascending: true })

    if (!showDone) {
      query = query.eq('is_done', false)
    }

    const { data } = await query.limit(100)
    setReminders(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!title.trim() || !userName.trim()) return
    setSaving(true)

    const { error } = await supabase.from('reminders').insert({
      title: title.trim(),
      memo: memo.trim() || null,
      facility_name: facilityName.trim() || null,
      user_name: userName.trim(),
      remind_date: remindDate,
      remind_time: remindTime,
      priority,
      org_id: 'demo',
    })

    if (error) {
      alert('保存エラー: ' + error.message)
    } else {
      setTitle('')
      setMemo('')
      setFacilityName('')
      setPriority('normal')
      setShowAdd(false)
      loadReminders()
    }
    setSaving(false)
  }

  async function toggleDone(id: string, currentDone: boolean) {
    await supabase.from('reminders').update({ is_done: !currentDone }).eq('id', id)
    loadReminders()
  }

  async function handleDelete(id: string) {
    if (!confirm('このリマインダーを削除しますか？')) return
    await supabase.from('reminders').delete().eq('id', id)
    setReminders(reminders.filter(r => r.id !== id))
  }

  const today = new Date().toISOString().split('T')[0]
  const overdue = reminders.filter(r => r.remind_date < today && !r.is_done)
  const todayItems = reminders.filter(r => r.remind_date === today)
  const upcoming = reminders.filter(r => r.remind_date > today && !r.is_done)
  const done = reminders.filter(r => r.is_done)

  const getPriorityInfo = (p: string) =>
    PRIORITIES.find(pr => pr.value === p) || PRIORITIES[1]

  function ReminderCard({ reminder }: { reminder: Reminder }) {
    const pri = getPriorityInfo(reminder.priority)
    const isOverdue = reminder.remind_date < today && !reminder.is_done

    return (
      <div className={`bg-white rounded-xl shadow-sm p-4 ${reminder.is_done ? 'opacity-50' : ''} ${isOverdue ? 'border-l-4 border-red-500' : ''}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleDone(reminder.id, reminder.is_done)}
            className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center text-xs
              ${reminder.is_done
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-blue-500'}`}
          >
            {reminder.is_done ? '✓' : ''}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className={`font-bold text-sm ${reminder.is_done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {reminder.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${pri.color}`}>
                    {pri.label}
                  </span>
                  {isOverdue && (
                    <span className="text-xs text-red-600 font-bold">期限超過</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(reminder.id)}
                className="text-gray-300 hover:text-red-500 text-xs"
              >
                ✕
              </button>
            </div>

            {reminder.facility_name && (
              <p className="text-xs text-blue-600 mt-1">🏢 {reminder.facility_name}</p>
            )}

            {reminder.memo && (
              <p className="text-xs text-gray-500 mt-1">{reminder.memo}</p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>📅 {new Date(reminder.remind_date + 'T00:00:00').toLocaleDateString('ja-JP', {
                month: 'short', day: 'numeric', weekday: 'short'
              })}</span>
              <span>⏰ {reminder.remind_time}</span>
              <span>👤 {reminder.user_name}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      <Header title="リマインダー" />
      <div className="px-4 py-4 max-w-lg mx-auto">

        {/* 追加ボタン */}
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold mb-4"
        >
          {showAdd ? '閉じる' : '⏰ リマインダーを追加'}
        </button>

        {/* 追加フォーム */}
        {showAdd && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4 space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">あなたの名前 *</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="田中太郎"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">タイトル *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="〇〇クリニックに電話する"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">関連事業所（任意）</label>
              <input
                type="text"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="〇〇クリニック"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">日付 *</label>
                <input
                  type="date"
                  value={remindDate}
                  onChange={(e) => setRemindDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="w-28">
                <label className="block text-sm font-bold text-gray-700 mb-1">時間</label>
                <input
                  type="time"
                  value={remindTime}
                  onChange={(e) => setRemindTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">優先度</label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition
                      ${priority === p.value
                        ? 'border-blue-500 ' + p.color
                        : 'border-transparent bg-gray-50 text-gray-400'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">メモ（任意）</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="補足情報を入力..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || !title.trim() || !userName.trim()}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold disabled:opacity-50"
            >
              {saving ? '追加中...' : '追加する'}
            </button>
          </div>
        )}

        {/* 完了済み表示トグル */}
        <button
          onClick={() => setShowDone(!showDone)}
          className="text-sm text-blue-600 mb-4 block"
        >
          {showDone ? '完了済みを隠す' : '完了済みも表示'}
        </button>

        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : reminders.length === 0 ? (
          <p className="text-gray-400 text-center py-8">リマインダーがありません</p>
        ) : (
          <div className="space-y-4">
            {/* 期限超過 */}
            {overdue.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-red-600 mb-2">⚠️ 期限超過 ({overdue.length}件)</h2>
                <div className="space-y-2">
                  {overdue.map(r => <ReminderCard key={r.id} reminder={r} />)}
                </div>
              </div>
            )}

            {/* 今日 */}
            {todayItems.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-blue-600 mb-2">📌 今日 ({todayItems.length}件)</h2>
                <div className="space-y-2">
                  {todayItems.map(r => <ReminderCard key={r.id} reminder={r} />)}
                </div>
              </div>
            )}

            {/* 今後の予定 */}
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-600 mb-2">📅 今後の予定 ({upcoming.length}件)</h2>
                <div className="space-y-2">
                  {upcoming.map(r => <ReminderCard key={r.id} reminder={r} />)}
                </div>
              </div>
            )}

            {/* 完了済み */}
            {showDone && done.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-400 mb-2">✅ 完了済み ({done.length}件)</h2>
                <div className="space-y-2">
                  {done.map(r => <ReminderCard key={r.id} reminder={r} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
