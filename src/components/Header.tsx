'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Header({ title }: { title: string }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <h1 className="text-lg font-bold">{title}</h1>
      <button
        onClick={handleLogout}
        className="text-sm bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
      >
        ログアウト
      </button>
    </header>
  )
}
