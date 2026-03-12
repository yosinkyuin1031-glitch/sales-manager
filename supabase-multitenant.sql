-- =============================================
-- マルチテナント化 マイグレーション
-- =============================================

-- 1. 組織（会社）テーブル
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 組織メンバーシップ（ユーザーと組織の紐付け）
CREATE TABLE IF NOT EXISTS org_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- 3. 既存テーブルに org_id カラムを追加
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE route_lists ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

-- 4. org_id のインデックス
CREATE INDEX IF NOT EXISTS idx_facilities_org_id ON facilities(org_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_org_id ON daily_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_route_lists_org_id ON route_lists(org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON org_memberships(org_id);

-- 5. ユーザーの所属組織IDを取得するヘルパー関数
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM org_memberships WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 6. ユーザーの組織での役割を取得するヘルパー関数
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM org_memberships WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 7. 既存のRLSポリシーを削除して再作成
-- facilities
DROP POLICY IF EXISTS "認証済みユーザーは施設を閲覧可能" ON facilities;
DROP POLICY IF EXISTS "認証済みユーザーは施設を追加可能" ON facilities;
DROP POLICY IF EXISTS "認証済みユーザーは施設を更新可能" ON facilities;

CREATE POLICY "自組織の施設を閲覧可能" ON facilities
  FOR SELECT TO authenticated
  USING (org_id = get_user_org_id());

CREATE POLICY "自組織に施設を追加可能" ON facilities
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "自組織の施設を更新可能" ON facilities
  FOR UPDATE TO authenticated
  USING (org_id = get_user_org_id());

-- daily_reports
DROP POLICY IF EXISTS "認証済みユーザーは日報を閲覧可能" ON daily_reports;
DROP POLICY IF EXISTS "認証済みユーザーは日報を追加可能" ON daily_reports;

CREATE POLICY "自組織の日報を閲覧可能" ON daily_reports
  FOR SELECT TO authenticated
  USING (org_id = get_user_org_id());

CREATE POLICY "自組織に日報を追加可能" ON daily_reports
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_user_org_id() AND auth.uid() = user_id);

-- route_lists
DROP POLICY IF EXISTS "自分のルートを閲覧可能" ON route_lists;
DROP POLICY IF EXISTS "自分のルートを追加可能" ON route_lists;
DROP POLICY IF EXISTS "自分のルートを削除可能" ON route_lists;

CREATE POLICY "自組織のルートを閲覧可能" ON route_lists
  FOR SELECT TO authenticated
  USING (org_id = get_user_org_id());

CREATE POLICY "自組織にルートを追加可能" ON route_lists
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_user_org_id() AND auth.uid() = user_id);

CREATE POLICY "自分のルートを削除可能" ON route_lists
  FOR DELETE TO authenticated
  USING (org_id = get_user_org_id() AND auth.uid() = user_id);

-- organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "自組織の情報を閲覧可能" ON organizations
  FOR SELECT TO authenticated
  USING (id = get_user_org_id());

CREATE POLICY "管理者は組織情報を更新可能" ON organizations
  FOR UPDATE TO authenticated
  USING (id = get_user_org_id() AND get_user_role() = 'admin');

-- org_memberships
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "自組織のメンバーを閲覧可能" ON org_memberships
  FOR SELECT TO authenticated
  USING (org_id = get_user_org_id());

CREATE POLICY "管理者はメンバーを追加可能" ON org_memberships
  FOR INSERT TO authenticated
  WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "管理者はメンバーを削除可能" ON org_memberships
  FOR DELETE TO authenticated
  USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- 8. 組織作成＋管理者登録を一括で行う関数（サインアップ時に使用）
CREATE OR REPLACE FUNCTION create_org_with_admin(org_name TEXT)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO organizations (name) VALUES (org_name) RETURNING id INTO new_org_id;
  INSERT INTO org_memberships (org_id, user_id, role) VALUES (new_org_id, auth.uid(), 'admin');
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. メンバー招待用関数（管理者がメールでユーザーを追加）
CREATE OR REPLACE FUNCTION invite_member(member_user_id UUID)
RETURNS void AS $$
BEGIN
  IF get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'admin権限が必要です';
  END IF;
  INSERT INTO org_memberships (org_id, user_id, role)
  VALUES (get_user_org_id(), member_user_id, 'member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
