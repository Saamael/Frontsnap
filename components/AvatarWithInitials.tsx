import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { OptimizedImage } from './OptimizedImage';

interface AvatarWithInitialsProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  style?: any;
  onError?: () => void;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
}

export const AvatarWithInitials: React.FC<AvatarWithInitialsProps> = ({
  name,
  avatarUrl,
  size = 80,
  style,
  onError,
  showOnlineStatus = false,
  isOnline = false,
}) => {
  // Debug logging to track URL corruption
  if (avatarUrl && avatarUrl.includes('avatar_')) {
    console.log('🔍 AvatarWithInitials received avatarUrl:', avatarUrl);
    console.log('🔍 URL type:', typeof avatarUrl);
    console.log('🔍 URL length:', avatarUrl.length);
  }
  // Generate initials from name
  const getInitials = (fullName: string): string => {
    if (!fullName || fullName.trim().length === 0) {
      return '??';
    }
    
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
    
    if (nameParts.length === 0) {
      return '??';
    }
    
    if (nameParts.length === 1) {
      // Single name - use first 2 characters
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    
    // Multiple names - use first letter of first and last name
    const firstInitial = nameParts[0].charAt(0);
    const lastInitial = nameParts[nameParts.length - 1].charAt(0);
    
    return (firstInitial + lastInitial).toUpperCase();
  };

  // Generate consistent color based on name
  const getBackgroundColor = (fullName: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
      '#F1948A', '#85C1E9', '#F8C471', '#82E0AA', '#D7BDE2'
    ];
    
    if (!fullName) return colors[0];
    
    // Simple hash function to get consistent color
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const initials = getInitials(name);
  const backgroundColor = getBackgroundColor(name);
  const avatarStyle = [
    styles.avatar,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    style,
  ];

  // If we have a valid avatar URL, show it with initials as fallback
  if (avatarUrl && avatarUrl.trim() !== '' && !avatarUrl.includes('pexels')) {
    // Ensure avatarUrl is a string to prevent any type coercion issues
    const cleanUrl = String(avatarUrl).trim();
    
    // Validate the URL format to prevent corrupted URLs
    const isValidUrl = cleanUrl.includes('http') && cleanUrl.length > 50;
    
    if (!isValidUrl) {
      console.warn('⚠️ Invalid avatar URL detected:', cleanUrl);
      // Fall through to show initials instead of broken image
    } else {
      // Use JSON.stringify to ensure we see the exact string
      console.log('🖼️ Attempting to load avatar:', JSON.stringify(cleanUrl));
      
      // Use standard React Native Image for Supabase URLs to avoid optimization issues
      if (cleanUrl.includes('supabase')) {
      return (
        <View style={avatarStyle}>
          <Image
            source={{ uri: cleanUrl }}
            style={[
              styles.avatarImage,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
            onError={(e) => {
              console.error('❌ Avatar load error:', e.nativeEvent.error);
              onError?.();
            }}
            onLoad={() => {
              console.log('✅ Avatar loaded successfully');
            }}
          />
          
          {showOnlineStatus && (
            <View
              style={[
                styles.onlineIndicator,
                {
                  width: size * 0.25,
                  height: size * 0.25,
                  borderRadius: (size * 0.25) / 2,
                  bottom: size * 0.05,
                  right: size * 0.05,
                  backgroundColor: isOnline ? '#34C759' : '#8E8E93',
                },
              ]}
            />
          )}
        </View>
      );
    }
    
    // Use OptimizedImage for non-Supabase URLs
    return (
      <View style={avatarStyle}>
        <OptimizedImage
          source={{ uri: cleanUrl }}
          style={[
            styles.avatarImage,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          fallback={
            <View
              style={[
                styles.initialsContainer,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.initialsText,
                  {
                    fontSize: size * 0.35, // Scale font size with avatar size
                  },
                ]}
              >
                {initials}
              </Text>
            </View>
          }
          onError={onError}
        />
        
        {showOnlineStatus && (
          <View
            style={[
              styles.onlineIndicator,
              {
                width: size * 0.25,
                height: size * 0.25,
                borderRadius: (size * 0.25) / 2,
                bottom: size * 0.05,
                right: size * 0.05,
                backgroundColor: isOnline ? '#34C759' : '#8E8E93',
              },
            ]}
          />
        )}
      </View>
    );
    }
  }

  // Show initials avatar as default
  return (
    <View style={avatarStyle}>
      <View
        style={[
          styles.initialsContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
          },
        ]}
      >
        <Text
          style={[
            styles.initialsText,
            {
              fontSize: size * 0.35,
            },
          ]}
        >
          {initials}
        </Text>
      </View>
      
      {showOnlineStatus && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: (size * 0.25) / 2,
              bottom: size * 0.05,
              right: size * 0.05,
              backgroundColor: isOnline ? '#34C759' : '#8E8E93',
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    position: 'relative',
  },
  avatarImage: {
    backgroundColor: '#F2F2F7',
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});