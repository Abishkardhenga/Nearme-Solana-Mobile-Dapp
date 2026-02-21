/**
 * Example: Using TanStack Query with Firestore
 *
 * This file demonstrates how to fetch data from Firestore
 * using TanStack Query for caching and state management.
 *
 * Copy this pattern for your own data fetching needs.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/services/firebase';

// Define your data type
interface Item {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
}

// ------------------------------------------------------------------
// FETCH ALL ITEMS
// ------------------------------------------------------------------

export function useItems() {
  return useQuery({
    queryKey: ['items'], // Unique key for this query
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'items'));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];
    },
    staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
  });
}

// Usage in a component:
// const { data, isLoading, error, refetch } = useItems();

// ------------------------------------------------------------------
// ADD ITEM (Mutation)
// ------------------------------------------------------------------

export function useAddItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newItem: Omit<Item, 'id'>) => {
      const docRef = await addDoc(collection(db, 'items'), {
        ...newItem,
        createdAt: new Date(),
      });
      return { id: docRef.id, ...newItem };
    },
    onSuccess: () => {
      // Invalidate and refetch items query
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

// Usage in a component:
// const addItem = useAddItem();
// addItem.mutate({ name: 'New Item', description: 'Description' });

// ------------------------------------------------------------------
// UPDATE ITEM (Mutation)
// ------------------------------------------------------------------

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Item> & { id: string }) => {
      const itemRef = doc(db, 'items', id);
      await updateDoc(itemRef, updates);
      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

// Usage:
// const updateItem = useUpdateItem();
// updateItem.mutate({ id: 'item-id', name: 'Updated Name' });

// ------------------------------------------------------------------
// DELETE ITEM (Mutation)
// ------------------------------------------------------------------

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'items', id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    // Optimistic update (optional)
    onMutate: async (deletedId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['items'] });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData(['items']);

      // Optimistically update
      queryClient.setQueryData(['items'], (old: Item[] | undefined) =>
        old?.filter((item) => item.id !== deletedId)
      );

      return { previousItems };
    },
    onError: (err, deletedId, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['items'], context.previousItems);
      }
    },
  });
}

// Usage:
// const deleteItem = useDeleteItem();
// deleteItem.mutate('item-id');

// ------------------------------------------------------------------
// USING IN A COMPONENT
// ------------------------------------------------------------------

/*
import { View, Text, FlatList } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import {
  useItems,
  useAddItem,
  useDeleteItem,
} from '@/hooks/examples/useItems.example';

export default function ItemsScreen() {
  const { data: items, isLoading, error } = useItems();
  const addItem = useAddItem();
  const deleteItem = useDeleteItem();

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <Screen className="p-6">
        <Text className="text-red-500">Error: {error.message}</Text>
      </Screen>
    );
  }

  const handleAdd = () => {
    addItem.mutate({
      name: 'New Item',
      description: 'Created via mutation',
      createdAt: new Date(),
    });
  };

  const handleDelete = (id: string) => {
    deleteItem.mutate(id);
  };

  return (
    <Screen className="p-6">
      <Button onPress={handleAdd} loading={addItem.isPending}>
        Add Item
      </Button>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="p-4 border-b border-gray-200">
            <Text className="font-bold">{item.name}</Text>
            <Text>{item.description}</Text>
            <Button
              onPress={() => handleDelete(item.id)}
              variant="outline"
              loading={deleteItem.isPending}
            >
              Delete
            </Button>
          </View>
        )}
      />
    </Screen>
  );
}
*/

// ------------------------------------------------------------------
// ADVANCED: Real-time Updates with Firestore
// ------------------------------------------------------------------

/*
import { useEffect } from 'react';
import { onSnapshot, collection } from 'firebase/firestore';

export function useItemsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'items'), (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];

      queryClient.setQueryData(['items'], items);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      // Initial fetch
      const snapshot = await getDocs(collection(db, 'items'));
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];
    },
  });
}
*/
