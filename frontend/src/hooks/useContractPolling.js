import { useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

export const useContractPolling = (API, enabled, onNewContract) => {
  const lastContractIds = useRef(new Set());
  const isFirstLoad = useRef(true);

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
