import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 認証チェック無効化（デモモード）
  // すべてのページに自由にアクセス可能
  return NextResponse.next({ request })
}
