import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

interface SimpleAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  style?: any;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
}

export const SimpleAvatar: React.FC<SimpleAvatarProps> = ({
  name,
  avatarUrl,
  size = 80,
  style,
  showOnlineStatus = false,
  isOnline = false,
}) => {
  const [imageError, setImageError] = useState(false);

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
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    
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
    
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const initials = getInitials(name);
  const backgroundColor = getBackgroundColor(name);
  
  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    style,
  ];

  // Check if it's a base64 data URL or regular URL
  const isBase64 = avatarUrl?.startsWith('data:image');

  // Stable cache-busting param tied to URL and error state to trigger retries
  const cacheBuster = useMemo(() => Date.now().toString(), [avatarUrl, imageError]);

  const avatarUrlWithTimestamp =
    avatarUrl && !isBase64 ? `${avatarUrl}?t=${cacheBuster}` : avatarUrl;

  return (
    <View style={containerStyle}>
      {/* Initials as background/fallback */}
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

      {/* Always render avatar image when URL exists; overlay on top of initials using expo-image */}
      {avatarUrl && !imageError ? (
        <ExpoImage
          key={avatarUrlWithTimestamp as string}
          source={{ uri: avatarUrlWithTimestamp as string }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              position: 'absolute',
              top: 0,
              left: 0,
            },
          ]}
          cachePolicy="none"
          contentFit="cover"
          transition={100}
          placeholder="L1O|b~-;fQ-;_3fQfQfQfQfQfQfQ"
          onError={(e: any) => {
            const errorMsg = e?.error || e?.message || 'Unknown error';
            console.log('⚠️ Avatar failed, falling back to initials:', errorMsg);
            setImageError(true);
          }}
          onLoad={() => {
            setImageError(false);
          }}
        />
      ) : null}

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
  container: {
    position: 'relative',
  },
  image: {
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