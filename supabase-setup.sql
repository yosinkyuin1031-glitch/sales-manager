-- =============================================
-- 営業管理アプリ DB構築SQL
-- Supabase SQL Editorで実行してください
-- =============================================

-- 1. 施設テーブル
CREATE TABLE IF NOT EXISTS facilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  business_type TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  staff_names TEXT DEFAULT '',
  visit_date TEXT,
  manager TEXT DEFAULT '',
  newsletter TEXT DEFAULT '',
  visit_count INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 0,
  map_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 日報テーブル
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  visit_date TEXT NOT NULL,
  talk_content TEXT DEFAULT '',
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ルートリストテーブル
CREATE TABLE IF NOT EXISTS route_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL DEFAULT '',
  facility_ids JSONB DEFAULT '[]',
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 訪問回数インクリメント用関数
CREATE OR REPLACE FUNCTION increment_visit_count(facility_id_input UUID, visit_date_input TEXT)
RETURNS void AS $$
BEGIN
  UPDATE facilities
  SET visit_count = visit_count + 1,
      visit_date = visit_date_input,
      updated_at = now()
  WHERE id = facility_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS（Row Level Security）有効化
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_lists ENABLE ROW LEVEL SECURITY;

-- 6. RLSポリシー：認証済みユーザーは全施設を閲覧・編集可能
CREATE POLICY "認証済みユーザーは施設を閲覧可能" ON facilities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "認証済みユーザーは施設を追加可能" ON facilities
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "認証済みユーザーは施設を更新可能" ON facilities
  FOR UPDATE TO authenticated USING (true);

-- 7. RLSポリシー：日報は全員閲覧可能、自分のものだけ追加
CREATE POLICY "認証済みユーザーは日報を閲覧可能" ON daily_reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "認証済みユーザーは日報を追加可能" ON daily_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 8. RLSポリシー：ルートは自分のもののみ
CREATE POLICY "自分のルートを閲覧可能" ON route_lists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "自分のルートを追加可能" ON route_lists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "自分のルートを削除可能" ON route_lists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 9. インデックス
CREATE INDEX IF NOT EXISTS idx_facilities_city ON facilities(city);
CREATE INDEX IF NOT EXISTS idx_facilities_business_type ON facilities(business_type);
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_id ON daily_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_facility_id ON daily_reports(facility_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_visit_date ON daily_reports(visit_date);
