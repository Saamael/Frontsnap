import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = 'frontsnap_recent_searches';
const MAX_RECENT_SEARCHES = 10;
const POPULAR_SEARCHES_KEY = 'frontsnap_popular_searches';

export interface SearchSuggestion {
  query: string;
  type: 'recent' | 'popular' | 'autocomplete';
  timestamp?: number;
  frequency?: number;
}

export interface UseSearchSuggestionsReturn {
  recentSearches: string[];
  popularSearches: string[];
  suggestions: SearchSuggestion[];
  addRecentSearch: (query: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
  removeRecentSearch: (query: string) => Promise<void>;
  getSuggestions: (input: string) => SearchSuggestion[];
  isLoading: boolean;
}

// Default popular search suggestions based on app usage patterns
const DEFAULT_POPULAR_SEARCHES = [
  'coffee shop',
  'restaurant',
  'nail salon',
  'gym',
  'bookstore',
  'cafe',
  'bakery',
  'pharmacy',
  'grocery store',
  'gas station'
];

export const useSearchSuggestions = (): UseSearchSuggestionsReturn => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>(DEFAULT_POPULAR_SEARCHES);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored data on mount
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      setIsLoading(true);
      
      // Load recent searches
      const storedRecent = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (storedRecent) {
        const recentData = JSON.parse(storedRecent);
        if (Array.isArray(recentData)) {
          setRecentSearches(recentData.slice(0, MAX_RECENT_SEARCHES));
        }
      }

      // Load popular searches (merge with defaults)
      const storedPopular = await AsyncStorage.getItem(POPULAR_SEARCHES_KEY);
      if (storedPopular) {
        const popularData = JSON.parse(storedPopular);
        if (Array.isArray(popularData)) {
          // Merge with defaults, prioritizing stored data
          const mergedPopular = [...new Set([...popularData, ...DEFAULT_POPULAR_SEARCHES])];
          setPopularSearches(mergedPopular.slice(0, 15));
        }
      }
    } catch (error) {
      console.warn('Failed to load search suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addRecentSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    const normalizedQuery = query.trim().toLowerCase();
    
    try {
      // Load current recent searches
      const storedRecent = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      let currentRecent: string[] = [];
      
      if (storedRecent) {
        currentRecent = JSON.parse(storedRecent);
      }

      // Remove if already exists (to move to top)
      const filteredRecent = currentRecent.filter(
        search => search.toLowerCase() !== normalizedQuery
      );

      // Add to beginning
      const updatedRecent = [normalizedQuery, ...filteredRecent].slice(0, MAX_RECENT_SEARCHES);

      // Save to storage
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedRecent));
      
      // Update state
      setRecentSearches(updatedRecent);

      // Update popular searches frequency
      await updatePopularSearches(normalizedQuery);
    } catch (error) {
      console.warn('Failed to save recent search:', error);
    }
  }, []);

  const updatePopularSearches = async (query: string) => {
    try {
      // Load current popular searches with frequency data
      const storedData = await AsyncStorage.getItem(POPULAR_SEARCHES_KEY + '_data');
      let popularData: { [key: string]: number } = {};
      
      if (storedData) {
        popularData = JSON.parse(storedData);
      }

      // Increment frequency for this query
      popularData[query] = (popularData[query] || 0) + 1;

      // Sort by frequency and get top searches
      const sortedPopular = Object.entries(popularData)
        .sort(([, a], [, b]) => b - a)
        .map(([query]) => query)
        .slice(0, 10);

      // Merge with defaults for variety
      const mergedPopular = [...new Set([...sortedPopular, ...DEFAULT_POPULAR_SEARCHES])];

      // Save frequency data and popular list
      await AsyncStorage.setItem(POPULAR_SEARCHES_KEY + '_data', JSON.stringify(popularData));
      await AsyncStorage.setItem(POPULAR_SEARCHES_KEY, JSON.stringify(mergedPopular));
      
      setPopularSearches(mergedPopular.slice(0, 15));
    } catch (error) {
      console.warn('Failed to update popular searches:', error);
    }
  };

  const clearRecentSearches = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch (error) {
      console.warn('Failed to clear recent searches:', error);
    }
  }, []);

  const removeRecentSearch = useCallback(async (query: string) => {
    try {
      const normalizedQuery = query.toLowerCase();
      const updatedRecent = recentSearches.filter(
        search => search.toLowerCase() !== normalizedQuery
      );
      
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedRecent));
      setRecentSearches(updatedRecent);
    } catch (error) {
      console.warn('Failed to remove recent search:', error);
    }
  }, [recentSearches]);

  const getSuggestions = useCallback((input: string): SearchSuggestion[] => {
    if (!input.trim()) {
      // Return recent and popular when no input
      const suggestions: SearchSuggestion[] = [];
      
      // Add recent searches
      recentSearches.slice(0, 5).forEach(query => {
        suggestions.push({
          query,
          type: 'recent'
        });
      });

      // Add popular searches (excluding those already in recent)
      const recentSet = new Set(recentSearches.map(s => s.toLowerCase()));
      popularSearches
        .filter(query => !recentSet.has(query.toLowerCase()))
        .slice(0, 5)
        .forEach(query => {
          suggestions.push({
            query,
            type: 'popular'
          });
        });

      return suggestions;
    }

    const normalizedInput = input.toLowerCase().trim();
    const suggestions: SearchSuggestion[] = [];

    // Match recent searches
    recentSearches
      .filter(query => query.toLowerCase().includes(normalizedInput))
      .slice(0, 3)
      .forEach(query => {
        suggestions.push({
          query,
          type: 'recent'
        });
      });

    // Match popular searches (excluding those already added from recent)
    const addedQueries = new Set(suggestions.map(s => s.query.toLowerCase()));
    popularSearches
      .filter(query => 
        query.toLowerCase().includes(normalizedInput) && 
        !addedQueries.has(query.toLowerCase())
      )
      .slice(0, 5)
      .forEach(query => {
        suggestions.push({
          query,
          type: 'popular'
        });
      });

    // Add autocomplete suggestions for common business types
    const businessTypes = [
      'coffee shop', 'restaurant', 'cafe', 'bakery', 'gym', 'nail salon',
      'hair salon', 'bookstore', 'pharmacy', 'grocery store', 'gas station',
      'bank', 'atm', 'hospital', 'clinic', 'dentist', 'veterinarian',
      'pizza', 'sushi', 'mexican food', 'chinese food', 'thai food',
      'bar', 'pub', 'nightclub', 'hotel', 'motel', 'park', 'library'
    ];

    businessTypes
      .filter(type => 
        type.includes(normalizedInput) && 
        !addedQueries.has(type.toLowerCase())
      )
      .slice(0, 3)
      .forEach(type => {
        suggestions.push({
          query: type,
          type: 'autocomplete'
        });
      });

    return suggestions.slice(0, 8); // Limit total suggestions
  }, [recentSearches, popularSearches]);

  // Computed suggestions property for empty input
  const suggestions = getSuggestions('');

  return {
    recentSearches,
    popularSearches,
    suggestions,
    addRecentSearch,
    clearRecentSearches,
    removeRecentSearch,
    getSuggestions,
    isLoading,
  };
};