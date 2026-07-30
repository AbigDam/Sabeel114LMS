import { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, spacing, radii } from '../constants/theme';

// Replaces the useTheme hook — mirrors the app's warm cream/olive palette
// from constants/theme.js.
const theme = {
  background:        colors.background, // '#F7F4EF' warm off-white
  backgroundElement: colors.surface,    // '#FFFFFF' inputs, segments
  text:              colors.text,        // '#2A2118' espresso
};

// ---------------------------------------------------------------------------
// PickerModal — bottom-sheet style list picker
// ---------------------------------------------------------------------------
function PickerModal({ visible, items, labelFn, onSelect, onClose, title }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.pickerOverlay}>
        <View style={[s.pickerSheet, { backgroundColor: theme.background }]}>
          <View style={[s.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.pickerTitle, { color: theme.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={[s.pickerDone, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.pickerItem, { borderBottomColor: colors.border }]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={{ color: theme.text, fontSize: 16 }}>{labelFn(item)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// SegmentControl — pill-style toggle for 2–3 options
// ---------------------------------------------------------------------------
function SegmentControl({ options, value, onChange, theme }) {
  return (
    <View style={[s.segment, { backgroundColor: theme.backgroundElement }]}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[s.segmentBtn, active && { backgroundColor: theme.background, ...segmentActiveShadow }]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[s.segmentLabel, { color: active ? theme.text : colors.textMuted }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segmentActiveShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
};

// ---------------------------------------------------------------------------
// Small reusable sub-components
// ---------------------------------------------------------------------------
function SectionLabel({ text }) {
  return <Text style={s.label}>{text}</Text>;
}

function PrimaryButton({ label, onPress, disabled = false }) {
  return (
    <TouchableOpacity
      style={[s.primaryBtn, disabled && s.primaryBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={s.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function OutlineButton({ label, onPress }) {
  return (
    <TouchableOpacity style={s.outlineBtn} onPress={onPress}>
      <Text style={s.outlineBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// Shared 1–3 rating scale labels, used for Homework Prep, Participation, and
// Lesson Progress.
const RATING_3_OPTIONS = [
  { label: 'Needs Attention', value: 1 },
  { label: 'Good', value: 2 },
  { label: 'Excellent', value: 3 },
];

const RESPECT_OPTIONS = [
  { label: "Doesn't Meet Expectations", value: 1 },
  { label: 'Meets Expectations', value: 2 },
];

// ---------------------------------------------------------------------------
// AddLogForm
// ---------------------------------------------------------------------------
export function AddLogForm({ onSubmit, initialData, skipAttendanceStep = false }) {
  const [currentStep, setCurrentStep] = useState(1);

  const [attendance, setAttendance] = useState(
    initialData?.attendance ?? 'Present'
  );

  const [homeworkPrep, setHomeworkPrep] = useState(
    initialData?.homeworkPrep ?? 2
  );
  const [homeworkPrepComments, setHomeworkPrepComments] = useState(
    initialData?.homeworkPrepComments ?? ''
  );

  const [participation, setParticipation] = useState(
    initialData?.participation ?? 2
  );

  const [respect, setRespect] = useState(
    initialData?.respect ?? 2
  );

  const [lessonProgress, setLessonProgress] = useState(
    initialData?.lessonProgress ?? 2
  );
  const [lessonProgressComments, setLessonProgressComments] = useState(
    initialData?.lessonProgressComments ?? ''
  );

  const [nextLesson, setNextLesson] = useState(
    initialData?.nextLesson ?? ''
  );

  const [additionalComments, setAdditionalComments] = useState(
    initialData?.additionalComments ?? ''
  );

  const isAbsent = attendance === 'Absent';
  const TOTAL_STEPS = 3;

  function handleBack() {
    if (currentStep === 2 && !skipAttendanceStep) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  }

  function handleSubmit() {
    onSubmit({
      attendance,
      homeworkPrep,
      homeworkPrepComments: homeworkPrepComments.trim(),
      participation,
      respect,
      lessonProgress,
      lessonProgressComments: lessonProgressComments.trim(),
      nextLesson: nextLesson.trim(),
      additionalComments: additionalComments.trim(),
    });

    setAttendance('Present');
    setHomeworkPrep(2);
    setHomeworkPrepComments('');
    setParticipation(2);
    setRespect(2);
    setLessonProgress(2);
    setLessonProgressComments('');
    setNextLesson('');
    setAdditionalComments('');
    setCurrentStep(1);
  }

  // Step progress dots — only shown when there are multiple steps to navigate.
  function StepDots() {
    return (
      <View style={s.stepDots}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
          <View
            key={n}
            style={[s.dot, {
              backgroundColor: n === currentStep ? colors.primary
                : n < currentStep ? colors.primaryLight : colors.border,
              width: n === currentStep ? 20 : 8,
            }]}
          />
        ))}
      </View>
    );
  }

  return (
    <View>
      {!isAbsent && <StepDots />}

      {/* ── STEP 1: Attendance ── */}
      {currentStep === 1 && (
        <View>
          <SectionLabel text="Attendance" />

          <SegmentControl
            options={[
              { label: 'Present', value: 'Present' },
              { label: 'Absent', value: 'Absent' },
            ]}
            value={attendance}
            onChange={setAttendance}
            theme={theme}
          />
          <PrimaryButton
            label={
              attendance === 'Present'
                ? 'Next →'
                : (initialData ? 'Save Changes' : 'Submit Log')
            }
            onPress={() => {
              if (attendance === 'Present') {
                setCurrentStep(2);
              } else {
                handleSubmit();
              }
            }}
          />
        </View>
      )}

      {/* ── STEP 2: Homework Prep, Participation, Respect ── */}
      {currentStep === 2 && (
        <View>
          <SectionLabel text="Homework Preparation" />
          <SegmentControl
            options={RATING_3_OPTIONS}
            value={homeworkPrep}
            onChange={setHomeworkPrep}
            theme={theme}
          />

          <SectionLabel text="Homework Prep Comments" />
          <TextInput
            style={[
              s.textArea,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Enter comments..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={homeworkPrepComments}
            onChangeText={setHomeworkPrepComments}
          />

          <SectionLabel text="Participation" />
          <SegmentControl
            options={RATING_3_OPTIONS}
            value={participation}
            onChange={setParticipation}
            theme={theme}
          />

          <SectionLabel text="Respect" />
          <SegmentControl
            options={RESPECT_OPTIONS}
            value={respect}
            onChange={setRespect}
            theme={theme}
          />

          <View style={[s.row, { marginTop: spacing.xl }]}>
            <OutlineButton label="← Back" onPress={handleBack} />
            <View style={{ flex: 2 }}>
              <PrimaryButton label="Next →" onPress={() => setCurrentStep(3)} />
            </View>
          </View>
        </View>
      )}

      {/* ── STEP 3: Lesson Progress, Next Lesson/Homework, Additional Comments ── */}
      {currentStep === 3 && (
        <View>
          <SectionLabel text="Lesson Progress" />
          <SegmentControl
            options={RATING_3_OPTIONS}
            value={lessonProgress}
            onChange={setLessonProgress}
            theme={theme}
          />

          <SectionLabel text="Lesson Progress Comments" />
          <TextInput
            style={[
              s.textArea,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Enter comments..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={lessonProgressComments}
            onChangeText={setLessonProgressComments}
          />

          <SectionLabel text="Next Lesson / Homework" />
          <TextInput
            style={[
              s.textArea,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Enter next lesson or homework..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={nextLesson}
            onChangeText={setNextLesson}
          />

          <SectionLabel text="Additional Comments" />
          <TextInput
            style={[
              s.textArea,
              {
                backgroundColor: theme.backgroundElement,
                color: theme.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Enter comments..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            value={additionalComments}
            onChangeText={setAdditionalComments}
          />

          <View style={[s.row, { marginTop: spacing.xl }]}>
            <OutlineButton label="← Back" onPress={handleBack} />
            <View style={{ flex: 2 }}>
              <PrimaryButton
                label={initialData ? 'Save Changes' : 'Submit Log'}
                onPress={handleSubmit}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  // Step dots
  stepDots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.lg, alignSelf: 'center' },
  dot:      { height: 8, borderRadius: radii.pill },

  // Labels
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Segment control
  segment:      { flexDirection: 'row', borderRadius: radii.lg, padding: 4 },
  segmentBtn:   { flex: 1, paddingVertical: 10, borderRadius: radii.md, alignItems: 'center' },
  segmentLabel: { fontSize: 14, fontWeight: '600' },

  // Picker rows
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  pickerDisabled: { opacity: 0.4 },
  row: { flexDirection: 'row', gap: spacing.md },

  // Behavior score buttons
  behaviorRow: { flexDirection: 'row', gap: spacing.sm },
  behaviorBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  behaviorLabel: { fontSize: 16, fontWeight: '700' },

  // Text areas
  textArea: {
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
    borderWidth: 1,
    lineHeight: 22,
  },

  // Buttons
  primaryBtn:         { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center', marginTop: spacing.lg },
  primaryBtnDisabled: { backgroundColor: colors.disabled },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineBtnText: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },

  // Picker bottom sheet
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet:   { maxHeight: '60%', borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  pickerHeader:  {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { fontSize: 17, fontWeight: '700' },
  pickerDone:  { fontSize: 16, fontWeight: '600' },
  pickerItem:  { padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
});
