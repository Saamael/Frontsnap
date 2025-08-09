import React from 'react';
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
    >
      <Stack.Screen
        name="hidden-gems"
        options={{
          title: 'Manage Hidden Gems',
          headerShown: false,
        }}
      />
    </Stack>
  );
}