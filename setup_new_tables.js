const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:fJZj8SDawfJze7H9@db.vzkfkazjylrkspqrnhnx.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  await client.connect();
  console.log('Connected');

  const statements = [
    // 会話・相談共有テーブル
    `CREATE TABLE IF NOT EXISTS shared_notes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      org_id TEXT,
      facility_id TEXT,
      facility_name TEXT,
      user_name TEXT DEFAULT 'スタッフ',
      content TEXT NOT NULL,
      note_type TEXT DEFAULT 'info',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // リマインダーテーブル
    `CREATE TABLE IF NOT EXISTS reminders (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      org_id TEXT,
      user_name TEXT DEFAULT 'スタッフ',
      facility_name TEXT,
      title TEXT NOT NULL,
      memo TEXT,
      remind_date DATE NOT NULL,
      remind_time TEXT DEFAULT '09:00',
      is_done BOOLEAN DEFAULT false,
      priority TEXT DEFAULT 'normal',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_shared_notes_org ON shared_notes(org_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(remind_date, is_done)`,
    `CREATE INDEX IF NOT EXISTS idx_reminders_org ON reminders(org_id, remind_date)`,
    `ALTER TABLE shared_notes ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE reminders ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY "allow_anon_all_shared_notes" ON shared_notes FOR ALL USING (true) WITH CHECK (true)`,
    `CREATE POLICY "allow_anon_all_reminders" ON reminders FOR ALL USING (true) WITH CHECK (true)`,
  ];

  for (const sql of statements) {
    try {
      await client.query(sql);
      console.log('OK:', sql.substring(0, 60));
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('SKIP:', sql.substring(0, 60));
      } else {
        console.error('ERROR:', e.message);
      }
    }
  }

  await client.end();
  console.log('Done!');
}
setup();
