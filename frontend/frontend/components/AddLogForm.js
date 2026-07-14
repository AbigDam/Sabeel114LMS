
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

// ---------------------------------------------------------------------------
// AddLogForm
// ---------------------------------------------------------------------------
export function AddLogForm({ onSubmit, initialData, skipAttendanceStep = false }) {
    const [currentStep, setCurrentStep] = useState(1);

    const [attendance, setAttendance] = useState(
      initialData?.attendance ?? "Present"
    );

    const [behavior, setBehavior] = useState(
      initialData?.behavior ?? 2
    );

    const [respect, setRespect] = useState(
      initialData?.respect ?? 2
    );

    const [comments, setComments] = useState(
      initialData?.comments ?? ""
    );


  const isAbsent = attendance === 'Absent';
  const canStep2 = behavior !== null && respect !== null && comments !== null;

  function handleNext() {
    if (currentStep === 1) { isAbsent ? handleSubmit() : setCurrentStep(2); }
    else if (currentStep === 2 && canStep2) { setCurrentStep(3); }
  }

  function handleBack() {
    if (currentStep === 2 && !skipAttendanceStep) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  }

function handleSubmit() {
  onSubmit({
    attendance,
    behavior,
    respect,
    comments: comments.trim(),
  });

  setAttendance("Present");
  setBehavior(2);
  setRespect(2);
  setComments("");
  setCurrentStep(1);
}

  // Step progress dots — only shown when there are multiple steps to navigate.
  function StepDots() {
    return (
      <View style={s.stepDots}>
        {[1, 2].map(n => (
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
              { label: "Present", value: "Present" },
              { label: "Absent", value: "Absent" },
            ]}
            value={attendance}
            onChange={setAttendance}
            theme={theme}
          />
        <PrimaryButton
          label={
            attendance === "Present"
              ? "Next →"
              : (initialData ? "Save Changes" : "Submit Log")
          }
          onPress={() => {
            if (attendance === "Present") {
              setCurrentStep(2);
            } else {
              handleSubmit();
            }
          }}
        />
        </View>
      )}
      {/* ── STEP 2: The rest*/}
      {currentStep === 2 && (
      <View>
        <SectionLabel text="Behavior" />

        <SegmentControl
          options={[
            { label: "Needs Attention", value: 1 },
            { label: "Good", value: 2 },
            { label: "Excellent", value: 3 },
          ]}
          value={behavior}
          onChange={setBehavior}
          theme={theme}
        />

        <SectionLabel text="Respect" />

        <SegmentControl
          options={[
            { label: "Doesn't Meet Expectations", value: 1 },
            { label: "Meets Expectations", value: 2 },
          ]}
          value={respect}
          onChange={setRespect}
          theme={theme}
        />

        <SectionLabel text="Comments" />

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
          value={comments}
          onChangeText={setComments}
        />

        <View style={[s.row, { marginTop: spacing.xl }]}>
          <OutlineButton
            label="← Back"
            onPress={() => setCurrentStep(1)}
          />

          <View style={{ flex: 2 }}>
            <PrimaryButton
              label={initialData ? "Save Changes" : "Submit Log"}
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

  // Assignments text area
  textArea: {
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 120,
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