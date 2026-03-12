'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'
import type { DailyReport } from '@/lib/types'

export default function ReportsPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filterUser] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('daily_reports')
        .select('*, facility:facilities(name)')
        .order('visit_date', { ascending: false })

      setReports(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filterUser
    ? reports.filter(r => r.user_id === filterUser)
    : reports

  return (
    <>
      <Header title="日報一覧" />
      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* 日報入力ボタン */}
        <Link
          href="/reports/new"
          className="block bg-blue-600 text-white text-center py-3 rounded-lg font-bold mb-4"
        >
          📝 新しい日報を入力
        </Link>

        <p className="text-sm text-gray-500 mb-2">{filtered.length}件の日報</p>

        {loading ? (
          <p className="text-gray-400 text-center py-8">読み込み中...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-8">日報がありません</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => (
              <div key={report.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-gray-800">
                      {(report.facility as { name: string } | null)?.name || '不明な施設'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {report.visit_date}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{report.talk_content}</p>
                {report.memo && (
                  <p className="text-xs text-gray-400">📌 {report.memo}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
