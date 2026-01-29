import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

// Request notification permission
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Send desktop notification
const sendDesktopNotification = (contract) => {
  if (Notification.permission !== 'granted') return;
  
  const typeEmojis = {
    security: '🛡️',
    rescue: '🚑',
    transport: '📦',
    operations: '🤝'
  };
  
  const emoji = typeEmojis[contract.type] || '📋';
  const title = `${emoji} New ${contract.type.charAt(0).toUpperCase() + contract.type.slice(1)} Contract`;
  
  const notification = new Notification(title, {
    body: contract.title || 'A new contract is available!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `contract-${contract.id}`,
    requireInteraction: false,
    silent: false
  });
  
  // Auto-close after 8 seconds
  setTimeout(() => notification.close(), 8000);
  
  // Click to focus the app
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};

export const useContractPolling = (API, enabled, onNewContract) => {
  const lastContractIds = useRef(new Set());
  const isFirstLoad = useRef(true);
  const permissionRequested = useRef(false);

  // Request permission on mount if enabled
  useEffect(() => {
    if (enabled && !permissionRequested.current) {
      permissionRequested.current = true;
      requestNotificationPermission();
    }
  }, [enabled]);

  const checkForNewContracts = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const response = await axios.get(`${API}/contracts`);
      const contracts = response.data || [];
      
      const currentIds = new Set(contracts.map(c => c.id));
      
      // Skip notification on first load - just populate the set
      if (isFirstLoad.current) {
        lastContractIds.current = currentIds;
        isFirstLoad.current = false;
        return;
      }
      
      // Find new contracts
      const newContracts = contracts.filter(c => !lastContractIds.current.has(c.id));
      
      if (newContracts.length > 0) {
        newContracts.forEach(contract => {
          toast.info(`New ${contract.type} contract available!`, {
            description: contract.title,
            duration: 5000,
          });
        });
        
        if (onNewContract) {
          onNewContract(newContracts);
        }
      }
      
      lastContractIds.current = currentIds;
    } catch (error) {
      // Silently fail - don't spam errors
      console.debug('Contract polling failed:', error);
    }
  }, [API, enabled, onNewContract]);

  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkForNewContracts();

    // Poll every 15 seconds
    const interval = setInterval(checkForNewContracts, 15000);
    
    return () => clearInterval(interval);
  }, [enabled, checkForNewContracts]);

  return { refresh: checkForNewContracts };
};

export default useContractPolling;
