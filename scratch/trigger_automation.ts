import { executeStageAutomation } from './src/utils/automation-engine';

async function test() {
  const leadId = '0877f133-85b1-479a-ae23-a81fe9338a34';
  console.log('Triggering automation for lead:', leadId);
  await executeStageAutomation(leadId, 'reserva_confirmada', {
    stripe_payment_id: 'pi_test_manual_update',
    amount: 880,
    currency: 'USD'
  });
  console.log('Automation triggered!');
}

test();
