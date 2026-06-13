'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { broadcastNotification } from './notifications'

export type TaskType = 'call' | 'whatsapp' | 'meeting' | 'email' | 'custom'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskOutcome = 'positive' | 'negative' | 'no_answer'

export interface FollowUpRule {
  action: 'create_task' | 'whatsapp_template' | 'whatsapp_text' | 'notify_agent'
  delay_hours?: number
  task_type?: TaskType
  title?: string
  description?: string
  priority?: TaskPriority
  follow_up_rules?: Record<string, FollowUpRule>
  template?: string
  message?: string
}

export interface Task {
  id: string
  lead_id: string
  task_type: TaskType
  title: string
  description: string | null
  due_date: string | null
  assigned_to: string | null
  status: TaskStatus
  priority: TaskPriority
  outcome: TaskOutcome | null
  outcome_notes: string | null
  completed_at: string | null
  completed_by: string | null
  follow_up_rules: Record<string, FollowUpRule>
  parent_task_id: string | null
  automation_rule_id: string | null
  source: string
  created_at: string
  updated_at: string
  created_by: string | null
  assigned_to_profile?: { first_name: string; last_name: string; avatar_url: string | null } | null
  lead?: { first_name: string; last_name: string; phone: string | null; status: string } | null
}

export async function getTasksForLead(leadId: string): Promise<{ tasks: Task[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assigned_to_profile:profiles(first_name, last_name, avatar_url)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  if (error) return { tasks: [], error: error.message }
  return { tasks: (data || []) as unknown as Task[] }
}

export async function getMyTasks(
  statusFilter: TaskStatus | 'all' = 'all',
  limit = 100
): Promise<{ tasks: Task[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tasks: [], error: 'No autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = !profile || profile.role === 'admin'

  let query = supabase
    .from('tasks')
    .select('*, assigned_to_profile:profiles(first_name, last_name, avatar_url), lead:leads(first_name, last_name, phone, status)')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit)

  if (!isAdmin) query = query.eq('assigned_to', user.id)
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  } else {
    query = query.neq('status', 'cancelled')
  }

  const { data, error } = await query
  if (error) return { tasks: [], error: error.message }
  return { tasks: (data || []) as unknown as Task[] }
}

export async function createTask(input: {
  lead_id: string
  task_type: TaskType
  title: string
  description?: string
  due_date?: string
  assigned_to?: string
  priority?: TaskPriority
  follow_up_rules?: Record<string, FollowUpRule>
  parent_task_id?: string
}): Promise<{ ok: boolean; task?: Task; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...input,
      status: 'pending',
      priority: input.priority || 'medium',
      source: 'manual',
      created_by: user.id,
      follow_up_rules: input.follow_up_rules || {},
    })
    .select('*')
    .single()

  if (error) return { ok: false, error: error.message }

  if (data.assigned_to && data.assigned_to !== user.id) {
    await broadcastNotification(
      {
        type: 'new_lead',
        title: '📋 Nueva Tarea Asignada',
        body: data.title,
        link: `/dashboard/leads/${data.lead_id}`,
        lead_id: data.lead_id,
      },
      data.assigned_to
    )
  }

  revalidatePath(`/dashboard/leads/${input.lead_id}`)
  revalidatePath('/dashboard/tasks')
  return { ok: true, task: data as unknown as Task }
}

export async function completeTask(
  taskId: string,
  outcome: TaskOutcome,
  outcomeNotes?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()
  if (fetchError || !task) return { ok: false, error: 'Tarea no encontrada' }

  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      outcome,
      outcome_notes: outcomeNotes || null,
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq('id', taskId)
  if (error) return { ok: false, error: error.message }

  // Programar seguimiento según el resultado
  const followUpRules = task.follow_up_rules as Record<string, FollowUpRule> | null
  if (followUpRules && outcome in followUpRules) {
    const followUp = followUpRules[outcome]
    if (followUp) {
      await scheduleFollowUp(task, followUp, supabase, user.id)
    }
  }

  revalidatePath(`/dashboard/leads/${task.lead_id}`)
  revalidatePath('/dashboard/tasks')
  return { ok: true }
}

