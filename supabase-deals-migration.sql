-- =============================================
-- 商談パイプライン・売上目標 マイグレーション
-- Supabase SQL Editorで実行してください
-- =============================================

-- 1. 商談テーブル
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  facility_id UUID REFERENCES facilities(id),
  facility_name TEXT NOT NULL DEFAULT '',
  contact_name TEXT DEFAULT '',
  deal_name TEXT NOT NULL DEFAULT '',
  amount INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost')),
  expected_close_date DATE,
  follow_up_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 売上目標テーブル
CREATE TABLE IF NOT EXISTS sales_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  target_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, year, month)
);

-- 3. RLS有効化
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシー（deals）
CREATE POLICY "自組織の商談を閲覧可能" ON deals
  FOR SELECT TO authenticated
  USING (org_id = get_user_org_id());

CREATE POLICY "自組織に商談を追加可能" ON deals
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "自組織の商談を更新可能" ON deals
  FOR UPDATE TO authenticated
  USING (org_id = get_user_org_id());

CREATE POLICY "自組織の商談を削除可能" ON deals
  FOR DELETE TO authenticated
  USING (org_id = get_user_org_id());

-- 5. RLSポリシー（sales_targets）
CREATE POLICY "自組織の売上目標を閲覧可能" ON sales_targets
  FOR SELECT TO authenticated
  USING (org_id = get_user_org_id());

CREATE POLICY "自組織に売上目標を追加可能" ON sales_targets
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "自組織の売上目標を更新可能" ON sales_targets
  FOR UPDATE TO authenticated
  USING (org_id = get_user_org_id());

CREATE POLICY "自組織の売上目標を削除可能" ON sales_targets
  FOR DELETE TO authenticated
  USING (org_id = get_user_org_id());

-- 6. インデックス
CREATE INDEX IF NOT EXISTS idx_deals_org_id ON deals(org_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_follow_up_date ON deals(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_sales_targets_org_id ON sales_targets(org_id);

-- 7. anonユーザー（未ログイン）用のポリシー追加（デモモード対応）
CREATE POLICY "anon_deals_select" ON deals
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_deals_insert" ON deals
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_deals_update" ON deals
  FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_deals_delete" ON deals
  FOR DELETE TO anon USING (true);

CREATE POLICY "anon_sales_targets_select" ON sales_targets
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_sales_targets_insert" ON sales_targets
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_sales_targets_update" ON sales_targets
  FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_sales_targets_delete" ON sales_targets
  FOR DELETE TO anon USING (true);
