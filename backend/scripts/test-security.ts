import { ENV } from '../src/config/env';

const TARGET_URL = process.env.TEST_TARGET || 'https://digitalsmm.site';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details: string;
  status?: number;
}

const results: TestResult[] = [];

function record(category: string, name: string, passed: boolean, details: string, status?: number) {
  results.push({ category, name, passed, details, status });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${category}] ${name} ${status ? `(HTTP ${status})` : ''} - ${details}`);
}

async function runSecurityAudit() {
  console.log('===============================================================');
  console.log(`🛡️ DIGITAL SMM - COMPREHENSIVE DEFENSIVE SECURITY AUDIT`);
  console.log(`🎯 Target Endpoint: ${TARGET_URL}`);
  console.log(`🕒 Timestamp: ${new Date().toISOString()}`);
  console.log('===============================================================\n');

  // --------------------------------------------------------------------------
  // TEST SUITE 1: HTTP Security Headers & Information Disclosure
  // --------------------------------------------------------------------------
  console.log('▶ [1/7] Testing HTTP Headers & Server Information Disclosure...');
  try {
    const res = await fetch(`${TARGET_URL}/api/health`);
    const headers = res.headers;

    // 1.1 Check X-Powered-By
    const poweredBy = headers.get('x-powered-by');
    record(
      'Headers',
      'Hide X-Powered-By Header (Anti-Fingerprinting)',
      !poweredBy,
      poweredBy ? `Leaked header: ${poweredBy}` : 'Properly suppressed, Express engine hidden',
      res.status
    );

    // 1.2 Check X-Content-Type-Options
    const nosniff = headers.get('x-content-type-options');
    record(
      'Headers',
      'X-Content-Type-Options: nosniff (MIME-Sniffing Defense)',
      nosniff === 'nosniff',
      nosniff ? `Present: ${nosniff}` : 'Missing header',
      res.status
    );

    // 1.3 Check HSTS
    const hsts = headers.get('strict-transport-security');
    record(
      'Headers',
      'Strict-Transport-Security (HTTPS Enforcement)',
      !!hsts,
      hsts ? `Enforced: ${hsts}` : 'Missing HSTS',
      res.status
    );
  } catch (err: any) {
    record('Headers', 'Health Endpoint Reachability', false, `Connection error: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Unauthenticated Endpoint Access Control (RBAC)
  // --------------------------------------------------------------------------
  console.log('\n▶ [2/7] Testing RBAC: Unauthenticated Access to Protected Routes...');
  const protectedRoutes = [
    { method: 'GET', path: '/api/auth/profile', name: 'User Profile (/api/auth/profile)' },
    { method: 'GET', path: '/api/orders/my-orders', name: 'User Orders (/api/orders/my-orders)' },
    { method: 'GET', path: '/api/wallet/transactions', name: 'Wallet Transactions (/api/wallet/transactions)' },
    { method: 'GET', path: '/api/tickets/my-tickets', name: 'Support Tickets (/api/tickets/my-tickets)' },
    { method: 'GET', path: '/api/tickets/all', name: 'Admin Ticket Management (/api/tickets/all)' },
    { method: 'GET', path: '/api/admin/users', name: 'Admin Users Directory (/api/admin/users)' },
    { method: 'GET', path: '/api/admin/audit-logs', name: 'Admin Audit Ledger (/api/admin/audit-logs)' },
    { method: 'POST', path: '/api/admin/services/markup', name: 'Admin Markup Modification (/api/admin/services/markup)' },
  ];

  for (const route of protectedRoutes) {
    try {
      const res = await fetch(`${TARGET_URL}${route.path}`, {
        method: route.method,
        headers: { 'Content-Type': 'application/json' },
      });
      const passed = res.status === 401;
      const data: any = await res.json().catch(() => ({}));
      record(
        'Auth & RBAC',
        `Reject unauthenticated ${route.name}`,
        passed,
        `HTTP ${res.status}: ${data.error || 'Access denied'}`,
        res.status
      );
    } catch (e: any) {
      record('Auth & RBAC', `Reject unauthenticated ${route.name}`, false, `Request failed: ${e.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Malformed, Fake, & Tampered JWT Tokens
  // --------------------------------------------------------------------------
  console.log('\n▶ [3/7] Testing JWT Cryptographic Integrity & Tampering...');
  const fakeTokens = [
    { name: 'Random Garbage Token', token: 'Bearer completely_garbage_random_string_12345' },
    {
      name: 'Tampered Signature (Header.Payload.FakeSig)',
      token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJBRE1JTiJ9.InvalidSignatureHereFakeSignatureXYZ123',
    },
    {
      name: 'None Algorithm Exploit (alg: none)',
      token: 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJBRE1JTiJ9.',
    },
  ];

  for (const t of fakeTokens) {
    try {
      const res = await fetch(`${TARGET_URL}/api/auth/profile`, {
        headers: { Authorization: t.token },
      });
      const passed = res.status === 401;
      const data: any = await res.json().catch(() => ({}));
      record(
        'JWT Security',
        `Block ${t.name}`,
        passed,
        `Returned HTTP ${res.status}: ${data.error || 'Rejected'}`,
        res.status
      );
    } catch (e: any) {
      record('JWT Security', `Block ${t.name}`, false, `Request failed: ${e.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Wholesale Provider Rate Privacy / Confidentiality
  // --------------------------------------------------------------------------
  console.log('\n▶ [4/7] Testing Wholesale Provider Rate Privacy in Service Catalog...');
  try {
    const res = await fetch(`${TARGET_URL}/api/services?limit=10`);
    if (res.ok) {
      const data: any = await res.json();
      const services = data.services || data.data || [];
      if (Array.isArray(services) && services.length > 0) {
        const leaksWholesale = services.some((s: any) => s.originalRate !== undefined && s.originalRate !== null);
        const leaksMarkup = services.some((s: any) => s.markupPercent !== undefined && s.markupPercent !== null);

        record(
          'Data Confidentiality',
          'Wholesale originalRate redacted for public/guests',
          !leaksWholesale,
          !leaksWholesale
            ? `Verified: originalRate is strictly stripped across all returned services`
            : `LEAK DETECTED: Public response contained original wholesale rates!`,
          res.status
        );

        record(
          'Data Confidentiality',
          'Internal profit markupPercent redacted for public/guests',
          !leaksMarkup,
          !leaksMarkup
            ? `Verified: markupPercent is strictly stripped across all returned services`
            : `LEAK DETECTED: Public response contained margin percentages!`,
          res.status
        );
      } else {
        record('Data Confidentiality', 'Service Catalog Privacy Check', false, 'No services returned to verify');
      }
    } else {
      record('Data Confidentiality', 'Service Catalog Privacy Check', false, `Status ${res.status}`, res.status);
    }
  } catch (e: any) {
    record('Data Confidentiality', 'Service Catalog Privacy Check', false, e.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Reseller API v2 Defenses & Key Validation
  // --------------------------------------------------------------------------
  console.log('\n▶ [5/7] Testing Reseller API v2 Security & SQL Injection in Keys...');
  const apiV2Tests = [
    {
      name: 'Missing API Key Parameter',
      body: { action: 'services' },
      expectedStatus: 401,
    },
    {
      name: 'Invalid/Non-Existent API Key',
      body: { key: 'invalid_fake_api_key_8372619472', action: 'services' },
      expectedStatus: 401,
    },
    {
      name: 'SQL Injection in API Key: \' OR \'1\'=\'1',
      body: { key: "' OR '1'='1' --", action: 'services' },
      expectedStatus: 401,
    },
    {
      name: 'SQL Injection in API Key: UNION SELECT',
      body: { key: "' UNION SELECT NULL, NULL, 'admin', 'ADMIN' --", action: 'balance' },
      expectedStatus: 401,
    },
  ];

  for (const t of apiV2Tests) {
    try {
      const res = await fetch(`${TARGET_URL}/api/v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t.body),
      });
      const passed = res.status === t.expectedStatus;
      const data: any = await res.json().catch(() => ({}));
      record(
        'Reseller API v2',
        t.name,
        passed,
        `Status ${res.status}: ${data.error || 'Successfully rejected'}`,
        res.status
      );
    } catch (e: any) {
      record('Reseller API v2', t.name, false, e.message);
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 6: Input Validation, Schema Enforcement & Injection Defense (Zod)
  // --------------------------------------------------------------------------
  console.log('\n▶ [6/7] Testing Strict Input Validation & Schema Enforcement (Zod)...');
  const validationTests = [
    {
      name: 'Reject SQL Injection in Registration Username',
      endpoint: '/api/auth/register',
      body: { username: "admin' OR 1=1--", email: 'sqli_test@example.com', password: 'Password123!' },
      expectedStatus: 400,
    },
    {
      name: 'Reject XSS payload in Registration Username',
      endpoint: '/api/auth/register',
      body: { username: '<script>alert(1)</script>', email: 'xss_test@example.com', password: 'Password123!' },
      expectedStatus: 400,
    },
    {
      name: 'Reject Weak Password (< 6 characters)',
      endpoint: '/api/auth/register',
      body: { username: 'shortpass', email: 'shortpass@example.com', password: '123' },
      expectedStatus: 400,
    },
    {
      name: 'Reject Malformed Email Format',
      endpoint: '/api/auth/register',
      body: { username: 'validuser', email: 'not-an-email', password: 'ValidPassword123!' },
      expectedStatus: 400,
    },
  ];

  for (const t of validationTests) {
    try {
      const res = await fetch(`${TARGET_URL}${t.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t.body),
      });
      const passed = res.status === t.expectedStatus;
      const data: any = await res.json().catch(() => ({}));
      record(
        'Input Validation',
        t.name,
        passed,
        `Status ${res.status}: ${data.error || 'Properly rejected by schema validator'}`,
        res.status
      );
    } catch (e: any) {
      record('Input Validation', t.name, false, e.message);
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 7: Admin Authentication & Privilege Verification
  // --------------------------------------------------------------------------
  console.log('\n▶ [7/7] Testing Authenticated Admin Session & Privileged Access...');
  try {
    const adminLoginRes = await fetch(`${TARGET_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: ENV.ADMIN_EMAIL,
        password: ENV.ADMIN_PASSWORD,
      }),
    });

    if (adminLoginRes.ok) {
      const authData: any = await adminLoginRes.json();
      const adminToken = authData.token;
      const userObj = authData.user;

      record(
        'Admin Security',
        'Admin Authentication with BCrypt & JWT Issuance',
        !!adminToken && userObj?.role === 'ADMIN',
        `Logged in as ${userObj?.email} with Role: ${userObj?.role}`,
        adminLoginRes.status
      );

      // Verify sensitive passwordHash is NEVER leaked in login response
      const leaksPasswordHash = 'passwordHash' in userObj || 'twoFactorSecret' in userObj;
      record(
        'Data Confidentiality',
        'Password hash & 2FA secret redacted from auth response',
        !leaksPasswordHash,
        !leaksPasswordHash ? 'Verified: No passwordHash or 2FA secrets leaked' : 'LEAK: passwordHash found in user object!',
        adminLoginRes.status
      );

      // Verify Admin Token can securely access /api/admin/users
      const adminUsersRes = await fetch(`${TARGET_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      record(
        'Admin Security',
        'Admin Access to /api/admin/users with valid Admin JWT',
        adminUsersRes.status === 200,
        `Status ${adminUsersRes.status}: Authorized access granted to administrator`,
        adminUsersRes.status
      );

      // Verify Admin Token receives wholesale costs on /api/services
      const adminServicesRes = await fetch(`${TARGET_URL}/api/services?limit=5`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (adminServicesRes.ok) {
        const adminServicesData: any = await adminServicesRes.json();
        const list = adminServicesData.services || [];
        const hasWholesale = list.some((s: any) => s.originalRate !== undefined && s.originalRate !== null);
        record(
          'Admin Security',
          'Admin receives wholesale originalRate when authenticated',
          hasWholesale,
          hasWholesale
            ? `Verified: Administrator receives wholesale cost & markup data`
            : `originalRate not present`,
          adminServicesRes.status
        );
      }
    } else {
      record(
        'Admin Security',
        'Admin Authentication',
        false,
        `Admin login failed with status ${adminLoginRes.status}`,
        adminLoginRes.status
      );
    }
  } catch (e: any) {
    record('Admin Security', 'Admin Authentication', false, e.message);
  }

  // --------------------------------------------------------------------------
  // AUDIT SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('📊 AUDIT SUMMARY & SCORECARD');
  console.log('===============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  const percentage = Math.round((passed / total) * 100);

  console.log(`Total Security Checks: ${total}`);
  console.log(`✅ Passed:              ${passed}`);
  console.log(`❌ Failed:              ${failed}`);
  console.log(`🛡️ Security Score:      ${percentage}%`);
  console.log('===============================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL SECURITY CONTROLS ARE ACTIVE, OPERATIONAL, AND PASSING!');
  } else {
    console.log('⚠️ Some tests did not pass. Review the detailed log above.');
  }
}

runSecurityAudit().catch(console.error);
