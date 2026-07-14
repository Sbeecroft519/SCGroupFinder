import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { playContractSound, playThreatSound, playIssueSound, playStabilitySound, playBidSound, playBidAcceptedSound } from '../utils/sounds';
import { API } from '../App';

// Map contract categories to notification filter IDs
const CATEGORY_TO_FILTER = {
  'Combat': 'combat',
  'Medical': 'rescue',
  'Logistics': 'transport',
  'Industrial': 'mining',
  'Other': 'escort'  // Default mapping for "Other"
};

export const useSSENotifications = (currentUserId, notificationSettings) => {
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  // Use ref to always have latest settings without re-creating EventSource
  const settingsRef = useRef(notificationSettings);
  
  // Keep settingsRef updated
  useEffect(() => {
    settingsRef.current = notificationSettings;
  }, [notificationSettings]);

  useEffect(() => {
    if (!currentUserId) return;

    // Seed persistent org-owner invites so the bell + toast survive refresh/offline.
    (async () => {
      try {
        const res = await axios.get(`${API}/user/org-invites`);
        const invites = Array.isArray(res.data) ? res.data : [];
        if (invites.length === 0) return;
        setNotifications(prev => {
          const existing = new Set(prev.map(n => n.id));
          const seeded = invites
            .filter(i => !existing.has(`invite-${i.org_id}`))
            .map(i => ({
              id: `invite-${i.org_id}`,
              type: 'org_invite',
              title: 'Organization Invitation',
              message: `You have been invited to lead ${i.org_name} [${i.org_tag}]. Open Orgs to set it up.`,
              org_id: i.org_id,
              org_name: i.org_name,
              org_tag: i.org_tag,
              link: '/orgs',
              read: false,
              timestamp: i.invited_at || new Date().toISOString(),
            }));
          if (seeded.length === 0) return prev;
          // Fire one toast summarising the invites (persistent-style).
          toast.info(seeded.length === 1
            ? 'Organization Invitation'
            : `${seeded.length} Organization Invitations`, {
            description: seeded.length === 1 ? seeded[0].message : 'Open Orgs to set them up.',
            duration: 12000,
            action: {
              label: 'Open Orgs',
              onClick: () => { window.location.assign('/orgs'); },
            },
          });
          return [...seeded, ...prev];
        });
      } catch (_e) { /* silent */ }
    })();

    const eventSource = new EventSource(`${API}/notifications/stream`);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const settings = settingsRef.current || {};

        // Ignore pings and connection messages
        if (data.type === 'ping' || data.type === 'connected') return;

        // Check if notification is targeted at specific user
        if (data.target_user_id && data.target_user_id !== currentUserId) {
          return; // Not for this user
        }

        // === GRANULAR NOTIFICATION FILTERING ===
        
        // Filter contract notifications based on user preferences
        if (data.type === 'new_contract') {
          // Check if contract alerts are enabled
          if (settings.contract_alerts === false) {
            return; // User disabled all contract alerts
          }
          
          // Check if specific contract types are selected
          const contractTypes = settings.contract_types || [];
          if (contractTypes.length > 0 && data.category) {
            // Map the contract category to filter ID
            const filterType = CATEGORY_TO_FILTER[data.category] || 'escort';
            if (!contractTypes.includes(filterType)) {
              return; // User not subscribed to this contract type
            }
          }
        }
        
        // Filter intel alerts (threat_alerts in settings)
        if (data.type === 'intel_alert' && settings.threat_alerts === false) {
          return; // User disabled threat alerts
        }

        // Play appropriate sound based on notification type
        if (data.type === 'new_contract' && data.category) {
          playContractSound(data.category);
        } else if (data.type === 'new_bid') {
          playBidSound();
        } else if (data.type === 'bid_accepted') {
          playBidAcceptedSound();
        } else if (data.type === 'intel_alert') {
          if (data.report_type === 'pirates' || data.report_type === 'pvp') {
            playThreatSound();
          } else if (data.report_type === 'lag') {
            playStabilitySound();
          } else {
            playIssueSound();
          }
        } else if (data.type === 'org_invite') {
          playContractSound('Logistics');
          // Toast prompt with click-through to Orgs page
          toast.info(data.title || 'Organization Invitation', {
            description: data.message,
            duration: 10000,
            action: {
              label: 'Open Orgs',
              onClick: () => { window.location.assign('/orgs'); },
            },
          });
        } else if (data.sound === 'alert') {
          playThreatSound();
        } else if (data.sound === 'notification') {
          playContractSound('Logistics'); // Default
        }

        // Add to notifications list (dedupe invites by stable id)
        const stableId = data.type === 'org_invite' && data.org_id ? `invite-${data.org_id}` : Date.now();
        setNotifications(prev => {
          if (data.type === 'org_invite' && prev.some(n => n.id === stableId)) return prev;
          return [
            { ...data, id: stableId, read: false, timestamp: new Date().toISOString() },
            ...prev.slice(0, 49) // Keep last 50
          ];
        });
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      // Will auto-reconnect
    };

    // Allow other pages (e.g. /orgs) to signal that an invite was accepted.
    const onInviteAccepted = (ev) => {
      const orgId = ev?.detail?.org_id;
      if (!orgId) return;
      setNotifications(prev => prev.filter(n => n.id !== `invite-${orgId}`));
    };
    window.addEventListener('org-invite-accepted', onInviteAccepted);

    return () => {
      eventSource.close();
      window.removeEventListener('org-invite-accepted', onInviteAccepted);
    };
  }, [currentUserId]);

  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, connected, markAsRead, clearAll };
};

export default useSSENotifications;
