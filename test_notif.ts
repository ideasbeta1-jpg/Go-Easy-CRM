import { createAdminClient } from './src/utils/supabase/admin';

async function testNotification() {
  const supabase = createAdminClient();
  const { data: admin } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single();

  if (admin) {
    const { error } = await supabase.from('notifications').insert({
      user_id: admin.id,
      type: 'new_message',
      title: 'Prueba de Campana',
      body: 'Esta es una prueba de la campana de notificaciones.',
      is_read: false
    });
    console.log('Inserted notification, error:', error);
  }
}

testNotification();
