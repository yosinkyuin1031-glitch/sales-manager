'use client'

import { useState, useRef } from 'react'
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
  '会社': 'name',
  '事業所名': 'name',
  '事業所': 'name',
  'name': 'name',
  '市区町村': 'city',
  '市町村': 'city',
  '市': 'city',
  'city': 'city',
  '住所': 'address',
  '所在地': 'address',
  'address': 'address',
  '事業種別': 'business_type',
  '種別': 'business_type',
  'サービス種別': 'business_type',
  'business_type': 'business_type',
  '事業カテゴリ': 'business_category',
  'カテゴリ': 'business_category',
  'business_category': 'business_category',
  '電話': 'phone',
  '電話番号': 'phone',
  'TEL': 'phone',
  'tel': 'phone',
  'phone': 'phone',
  '担当者': 'staff_names',
  '担当者名': 'staff_names',
  'スタッフ氏名（複数）': 'staff_names',
  '管理者名': 'staff_names',
  'staff_names': 'staff_names',
  '訪問日': 'visit_date',
  '最終訪問日': 'visit_date',
  'visit_date': 'visit_date',
  '管理者': 'manager',
  '担当': 'manager',
  '営業担当': 'manager',
  'manager': 'manager',
  '通信': 'newsletter',
  'ニュースレター': 'newsletter',
  'newsletter': 'newsletter',
  '訪問回数': 'visit_count',
  'visit_count': 'visit_count',
  '評価': 'rating',
  '反応': 'rating',
  'rating': 'rating',
  '地図URL': 'map_url',
  'map': 'map_url',
  'map_url': 'map_url',
  '備考': 'notes',
  'メモ': 'notes',
  'notes': 'notes',
  'FAX': 'fax',
  'fax': 'fax',
  'FAX番号': 'fax',
}

// サンプルCSVデータ
const SAMPLE_CSV = `施設名,市区町村,住所,事業種別,事業カテゴリ,電話番号,担当者名,営業担当,備考
サンプル介護施設,杉並区,東京都杉並区高円寺北1-1-1,特養,介護施設,03-1234-5678,山田太郎,大口,初回訪問済み
サンプルデイサービス,世田谷区,東京都世田谷区代沢2-2-2,デイサービス,デイサービス,03-2345-6789,佐藤花子,大口,来月再訪問予定`

