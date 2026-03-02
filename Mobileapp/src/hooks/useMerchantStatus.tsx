import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from './useAuth';

export function useMerchantStatus() {
  const { user } = useAuth();
  const [isMerchant, setIsMerchant] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMerchantStatus = async () => {
      if (!user?.uid) {
        setIsMerchant(false);
        setLoading(false);
        return;
      }

      try {
        console.log('Checking merchant status for user:', user.uid);

        // Method 1: Check by document ID (for merchants created via signup)
        const merchantDocRef = doc(db, 'merchants', user.uid);
        const merchantDoc = await getDoc(merchantDocRef);

        if (merchantDoc.exists()) {
          console.log('Merchant found by doc ID:', merchantDoc.data());
          setIsMerchant(true);
          setLoading(false);
          return;
        }

        // Method 2: Check by userId field (for merchants created via registration flow)
        const merchantsQuery = query(
          collection(db, 'merchants'),
          where('userId', '==', user.uid),
          limit(1)
        );

        const merchantSnapshot = await getDocs(merchantsQuery);

        if (!merchantSnapshot.empty) {
          console.log('Merchant found by userId field:', merchantSnapshot.docs[0].data());
          setIsMerchant(true);
        } else {
          console.log('No merchant account found for user');
          setIsMerchant(false);
        }
      } catch (error) {
        console.error('Error checking merchant status:', error);
        setIsMerchant(false);
      } finally {
        setLoading(false);
      }
    };

    checkMerchantStatus();
  }, [user?.uid]);

  return { isMerchant, loading };
}
