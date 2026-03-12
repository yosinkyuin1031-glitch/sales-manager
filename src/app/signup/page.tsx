'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上にしてください')
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message === 'User already registered'
        ? 'このメールアドレスは既に登録されています'
        : 'アカウント作成に失敗しました: ' + signUpError.message)
      setLoading(false)
      return
    }

    // サインアップ後、自動ログインされるのでセットアップへ
    router.push('/setup')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-blue-600 text-white px-4 py-3">
        <h1 className="text-lg font-bold text-center">営業管理アプリ</h1>
      </div>

      <div className="px-4 py-6 max-w-sm mx-auto">
        {/* 特徴 */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">14日間無料でお試し</h2>
          <p className="text-sm text-gray-500">クレジットカード不要で今すぐ始められます</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <ul className="text-sm text-gray-700 space-y-2">
            <li>✅ 施設データをCSVで一括登録</li>
            <li>✅ 訪問日報をスマホから簡単入力</li>
            <li>✅ Googleマップでルート案内</li>
            <li>✅ チーム全体の訪問状況を共有</li>
          </ul>
        </div>

        {/* 登録フォーム */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-center mb-4">アカウント作成</h3>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
                placeholder="example@mail.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
                placeholder="6文字以上"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード（確認）
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
                placeholder="もう一度入力"
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-base
                hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '作成中...' : '無料で始める'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            既にアカウントをお持ちの方は{' '}
            <a href="/login" className="text-blue-600 font-bold">ログイン</a>
          </p>
        </div>

        {/* 料金 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            14日間の無料トライアル後、月額¥5,000でご利用いただけます
          </p>
        </div>
      </div>
    </div>
  )
}
