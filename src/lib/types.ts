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

// 商談パイプライン用の型
export type DealStatus = 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost'

export const DEAL_STATUSES: { value: DealStatus; label: string; color: string; bgColor: string }[] = [
  { value: 'lead', label: 'リード', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  { value: 'contacted', label: '接触済み', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { value: 'proposal', label: '提案中', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { value: 'negotiation', label: '交渉中', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  { value: 'won', label: '成約', color: 'text-green-700', bgColor: 'bg-green-100' },
  { value: 'lost', label: '失注', color: 'text-red-700', bgColor: 'bg-red-100' },
]

export interface Deal {
  id: string
  org_id: string
  facility_id: string | null
  facility_name: string
  contact_name: string
  deal_name: string
  amount: number
  status: DealStatus
  expected_close_date: string | null
  follow_up_date: string | null
  notes: string
  created_at: string
  updated_at: string
}

// 売上目標用の型
export interface SalesTarget {
  id: string
  org_id: string
  year: number
  month: number
  target_amount: number
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
