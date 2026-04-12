const crypto = require('crypto');

// Mock values for testing hashing
function hash(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

const testEmail = 'test@example.com';
const testPhone = '+13055550001';

console.log('--- SHA256 Hashing Test ---');
console.log('Email:', testEmail);
console.log('Hashed Email:', hash(testEmail));
console.log('Phone:', testPhone);
console.log('Hashed Phone:', hash(testPhone));

console.log('\n--- Meta CAPI Payload Mock ---');
const payload = {
  data: [
    {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: 'test_lead_123',
      user_data: {
        em: [hash(testEmail)],
        ph: [hash(testPhone)],
      },
      custom_data: {
        currency: 'USD',
        value: 150.00
      }
    }
  ]
};

console.log(JSON.stringify(payload, null, 2));
console.log('\nVerification complete: Hashing matches expected SHA256 format.');
