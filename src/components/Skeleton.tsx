'use client'

/**
 * Skeleton loading components with animate-pulse.
 * Use these instead of "読み込み中..." plain text.
 */

export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-gray-200 rounded animate-pulse ${className}`}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 animate-pulse" aria-hidden="true">
      <div className="bg-gray-200 rounded h-5 w-2/3 mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 rounded h-4 mb-2 ${i === lines - 1 ? 'w-1/2' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="読み込み中">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
      <span className="sr-only">読み込み中</span>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse" role="status" aria-label="読み込み中">
      <div className="flex gap-4 mb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 mb-2">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="bg-gray-100 rounded h-4 flex-1" />
          ))}
        </div>
      ))}
      <span className="sr-only">読み込み中</span>
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse" role="status" aria-label="読み込み中">
      <div className="bg-gray-200 rounded h-5 w-1/3 mb-4" />
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-t flex-1"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
      <span className="sr-only">読み込み中</span>
    </div>
  )
}

/** Full-page skeleton with header area */
export function SkeletonPage({ lines = 4 }: { lines?: number }) {
  return (
    <div className="px-4 py-4 max-w-lg mx-auto" role="status" aria-label="読み込み中">
      <SkeletonCard lines={lines} />
      <div className="mt-4">
        <SkeletonCard lines={2} />
      </div>
      <span className="sr-only">読み込み中</span>
    </div>
  )
}
