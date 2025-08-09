import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Home, Globe, Users } from 'lucide-react-native';
import { usePlaceFilter, PlaceFilterMode } from '@/contexts/PlaceFilterContext';
import { HapticFeedback } from '@/utils/haptics';
import { getCurrentUser } from '@/lib/supabase';

interface PlaceFilterToggleProps {
  style?: any;
}

type FilterOption = {
  id: PlaceFilterMode;
  label: string;
  icon: React.ReactNode;
};

export const PlaceFilterToggle: React.FC<PlaceFilterToggleProps> = ({ style }) => {
  const { filterMode, setFilterMode, isLoading } = usePlaceFilter();
  const [userHasSocialFeatures, setUserHasSocialFeatures] = React.useState(false);

  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      id: 'my_places',
      label: 'My Places',
      icon: <Home size={16} color={filterMode === 'my_places' ? '#FFFFFF' : '#8E8E93'} strokeWidth={2} />
    },
    {
      id: 'everyones_places',
      label: 'Everyone\'s',
      icon: <Globe size={16} color={filterMode === 'everyones_places' ? '#FFFFFF' : '#8E8E93'} strokeWidth={2} />
    },
    ...(userHasSocialFeatures || true ? [{
      id: 'friends_places',
      label: 'Friends',
      icon: <Users size={16} color={filterMode === 'friends_places' ? '#FFFFFF' : '#8E8E93'} strokeWidth={2} />
    }] : [])
  ];

  // Check if user has social features enabled
  useEffect(() => {
    const checkSocialFeatures = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          console.log('❌ PlaceFilterToggle - No authenticated user');
          return;
        }

        const { getProfile } = await import('@/lib/supabase');
        const profile = await getProfile(user.id);
        
        if (profile?.allow_social_features === true) {
          setUserHasSocialFeatures(true);
        }
      } catch (error) {
        console.log('❌ Could not check social features status:', error);
      }
    };
    
    checkSocialFeatures();
  }, []);

  // No scrolling needed for fixed layout

  const handleFilterChange = (mode: PlaceFilterMode) => {
    if (mode === filterMode) return;
    
    HapticFeedback.light();
    setFilterMode(mode);
  };

  // Layout handling not needed for fixed buttons

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.buttonsContainer}>
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.filterButton,
              filterMode === option.id && styles.activeFilter
            ]}
            onPress={() => handleFilterChange(option.id)}
            accessibilityLabel={`Show ${option.label.toLowerCase()}`}
            accessibilityRole="button"
            accessibilityState={{ selected: filterMode === option.id }}
            accessibilityHint={
              option.id === 'my_places' 
                ? "Show only places you've saved in your collections"
                : option.id === 'everyones_places'
                ? "Show public places from all users"
                : "Show places visited by friends you follow"
            }
          >
            {option.icon}
            <Text 
              style={[
                styles.filterText,
                filterMode === option.id && styles.activeFilterText
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
              allowFontScaling={false}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 3,
    minHeight: 36,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 1,
    minHeight: 30,
  },
  activeFilter: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 3,
    textAlign: 'center',
    flexShrink: 1,
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
