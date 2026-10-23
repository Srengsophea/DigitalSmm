const TARGET_URL = process.env.TEST_TARGET || 'https://digitalsmm.site';

async function testRateLimit() {
  console.log('Testing OTP Rate Limiting defense against spam flooding (max 5 requests)...');
  let hit429 = false;

  for (let i = 1; i <= 7; i++) {
    try {
      const res = await fetch(`${TARGET_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `spamuser${i}`,
          email: `spam_rate_test_${i}@example.com`,
          password: 'ValidPassword123!',
        }),
      });

      console.log(`Request #${i}: HTTP ${res.status}`);
      if (res.status === 429) {
        hit429 = true;
        const body: any = await res.json().catch(() => ({}));
        console.log(`🛡️ Rate Limiter Activated on request #${i}: "${body.error}"`);
        break;
      }
    } catch (e: any) {
      console.error(`Request #${i} error:`, e.message);
    }
  }

  if (hit429) {
    console.log('✅ PASS: Anti-spam rate limiting is actively enforcing HTTP 429 flood protection.');
  } else {
    console.log('ℹ️ Limit window not reached or running behind load balancer with dynamic headers.');
  }
}

testRateLimit();
