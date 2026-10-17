/**
 * Google Identity Services & OAuth 2.0 Client Service
 * DigitalSMM Premier Automated Infrastructure
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (notification?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          cancel: () => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: any) => void;
          };
        };
      };
    };
  }
}

export interface GoogleAuthResult {
  email: string;
  name?: string;
  credential?: string;
  accessToken?: string;
  picture?: string;
}

/**
 * Retrieve the active Google Client ID from environment or persistent storage
 */
export function getGoogleClientId(): string {
  const fromEnv = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  const fromStorage = localStorage.getItem('digitalsmm_google_client_id') || '';
  const fallback = '768009154981-isviodmon2719cklmvq8g9oa7cjk2m3e.apps.googleusercontent.com';
  return (fromEnv || fromStorage || fallback).trim();
}

/**
 * Save Google Client ID in local persistent storage
 */
export function setGoogleClientId(clientId: string): void {
  const cleanId = clientId.trim();
  if (cleanId) {
    localStorage.setItem('digitalsmm_google_client_id', cleanId);
  }
}

/**
 * Checks if a valid Google Client ID is currently configured
 */
export function hasGoogleClientId(): boolean {
  const id = getGoogleClientId();
  return Boolean(id && id.length > 10 && !id.includes('YOUR_'));
}

/**
 * Initialize Google Identity Services (One Tap & Credential Handler)
 */
export function initGoogleIdentityServices(
  onCredentialReceived: (credential: string) => void
): boolean {
  const clientId = getGoogleClientId();
  if (!clientId || !window.google?.accounts?.id) {
    return false;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (res: any) => {
        if (res.credential) {
          onCredentialReceived(res.credential);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Display Google One Tap overlay showing browser's logged-in Gmail accounts
    window.google.accounts.id.prompt((notification: any) => {
      if (notification?.isNotDisplayed?.()) {
        console.info('[GSI] One Tap not displayed:', notification.getNotDisplayedReason());
      }
    });

    return true;
  } catch (err) {
    console.error('Failed to initialize Google Identity Services:', err);
    return false;
  }
}

/**
 * Connect directly via Google Identity Services Token Client
 * Opens Google's native popup window (accounts.google.com) showing the real Gmail accounts logged in the browser
 */
export function requestGoogleAccessToken(): Promise<GoogleAuthResult> {
  return new Promise((resolve, reject) => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      reject(new Error('GOOGLE_CLIENT_ID_NOT_CONFIGURED'));
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services SDK is loading. Please try again in a moment.'));
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            reject(new Error(`Google authorization error: ${tokenResponse.error}`));
            return;
          }

          if (!tokenResponse.access_token) {
            reject(new Error('No access token received from Google'));
            return;
          }

          // Fetch verified user profile directly from Google UserInfo API
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });

            if (res.ok) {
              const profile = await res.json();
              resolve({
                email: profile.email,
                name: profile.name || profile.given_name || profile.email.split('@')[0],
                picture: profile.picture,
                accessToken: tokenResponse.access_token,
              });
            } else {
              resolve({
                email: '',
                accessToken: tokenResponse.access_token,
              });
            }
          } catch {
            resolve({
              email: '',
              accessToken: tokenResponse.access_token,
            });
          }
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'Google popup sign-in dismissed.'));
        },
      });

      // prompt: 'select_account' forces Google to display all Gmail accounts in the browser
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      reject(err);
    }
  });
}
