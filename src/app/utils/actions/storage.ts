'use server'

import { createClient } from '@/utils/supabase/server'

export async function uploadChatMedia(file: { name: string, type: string, buffer: number[] }) {
  const supabase = await createClient()
  
  // Convert array back to Buffer/Uint8Array
  const content = new Uint8Array(file.buffer)
  const fileName = `${Date.now()}-${file.name}`
  const filePath = `audios/${fileName}`

  const { data, error } = await supabase.storage
    .from('chat_media')
    .upload(filePath, content, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('[Storage Action] Upload error:', error)
    return { error: error.message }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('chat_media')
    .getPublicUrl(filePath)

  return { publicUrl }
}
