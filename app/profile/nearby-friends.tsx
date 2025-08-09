import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { NearbyFriendsSuggestions } from '@/components/NearbyFriendsSuggestions';
import { HapticFeedback } from '@/utils/haptics';
import { NearbyUser } from '@/lib/supabase';

export default function NearbyFriendsScreen() {
  const router = useRouter();

  const handleBack = () => {
    HapticFeedback.light();
    router.back();
  };

  const handleUserSelect = (user: NearbyUser) => {
    HapticFeedback.light();
    // Could navigate to user profile or show modal
    console.log('Selected user:', user);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Nearby Friends',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color="#007AFF" strokeWidth={2} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <View style={styles.content}>
        <NearbyFriendsSuggestions onUserSelect={handleUserSelect} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
});