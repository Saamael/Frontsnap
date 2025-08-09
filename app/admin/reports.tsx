import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';

type Report = Database['public']['Tables']['reports']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Place = Database['public']['Tables']['places']['Row'];

interface ReportWithDetails extends Report {
  profiles?: Profile;
  places?: Place;
}

type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
type ReportType = 'inappropriate_content' | 'spam' | 'incorrect_info' | 'harassment' | 'fake_place' | 'other';

export default function AdminReports() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [actionNote, setActionNote] = useState('');

  const reportTypes: { value: ReportType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'spam', label: 'Spam' },
    { value: 'incorrect_info', label: 'Incorrect Info' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'fake_place', label: 'Fake Place' },
    { value: 'other', label: 'Other' },
  ];

  const reportStatuses: { value: ReportStatus | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'All Status', color: '#666' },
    { value: 'pending', label: 'Pending', color: '#FF9500' },
    { value: 'reviewed', label: 'Reviewed', color: '#007AFF' },
    { value: 'resolved', label: 'Resolved', color: '#34C759' },
    { value: 'dismissed', label: 'Dismissed', color: '#666' },
  ];

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, statusFilter, typeFilter]);

  const loadReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        router.replace('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        Alert.alert('Access Denied', 'Admin privileges required');
        router.back();
        return;
      }

      const { data: reportsData, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:reported_by (
            id,
            full_name,
            email
          ),
          places:place_id (
            id,
            name,
            address,
            category
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(reportsData || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(report => report.report_type === typeFilter);
    }

    setFilteredReports(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const handleReportPress = (report: ReportWithDetails) => {
    setSelectedReport(report);
    setActionNote('');
    setShowReportModal(true);
  };

  const handleUpdateReportStatus = async (status: ReportStatus, note?: string) => {
    if (!selectedReport) return;

    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status,
          admin_notes: note || null,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      Alert.alert('Success', `Report marked as ${status}`);
      setShowReportModal(false);
      loadReports();
    } catch (error) {
      console.error('Error updating report status:', error);
      Alert.alert('Error', 'Failed to update report status');
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    const statusInfo = reportStatuses.find(s => s.value === status);
    return statusInfo?.color || '#666';
  };

  const formatReportType = (type: ReportType) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const ReportCard = ({ report }: { report: ReportWithDetails }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => handleReportPress(report)}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportType}>
          <Ionicons 
            name="flag" 
            size={16} 
            color={getStatusColor(report.status as ReportStatus)} 
          />
          <Text style={styles.reportTypeText}>
            {formatReportType(report.report_type as ReportType)}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(report.status as ReportStatus) }
        ]}>
          <Text style={styles.statusBadgeText}>
            {report.status?.charAt(0).toUpperCase() + report.status?.slice(1)}
          </Text>
        </View>
      </View>

      <Text style={styles.reportReason} numberOfLines={2}>
        {report.reason}
      </Text>

      {report.places && (
        <View style={styles.reportTarget}>
          <Ionicons name="location" size={14} color="#666" />
          <Text style={styles.reportTargetText}>
            {report.places.name} - {report.places.address?.substring(0, 50)}...
          </Text>
        </View>
      )}

      <View style={styles.reportFooter}>
        <Text style={styles.reportDate}>
          {new Date(report.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.reportUser}>
          by {report.profiles?.full_name || 'Unknown User'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const ReportModal = () => (
    <Modal
      visible={showReportModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowReportModal(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Report Details</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>

        {selectedReport && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Report Information</Text>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Type:</Text>
                <Text style={styles.modalInfoValue}>
                  {formatReportType(selectedReport.report_type as ReportType)}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Status:</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(selectedReport.status as ReportStatus) }
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {selectedReport.status?.charAt(0).toUpperCase() + selectedReport.status?.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Reported by:</Text>
                <Text style={styles.modalInfoValue}>
                  {selectedReport.profiles?.full_name || 'Unknown User'}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Date:</Text>
                <Text style={styles.modalInfoValue}>
                  {new Date(selectedReport.created_at).toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Reason</Text>
              <Text style={styles.reasonText}>{selectedReport.reason}</Text>
            </View>

            {selectedReport.places && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Reported Place</Text>
                <TouchableOpacity
                  style={styles.placeInfo}
                  onPress={() => {
                    setShowReportModal(false);
                    router.push(`/place/${selectedReport.places?.id}`);
                  }}
                >
                  <Text style={styles.placeName}>{selectedReport.places.name}</Text>
                  <Text style={styles.placeAddress}>{selectedReport.places.address}</Text>
                  <Text style={styles.placeCategory}>{selectedReport.places.category}</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedReport.admin_notes && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Admin Notes</Text>
                <Text style={styles.adminNotes}>{selectedReport.admin_notes}</Text>
              </View>
            )}

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Action Notes</Text>
              <TextInput
                style={styles.actionNoteInput}
                placeholder="Add notes about your decision..."
                value={actionNote}
                onChangeText={setActionNote}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Actions</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#007AFF' }]}
                  onPress={() => handleUpdateReportStatus('reviewed', actionNote)}
                >
                  <Text style={styles.actionButtonText}>Mark Reviewed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#34C759' }]}
                  onPress={() => handleUpdateReportStatus('resolved', actionNote)}
                >
                  <Text style={styles.actionButtonText}>Resolve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#666' }]}
                  onPress={() => handleUpdateReportStatus('dismissed', actionNote)}
                >
                  <Text style={styles.actionButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Content Reports</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
        >
          {reportStatuses.map((status) => (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.filterButton,
                statusFilter === status.value && styles.filterButtonActive,
                statusFilter === status.value && { backgroundColor: status.color }
              ]}
              onPress={() => setStatusFilter(status.value)}
            >
              <Text style={[
                styles.filterButtonText,
                statusFilter === status.value && styles.filterButtonTextActive
              ]}>
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.resultsText}>
          {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
        </Text>

        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#34C759" />
            <Text style={styles.emptyTitle}>No Reports Found</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'all' 
                ? 'There are no content reports at this time'
                : `No ${statusFilter} reports found`
              }
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))
        )}
      </ScrollView>

      <ReportModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterScrollView: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  reportReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  reportTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  reportTargetText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
  },
  reportUser: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalHeaderSpacer: {
    width: 32,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  reasonText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  placeInfo: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeCategory: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  adminNotes: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actionNoteInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});