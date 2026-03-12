'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import type { DailyReport } from '@/lib/types'

export default function HomePage() {
  const supabase = createClient()
  const [todayCount, setTodayCount] = useState(0)
  const [recentReports, setRecentReports] = useState<DailyReport[]>([])
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(user.email?.split('@')[0] || '')
      }

      const today = new Date().toISOString().split('T')[0]

      // 今日の訪問数
      const { count } = await supabase
        .from('daily_reports')
        .select('*', { count: 'exact', head: true })
        .eq('visit_date', today)
        .eq('user_id', user?.id || '')

      setTodayCount(count || 0)

      // 最近の日報
      const { data: reports } = await supabase
        .from('daily_reports')
        .select('*, facility:facilities(name)')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentReports(reports || [])
    }
    load()
  }, [])

  return (
    <AppShell>
      <Header title="営業管理アプリ" />
      <div className="px-4 py-4 max-w-lg mx-auto">
        <p className="text-gray-600 mb-4">こんにちは、{userName}さん</p>

        {/* 今日の訪問数 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <p className="text-sm text-gray-500">今日の訪問数</p>
          <p className="text-4xl font-bold text-blue-600">{todayCount}<span className="text-lg text-gray-500 ml-1">件</span></p>
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href="/reports/new"
            className="bg-blue-600 text-white rounded-xl p-4 text-center font-bold shadow-sm hover:bg-blue-700"
          >
            📝 日報入力
          </Link>
          <Link
            href="/facilities"
            className="bg-green-600 text-white rounded-xl p-4 text-center font-bold shadow-sm hover:bg-green-700"
          >
            🏢 施設一覧
          </Link>
          <Link
            href="/routes"
            className="bg-orange-500 text-white rounded-xl p-4 text-center font-bold shadow-sm hover:bg-orange-600"
          >
            🗺️ ルート作成
          </Link>
          <Link
            href="/facilities/import"
            className="bg-purple-600 text-white rounded-xl p-4 text-center font-bold shadow-sm hover:bg-purple-700"
          >
            📄 CSV取込
          </Link>
        </div>

        {/* 最近の日報 */}
        <h2 className="text-lg font-bold text-gray-800 mb-3">最近の日報</h2>
        {recentReports.length === 0 ? (
          <p className="text-gray-400 text-sm">まだ日報がありません</p>
        ) : (
          <div className="space-y-2">
            {recentReports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm">
                    {(report.facility as { name: string } | null)?.name || '不明な施設'}
                  </span>
                  <span className="text-xs text-gray-400">{report.visit_date}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{report.talk_content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
