export interface LeadFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  pickup_location: string
  return_location: string
  pickup_location_id: string
  return_location_id: string
  pickup_date: string
  return_date: string
  category_id: string
  provider_id: string
  assigned_to: string
  total_amount: number
  status: string
  deposit_paid: boolean
  notes: string
  agreed_daily_price: number | null
  rate_plan: string
}

export interface LeadCategory {
  id: string
  name: string
  daily_price: number | string
  base_daily_cost: number | string
  description?: string
  image_url?: string
}

export interface LeadProvider {
  id: string
  name: string
}

export interface LeadAgent {
  id: string
  full_name: string
  avatar_url?: string
  zadarma_sip?: string
}

export interface LeadLocation {
  id: string
  name: string
  code?: string
}

export interface LeadNote {
  id: string
  content: string
  created_at: string
  profiles?: { full_name?: string; avatar_url?: string }
}

export interface LeadMessage {
  id?: string
  direction: 'inbound' | 'outbound'
  content?: string
  media_type?: string
  media_url?: string
  created_at: string
}
