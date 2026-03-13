'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/useOrg'
import type { VisitSchedule, DailyReport } from '@/lib/types'

export default function HomePage() {
  const supabase = createClient()
  const { orgName } = useOrg()
  const [todaySchedules, setTodaySchedules] = useState<VisitSchedule[]>([])
  const [lastReports, setLastReports] = useState<Record<string, DailyReport>>({})
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserName(user.email?.split('@')[0] || '')

      const today = new Date().toISOString().split('T')[0]

      const { data: schedules } = await supabase
        .from('visit_schedules')
        .select('*, facility:facilities(id, name, address, city, business_category, phone, staff_names)')
        .eq('scheduled_date', today)
        .eq('user_id', user?.id || '')
        .eq('status', 'pending')
        .order('created_at')

      setTodaySchedules(schedules || [])

      if (schedules && schedules.length > 0) {
        const facilityIds = schedules.map((s: VisitSchedule) => s.facility_id)
        const { data: reports } = await supabase
          .from('daily_reports')
          .select('*')
          .in('facility_id', facilityIds)
          .order('visit_date', { ascending: false })

        const reportMap: Record<string, DailyReport> = {}
        if (reports) {
          for (const r of reports) {
            if (!reportMap[r.facility_id]) reportMap[r.facility_id] = r
          }
        }
        setLastReports(reportMap)
      }

      setLoading(false)
    }
    load()
  }, [])

  return (
    <AppShell>
      <Header title="営業管理" />
      <div className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">こんにちは、{userName}さん</p>
          {orgName && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{orgName}</span>
          )}
        </div>

        {/* 今日の訪問リスト */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-1">本日の訪問リスト</h2>
          <p className="text-xs text-gray-400 mb-3">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</p>

          {loading ? (
            <p className="text-gray-400 text-sm py-4 text-center">読み込み中...</p>
          ) : todaySchedules.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">本日の訪問予定はありません</p>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((schedule, index) => {
                const facility = schedule.facility as unknown as {
                  id: string; name: string; address: string; city: string;
                  business_category: string; phone: string; staff_names: string;
                }
                const lastReport = lastReports[schedule.facility_id]

                return (
                  <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-800">{facility?.name}</h3>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {facility?.business_category || '未分類'}
                            </span>
                          </div>
                          {facility?.address && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-green-500 text-white text-xs px-2 py-1.5 rounded-lg flex-shrink-0"
                            >
                              地図
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{facility?.address}</p>
                        {facility?.phone && <p className="text-xs text-gray-500">TEL: {facility.phone}</p>}
                        {facility?.staff_names && <p className="text-xs text-gray-500">担当: {facility.staff_names}</p>}

                        {lastReport ? (
                          <div className="mt-2 bg-yellow-50 rounded-lg p-3">
                            <p className="text-xs font-bold text-yellow-700 mb-1">
                              前回（{lastReport.visit_date}）
                              {lastReport.atmosphere && (
                                <span className="ml-1 font-normal">/ 雰囲気: {lastReport.atmosphere}</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-700 line-clamp-3">{lastReport.talk_content}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 mt-2">初回訪問</p>
                        )}

                        <Link
                          href={`/reports/new?facility_id=${schedule.facility_id}&schedule_id=${schedule.id}`}
                          className="block mt-2 bg-blue-600 text-white text-center py-2 rounded-lg text-sm font-bold"
                        >
                          日報を入力
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link href="/reports/new" className="bg-blue-600 text-white rounded-xl p-4 text-center font-bold shadow-sm text-sm">
            📝 日報入力
          </Link>
          <Link href="/facilities" className="bg-green-600 text-white rounded-xl p-4 text-center font-bold shadow-sm text-sm">
            🏢 事業所一覧
          </Link>
          <Link href="/schedules" className="bg-orange-500 text-white rounded-xl p-4 text-center font-bold shadow-sm text-sm">
            📅 スケジュール管理
          </Link>
          <Link href="/facilities/import" className="bg-purple-600 text-white rounded-xl p-4 text-center font-bold shadow-sm text-sm">
            📄 CSV取込
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
