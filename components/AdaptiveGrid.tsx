import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AdaptiveGridProps {
  children: React.ReactElement[];
  minItemWidth: number;
  spacing?: number;
  maxColumns?: number;
  contentInsets?: boolean;
}

export const AdaptiveGrid: React.FC<AdaptiveGridProps> = ({
  children,
  minItemWidth,
  spacing = 12,
  maxColumns = 3,
  contentInsets = true,
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Calculate optimal grid layout
  const calculateGrid = () => {
    const horizontalInsets = contentInsets ? (insets.left + insets.right) : 0;
    const horizontalPadding = contentInsets ? 32 : 16; // Account for screen padding
    const availableWidth = width - horizontalInsets - horizontalPadding;
    
    // Calculate how many columns can fit
    const columnsFloat = availableWidth / (minItemWidth + spacing);
    const columns = Math.min(Math.floor(columnsFloat), maxColumns);
    
    // Calculate actual item width
    const totalSpacing = (columns - 1) * spacing;
    const itemWidth = (availableWidth - totalSpacing) / columns;
    
    return {
      columns: Math.max(1, columns),
      itemWidth: Math.max(minItemWidth * 0.8, itemWidth), // Minimum fallback
      totalSpacing,
    };
  };

  const { columns, itemWidth } = calculateGrid();

  const renderRows = () => {
    const rows = [];
    const itemsPerRow = columns;
    
    for (let i = 0; i < children.length; i += itemsPerRow) {
      const rowItems = children.slice(i, i + itemsPerRow);
      
      rows.push(
        <View key={i} style={styles.gridRow}>
          {rowItems.map((child, index) => (
            <View key={`${i}-${index}`} style={[styles.gridItem, { width: itemWidth }]}>
              {React.cloneElement(child, { width: itemWidth, ...child.props })}
            </View>
          ))}
          {/* Fill remaining space if last row is incomplete */}
          {rowItems.length < itemsPerRow &&
            Array.from({ length: itemsPerRow - rowItems.length }).map((_, index) => (
              <View key={`empty-${i}-${index}`} style={{ width: itemWidth }} />
            ))
          }
        </View>
      );
    }
    
    return rows;
  };

  return (
    <View style={styles.container}>
      {renderRows()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: Platform.OS === 'ios' ? 16 : 12,
  },
  gridItem: {
    alignItems: 'center',
  },
});