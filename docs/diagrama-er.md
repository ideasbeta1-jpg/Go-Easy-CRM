# 🗺️ Diagrama Entidad-Relación — Go Easy CRM

> Verificado contra Supabase · `2026-06-17` · 24 tablas + `auth.users`

Diagrama Mermaid del esquema `public`. Se renderiza en GitHub, VS Code (con extensión Mermaid) y en [mermaid.live](https://mermaid.live). Para el detalle de cada columna ver [`esquema-datos.md`](esquema-datos.md); para el DDL ver [`schema.sql`](schema.sql).

```mermaid
erDiagram
    auth_users ||--|| profiles : "1:1 (id)"
    auth_users ||--o{ leads : "assigned_to"
    auth_users ||--o{ contacts : "assigned_to"
    auth_users ||--o{ notifications : "user_id"
    auth_users ||--o{ push_subscriptions : "user_id"
    auth_users ||--o{ tasks : "assigned_to / created_by / completed_by"

    contacts ||--o{ leads : "contact_id"
    contacts ||--o{ messages : "contact_id"

    categories ||--o{ leads : "category_id"
    providers  ||--o{ leads : "provider_id"
    providers  ||--o{ provider_offices : "provider_id"
    locations  ||--o{ leads : "pickup / return"
    locations  ||--o{ provider_offices : "location_id"

    leads ||--o{ quotes : ""
    leads ||--o{ vouchers : ""
    leads ||--o{ messages : ""
    leads ||--o{ lead_notes : ""
    leads ||--o{ lead_events : ""
    leads ||--o{ tasks : ""
    leads ||--o{ call_logs : ""
    leads ||--o{ automation_logs : ""
    leads ||--o{ system_logs : ""
    leads ||--o{ notifications : ""
    leads ||--o{ pending_actions : "lead_id"

    profiles ||--o{ lead_notes : "agent_id"
    profiles ||--o{ lead_events : "actor_id"
    profiles ||--o{ call_logs : "agent_id"

    automation_rules ||--o{ pending_actions : "rule_id"
    tasks ||--o{ tasks : "parent_task_id"

    auth_users {
        uuid id PK
    }

    profiles {
        uuid id PK_FK
        user_role role
        text full_name
        boolean is_active
        boolean disabled
        timestamptz last_assigned_at
        text zadarma_sip
    }

    contacts {
        uuid id PK
        text first_name
        text last_name
        text phone_normalized "UNIQUE parcial"
        uuid assigned_to FK
        timestamptz deleted_at
    }

    leads {
        uuid id PK
        text first_name
        text last_name
        lead_status status
        uuid contact_id FK
        uuid assigned_to FK
        uuid category_id FK
        uuid provider_id FK
        uuid pickup_location_id FK
        uuid return_location_id FK
        numeric agreed_daily_price
        numeric total_amount
        boolean deposit_paid
        text lost_reason
        timestamptz deleted_at
    }

    categories {
        uuid id PK
        text name
        numeric daily_price
        numeric base_daily_cost
    }

    providers {
        uuid id PK
        text name
        text whatsapp_group_id
    }

    locations {
        uuid id PK
        text name "UNIQUE"
        text code
        text type
    }

    provider_offices {
        uuid id PK
        uuid provider_id FK
        uuid location_id FK
        text address
    }

    quotes {
        uuid id PK
        uuid lead_id FK
        text stripe_link
        numeric total_amount
        numeric deposit_amount
        boolean is_active
        timestamptz expires_at
    }

    vouchers {
        uuid id PK
        uuid lead_id FK
        text confirmation_number
        text provider_confirmation
        text conductor_nombre
    }

    messages {
        uuid id PK
        uuid lead_id FK
        uuid contact_id FK
        text content
        text direction
        text wamid "UNIQUE parcial"
        boolean is_read
    }

    lead_notes {
        uuid id PK
        uuid lead_id FK
        uuid agent_id FK
        text content
    }

    lead_events {
        uuid id PK
        uuid lead_id FK
        uuid actor_id FK
        text event_type
        text from_status
        text to_status
        jsonb metadata
    }

    tasks {
        uuid id PK
        uuid lead_id FK
        uuid assigned_to FK
        text task_type
        text status
        text priority
        text outcome
        jsonb follow_up_rules
        uuid parent_task_id FK
        text source
    }

    call_logs {
        uuid id PK
        uuid lead_id FK
        uuid agent_id FK
        text zadarma_call_id "UNIQUE"
        text direction
        text status
        integer duration
    }

    notifications {
        uuid id PK
        uuid user_id FK
        uuid lead_id FK
        text type
        text title
        boolean is_read
    }

    push_subscriptions {
        uuid id PK
        uuid user_id FK
        text endpoint
    }

    automation_config {
        text stage PK
        text channel PK
        boolean enabled
    }

    automation_rules {
        uuid id PK
        text name
        boolean enabled
        text trigger_type
        text trigger_stage
        integer trigger_delay_hours
        text action_type
        jsonb task_payload
    }

    pending_actions {
        uuid id PK
        uuid rule_id FK
        uuid lead_id
        timestamptz execute_at
        text status
        text action_type
        jsonb action_payload
    }

    automation_logs {
        uuid id PK
        uuid lead_id FK
        text stage
        text channel
        text status
        text error_message
    }

    system_logs {
        uuid id PK
        uuid lead_id FK
        text category
        text severity
        text source
        text message
        jsonb context
    }

    email_templates {
        uuid id PK
        text stage "UNIQUE"
        text subject
        text body
    }

    whatsapp_template_mappings {
        uuid id PK
        text template_name "UNIQUE"
        text stage
        text language_code
        jsonb mappings
    }

    system_settings {
        integer id PK "= 1 (singleton)"
        text crm_name
        text logo_url
        jsonb google_config
    }
```

> **Notas de lectura**
> - `automation_config` y `system_settings` no tienen claves foráneas (configuración independiente).
> - `email_templates` y `whatsapp_template_mappings` se relacionan con el pipeline por el valor de texto `stage`, no por FK.
> - `pending_actions.lead_id` apunta a `leads` por valor pero **no** tiene constraint de FK declarado (solo índice).
> - `auth_users` representa `auth.users`, gestionada por Supabase Auth.
