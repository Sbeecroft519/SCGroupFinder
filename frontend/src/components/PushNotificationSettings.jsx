import {useState, useEffect} from 'react';
import {Bell, BellOff, Send} from 'lucide-react';
import axios from 'axios';
import {useAuth, API} from '../App';
import {disableWebPush, enableWebPush, getPushSubscription, ownsPushSubscription, pushSupportMessage} from '../utils/webPush';

export const PushNotificationSettings = () => {
  const {user} = useAuth();
  const [publicKey, setPublicKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const unsupported = pushSupportMessage();
  const blocked = typeof Notification !== 'undefined' && Notification.permission === 'denied';
  useEffect(() => {
    let active = true;
    Promise.all([axios.get(`${API}/push/config`), getPushSubscription()])
      .then(([config, subscription]) => {
        if (!active) return;
        setPublicKey(config.data.public_key);
        setEnabled(!!subscription && ownsPushSubscription(user.id) && !blocked);
      }).catch(() => { if (active) setError('Could not load notification settings.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [user.id, blocked]);
  const run = async (action) => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); }
    catch (e) { setError(typeof e.response?.data?.detail === 'string' ? e.response.data.detail : e.message || 'Notification setup failed'); }
    finally { setBusy(false); }
  };
  return (
    <section className="push-settings" data-testid="push-settings">
      <h3 data-testid="push-settings-title"><Bell size={18} /> Background organization alerts</h3>
      <p data-testid="push-device-status">{unsupported || (blocked ? 'Blocked in browser settings.' : enabled ? 'Enabled on this device · applications, invitations and approval decisions' : 'Off on this device')}</p>
      {!unsupported && <div className="push-settings-actions">
        <button className="nc-btn nc-btn-primary" data-testid="push-enable-toggle" disabled={busy || (!enabled && (blocked || !publicKey))}
          onClick={() => run(async () => {
            if (enabled) { await disableWebPush(); setEnabled(false); }
            else { await enableWebPush(user.id, publicKey); setEnabled(true); }
          })}>{enabled ? <BellOff size={16} /> : <Bell size={16} />}{busy ? 'Please wait…' : enabled ? 'Disable on this device' : 'Enable on this device'}</button>
        {enabled && <button className="nc-btn nc-btn-secondary" data-testid="push-test-button" disabled={busy}
          onClick={() => run(async () => {
            const subscription = await getPushSubscription();
            if (!subscription) { setEnabled(false); throw new Error('Device subscription expired. Enable notifications again.'); }
            await axios.post(`${API}/push/test`, {endpoint: subscription.endpoint});
            setMessage('Test queued. Delivery depends on your browser and system notification settings.');
          })}><Send size={16} /> Send test</button>}
      </div>}
      {error && <p role="alert" data-testid="push-settings-error" className="text-red">{error}</p>}
      {message && <p role="status" data-testid="push-settings-feedback">{message}</p>}
    </section>
  );
};