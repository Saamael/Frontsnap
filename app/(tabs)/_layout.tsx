import { Tabs } from 'expo-router';
import { Search, Camera, Heart } from 'lucide-react-native';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '@/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2C2C2E',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          paddingTop: Spacing.sm,
          paddingBottom: Spacing.sm,
          height: Platform.OS === 'ios' ? 58 : 68,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          shadowOpacity: 0,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
          elevation: 0,
          borderWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: Spacing.xs,
          marginBottom: Spacing.xs,
          paddingBottom: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ size, color }) => (
            <Search size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ size, color }) => (
            <View style={{
              backgroundColor: color === '#2C2C2E' ? '#2C2C2E' : '#F2F2F7',
              borderRadius: 20,
              padding: Spacing.sm,
            }}>
              <Camera size={size + 4} color={color === '#2C2C2E' ? '#FFFFFF' : color} strokeWidth={2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections',
          tabBarIcon: ({ size, color }) => (
            <Heart size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}