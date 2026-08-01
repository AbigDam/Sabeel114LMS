import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { AddLogForm } from '../components/AddLogForm';
import { brand } from '../constants/brand';
import { colors, fonts, fontFamilies, radii, shadow, spacing } from '../constants/theme';
import { apiCall } from '../api.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TODAY = new Date().toISOString().split('T')[0];

const ATTENDANCE_LABELS = {
  0: 'Present',
  1: 'Absent',
  2: 'Excused Absence',
};

// Shared 1–3 rating labels — used for Homework Prep, Participation, and
// Lesson Progress.
const RATING_LABELS = {
  1: 'Needs Attention',
  2: 'Good',
  3: 'Excellent',
};

const RESPECT_LABELS = {
  1: "Doesn't Meet Expectations",
  2: 'Meets Expectations',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getTodayLog(logs) {
  return logs.find(l => l.date === TODAY) ?? null;
}

function attendanceToCode(value) {
  if (value === 'Absent') return 1;
  if (value === 'Excused Absence') return 2;
  return 0;
}

function isAbsentLog(log) {
  return log?.attendance === 1 || log?.attendance === 2 ||
    log?.attendance === 'Absent' || log?.attendance === 'Excused Absence';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function LogDetailView({ log, viewHistory }) {
  const absent = isAbsentLog(log);

  return (
    <View>
      <View style={styles.loggedBanner}>
        <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.success} />
        <Text style={styles.loggedBannerText}>Log recorded for today</Text>
      </View>

      <View style={styles.detailCard}>
        <DetailRow
          label="Attendance"
          value={ATTENDANCE_LABELS[log.attendance] ?? log.attendance}
          bold={absent}
        />
        {!absent && (
          <>
            <DetailRow
              label="Homework Preparation"
              value={RATING_LABELS[log.homeworkPrep] ?? log.homeworkPrep}
            />
            {log.homeworkPrepComments ? (
              <CommentRow label="Homework Prep Comments" value={log.homeworkPrepComments} />
            ) : null}

            <DetailRow
              label="Participation"
              value={RATING_LABELS[log.participation] ?? log.participation}
            />

            <DetailRow
              label="Respect"
              value={RESPECT_LABELS[log.respect] ?? log.respect}
              valueColor={log.respect === 1 ? colors.danger : undefined}
            />

            <DetailRow
              label="Lesson Progress"
              value={RATING_LABELS[log.lessonProgress] ?? log.lessonProgress}
            />
            {log.lessonProgressComments ? (
              <CommentRow label="Lesson Progress Comments" value={log.lessonProgressComments} />
            ) : null}

            {log.nextLesson ? (
              <CommentRow label="Next Lesson / Homework" value={log.nextLesson} />
            ) : null}

            {log.additionalComments ? (
              <CommentRow label="Additional Comments" value={log.additionalComments} />
            ) : null}
          </>
        )}
      </View>

      <TouchableOpacity style={styles.viewHistoryBtn} onPress={viewHistory}>
        <Ionicons name="time-outline" size={17} color={colors.textOnPrimary} style={{ marginRight: spacing.xs }} />
        <Text style={styles.viewHistoryBtnText}>View/Edit Log History</Text>
      </TouchableOpacity>
    </View>
  );
}

function DetailRow({ label, value, bold = false, valueColor }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[
        styles.detailValue,
        bold && { fontFamily: fontFamilies.bodyBold },
        valueColor && { color: valueColor },
      ]}>
        {value}
      </Text>
    </View>
  );
}

function CommentRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.assignmentBox}>
        <Text style={styles.assignmentText}>{value}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function AddLogScreen({ navigation, route }) {
  const { course, student } = route.params ?? {};
  const className = course?.title;

  const [allLogs, setAllLogs] = useState({});
  const [selectedId] = useState(student.id);
  const [viewingHistory, setViewingHistory] = useState(false);
  const [addingLog, setAddingLog] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);

  const studentLogs = allLogs[selectedId] ?? [];
  const todayLog = getTodayLog(studentLogs);
  const editingLog = editingLogId ? studentLogs.find(l => l.id === editingLogId) ?? null : null;

  const isTodayAbsent = isAbsentLog(todayLog);

  // Show the form when: no log today, OR teacher clicked Edit on a history row, OR teacher clicked "Add Log".
  const showForm = !todayLog || !!editingLogId || addingLog;

  const selectedStudent = student;

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await apiCall('get', 'get_logs/', {
          params: { class_id: course.id },
        });
        setAllLogs(data);
      } catch (error) {
        console.error(error);
      }
    }
    loadLogs();
  }, []);

  async function handleAddLog(newLog) {
    const payload = {
      student_id: selectedId,
      class_id: course.id,
      date: TODAY,
      attendance: attendanceToCode(newLog.attendance),
      hw_prep: newLog.homeworkPrep,
      hw_prep_comments: newLog.homeworkPrepComments ?? '',
      participation: newLog.participation,
      respect: newLog.respect,
      lesson_prog: newLog.lessonProgress,
      lesson_prog_comments: newLog.lessonProgressComments ?? '',
      next_lesson: newLog.nextLesson ?? '',
      comments: newLog.additionalComments ?? '',
    };

    try {
      const data = await apiCall('post', 'create_log/', { data: payload });
      const entry = { id: data.id, date: TODAY, ...newLog, attendance: payload.attendance };
      setAllLogs(prev => ({
        ...prev,
        [selectedId]: [entry, ...(prev[selectedId] ?? [])],
      }));
      setAddingLog(false);
    } catch (error) {
      console.error('Failed to create log', error);
    }
  }

  async function handleUpdateLog(logId, updatedFields) {
    const payload = {
      log_id: logId,
      student_id: selectedId,
      class_id: course.id,
      attendance: attendanceToCode(updatedFields.attendance),
      hw_prep: updatedFields.homeworkPrep,
      hw_prep_comments: updatedFields.homeworkPrepComments ?? '',
      participation: updatedFields.participation,
      respect: updatedFields.respect,
      lesson_prog: updatedFields.lessonProgress,
      lesson_prog_comments: updatedFields.lessonProgressComments ?? '',
      next_lesson: updatedFields.nextLesson ?? '',
      comments: updatedFields.additionalComments ?? '',
    };

    try {
      await apiCall('post', 'update_log/', { data: payload });
      setAllLogs(prev => ({
        ...prev,
        [selectedId]: (prev[selectedId] ?? []).map(l =>
          l.id === logId ? { ...l, ...updatedFields, attendance: payload.attendance } : l),
      }));
      setEditingLogId(null);
      setViewingHistory(false);
    } catch (error) {
      console.error('Failed to update log', error);
    }
  }

  async function handleDeleteLog(logId) {
    try {
      await apiCall('post', 'delete_log/', { data: { log_id: logId } });
      setAllLogs(prev => ({
        ...prev,
        [selectedId]: (prev[selectedId] ?? []).filter(l => l.id !== logId),
      }));
    } catch (error) {
      console.error('Failed to delete log', error);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>Daily Logs</Text>
          <Text style={styles.topBarSub} numberOfLines={1}>{className}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="book-outline" size={13} color={colors.primaryDark} />
          <Text style={styles.headerBadgeText}>{brand.portal}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.h2}>{course?.title}</Text>
        </View>

        {/* ── Log panel ── */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.h2}>
              {selectedStudent?.first_name
                ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                : selectedStudent?.name}
            </Text>

            <Text style={styles.subtext}>
              {showForm
                ? editingLogId
                  ? `Editing log from ${editingLog?.date ?? ''}`
                  : addingLog
                    ? 'Adding a new log'
                    : 'No log yet — record now'
                : "Today's session"}
            </Text>

            {!showForm && (
              <View style={styles.inlineButtonRow}>
                <TouchableOpacity
                  style={[
                    styles.inlineRowBtn,
                    isTodayAbsent && { backgroundColor: colors.border },
                  ]}
                  onPress={() => setAddingLog(true)}
                  disabled={isTodayAbsent}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={16}
                    color={colors.textOnPrimary}
                    style={{ marginRight: spacing.xs }}
                  />
                  <Text style={styles.inlineRowBtnText}>Add Log</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!showForm && (
            <View style={styles.loggedBadge}>
              <MaterialCommunityIcons name="check" size={12} color={colors.success} />
              <Text style={styles.loggedBadgeText}>Logged</Text>
            </View>
          )}
        </View>

        <View style={styles.panelCard}>
          {showForm ? (
            <AddLogForm
              onSubmit={editingLogId ? (fields) => handleUpdateLog(editingLogId, fields) : handleAddLog}
              skipAttendanceStep={!!todayLog && addingLog}
              initialData={editingLog ? {
                attendance: ATTENDANCE_LABELS[editingLog.attendance] ?? editingLog.attendance ?? 'Present',
                homeworkPrep:            editingLog.homeworkPrep,
                homeworkPrepComments:    editingLog.homeworkPrepComments,
                participation:           editingLog.participation,
                respect:                 editingLog.respect,
                lessonProgress:          editingLog.lessonProgress,
                lessonProgressComments:  editingLog.lessonProgressComments,
                nextLesson:              editingLog.nextLesson,
                additionalComments:      editingLog.additionalComments,
              } : undefined}
            />
          ) : (
            <LogDetailView
              log={todayLog}
              viewHistory={() => setViewingHistory(true)}
            />
          )}
        </View>

        {(addingLog || editingLogId) && (
          <TouchableOpacity
            style={styles.cancelAddBtn}
            onPress={() => {
              setAddingLog(false);
              setEditingLogId(null);
            }}
          >
            <Text style={styles.cancelAddBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Log history modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewingHistory}
        onRequestClose={() => setViewingHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Log History</Text>
                <Text style={styles.modalSub}>{selectedStudent?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setViewingHistory(false)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.xl }}
            >
              {studentLogs.length === 0 ? (
                <Text style={styles.emptyHistoryText}>No logs found for this student.</Text>
              ) : (
                studentLogs.map((log) => {
                  const absent = isAbsentLog(log);

                  return (
                    <View key={log.id} style={styles.historyCard}>
                      <View style={styles.historyCardHeader}>
                        <Text style={styles.historyDate}>
                          {log.date} ({ATTENDANCE_LABELS[log.attendance] ?? log.attendance})
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                          {!absent && (
                            <View style={[
                              styles.historyBadge,
                              { backgroundColor: log.respect === 1 ? colors.dangerBg : colors.successBg },
                            ]}>
                              <Text style={[
                                styles.historyBadgeText,
                                { color: log.respect === 1 ? colors.danger : colors.success },
                              ]}>
                                {(RESPECT_LABELS[log.respect] ?? '').toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => {
                              setEditingLogId(log.id);
                              setAddingLog(false);
                              setViewingHistory(false);
                            }}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Edit log"
                            style={styles.editLogBtn}
                          >
                            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteLog(log.id)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Delete log"
                            style={styles.deleteLogBtn}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {!absent && (
                        <View style={styles.historyCardBody}>
                          <Text style={styles.historyMainText}>
                            Homework Prep: {RATING_LABELS[log.homeworkPrep] ?? log.homeworkPrep}
                          </Text>
                          <Text style={styles.historyMainText}>
                            Participation: {RATING_LABELS[log.participation] ?? log.participation}
                          </Text>
                          <Text style={styles.historyMainText}>
                            Lesson Progress: {RATING_LABELS[log.lessonProgress] ?? log.lessonProgress}
                          </Text>

                          {log.homeworkPrepComments ? (
                            <View style={styles.historyNotesBox}>
                              <Text style={styles.historyNotesLabel}>Homework Prep Comments</Text>
                              <Text style={styles.historyNotesText}>{log.homeworkPrepComments}</Text>
                            </View>
                          ) : null}
                          {log.lessonProgressComments ? (
                            <View style={styles.historyNotesBox}>
                              <Text style={styles.historyNotesLabel}>Lesson Progress Comments</Text>
                              <Text style={styles.historyNotesText}>{log.lessonProgressComments}</Text>
                            </View>
                          ) : null}
                          {log.nextLesson ? (
                            <View style={styles.historyNotesBox}>
                              <Text style={styles.historyNotesLabel}>Next Lesson / Homework</Text>
                              <Text style={styles.historyNotesText}>{log.nextLesson}</Text>
                            </View>
                          ) : null}
                          {log.additionalComments ? (
                            <View style={styles.historyNotesBox}>
                              <Text style={styles.historyNotesLabel}>Additional Comments</Text>
                              <Text style={styles.historyNotesText}>{log.additionalComments}</Text>
                            </View>
                          ) : null}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: 60 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn:      { padding: spacing.xs },
  topBarCenter: { flex: 1 },
  topBarTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fonts.sizes.subtitle,
    color: colors.text,
  },
  topBarSub: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: fonts.sizes.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  headerBadgeText: {
    color: colors.primaryDark,
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.caption,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  h2:      { fontFamily: fontFamilies.displayBold, fontSize: fonts.sizes.title, color: colors.text },
  subtext: { fontFamily: fontFamilies.bodyRegular, fontSize: fonts.sizes.body,  color: colors.textMuted, marginTop: spacing.xs },

  inlineButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    width: '100%',
  },
  inlineRowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    ...shadow,
  },
  inlineRowBtnText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.caption,
    color: colors.textOnPrimary,
  },

  panelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },

  loggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  loggedBadgeText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.caption,
    color: colors.success,
  },

  loggedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  loggedBannerText: {
    fontFamily: fontFamilies.bodySemibold,
    fontSize: fonts.sizes.body,
    color: colors.success,
  },
  detailCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  detailRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontFamily: fontFamilies.bodyExtraBold,
    fontSize: fonts.sizes.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: fonts.sizes.subtitle,
    color: colors.text,
  },
  assignmentBox: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  assignmentText: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: fonts.sizes.body,
    color: colors.text,
    lineHeight: 20,
  },
  viewHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
  },
  viewHistoryBtnText: {
    color: colors.textOnPrimary,
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.body,
  },
  cancelAddBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelAddBtnText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodySemibold,
    fontSize: fonts.sizes.body,
  },
  deleteLogBtn: {
    padding: spacing.xs,
  },
  editLogBtn: {
    padding: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    height: '80%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: fonts.sizes.title,
    color: colors.text,
  },
  modalSub: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: fonts.sizes.body,
    color: colors.textMuted,
  },
  closeModalBtn: {
    padding: spacing.xs,
  },
  emptyHistoryText: {
    fontFamily: fontFamilies.bodyRegular,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fonts.sizes.body,
    marginTop: spacing.xl,
  },
  historyCard: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  historyDate: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.body,
    color: colors.text,
  },
  historyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  historyBadgeText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: fonts.sizes.caption,
  },
  historyCardBody: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  historyMainText: {
    fontFamily: fontFamilies.bodySemibold,
    fontSize: fonts.sizes.body,
    color: colors.text,
  },
  historyNotesBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  historyNotesLabel: {
    fontFamily: fontFamilies.bodyExtraBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginBottom: 2,
  },
  historyNotesText: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: fonts.sizes.caption,
    color: colors.text,
    lineHeight: 16,
  },
});
