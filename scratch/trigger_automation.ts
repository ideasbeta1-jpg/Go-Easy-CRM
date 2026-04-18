import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Registrando paths para que soporte @/ imports de Next
import * as tsConfigPaths from 'tsconfig-paths';
const tsConfig = require('../tsconfig.json');
tsConfigPaths.register({
  baseUrl: './',
  paths: tsConfig.compilerOptions.paths
});

import { executeStageAutomation } from '../src/utils/automation-engine';

async function run() {
  const leadId = 'fb8406fe-fc86-4777-a187-8f9df3c4bfda';
  const paymentIntentId = 'pi_3TNXscFYhCcugkeF0fxN0EKD';
  
  console.log('Ejecutando motor de automatizacion para reserva confirmada...');
  
  await executeStageAutomation(leadId, 'reserva_confirmada', {
    stripe_payment_id: paymentIntentId,
    amount: 100, // asume 100 de ejemplo
    currency: 'USD',
    event_id: 'manual_trigger'
  });
  
  console.log('Motor finalizado');
}
run().catch(console.error);
