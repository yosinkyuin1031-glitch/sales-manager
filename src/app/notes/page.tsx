'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'

interface SharedNote {
  id: string
  facility_name: string | null
  user_name: string
  content: string
  note_type: string
  created_at: string
}

const NOTE_TYPES = [
  { value: 'info', label: '情報共有', color: 'bg-blue-100 text-blue-700', icon: '💬' },
  { value: 'consultation', label: '相談', color: 'bg-yellow-100 text-yellow-700', icon: '🤝' },
  { value: 'important', label: '重要', color: 'bg-red-100 text-red-700', icon: '⚠️' },
  { value: 'success', label: '成果報告', color: 'bg-green-100 text-green-700', icon: '🎉' },
  { value: 'question', label: '質問', color: 'bg-purple-100 text-purple-700', icon: '❓' },
]

export default function NotesPage() {
  const supabase = createClient()
  const [notes, setNotes] = useState<SharedNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filterType, setFilterType] = useState('')

  // 入力フォーム
  const [content, setContent] = useState('')
  const [facilityName, setFacilityName] = useState('')
  const [userName, setUserName] = useState('')
  const [noteType, setNoteType] = useState('info')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [])

  async function loadNotes() {
    const { data } = await supabase
      .from('shared_notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setNotes(data || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!content.trim() || !userName.trim()) return
    setSaving(true)

    const { error } = await supabase.from('shared_notes').insert({
      content: content.trim(),
      facility_name: facilityName.trim() || null,
      user_name: userName.trim(),
      note_type: noteType,
      org_id: 'demo',
    })

    if (error) {
      alert('保存エラー: ' + error.message)
    } else {
      setContent('')
      setFacilityName('')
      setNoteType('info')
      setShowAdd(false)
      loadNotes()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('この投稿を削除しますか？')) return
    await supabase.from('shared_notes').delete().eq('id', id)
    setNotes(notes.filter(n => n.id !== id))
  }

  const filtered = filterType
    ? notes.filter(n => n.note_type === filterType)
    : notes

  const getTypeInfo = (type: string) =>
    NOTE_TYPES.find(t => t.value === type) || NOTE_TYPES[0]

  return (
    <AppShell>
      <Header title="会話・相談共有" />
      <div className="px-4 py-4 max-w-lg mx-auto">

        {/* 投稿ボタン */}
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold mb-4"
        >
          {showAdd ? '閉じる' : '💬 新しく投稿する'}
        </button>

        {/* 投稿フォーム */}
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
              <label className="block text-sm font-bold text-gray-700 mb-1">種別</label>
              <div className="flex flex-wrap gap-2">
                {NOTE_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setNoteType(t.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition
                      ${noteType === t.value
                        ? 'border-blue-500 ' + t.color
                        : 'border-transparent bg-gray-100 text-gray-500'}`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
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

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">内容 *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="共有したい会話内容や相談事項を入力..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || !content.trim() || !userName.trim()}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold disabled:opacity-50"
            >
              {saving ? '投稿中...' : '投稿する'}
            </button>
          </div>
        )}

        {/* フィルタ */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterType('')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap
              ${!filterType ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
          >
            すべて
          </button>
          {NOTE_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap
                ${filterType === t.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-500 mb-2">{filtered.length}件の投稿</p>

        {/* 投稿一覧 */}
        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-8">投稿がありません</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((note) => {
              const typeInfo = getTypeInfo(note.note_type)
              return (
                <div key={note.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                        {note.user_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-gray-800">{note.user_name}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-gray-300 hover:text-red-500 text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  {note.facility_name && (
                    <p className="text-xs text-blue-600 mb-1">🏢 {note.facility_name}</p>
                  )}

                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>

                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(note.created_at).toLocaleString('ja-JP', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
