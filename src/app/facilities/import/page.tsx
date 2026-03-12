'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/useOrg'
import Papa from 'papaparse'

interface CSVRow {
  [key: string]: string
}

// CSVカラム名 → DBカラム名のマッピング
const COLUMN_MAP: Record<string, string> = {
  '施設名': 'name',
  '名前': 'name',
  'name': 'name',
  '市区町村': 'city',
  '市町村': 'city',
  'city': 'city',
  '住所': 'address',
  'address': 'address',
  '事業種別': 'business_type',
  '種別': 'business_type',
  'business_type': 'business_type',
  '電話': 'phone',
  '電話番号': 'phone',
  'phone': 'phone',
  '担当者': 'staff_names',
  '担当者名': 'staff_names',
  'staff_names': 'staff_names',
  '訪問日': 'visit_date',
  'visit_date': 'visit_date',
  '管理者': 'manager',
  'manager': 'manager',
  '通信': 'newsletter',
  'newsletter': 'newsletter',
  '訪問回数': 'visit_count',
  'visit_count': 'visit_count',
  '評価': 'rating',
  'rating': 'rating',
  '地図URL': 'map_url',
  'map_url': 'map_url',
  '備考': 'notes',
  'notes': 'notes',
}

export default function ImportPage() {
  const supabase = createClient()
  const router = useRouter()
  const { orgId } = useOrg()
  const [preview, setPreview] = useState<CSVRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; error: number } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const data = results.data as CSVRow[]
        setHeaders(results.meta.fields || [])
        setPreview(data.slice(0, 10))
      },
    })
  }

  const handleImport = async () => {
    if (preview.length === 0) return
    setImporting(true)

    const file = (document.querySelector('input[type="file"]') as HTMLInputElement)?.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: async (results) => {
        const rows = results.data as CSVRow[]
        let success = 0
        let errorCount = 0

        // バッチ挿入（50件ずつ）
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50).map((row) => {
            const mapped: Record<string, string | number | null> = {}
            for (const [csvCol, value] of Object.entries(row)) {
              const dbCol = COLUMN_MAP[csvCol.trim()]
              if (dbCol) {
                if (dbCol === 'visit_count' || dbCol === 'rating') {
                  mapped[dbCol] = parseInt(value) || 0
                } else if (dbCol === 'visit_date') {
                  mapped[dbCol] = value || null
                } else {
                  mapped[dbCol] = value || ''
                }
              }
            }
            mapped.org_id = orgId
            return mapped
          }).filter(m => m.name) // 施設名がないものは除外

          const { error } = await supabase.from('facilities').insert(batch)
          if (error) {
            errorCount += batch.length
          } else {
            success += batch.length
          }
        }

        setResult({ success, error: errorCount })
        setImporting(false)
      },
    })
  }

  return (
    <AppShell>
      <Header title="CSV取り込み" />
      <div className="px-4 py-4 max-w-lg mx-auto">
        <button onClick={() => router.back()} className="text-blue-600 text-sm mb-4">
          ← 戻る
        </button>

        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <h2 className="text-lg font-bold mb-3">CSVファイルを選択</h2>
          <p className="text-sm text-gray-500 mb-3">
            スプレッドシートからダウンロードしたCSVファイルを選択してください
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full text-sm"
          />
        </div>

        {/* プレビュー */}
        {preview.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <h3 className="font-bold mb-2">プレビュー（先頭10件）</h3>
            <p className="text-xs text-gray-500 mb-3">
              認識されたカラム: {headers.filter(h => COLUMN_MAP[h.trim()]).map(h => h).join(', ')}
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    {headers.slice(0, 5).map((h) => (
                      <th key={h} className="text-left p-1 border-b font-bold">
                        {h}
                        {COLUMN_MAP[h.trim()] && (
                          <span className="text-green-600 ml-1">✓</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {headers.slice(0, 5).map((h) => (
                        <td key={h} className="p-1 border-b truncate max-w-[120px]">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? '取り込み中...' : `${preview.length}件以上を取り込む`}
            </button>
          </div>
        )}

        {/* 結果 */}
        {result && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-bold mb-2">取り込み結果</h3>
            <p className="text-green-600">成功: {result.success}件</p>
            {result.error > 0 && (
              <p className="text-red-500">エラー: {result.error}件</p>
            )}
            <button
              onClick={() => router.push('/facilities')}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-bold"
            >
              施設一覧を見る
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