// Shift-JIS検出とデコード
function readFileWithEncoding(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const uint8 = new Uint8Array(e.target?.result as ArrayBuffer)
      let sjisCount = 0
      for (let i = 0; i < Math.min(uint8.length, 1000); i++) {
        if ((uint8[i] >= 0x80 && uint8[i] <= 0x9F) || (uint8[i] >= 0xE0 && uint8[i] <= 0xEF)) {
          sjisCount++
        }
      }
      const encoding = sjisCount > 10 ? 'Shift_JIS' : 'UTF-8'
      const decoder = new TextDecoder(encoding)
      resolve(decoder.decode(uint8))
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export default function ImportPage() {
  const supabase = createClient()
  const router = useRouter()
  const { orgId } = useOrg()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CSVRow[]>([])
  const [allData, setAllData] = useState<CSVRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update'>('skip')
  const [result, setResult] = useState<{
    success: number
    skipped: number
    updated: number
    error: number
    errorRows: { row: number; name: string; reason: string }[]
  } | null>(null)

  const parseFile = async (file: File) => {
    const text = await readFileWithEncoding(file)
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CSVRow[]
        setHeaders(results.meta.fields || [])
        setAllData(data)
        setPreview(data.slice(0, 10))
      },
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setResult(null)
    setProgress({ current: 0, total: 0 })
    parseFile(file)
  }

  const mapRow = (row: CSVRow): Record<string, string | number | null> => {
    const mapped: Record<string, string | number | null> = {}
    for (const [csvCol, value] of Object.entries(row)) {
      const dbCol = COLUMN_MAP[csvCol.trim()]
      if (dbCol && dbCol !== 'fax') {
        if (dbCol === 'visit_count' || dbCol === 'rating') {
          mapped[dbCol] = parseInt(value) || 0
        } else if (dbCol === 'visit_date') {
          const v = value?.trim()
          mapped[dbCol] = v ? v.replace(/\//g, '-') : null
        } else if (dbCol === 'map_url') {
          mapped[dbCol] = (value && value !== 'Google Mapsで表示') ? value : ''
        } else {
          mapped[dbCol] = value || ''
        }
      }
    }
    // FAXは備考に追記
    const faxCol = Object.keys(row).find(k => COLUMN_MAP[k.trim()] === 'fax')
    if (faxCol && row[faxCol]) {
      const existing = (mapped.notes as string) || ''
      mapped.notes = existing ? `${existing} / FAX: ${row[faxCol]}` : `FAX: ${row[faxCol]}`
    }
    // 住所があってmap_urlがない場合、GoogleマップURLを自動生成
    if (mapped.address && !mapped.map_url) {
      mapped.map_url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapped.address as string)}`
    }
    mapped.org_id = orgId
    return mapped
  }

  const isValidRow = (m: Record<string, string | number | null>): { valid: boolean; reason?: string } => {
    const name = (m.name as string)?.trim()
    if (!name) return { valid: false, reason: '施設名が空です' }
    if (!m.address && !m.phone && !m.staff_names) return { valid: false, reason: 'エリア区切り行のためスキップ' }
    return { valid: true }
  }

  const handleImport = async () => {
    if (allData.length === 0 || !selectedFile) return
    setImporting(true)
    setResult(null)

    const text = await readFileWithEncoding(selectedFile)
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as CSVRow[]
        let success = 0
        let skipped = 0
        let updated = 0
        let errorCount = 0
        const errorRows: { row: number; name: string; reason: string }[] = []

        setProgress({ current: 0, total: rows.length })

        // 既存施設を取得（重複チェック用）
        const { data: existing } = await supabase
          .from('facilities')
          .select('id, name, address')
          .eq('org_id', orgId)

        const existingMap = new Map<string, string>()
        if (existing) {
          for (const f of existing) {
            const key = `${(f.name || '').trim()}||${(f.address || '').trim()}`
            existingMap.set(key, f.id)
          }
        }

        // バッチ処理（50件ずつ）
        for (let i = 0; i < rows.length; i += 50) {
          const batchRows = rows.slice(i, i + 50)
          const toInsert: Record<string, string | number | null>[] = []
          const toUpdate: { id: string; data: Record<string, string | number | null> }[] = []

          for (let j = 0; j < batchRows.length; j++) {
            const rowNum = i + j + 2 // +2 for header row + 1-indexed
            const mapped = mapRow(batchRows[j])
            const validation = isValidRow(mapped)

            if (!validation.valid) {
              if (validation.reason !== 'エリア区切り行のためスキップ') {
                errorRows.push({ row: rowNum, name: (mapped.name as string) || '(空)', reason: validation.reason! })
              }
              continue
            }

            const key = `${(mapped.name as string).trim()}||${(mapped.address as string || '').trim()}`
            const existingId = existingMap.get(key)

            if (existingId) {
              if (duplicateMode === 'update') {
                const updateData = { ...mapped }
                delete updateData.org_id
                toUpdate.push({ id: existingId, data: updateData })
              } else {
                skipped++
              }
            } else {
              toInsert.push(mapped)
              existingMap.set(key, 'pending')
            }
          }

          // 新規挿入
          if (toInsert.length > 0) {
            const { error } = await supabase.from('facilities').insert(toInsert)
            if (error) {
              errorCount += toInsert.length
              errorRows.push({ row: i + 2, name: '(バッチ)', reason: error.message })
            } else {
              success += toInsert.length
            }
          }

          // 既存更新
          for (const item of toUpdate) {
            const { error } = await supabase
              .from('facilities')
              .update(item.data)
              .eq('id', item.id)
            if (error) {
              errorCount++
              errorRows.push({ row: i + 2, name: (item.data.name as string) || '', reason: error.message })
            } else {
              updated++
            }
          }

          setProgress({ current: Math.min(i + 50, rows.length), total: rows.length })
        }

        setResult({ success, skipped, updated, error: errorCount, errorRows })
        setImporting(false)
      },
    })
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_facilities.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const unmappedHeaders = headers.filter(h => !COLUMN_MAP[h.trim()])
  const mappedHeaders = headers.filter(h => COLUMN_MAP[h.trim()])

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

          <button
            onClick={downloadSample}
            className="text-sm text-purple-600 underline mb-3 block"
          >
            サンプルCSVをダウンロード
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv,text/csv,text/plain,application/csv,application/vnd.ms-excel"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg py-6 px-4 text-center"
          >
            <span className="text-blue-600 font-bold text-base">
              {selectedFile ? selectedFile.name : 'タップしてファイルを選択'}
            </span>
            <br />
            <span className="text-xs text-gray-400 mt-1">CSV / テキストファイル対応（Shift-JIS / UTF-8 自動判定）</span>
          </button>
        </div>

        {/* プレビュー */}
        {preview.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <h3 className="font-bold mb-2">プレビュー（先頭10件 / 全{allData.length}件）</h3>

            <div className="mb-3 space-y-1">
              <p className="text-xs text-green-600">
                認識済み ({mappedHeaders.length}): {mappedHeaders.join(', ')}
              </p>
              {unmappedHeaders.length > 0 && (
                <p className="text-xs text-orange-500">
                  未認識 ({unmappedHeaders.length}): {unmappedHeaders.join(', ')}
                </p>
              )}
            </div>

            <div className="overflow-x-auto -mx-5 px-5">
              <table className="text-xs min-w-full">
                <thead>
                  <tr>
                    <th className="text-left p-1 border-b font-bold text-gray-400 sticky left-0 bg-white">#</th>
                    {headers.map((h) => (
                      <th key={h} className={`text-left p-1.5 border-b font-bold whitespace-nowrap ${
                        COLUMN_MAP[h.trim()] ? 'text-green-700 bg-green-50' : 'text-gray-500'
                      }`}>
                        {h}
                        {COLUMN_MAP[h.trim()] && (
                          <span className="text-green-500 ml-0.5">→{COLUMN_MAP[h.trim()]}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-1 border-b text-gray-400 sticky left-0 bg-white">{i + 1}</td>
                      {headers.map((h) => (
                        <td key={h} className="p-1.5 border-b whitespace-nowrap max-w-[200px] truncate">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 重複処理の設定 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-bold text-gray-700 mb-2">重複施設（同名+同住所）の処理</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dupMode"
                    checked={duplicateMode === 'skip'}
                    onChange={() => setDuplicateMode('skip')}
                    className="accent-blue-600"
                  />
                  <span className="text-sm">スキップ</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="dupMode"
                    checked={duplicateMode === 'update'}
                    onChange={() => setDuplicateMode('update')}
                    className="accent-blue-600"
                  />
                  <span className="text-sm">上書き更新</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? '取り込み中...' : `${allData.length}件を取り込む`}
            </button>

            {/* 進捗バー */}
            {importing && progress.total > 0 && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {progress.current} / {progress.total} 件処理中...
                </p>
              </div>
            )}
          </div>
        )}

        {/* 結果 */}
        {result && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-bold mb-3">取り込み結果</h3>
            <div className="space-y-1">
              <p className="text-green-600 font-medium">新規登録: {result.success}件</p>
              {result.updated > 0 && (
                <p className="text-blue-600 font-medium">更新: {result.updated}件</p>
              )}
              {result.skipped > 0 && (
                <p className="text-gray-500">スキップ（重複）: {result.skipped}件</p>
              )}
              {result.error > 0 && (
                <p className="text-red-500 font-medium">エラー: {result.error}件</p>
              )}
            </div>

            {result.errorRows.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg max-h-40 overflow-y-auto">
                <p className="text-xs font-bold text-red-700 mb-1">エラー詳細:</p>
                {result.errorRows.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">
                    行{e.row}: {e.name} - {e.reason}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={() => router.push('/facilities')}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-bold"
            >
              施設一覧を見る
            </button>
            <button
              onClick={() => {
                setSelectedFile(null)
                setPreview([])
                setAllData([])
                setHeaders([])
                setResult(null)
                setProgress({ current: 0, total: 0 })
              }}
              className="w-full mt-2 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium"
            >
              別のCSVを取り込む
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
