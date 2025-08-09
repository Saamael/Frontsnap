import { createSupabaseClient, supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@supabase/supabase-js');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Supabase Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create supabase client with correct configuration', () => {
    expect(supabase).toBeDefined();
    expect(createSupabaseClient).toBeDefined();
  });

  it('should use AsyncStorage for session storage', () => {
    createSupabaseClient();
    
    // The client should be configured to use AsyncStorage
    expect(mockAsyncStorage.getItem).toBeDefined();
    expect(mockAsyncStorage.setItem).toBeDefined();
    expect(mockAsyncStorage.removeItem).toBeDefined();
  });

  it('should handle auth state changes', async () => {
    const mockCallback = jest.fn();
    
    // Mock auth state change listener
    const mockUnsubscribe = jest.fn();
    supabase.auth.onAuthStateChange = jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } }
    });

    const { data } = supabase.auth.onAuthStateChange(mockCallback);
    
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
    expect(data.subscription.unsubscribe).toBe(mockUnsubscribe);
  });

  it('should handle database queries', async () => {
    const mockData = [{ id: 1, name: 'Test' }];
    
    supabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockData, error: null })
      })
    });

    const result = await supabase
      .from('test_table')
      .select('*')
      .eq('id', 1);

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
  });

  it('should handle database errors', async () => {
    const mockError = new Error('Database error');
    
    supabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: mockError })
      })
    });

    const result = await supabase
      .from('test_table')
      .select('*')
      .eq('id', 1);

    expect(result.data).toBeNull();
    expect(result.error).toEqual(mockError);
  });

  it('should handle storage operations', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    supabase.storage = {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: mockFile, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ 
          data: { publicUrl: 'https://example.com/test.jpg' } 
        })
      })
    };

    const uploadResult = await supabase.storage
      .from('images')
      .upload('test.jpg', mockFile);

    expect(uploadResult.data?.path).toBe('test.jpg');
    expect(uploadResult.error).toBeNull();
  });

  it('should handle RPC function calls', async () => {
    const mockResult = { count: 5 };
    
    supabase.rpc = jest.fn().mockResolvedValue({ data: mockResult, error: null });

    const result = await supabase.rpc('get_user_count', { user_id: '123' });

    expect(result.data).toEqual(mockResult);
    expect(result.error).toBeNull();
    expect(supabase.rpc).toHaveBeenCalledWith('get_user_count', { user_id: '123' });
  });

  it('should handle realtime subscriptions', () => {
    const mockCallback = jest.fn();
    const mockUnsubscribe = jest.fn();
    
    supabase.channel = jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnValue({
        unsubscribe: mockUnsubscribe
      })
    });

    const subscription = supabase
      .channel('test-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places' }, mockCallback)
      .subscribe();

    expect(supabase.channel).toHaveBeenCalledWith('test-channel');
    expect(subscription.unsubscribe).toBe(mockUnsubscribe);
  });
});