async function scheduleFollowUp(task: any, followUp: FollowUpRule, supabase: any, userId: string) {
  const delayHours = followUp.delay_hours ?? 0
  const executeAt = new Date(Date.now() + delayHours * 3600 * 1000)

  if (followUp.action === 'create_task') {
    if (delayHours === 0) {
      // Crear tarea inmediatamente
      await supabase.from('tasks').insert({
        lead_id: task.lead_id,
        task_type: followUp.task_type || 'call',
        title: followUp.title || 'Tarea de seguimiento',
        description: followUp.description || null,
        due_date: executeAt.toISOString(),
        assigned_to: task.assigned_to,
        status: 'pending',
        priority: followUp.priority || 'medium',
        follow_up_rules: followUp.follow_up_rules || {},
        parent_task_id: task.id,
        source: 'automation',
        created_by: userId,
      })
    } else {
      // Encolar en pending_actions para ejecución diferida
      await supabase.from('pending_actions').insert({
        lead_id: task.lead_id,
        execute_at: executeAt.toISOString(),
        status: 'pending',
        action_type: 'create_task',
        action_payload: {
          task_type: followUp.task_type || 'call',
          title: followUp.title || 'Tarea de seguimiento',
          description: followUp.description || null,
          priority: followUp.priority || 'medium',
          follow_up_rules: followUp.follow_up_rules || {},
          assigned_to: task.assigned_to,
          parent_task_id: task.id,
        },
      })
    }
  } else if (followUp.action === 'whatsapp_template') {
    await supabase.from('pending_actions').insert({
      lead_id: task.lead_id,
      execute_at: executeAt.toISOString(),
      status: 'pending',
      action_type: 'whatsapp_template',
      action_payload: { action_template: followUp.template },
    })
  } else if (followUp.action === 'whatsapp_text') {
    await supabase.from('pending_actions').insert({
      lead_id: task.lead_id,
      execute_at: executeAt.toISOString(),
      status: 'pending',
      action_type: 'whatsapp_text',
      action_payload: { action_message: followUp.message || '' },
    })
  } else if (followUp.action === 'notify_agent') {
    await supabase.from('pending_actions').insert({
      lead_id: task.lead_id,
      execute_at: executeAt.toISOString(),
      status: 'pending',
      action_type: 'notify_agent',
      action_payload: { action_message: followUp.message || 'Seguimiento pendiente.' },
    })
  }
}

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'due_date' | 'assigned_to' | 'priority' | 'status'>>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId)
  if (error) return { ok: false, error: error.message }
  const { data: task } = await supabase.from('tasks').select('lead_id').eq('id', taskId).single()
  if (task) {
    revalidatePath(`/dashboard/leads/${task.lead_id}`)
    revalidatePath('/dashboard/tasks')
  }
  return { ok: true }
}

export async function cancelTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: task } = await supabase.from('tasks').select('lead_id').eq('id', taskId).single()
  const { error } = await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', taskId)
  if (error) return { ok: false, error: error.message }
  if (task) {
    revalidatePath(`/dashboard/leads/${task.lead_id}`)
    revalidatePath('/dashboard/tasks')
  }
  return { ok: true }
}

// Usada internamente por el motor de automatizaciones (sin auth check)
export async function createTaskAdmin(input: {
  lead_id: string
  task_type: string
  title: string
  description?: string | null
  due_date?: string | null
  assigned_to?: string | null
  priority?: string
  follow_up_rules?: any
  parent_task_id?: string | null
  automation_rule_id?: string | null
  source?: string
}): Promise<{ ok: boolean; task?: any; error?: string }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...input,
      status: 'pending',
      priority: input.priority || 'medium',
      source: input.source || 'automation',
      follow_up_rules: input.follow_up_rules || {},
    })
    .select('*')
    .single()
  if (error) return { ok: false, error: error.message }
  if (data?.assigned_to) {
    await broadcastNotification(
      {
        type: 'new_lead',
        title: '📋 Nueva Tarea',
        body: data.title,
        link: `/dashboard/leads/${data.lead_id}`,
        lead_id: data.lead_id,
      },
      data.assigned_to
    )
  }
  return { ok: true, task: data }
}
