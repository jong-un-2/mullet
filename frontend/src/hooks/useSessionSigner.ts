import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
// @ts-ignore - useSessionSigners 可能不在类型定义中
import { useSessionSigners } from '@privy-io/react-auth';
import { toast } from 'sonner';

// Session Signer hook for TRON wallet
// Enables server-side transaction signing
export function useSessionSigner() {
  const { user } = usePrivy();
  const { addSessionSigners } = useSessionSigners();
  const [isSessionSignerAdded, setIsSessionSignerAdded] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Check if session signer is already added to the TRON wallet
  useEffect(() => {
    checkSessionSigner();
  }, [user]);

  async function checkSessionSigner() {
    if (!user) {
      console.log('[SessionSigner] No user logged in');
      return;
    }

    setIsChecking(true);
    try {
      const tronWallet = user.linkedAccounts?.find(
        (account: any) => account.type === 'wallet' && account.chainType === 'tron'
      );

      console.log('[SessionSigner] TRON wallet info:', {
        found: !!tronWallet,
        address: (tronWallet as any)?.address,
        delegated: (tronWallet as any)?.delegated,
        walletId: (tronWallet as any)?.walletId,
      });

      if (tronWallet && (tronWallet as any).delegated) {
        console.log('[SessionSigner] Session signer already added');
        setIsSessionSignerAdded(true);
      } else {
        console.log('[SessionSigner] Session signer NOT added yet');
        setIsSessionSignerAdded(false);
      }
    } catch (error) {
      console.error('[SessionSigner] Failed to check session signer:', error);
    } finally {
      setIsChecking(false);
    }
  }

  // Add session signer to the TRON wallet
  async function addSessionSigner() {
    if (!user) {
      throw new Error('User not logged in');
    }

    const tronWallet = user.linkedAccounts?.find(
      (account: any) => account.type === 'wallet' && account.chainType === 'tron'
    ) as any;

    if (!tronWallet) {
      throw new Error('TRON wallet not found');
    }

    if (tronWallet.delegated) {
      console.log('[SessionSigner] Session signer already added');
      return;
    }

    setIsAdding(true);
    try {
      // Get Session Signer ID from environment variable
      const signerId = import.meta.env.VITE_SESSION_SIGNER_ID;
      if (!signerId) {
        throw new Error('VITE_SESSION_SIGNER_ID not configured. Please set up Session Signer in Privy Dashboard.');
      }

      console.log('[SessionSigner] Adding session signer with ID:', signerId);

      // Use Privy React SDK to add session signer
      // This grants the server permission to sign transactions on behalf of the user
      await addSessionSigners({
        address: tronWallet.address,
        signers: [{
          signerId: signerId,
          policyIds: [], // No policy restrictions - full permission
        }],
      });

      console.log('[SessionSigner] Session signer added successfully');
      
      setIsSessionSignerAdded(true);
      toast.success('Server signing enabled');
      
      // Refresh user data
      await checkSessionSigner();
    } catch (error: any) {
      console.error('[SessionSigner] Failed to add session signer:', error);
      toast.error(error.message || 'Failed to enable server signing');
      throw error;
    } finally {
      setIsAdding(false);
    }
  }

  return {
    isSessionSignerAdded,
    isChecking,
    isAdding,
    addSessionSigner,
    checkSessionSigner,
  };
}
