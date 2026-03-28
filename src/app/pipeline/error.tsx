'use client'

import { useEffect } from 'react'
import AppShell from '@/components/AppShell'
import Header from '@/components/Header'

export default function PipelineError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Pipeline error:', error)
  }, [error])

  return (
    <AppShell>
      <Header title="商談パイプライン" />
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl font-bold">!</span>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            商談データの読み込みに失敗しました
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            ネットワーク接続を確認して再試行してください。
          </p>
          <button
            onClick={reset}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm
              hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="再読み込み"
          >
            再試行
          </button>
        </div>
      </div>
    </AppShell>
  )
}
