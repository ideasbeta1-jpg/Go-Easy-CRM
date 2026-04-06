'use server'

import { getTemplates, createTemplate } from '@/utils/waba'

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
