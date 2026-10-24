import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Copy, Check, RefreshCw, Play, Terminal, LogIn } from 'lucide-react';

interface ApiDocsProps {
  onNavigate?: (path: string) => void;
}

export const ApiDocs: React.FC<ApiDocsProps> = ({ onNavigate }) => {
  const { user, isAuthenticated, refreshProfile, showToast } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
      <div className="api-page-wrapper">
        {/* Title */}
        <h1 className="api-page-title">DigitalSMM Reseller API Documentation</h1>

        {/* Top Info Overview Card (Fully Responsive for Mobile & Desktop) */}
        <div className="api-overview-card">
          <div className="api-overview-row">
            <div className="api-overview-label">HTTP Method</div>
            <div className="api-overview-value">
              <span className="api-badge-method">POST</span>
            </div>
          </div>

          <div className="api-overview-row">
            <div className="api-overview-label">API URL</div>
            <div className="api-overview-value">
              <div className="api-code-url-wrapper">
                <code className="api-code-url">{apiUrl}</code>
                <button
                  className="topbar-circle-btn"
                  style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0 }}
                  title="Copy API URL"
                  onClick={() => copyToClipboard(apiUrl, 'api_url')}
                >
                  {copiedMap['api_url'] ? <Check size={14} color="#15803d" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="api-overview-row">
            <div className="api-overview-label">API Key</div>
            <div className="api-overview-value">
              {isAuthenticated ? (
                <div className="api-key-container">
                  <code className="api-key-box">{apiKey}</code>
                  <div className="api-key-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        copyToClipboard(apiKey, 'api_key');
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                    >
                      {copiedKey ? <Check size={13} color="#15803d" /> : <Copy size={13} />}
                      <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleRotateKey}
                      disabled={isRotating}
                      title="Regenerate new API key"
                    >
                      <RefreshCw size={13} className={isRotating ? 'spin' : ''} />
                      <span>Regenerate</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    Sign in to your account to view or generate your private API key.
                  </span>
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onNavigate('/login')}
                      style={{ padding: '6px 12px', fontSize: '0.80rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <LogIn size={13} />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="api-overview-row">
            <div className="api-overview-label">Response format</div>
            <div className="api-overview-value">
              <span className="api-badge-format">JSON</span>
            </div>
          </div>
        </div>

        {/* 1. Service list */}
        <h2 className="api-section-header">Service list</h2>
        <div className="api-table-wrapper">
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
        </div>

        <div className="api-example-heading">Example response</div>
        <div className="api-code-container">
          <button
            className="api-code-copy-btn"
            onClick={() => copyToClipboard(servicesResponseJson, 'services_res')}
          >
            {copiedMap['services_res'] ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
            <span>{copiedMap['services_res'] ? 'Copied' : 'Copy'}</span>
          </button>
          <pre>{servicesResponseJson}</pre>
        </div>

        {/* 2. Add order */}
        <h2 className="api-section-header">Add order</h2>
        <div className="api-table-wrapper">
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
        </div>

        <div className="api-example-heading">Example response</div>
        <div className="api-code-container">
          <button
            className="api-code-copy-btn"
            onClick={() => copyToClipboard(addOrderResponseJson, 'add_order_res')}
          >
            {copiedMap['add_order_res'] ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
            <span>{copiedMap['add_order_res'] ? 'Copied' : 'Copy'}</span>
          </button>
          <pre>{addOrderResponseJson}</pre>
        </div>

        {/* 3. Order status */}
        <h2 className="api-section-header">Order status</h2>
        <div className="api-table-wrapper">
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
        </div>

        <div className="api-example-heading">Example response</div>
        <div className="api-code-container">
          <button
            className="api-code-copy-btn"
            onClick={() => copyToClipboard(orderStatusResponseJson, 'status_res')}
          >
            {copiedMap['status_res'] ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
            <span>{copiedMap['status_res'] ? 'Copied' : 'Copy'}</span>
          </button>
          <pre>{orderStatusResponseJson}</pre>
        </div>

        {/* 4. Multiple orders status */}
        <h2 className="api-section-header">Multiple orders status</h2>
        <div className="api-table-wrapper">
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
        </div>

        <div className="api-example-heading">Example response</div>
        <div className="api-code-container">
          <button
            className="api-code-copy-btn"
            onClick={() => copyToClipboard(multiOrdersResponseJson, 'multi_status_res')}
          >
            {copiedMap['multi_status_res'] ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
            <span>{copiedMap['multi_status_res'] ? 'Copied' : 'Copy'}</span>
          </button>
          <pre>{multiOrdersResponseJson}</pre>
        </div>

        {/* 5. User balance */}
        <h2 className="api-section-header">User balance</h2>
        <div className="api-table-wrapper">
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
        </div>

        <div className="api-example-heading">Example response</div>
        <div className="api-code-container">
          <button
            className="api-code-copy-btn"
            onClick={() => copyToClipboard(balanceResponseJson, 'balance_res')}
          >
            {copiedMap['balance_res'] ? <Check size={12} color="#15803d" /> : <Copy size={12} />}
            <span>{copiedMap['balance_res'] ? 'Copied' : 'Copy'}</span>
          </button>
          <pre>{balanceResponseJson}</pre>
        </div>

        {/* Interactive Live API Test Console */}
        <div className="api-live-tester">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Terminal size={18} color={isDark ? '#38bdf8' : '#162399'} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b', margin: 0 }}>
                Live API Console Tester
              </h3>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleLiveTest}
              disabled={isTesting}
            >
              <Play size={12} />
              <span>{isTesting ? 'Sending Request...' : 'Send Live Test Request (Balance)'}</span>
            </button>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12, marginTop: 0 }}>
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
