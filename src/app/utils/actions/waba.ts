'use server'

import { getTemplates, createTemplate } from '@/utils/waba'
import { createClient } from '@/utils/supabase/server'

export async function getWABATemplatesAction() {
  try {
    const templates = await getTemplates();
    return { success: true, data: templates };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createWABATemplateAction(formData: any) {
  try {
    const result = await createTemplate(formData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTemplateMappingsAction() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('whatsapp_template_mappings')
      .select('*');
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveTemplateMappingAction(templateName: string, mappings: any, stage?: string, language?: string) {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('whatsapp_template_mappings')
      .upsert({
        template_name: templateName,
        mappings,
        stage,
        language_code: language || 'es',
        updated_at: new Date().toISOString()
      }, { onConflict: 'template_name' })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error saving mapping:', error);
    return { success: false, error: error.message };
  }
}

export async function getTemplateMappingByNameAction(templateName: string) {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('whatsapp_template_mappings')
      .select('*')
      .eq('template_name', templateName)
      .maybeSingle();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

