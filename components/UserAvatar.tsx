import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';

interface UserAvatarProps {
  imageUrl?: string;
  name: string;
  username?: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  onPress?: () => void;
  style?: any;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  imageUrl, 
  name, 
  username,
  size = 'medium',
  showName = false,
  onPress,
  style 
}) => {
  const getAvatarSize = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'medium':
        return 48;
      case 'large':
        return 64;
      default:
        return 48;
    }
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarSize = getAvatarSize();
  const fontSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;

  const AvatarContent = () => (
    <View style={[styles.container, style]}>
      <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
        {imageUrl ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={[styles.avatarImage, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
            accessibilityIgnoresInvertColors={true}
          />
        ) : (
          <View style={[styles.avatarFallback, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
            <Text style={[styles.initialsText, { fontSize: fontSize * 0.7 }]}>
              {getInitials(name)}
            </Text>
          </View>
        )}
      </View>
      
      {showName && (
        <View style={styles.nameContainer}>
          <Text style={[styles.name, { fontSize: size === 'small' ? 12 : 14 }]} numberOfLines={1}>
            {name}
          </Text>
          {username && (
            <Text style={[styles.username, { fontSize: size === 'small' ? 10 : 12 }]} numberOfLines={1}>
              @{username}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={onPress}
        accessibilityLabel={`${name}${username ? `, @${username}` : ''}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view profile"
      >
        <AvatarContent />
      </TouchableOpacity>
    );
  }

  return <AvatarContent />;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatar: {
    position: 'relative',
  },
  avatarImage: {
    backgroundColor: '#F2F2F7',
  },
  avatarFallback: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  nameContainer: {
    marginTop: 4,
    alignItems: 'center',
    maxWidth: 80,
  },
  name: {
    color: '#2C2C2E',
    fontWeight: '500',
    textAlign: 'center',
  },
  username: {
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 1,
  },
});