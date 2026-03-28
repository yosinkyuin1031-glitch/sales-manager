'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl font-bold">!</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">
          エラーが発生しました
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          予期しないエラーが発生しました。再度お試しください。
        </p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="ページを再読み込み"
        >
          再試行
        </button>
      </div>
    </div>
  )
}
