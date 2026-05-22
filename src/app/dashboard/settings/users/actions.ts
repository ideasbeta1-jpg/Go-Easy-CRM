'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function createSystemUser(formData: FormData) {
  try {
    const supabase = createAdminClient()
    
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const role = formData.get('role') as string // 'admin' | 'agente'

    if (!email || !password || !firstName || !lastName || !role) {
      return { error: 'Todos los campos son requeridos.' }
    }

    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        role: role
      }
    })

    if (createError) {
      return { error: createError.message }
    }

    revalidatePath('/dashboard/settings/users')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Ocurrió un error inesperado al intentar crear el usuario.' }
  }
}

export async function deleteSystemUser(userId: string) {
    try {
        const supabase = createAdminClient()
        const { error } = await supabase.auth.admin.deleteUser(userId)
        if (error) {
            return { error: error.message }
        }
        revalidatePath('/dashboard/settings/users')
        return { success: true }
    } catch(err: any) {
        return { error: err.message || 'Error inesperado.' }
    }
}

export async function toggleAgentDisabled(userId: string, disabled: boolean) {
  try {
    const supabase = createAdminClient()

    // Ban/unban at auth level so the user cannot log in while disabled
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: disabled ? '876000h' : 'none',
    })
    if (authError) return { error: authError.message }

    const { error } = await supabase
      .from('profiles')
      .update({ disabled })
      .eq('id', userId)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/settings/users')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado.' }
  }
}

export async function updateSystemUser(userId: string, formData: FormData) {
  try {
    const supabase = createAdminClient()
    
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const role = formData.get('role') as string
    const zadarmaSip = formData.get('zadarmaSip') as string
    const zadarmaSipPassword = formData.get('zadarmaSipPassword') as string

    if (!firstName || !lastName || !role) {
      return { error: 'Nombre, apellido y rol son requeridos.' }
    }

    // Actualizamos el perfil público
    const { error: profileError } = await supabase.from('profiles').update({
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        role: role,
        zadarma_sip: zadarmaSip || null,
        zadarma_sip_password: zadarmaSipPassword || null,
    }).eq('id', userId)

    if (profileError) {
      return { error: profileError.message }
    }

    // Opcionalmente actualizar metadata en Auth
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        role: role
      }
    })

    revalidatePath('/dashboard/settings/users')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Error inesperado al actualizar usuario.' }
  }
}
