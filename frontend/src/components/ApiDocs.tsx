import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Copy, Check, RefreshCw, Key, Play, Terminal } from 'lucide-react';

export const ApiDocs: React.FC = () => {
  const { user, isAuthenticated, refreshProfile, showToast } = useAuth();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedMap, setCopiedMap] = useState<{ [key: string]: boolean }>({});
  const [isRotating, setIsRotating] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const apiKey = user?.apiKey || 'ds_usr_demo_key_example_sign_in_to_view';
  const apiUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5000/api/v2`
    : 'https://digitalsmm.com/api/v2';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [id]: true }));
    showToast('Copied to clipboard!', 'info');
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const handleRotateKey = async () => {
    if (!window.confirm('Are you sure you want to regenerate your API key? Previous connections will need to be updated.')) {
      return;
    }
    setIsRotating(true);
    try {
      const res = await api.auth.regenerateApiKey();
      if (res.success) {
        showToast('New API key generated successfully!', 'success');
        await refreshProfile();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to rotate key', 'error');
    } finally {
      setIsRotating(false);
    }
  };

  const handleLiveTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: apiKey,
          action: 'balance',
        }),
      });
      const data = await response.json();
      setTestResult(JSON.stringify(data, null, 2));
      showToast('Live test completed successfully!', 'success');
    } catch (err: any) {
      setTestResult(JSON.stringify({ error: err.message || 'Failed to connect to API' }, null, 2));
    } finally {
      setIsTesting(false);
    }
  };

  const servicesResponseJson = `[
  {
    "service": 1,
    "name": "Followers",
    "type": "Default",
    "category": "First Category",
    "rate": "0.90",
    "min": "50",
    "max": "10000",
    "refill": true,
    "cancel": true
  },
  {
    "service": 2,
    "name": "Comments",
    "type": "Custom Comments",
    "category": "Second Category",
    "rate": "8",
    "min": "10",
    "max": "1500",
    "refill": false,
    "cancel": true
  }
]`;

  const addOrderResponseJson = `{
  "order": 23501
}`;

  const orderStatusResponseJson = `{
  "charge": "0.2781",
  "start_count": "3572",
  "status": "Completed",
  "remains": "0",
  "currency": "USD"
}`;

  const multiOrdersResponseJson = `{
  "1": {
    "charge": "0.2781",
    "start_count": "3572",
    "status": "Completed",
    "remains": "0",
    "currency": "USD"
  },
  "2": {
    "error": "Incorrect order ID"
  }
}`;

  const balanceResponseJson = `{
  "balance": "100.84",
  "currency": "USD"
}`;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', paddingBottom: 40 }}>
      <div className="api-page-wrapper" style={{ width: '100%' }}>
        {/* Title */}
        <h1 className="api-page-title">API</h1>

        {/* Top Info Table matching Screenshot 2 */}
        <table className="api-overview-table">
          <tbody>
            <tr>
              <td>HTTP Method</td>
              <td>
                <span style={{ fontWeight: 700, color: '#162399', background: '#eef5ff', padding: '3px 8px', borderRadius: 4 }}>
                  POST
                </span>
              </td>
            </tr>
            <tr>
              <td>API URL</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <code style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: 4, border: '1px solid #e2e8f0', color: '#162399', fontWeight: 600 }}>
                    {apiUrl}
                  </code>
                  <button
                    className="topbar-circle-btn"
                    style={{ width: 28, height: 28, borderRadius: 4 }}
                    title="Copy API URL"
                    onClick={() => copyToClipboard(apiUrl, 'api_url')}
                  >
                    {copiedMap['api_url'] ? <Check size={13} color="#15803d" /> : <Copy size={13} />}
                  </button>
                </div>
              </td>
            </tr>
            <tr>
              <td>API Key</td>
              <td>
                {isAuthenticated ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <code style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 4, border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 600, fontFamily: 'monospace' }}>
                      {apiKey}
                    </code>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        copyToClipboard(apiKey, 'api_key');
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                    >
                      {copiedKey ? <Check size={13} color="#15803d" /> : <Copy size={13} />}
                      {copiedKey ? 'Copied' : 'Copy Key'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleRotateKey}
                      disabled={isRotating}
                      title="Regenerate new API key"
                    >
                      <RefreshCw size={13} className={isRotating ? 'spin' : ''} />
                      Regenerate
                    </button>
                  </div>
                ) : (
                  <span style={{ color: '#64748b' }}>
                    Get an API key on the Account page (or sign in to view your key)
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td>Response format</td>
              <td>
                <span style={{ fontWeight: 600 }}>JSON</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 1. Service list matching Screenshot 2 */}
        <h2 className="api-section-header">Service list</h2>
        <table className="api-endpoint-table">
          <thead>
            <tr>
              <th>Parameters</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>key</td>
              <td>Your API key</td>
            </tr>
            <tr>
              <td>action</td>
              <td>services</td>
            </tr>
          </tbody>
        </table>

        <div className="api-example-heading">Example response</div>
        <div className="api-code-container">
          <button
            className="api-code-copy-btn"
            onClick={() => copyToClipboard(servicesResponseJson, 'services_res')}
          >
            {copiedMap['services_res'] ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
            {copiedMap['services_res'] ? 'Copied' : 'Copy'}
          </button>
          <pre>{servicesResponseJson}</pre>
        </div>

        {/* 2. Add order matching Screenshot 2 */}
        <h2 className="api-section-header">Add order</h2>
        <table className="api-endpoint-table">
          <thead>
            <tr>
              <th>Parameters</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>key</td>
              <td>Your API key</td>
            </tr>
            <tr>
              <td>action</td>
              <td>add</td>
            </tr>
            <tr>
              <td>service</td>
              <td>Service ID</td>
            </tr>
            <tr>
              <td>link</td>
              <td>Link to page</td>
            </tr>
            <tr>
              <td>quantity</td>
              <td>Needed quantity</td>
            </tr>
            <tr>
              <td>runs (optional)</td>
              <td>Runs to deliver</td>
            </tr>
            <tr>
              <td>interval (optional)</td>
              <td>Interval in minutes</td>
            </tr>
          </tbody>
        </table>

        <div className="api-example-heading">Example response</div>
        <div className="api-code-container">
          <button
            className="api-code-copy-btn"
            onClick={() => copyToClipboard(addOrderResponseJson, 'add_order_res')}
          >
            {copiedMap['add_order_res'] ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
            {copiedMap['add_order_res'] ? 'Copied' : 'Copy'}
          </button>
          <pre>{addOrderResponseJson}</pre>
        </div>

        {/* 3. Order status */}
        <h2 className="api-section-header">Order status</h2>
        <table className="api-endpoint-table">
          <thead>
            <tr>
              <th>Parameters</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>key</td>
              <td>Your API key</td>
            </tr>
            <tr>
              <td>action</td>
              <td>status</td>
            </tr>
            <tr>
              <td>order</td>
              <td>Order ID</td>
            </tr>
          </tbody>
        </table>

        <div className="api-example-heading">Example response</div>
        <div className="api-code-container">
          <button
            className="api-code-copy-btn"
            onClick={() => copyToClipboard(orderStatusResponseJson, 'status_res')}
          >
            {copiedMap['status_res'] ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
            {copiedMap['status_res'] ? 'Copied' : 'Copy'}
          </button>
          <pre>{orderStatusResponseJson}</pre>
        </div>

        {/* 4. Multiple orders status */}
        <h2 className="api-section-header">Multiple orders status</h2>
        <table className="api-endpoint-table">
          <thead>
            <tr>
              <th>Parameters</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>key</td>
              <td>Your API key</td>
            </tr>
            <tr>
              <td>action</td>
              <td>status</td>
            </tr>
            <tr>
              <td>orders</td>
              <td>Order IDs separated by comma (e.g. 1,2,3)</td>
            </tr>
          </tbody>
        </table>

        <div className="api-example-heading">Example response</div>
        <div className="api-code-container">
          <button
            className="api-code-copy-btn"
            onClick={() => copyToClipboard(multiOrdersResponseJson, 'multi_status_res')}
          >
            {copiedMap['multi_status_res'] ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
            {copiedMap['multi_status_res'] ? 'Copied' : 'Copy'}
          </button>
          <pre>{multiOrdersResponseJson}</pre>
        </div>

        {/* 5. User balance */}
        <h2 className="api-section-header">User balance</h2>
        <table className="api-endpoint-table">
          <thead>
            <tr>
              <th>Parameters</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>key</td>
              <td>Your API key</td>
            </tr>
            <tr>
              <td>action</td>
              <td>balance</td>
            </tr>
          </tbody>
        </table>

        <div className="api-example-heading">Example response</div>
        <div className="api-code-container">
          <button
            className="api-code-copy-btn"
            onClick={() => copyToClipboard(balanceResponseJson, 'balance_res')}
          >
            {copiedMap['balance_res'] ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
            {copiedMap['balance_res'] ? 'Copied' : 'Copy'}
          </button>
          <pre>{balanceResponseJson}</pre>
        </div>

        {/* Interactive Live API Test Console (Developer Bonus) */}
        <div
          style={{
            marginTop: 40,
            padding: 24,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Terminal size={18} color="#162399" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                Live API Console Tester
              </h3>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleLiveTest}
              disabled={isTesting}
            >
              <Play size={12} />
              {isTesting ? 'Sending Request...' : 'Send Live Test Request (Balance)'}
            </button>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12 }}>
            Test your live connection to <code>POST /api/v2</code> with action <code>"balance"</code>.
          </p>

          {testResult && (
            <div className="api-code-container" style={{ marginBottom: 0 }}>
              <pre>{testResult}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
