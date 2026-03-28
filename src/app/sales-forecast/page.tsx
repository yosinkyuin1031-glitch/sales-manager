'use client'

import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/Header'
import AppShell from '@/components/AppShell'
import { SkeletonChart } from '@/components/Skeleton'
import { createClient } from '@/lib/supabase/client'
import { useOrg } from '@/lib/useOrg'
import type { Deal, SalesTarget } from '@/lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

interface MonthlyData {
  month: string
  target: number
  actual: number
  forecast: number
}

export default function SalesForecastPage() {
  const supabase = createClient()
  const { orgId, loading: orgLoading } = useOrg()
  const [deals, setDeals] = useState<Deal[]>([])
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showTargetForm, setShowTargetForm] = useState(false)
  const [targetInputs, setTargetInputs] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

  const loadData = useCallback(async () => {
    if (!orgId) return

    const [dealsRes, targetsRes] = await Promise.all([
      supabase
        .from('deals')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'won'),
      supabase
        .from('sales_targets')
        .select('*')
        .eq('org_id', orgId)
        .eq('year', selectedYear),
    ])

    setDeals(dealsRes.data || [])
    setTargets(targetsRes.data || [])

    // 目標入力フォームの初期値
    const inputs: Record<number, string> = {}
    for (let m = 1; m <= 12; m++) {
      const t = (targetsRes.data || []).find(t => t.month === m)
      inputs[m] = t ? String(t.target_amount) : ''
    }
    setTargetInputs(inputs)

    setLoading(false)
  }, [orgId, selectedYear])

  useEffect(() => {
    if (orgLoading) return
    loadData()
  }, [orgLoading, loadData])

  const getMonthlyData = (): MonthlyData[] => {
    const months: MonthlyData[] = []
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1

    for (let m = 1; m <= 12; m++) {
      const monthStr = `${m}月`

      // 目標
      const target = targets.find(t => t.month === m)?.target_amount || 0

      // 実績（成約済み商談のexpected_close_dateまたはupdated_atが該当月のもの）
      const actual = deals
        .filter(d => {
          const dateStr = d.expected_close_date || d.updated_at
          if (!dateStr) return false
          const date = new Date(dateStr)
          return date.getFullYear() === selectedYear && date.getMonth() + 1 === m
        })
        .reduce((sum, d) => sum + d.amount, 0)

      // 予測（今月以降で、まだ実績がない月は、進行中商談のamountを案分）
      let forecast = actual
      if (selectedYear === currentYear && m >= currentMonth && actual === 0) {
        // 進行中商談の予測値
        const inProgressDeals = deals.filter(d => {
          const dateStr = d.expected_close_date
          if (!dateStr) return false
          const date = new Date(dateStr)
          return date.getFullYear() === selectedYear && date.getMonth() + 1 === m
        })
        forecast = inProgressDeals.reduce((sum, d) => sum + d.amount, 0)
      }

      months.push({ month: monthStr, target, actual, forecast })
    }
    return months
  }

  const handleSaveTargets = async () => {
    if (!orgId) return
    setSaving(true)

    for (let m = 1; m <= 12; m++) {
      const amount = parseInt(targetInputs[m]) || 0
      const existing = targets.find(t => t.month === m)

      if (existing) {
        await supabase
          .from('sales_targets')
          .update({ target_amount: amount })
          .eq('id', existing.id)
      } else if (amount > 0) {
        await supabase.from('sales_targets').insert({
          org_id: orgId,
          year: selectedYear,
          month: m,
          target_amount: amount,
        })
      }
    }

    setSaving(false)
    setShowTargetForm(false)
    loadData()
  }

  const monthlyData = getMonthlyData()
  const totalTarget = monthlyData.reduce((s, d) => s + d.target, 0)
  const totalActual = monthlyData.reduce((s, d) => s + d.actual, 0)
  const achievementRate = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0

  // CSVエクスポート
  const handleExportCSV = () => {
    const headers = ['月', '目標（円）', '実績（円）', '達成率']
    const rows = monthlyData.map(d => [
      d.month,
      String(d.target),
      String(d.actual),
      d.target > 0 ? `${Math.round((d.actual / d.target) * 100)}%` : '-',
    ])
    rows.push(['合計', String(totalTarget), String(totalActual), `${achievementRate}%`])

    const BOM = '\uFEFF'
    const csv = BOM + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `売上予測_${selectedYear}年.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatYAxisTick = (value: number) => {
    if (value >= 10000) return `${(value / 10000).toFixed(0)}万`
    return value.toLocaleString()
  }

  return (
    <AppShell>
      <Header title="売上予測" />
      <div className="px-4 py-4 max-w-lg mx-auto">

        {/* 年選択 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedYear(y => y - 1)}
              className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
              aria-label="前の年に移動"
            >
              ←
            </button>
            <span className="font-bold text-lg">{selectedYear}年</span>
            <button
              onClick={() => setSelectedYear(y => y + 1)}
              className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm"
              aria-label="次の年に移動"
            >
              →
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold"
          >
            CSV出力
          </button>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-xs text-gray-500">年間目標</p>
            <p className="font-bold text-blue-700 text-sm">{totalTarget.toLocaleString()}円</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-xs text-gray-500">年間実績</p>
            <p className="font-bold text-green-700 text-sm">{totalActual.toLocaleString()}円</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 text-center">
            <p className="text-xs text-gray-500">達成率</p>
            <p className={`font-bold text-sm ${achievementRate >= 100 ? 'text-green-700' : achievementRate >= 70 ? 'text-yellow-700' : 'text-red-700'}`}>
              {achievementRate}%
            </p>
          </div>
        </div>

        {/* グラフ切り替え */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            棒グラフ
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            折れ線グラフ
          </button>
        </div>

        {/* グラフ */}
        {loading ? (
          <SkeletonChart />
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h3 className="font-bold text-sm text-gray-700 mb-3">月別 目標 vs 実績</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={formatYAxisTick} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value) => `${Number(value).toLocaleString()}円`}
                      labelStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="target" name="目標" fill="#93c5fd" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="actual" name="実績" fill="#34d399" radius={[2, 2, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={formatYAxisTick} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value) => `${Number(value).toLocaleString()}円`}
                      labelStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="target" name="目標" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="actual" name="実績" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 目標設定 */}
        <button
          onClick={() => setShowTargetForm(!showTargetForm)}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold mb-4 text-sm"
        >
          {showTargetForm ? '閉じる' : '月別目標を設定'}
        </button>

        {showTargetForm && (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
            <h3 className="font-bold mb-3">{selectedYear}年の月別目標</h3>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <div key={m} className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 w-8">{m}月</label>
                  <input
                    type="number"
                    value={targetInputs[m] || ''}
                    onChange={(e) => setTargetInputs({ ...targetInputs, [m]: e.target.value })}
                    placeholder="0"
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-xs text-gray-400">円</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveTargets}
              disabled={saving}
              className="w-full mt-3 bg-green-600 text-white py-2.5 rounded-lg font-bold disabled:opacity-50"
            >
              {saving ? '保存中...' : '目標を保存'}
            </button>
          </div>
        )}

        {/* 月別テーブル */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-bold text-sm text-gray-700 mb-3">月別詳細</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-500">月</th>
                    <th className="text-right py-2 text-gray-500">目標</th>
                    <th className="text-right py-2 text-gray-500">実績</th>
                    <th className="text-right py-2 text-gray-500">達成率</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((d, i) => {
                    const rate = d.target > 0 ? Math.round((d.actual / d.target) * 100) : 0
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 font-bold">{d.month}</td>
                        <td className="py-2 text-right text-blue-600">{d.target.toLocaleString()}</td>
                        <td className="py-2 text-right text-green-600">{d.actual.toLocaleString()}</td>
                        <td className={`py-2 text-right font-bold ${
                          d.target === 0 ? 'text-gray-300' :
                          rate >= 100 ? 'text-green-600' :
                          rate >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {d.target > 0 ? `${rate}%` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td className="py-2 font-bold">合計</td>
                    <td className="py-2 text-right font-bold text-blue-600">{totalTarget.toLocaleString()}</td>
                    <td className="py-2 text-right font-bold text-green-600">{totalActual.toLocaleString()}</td>
                    <td className={`py-2 text-right font-bold ${achievementRate >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalTarget > 0 ? `${achievementRate}%` : '-'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
