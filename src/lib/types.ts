export interface Facility {
  id: string
  name: string
  city: string
  address: string
  business_type: string
  phone: string
  staff_names: string
  visit_date: string | null
  manager: string
  newsletter: string
  visit_count: number
  rating: number
  map_url: string
  notes: string
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

export interface DailyReport {
  id: string
  user_id: string
  facility_id: string
  visit_date: string
  talk_content: string
  memo: string
  created_at: string
  facility?: Facility
  user_email?: string
}

export interface RouteList {
  id: string
  user_id: string
  name: string
  facility_ids: string[]
  date: string
  created_at: string
}
