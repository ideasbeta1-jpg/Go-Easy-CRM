// ============================================================================
// Tipos TypeScript de Supabase — Go Easy CRM
// ----------------------------------------------------------------------------
// Generado desde el proyecto Supabase oupphpttipkedntaxizk · 2026-06-17
//
// REGENERAR tras cualquier cambio de esquema:
//   supabase gen types typescript --project-id oupphpttipkedntaxizk > src/types/database.types.ts
//
// USO con los clientes Supabase:
//   import type { Database } from '@/types/database.types'
//   createBrowserClient<Database>(url, key)
//   createServerClient<Database>(url, key, { cookies })
//   createClient<Database>(url, serviceKey)   // admin
//
// Helpers exportados: Tables<'leads'>, TablesInsert<'leads'>, TablesUpdate<'leads'>,
//   Enums<'lead_status'>, Constants.public.Enums.lead_status
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      automation_config: {
        Row: {
          channel: string
          enabled: boolean
          stage: string
          updated_at: string | null
        }
        Insert: {
          channel: string
          enabled?: boolean
          stage: string
          updated_at?: string | null
        }
        Update: {
          channel?: string
          enabled?: boolean
          stage?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          stage: string
          status: string | null
          template_name: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          stage: string
          status?: string | null
          template_name?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          stage?: string
          status?: string | null
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_message: string | null
          action_stage: string | null
          action_template: string | null
          action_type: string
          created_at: string | null
          enabled: boolean | null
          id: string
          name: string
          task_payload: Json | null
          trigger_date_field: string | null
          trigger_date_offset_hours: number | null
          trigger_delay_hours: number | null
          trigger_stage: string | null
          trigger_type: string
        }
        Insert: {
          action_message?: string | null
          action_stage?: string | null
          action_template?: string | null
          action_type: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          task_payload?: Json | null
          trigger_date_field?: string | null
          trigger_date_offset_hours?: number | null
          trigger_delay_hours?: number | null
          trigger_stage?: string | null
          trigger_type: string
        }
        Update: {
          action_message?: string | null
          action_stage?: string | null
          action_template?: string | null
          action_type?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          task_payload?: Json | null
          trigger_date_field?: string | null
          trigger_date_offset_hours?: number | null
          trigger_delay_hours?: number | null
          trigger_stage?: string | null
          trigger_type?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          agent_id: string | null
          answered_at: string | null
          called_number: string | null
          caller_number: string | null
          created_at: string | null
          direction: string | null
          duration: number | null
          ended_at: string | null
          id: string
          lead_id: string | null
          pbx_extension: string | null
          recording_url: string | null
          started_at: string | null
          status: string | null
          zadarma_call_id: string | null
        }
        Insert: {
          agent_id?: string | null
          answered_at?: string | null
          called_number?: string | null
          caller_number?: string | null
          created_at?: string | null
          direction?: string | null
          duration?: number | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          pbx_extension?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string | null
          zadarma_call_id?: string | null
        }
        Update: {
          agent_id?: string | null
          answered_at?: string | null
          called_number?: string | null
          caller_number?: string | null
          created_at?: string | null
          direction?: string | null
          duration?: number | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          pbx_extension?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string | null
          zadarma_call_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          base_daily_cost: number | null
          created_at: string
          daily_price: number
          description: string | null
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          base_daily_cost?: number | null
          created_at?: string
          daily_price: number
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          base_daily_cost?: number | null
          created_at?: string
          daily_price?: number
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          assigned_to: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          phone_normalized: string | null
          source: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          phone_normalized?: string | null
          source?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          phone_normalized?: string | null
          source?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          stage: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          stage: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          stage?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          lead_id: string
          metadata: Json
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          lead_id: string
          metadata?: Json
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          lead_id?: string
          metadata?: Json
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          agent_id: string | null
          content: string
          created_at: string | null
          id: string
          lead_id: string
        }
        Insert: {
          agent_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          lead_id: string
        }
        Update: {
          agent_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agreed_daily_price: number | null
          assigned_to: string | null
          category_id: string | null
          contact_id: string | null
          created_at: string
          deleted_at: string | null
          deposit_paid: boolean
          draft_conductor_nombre: string | null
          draft_conductor_telefono: string | null
          draft_provider_confirmation: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          lost_reason: string | null
          notes: string | null
          phone: string | null
          pickup_date: string | null
          pickup_location: string | null
          pickup_location_id: string | null
          provider_id: string | null
          rate_plan: string | null
          return_date: string | null
          return_location: string | null
          return_location_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          status_changed_at: string | null
          stripe_payment_id: string | null
          total_amount: number | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          agreed_daily_price?: number | null
          assigned_to?: string | null
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_paid?: boolean
          draft_conductor_nombre?: string | null
          draft_conductor_telefono?: string | null
          draft_provider_confirmation?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          lost_reason?: string | null
          notes?: string | null
          phone?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_location_id?: string | null
          provider_id?: string | null
          rate_plan?: string | null
          return_date?: string | null
          return_location?: string | null
          return_location_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          status_changed_at?: string | null
          stripe_payment_id?: string | null
          total_amount?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          agreed_daily_price?: number | null
          assigned_to?: string | null
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_paid?: boolean
          draft_conductor_nombre?: string | null
          draft_conductor_telefono?: string | null
          draft_provider_confirmation?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          lost_reason?: string | null
          notes?: string | null
          phone?: string | null
          pickup_date?: string | null
          pickup_location?: string | null
          pickup_location_id?: string | null
          provider_id?: string | null
          rate_plan?: string | null
          return_date?: string | null
          return_location?: string | null
          return_location_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          status_changed_at?: string | null
          stripe_payment_id?: string | null
          total_amount?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_return_location_id_fkey"
            columns: ["return_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          name: string
          type: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
          type?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string | null
          direction: string | null
          id: string
          is_read: boolean | null
          lead_id: string | null
          media_type: string | null
          media_url: string | null
          status: string | null
          wamid: string | null
        }
        Insert: {
          contact_id?: string | null
          content: string
          created_at?: string | null
          direction?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          status?: string | null
          wamid?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string | null
          direction?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          status?: string | null
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          lead_id: string | null
          link: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          link?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          link?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_actions: {
        Row: {
          action_payload: Json | null
          action_type: string
          created_at: string | null
          error: string | null
          execute_at: string
          executed_at: string | null
          id: string
          lead_id: string
          rule_id: string | null
          status: string | null
        }
        Insert: {
          action_payload?: Json | null
          action_type: string
          created_at?: string | null
          error?: string | null
          execute_at: string
          executed_at?: string | null
          id?: string
          lead_id: string
          rule_id?: string | null
          status?: string | null
        }
        Update: {
          action_payload?: Json | null
          action_type?: string
          created_at?: string | null
          error?: string | null
          execute_at?: string
          executed_at?: string | null
          id?: string
          lead_id?: string
          rule_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          disabled: boolean
          first_name: string | null
          full_name: string | null
          id: string
          inactivity_timeout: number | null
          is_active: boolean | null
          last_active_at: string | null
          last_assigned_at: string | null
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          whatsapp_number: string | null
          zadarma_sip: string | null
          zadarma_sip_password: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          disabled?: boolean
          first_name?: string | null
          full_name?: string | null
          id: string
          inactivity_timeout?: number | null
          is_active?: boolean | null
          last_active_at?: string | null
          last_assigned_at?: string | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          whatsapp_number?: string | null
          zadarma_sip?: string | null
          zadarma_sip_password?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          disabled?: boolean
          first_name?: string | null
          full_name?: string | null
          id?: string
          inactivity_timeout?: number | null
          is_active?: boolean | null
          last_active_at?: string | null
          last_assigned_at?: string | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          whatsapp_number?: string | null
          zadarma_sip?: string | null
          zadarma_sip_password?: string | null
        }
        Relationships: []
      }
      provider_offices: {
        Row: {
          address: string | null
          created_at: string | null
          hours: string | null
          id: string
          location_id: string
          notes: string | null
          phone: string | null
          provider_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          hours?: string | null
          id?: string
          location_id: string
          notes?: string | null
          phone?: string | null
          provider_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          hours?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          phone?: string | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_offices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_offices_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          whatsapp_group_id: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          whatsapp_group_id?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          whatsapp_group_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          deposit_amount: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          lead_id: string
          pdf_url: string | null
          pickup_date: string | null
          return_date: string | null
          stripe_link: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string
          deposit_amount?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          lead_id: string
          pdf_url?: string | null
          pickup_date?: string | null
          return_date?: string | null
          stripe_link?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string
          deposit_amount?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          lead_id?: string
          pdf_url?: string | null
          pickup_date?: string | null
          return_date?: string | null
          stripe_link?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          category: string
          context: Json
          created_at: string
          error: string | null
          id: string
          lead_id: string | null
          message: string
          severity: string
          source: string
          status: string | null
        }
        Insert: {
          category: string
          context?: Json
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message: string
          severity?: string
          source: string
          status?: string | null
        }
        Update: {
          category?: string
          context?: Json
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message?: string
          severity?: string
          source?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          ai_search_config: Json | null
          crm_name: string | null
          crm_tagline: string | null
          favicon_url: string | null
          google_config: Json | null
          id: number
          logo_url: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          updated_at: string | null
        }
        Insert: {
          ai_search_config?: Json | null
          crm_name?: string | null
          crm_tagline?: string | null
          favicon_url?: string | null
          google_config?: Json | null
          id?: number
          logo_url?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_search_config?: Json | null
          crm_name?: string | null
          crm_tagline?: string | null
          favicon_url?: string | null
          google_config?: Json | null
          id?: number
          logo_url?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          automation_rule_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          follow_up_rules: Json
          id: string
          lead_id: string
          outcome: string | null
          outcome_notes: string | null
          parent_task_id: string | null
          priority: string
          source: string
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          automation_rule_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          follow_up_rules?: Json
          id?: string
          lead_id: string
          outcome?: string | null
          outcome_notes?: string | null
          parent_task_id?: string | null
          priority?: string
          source?: string
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          automation_rule_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          follow_up_rules?: Json
          id?: string
          lead_id?: string
          outcome?: string | null
          outcome_notes?: string | null
          parent_task_id?: string | null
          priority?: string
          source?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_profiles_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          conductor_nombre: string | null
          conductor_telefono: string | null
          confirmation_number: string
          created_at: string
          id: string
          lead_id: string
          provider_confirmation: string | null
          voucher_url: string | null
        }
        Insert: {
          conductor_nombre?: string | null
          conductor_telefono?: string | null
          confirmation_number: string
          created_at?: string
          id?: string
          lead_id: string
          provider_confirmation?: string | null
          voucher_url?: string | null
        }
        Update: {
          conductor_nombre?: string | null
          conductor_telefono?: string | null
          confirmation_number?: string
          created_at?: string
          id?: string
          lead_id?: string
          provider_confirmation?: string | null
          voucher_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_template_mappings: {
        Row: {
          created_at: string | null
          id: string
          language_code: string | null
          mappings: Json
          stage: string | null
          template_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          language_code?: string | null
          mappings?: Json
          stage?: string | null
          template_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language_code?: string | null
          mappings?: Json
          stage?: string | null
          template_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_stale_agents: { Args: never; Returns: undefined }
      get_conversation_previews: {
        Args: { p_lead_ids: string[] }
        Returns: {
          content: string
          created_at: string
          direction: string
          id: string
          is_read: boolean
          lead_id: string
          media_type: string
          media_url: string
          status: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      lead_status:
        | "lead_nuevo"
        | "en_cotizacion"
        | "reserva_confirmada"
        | "voucher_enviado"
        | "cerrado"
        | "cerrado_ganado"
        | "cerrado_perdido"
      user_role: "admin" | "agente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      lead_status: [
        "lead_nuevo",
        "en_cotizacion",
        "reserva_confirmada",
        "voucher_enviado",
        "cerrado",
        "cerrado_ganado",
        "cerrado_perdido",
      ],
      user_role: ["admin", "agente"],
    },
  },
} as const
