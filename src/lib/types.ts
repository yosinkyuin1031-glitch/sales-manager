export interface Facility {
  id: string
  name: string
  city: string
  address: string
  business_type: string
  business_category: string
  phone: string
  staff_names: string
  visit_date: string | null
  next_visit_date: string | null
  revisit_interval_days: number
  assigned_user_id: string | null
  manager: string
  newsletter: string
  visit_count: number
  rating: number
  map_url: string
  notes: string
  org_id: string
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

export interface DailyReport {
  id: string
  user_id: string
  facility_id: string
  org_id: string
  visit_date: string
  talk_content: string
  atmosphere: string
  memo: string
  created_at: string
  facility?: Facility
}

export interface VisitSchedule {
  id: string
  org_id: string
  user_id: string
  facility_id: string
  scheduled_date: string
  status: 'pending' | 'completed' | 'skipped'
  created_at: string
  facility?: Facility
}

export interface RouteList {
  id: string
  user_id: string
  name: string
  facility_ids: string[]
  date: string
  created_at: string
}

export const BUSINESS_CATEGORIES = [
  'ケアプランセンター',
  '病院',
  'クリニック',
  '民間事業者',
  '介護施設',
  'デイサービス',
  '訪問看護ステーション',
  '地域包括支援センター',
  'その他',
] as const
