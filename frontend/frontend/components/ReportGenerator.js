// components/ReportGenerator.js
// -----------------------------------------------------------------------------
// Trimester report card generator + custom date-range summary.
//
// Converted from Expo Router (report-generator.tsx) to plain JS, using the
// project's central theme tokens instead of local overrides or useTheme.
//
// Props:
//   studentId   {number}  — passed through to the saved ReportCard payload
//   logs        {array}   — full LogEntry array from the parent screen
//   classroomId {number}  — classroom//
// Two tabs:
//   Trimester Report — scores still auto-compute from logs (teacher can
//                      adjust), but report cards are now loaded with
//                      GET /api/report-card/ and saved with
//                      POST /api/report-card/ instead of local mock state.
//   Custom Range     — date-filtered stats summary, computed entirely from
//                      the logs already on hand — no backend call needed.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, fonts, radii, shadow, spacing } from '../constants/theme';

// ---------------------------------------------------------------------------
// Theme shim — maps the old theme.backgroundElement / theme.background / theme.text
// references onto the project's real tokens.
// ---------------------------------------------------------------------------
const theme = {
  background:        colors.background, // '#F7F4EF'
  backgroundElement: colors.surface,    // '#FFFFFF'
  text:              colors.text,        // '#2A2118'
};

// ---------------------------------------------------------------------------
// Extra semantic colours not in the main palette (kept local)
// ---------------------------------------------------------------------------
const ext = {
  blue:       '#1C5B8E',
  blueLight:  '#DBEAFE',
  amber:      '#B45309',
  amberLight: '#FEF3C7',
  red:        '#B91C1C',
  redLight:   '#FEE2E2',
};

const AYAHS_PER_PAGE = 15;

// ---------------------------------------------------------------------------
// Backend helpers
// TODO: point this at your real API host, or swap these for your existing
// api client (axios instance / fetch wrapper with auth headers) if the
// project already has one.
// ---------------------------------------------------------------------------

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results; // DRF-style pagination
  return [];
}

// Reads the response as text first instead of calling res.json() directly.
// If the body isn't valid JSON (an HTML 404/500 page, an empty 204, the
// wrong host entirely, etc.) this throws a message that actually says what
// came back, instead of "JSON.parse: unexpected character at line 1 column 1".
async function parseJsonResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const snippet = text.slice(0, 500).replace(/\s+/g, ' ').trim();
      throw new Error(
        `Server returned ${res.status} ${res.statusText || ''} and a non-JSON body` +
        (snippet ? `: "${snippet}${text.length > 500 ? '…' : ''}"` : ' (empty).')
      );
    }
  }
  return { ok: res.ok, status: res.status, data };
}

function firstErrorMessage(data, fallback) {
  if (data && typeof data === 'object') {
    const [field, value] = Object.entries(data)[0] || [];
    const message = Array.isArray(value) ? value[0] : value;
    if (message) return field && field !== 'detail' ? `${field}: ${message}` : String(message);
  }
  return fallback;
}

async function fetchReportCards(baseUrl, studentId) {
  const res = await fetch(`${baseUrl}/report-card/?student=${studentId}`, {
    // TODO: attach an Authorization header here if your API requires one
  });
  const { ok, status, data } = await parseJsonResponse(res);
  if (!ok) {
    throw new Error(firstErrorMessage(data, `Could not load past report cards (status ${status}).`));
  }
  return normalizeList(data).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

async function createReportCard(baseUrl, payload) {
  const res = await fetch(`${baseUrl}/report-card/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const { ok, status, data } = await parseJsonResponse(res);

  
  if (!ok) {
    throw new Error(firstErrorMessage(data, `Failed to save report card (status ${status}).`));
  }
  // The backend only returns the new id (matching CreateLogView's
  // convention), so build the full record locally from what we just sent.
  return { id: data && data.id, ...payload };
}

// ---------------------------------------------------------------------------
// Score + stat computation helpers (all local — no backend needed)
// ---------------------------------------------------------------------------
function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }





function computeScores(logs) {
  const present = logs.filter(l => l.attendance !== 'Absent' && l.attendance !== 'Excused Absence' && l.attendance !== 1 && l.attendance !== 2);

  // Same-day cancel-out: an absent log doesn't count if there's a present log that day
  const presentDays = new Set(present.map(l => l.date));
  const isRealAbsence = l =>
    (l.attendance === 'Absent' || l.attendance === 'Excused Absence' || l.attendance === 1 || l.attendance === 2)
    && !presentDays.has(l.date);

  const logsForAttendance = logs.filter(l => present.includes(l) || isRealAbsence(l));
  const total = logsForAttendance.length;

  const memLogs = present.filter(l => l.type === 'memorization');
  const revLogs = present.filter(l => l.type === 'review');
  const attendance_score = total > 0
    ? clamp(Math.round((present.length / total) * 5), 1, 5) : 1;
  const behavior_score = present.length > 0
    ? clamp(Math.round(present.reduce((a, l) => a + l.behavior, 0) / present.length), 1, 5) : 1;
  const memorization_score = memLogs.length > 0
    ? clamp(Math.round((memLogs.filter(l => l.grade === 'pass').length / memLogs.length) * 5), 1, 5) : 1;
  const review_score = revLogs.length > 0
    ? clamp(Math.round((revLogs.filter(l => l.grade === 'pass').length / revLogs.length) * 5), 1, 5) : 1;
  const reading_score = clamp(Math.round((memorization_score + review_score) / 2), 1, 5);
  return { behavior_score, reading_score, review_score, memorization_score, attendance_score };
}


function computeStats(logs) {
  const present     = logs.filter(l => l.attendance !== 1 && l.attendance !== 2);

  // 2nd change: an absent log doesn't count if there's a present log on the same day
  const presentDays = new Set(present.map(l => l.date));
  const absent_days = logs.filter(l =>
    (l.attendance === 1 || l.attendance === 2) && !presentDays.has(l.date)
  ).length;

  let total_ayahs_memorized = 0;
  let total_ayahs_reviewed  = 0;
  const surahMap = {};

  for (const log of present) {
    if (log.ayahStart != null && log.ayahEnd != null && log.surahName) {
      const ayahs = log.ayahEnd - log.ayahStart + 1;
      if (log.type === 'memorization') total_ayahs_memorized += ayahs;
      else if (log.type === 'review')  total_ayahs_reviewed  += ayahs;
      if (!surahMap[log.surahName]) {
        surahMap[log.surahName] = { surahName: log.surahName, surah: log.surah ?? 0, ayahs: 0, sessions: 0 };
      }
      surahMap[log.surahName].ayahs    += ayahs;
      surahMap[log.surahName].sessions += 1;
    }
  }

  // 1st change: sessions = unique days, not log count
  const total_sessions        = new Set(present.map(l => l.date)).size;
  const memorization_sessions = new Set(present.filter(l => l.type === 'memorization').map(l => l.date)).size;
  const review_sessions       = new Set(present.filter(l => l.type === 'review').map(l => l.date)).size;

  return {
    total_ayahs_memorized,
    total_ayahs_reviewed,
    total_sessions,
    memorization_sessions,
    review_sessions,
    absent_days,
    surah_breakdown: Object.values(surahMap).sort((a, b) => a.surah - b.surah),
  };
}
// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------
function SectionLabel({ text }) {
  return <Text style={s.label}>{text}</Text>;
}

function ScoreRow({ label, value, onChange }) {
  return (
    <View style={s.scoreRow}>
      <Text style={s.scoreLabel}>{label}</Text>
      <View style={s.scoreDots}>
        {[1, 2, 3, 4, 5].map(n => {
          const filled = n <= value;
          return (
            <TouchableOpacity
              key={n}
              style={[s.scoreDot, {
                backgroundColor: filled ? colors.primary : theme.backgroundElement,
                borderColor:     filled ? colors.primary : colors.border,
              }]}
              onPress={() => onChange(n)}
            >
              <Text style={[s.scoreDotText, { color: filled ? colors.textOnPrimary : colors.textMuted }]}>
                {n}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ProgressBar({ value, max = 5 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={[s.barBg, { backgroundColor: colors.border }]}>
      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
    </View>
  );
}

function StatChip({ label, value, sub }) {
  return (
    <View style={s.statChip}>
      <Text style={s.statChipValue}>{value}</Text>
      <Text style={s.statChipLabel}>{label}</Text>
      {sub ? <Text style={s.statChipSub}>{sub}</Text> : null}
    </View>
  );
}

function TrimesterPicker({ value, onChange }) {
  return (
    <View style={s.segment}>
      {[1, 2, 3].map(n => {
        const active = value === n;
        return (
          <TouchableOpacity
            key={n}
            style={[s.segmentBtn, active && { backgroundColor: theme.background, ...segmentShadow }]}
            onPress={() => onChange(n)}
          >
            <Text style={[s.segmentLabel, { color: active ? theme.text : colors.textMuted }]}>
              T{n}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segmentShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
};

// ---------------------------------------------------------------------------
// Report card detail modal
// ---------------------------------------------------------------------------
function ReportCardModal({ report, onClose }) {
  const scoreFields = [
    { label: 'Behavior',     key: 'behavior_score' },
    { label: 'Reading',      key: 'reading_score' },
    { label: 'Review',       key: 'review_score' },
    { label: 'Memorization', key: 'memorization_score' },
    { label: 'Attendance',   key: 'attendance_score' },
  ];
  const avg = (
    (report.behavior_score + report.reading_score + report.review_score +
     report.memorization_score + report.attendance_score) / 5
  ).toFixed(1);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.modalCard}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Report Card</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={s.modalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            <View style={s.avgHero}>
              <Text style={s.avgLabel}>Overall Average</Text>
              <Text style={s.avgValue}>{avg} / 5</Text>
              <Text style={s.avgMeta}>Trimester {report.trimester}  ·  {report.date}</Text>
            </View>
            {scoreFields.map(({ label, key }) => (
              <View key={key} style={s.scoreBarRow}>
                <View style={s.scoreBarTop}>
                  <Text style={s.scoreBarLabel}>{label}</Text>
                  <Text style={s.scoreBarValue}>{report[key]}/5</Text>
                </View>
                <ProgressBar value={report[key]} />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Trimester tab
// ---------------------------------------------------------------------------
function TrimesterTab({ studentId, logs, classroomId, apiBaseUrl }) {
  const baseUrl = apiBaseUrl;
  const today = new Date().toISOString().split('T')[0];

  const [trimester,  setTrimester]  = useState(1);
  const [reportDate, setReportDate] = useState(today);
  const [isSaving,   setIsSaving]   = useState(false);
  const [error,      setError]      = useState(null);

  const auto  = useMemo(() => computeScores(logs), [logs]);
  const stats = useMemo(() => computeStats(logs),  [logs]);

  const [behaviorScore,     setBehaviorScore]    = useState(auto.behavior_score);
  const [readingScore,      setReadingScore]      = useState(auto.reading_score);
  const [reviewScore,       setReviewScore]       = useState(auto.review_score);
  const [memorizationScore, setMemorizationScore] = useState(auto.memorization_score);
  const [attendanceScore,   setAttendanceScore]   = useState(auto.attendance_score);

  // Past report cards now come from the backend instead of local-only state.
  const [savedReports,     setSavedReports]     = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [loadError,        setLoadError]        = useState(null);
  const [viewingReport,    setViewingReport]    = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReportCards() {
      setIsLoadingReports(true);
      setLoadError(null);
      try {
        const reports = await fetchReportCards(baseUrl, studentId);
        if (!cancelled) setSavedReports(reports);
      } catch (e) {
        if (!cancelled) setLoadError(e.message || 'Could not load past report cards.');
      } finally {
        if (!cancelled) setIsLoadingReports(false);
      }
    }

    if (studentId != null) loadReportCards();
    return () => { cancelled = true; };
  }, [studentId, baseUrl]);

  function refill() {
    // TODO: replace with GET /api/report-card/generate/?student=<id>&trimester=<n>
    // once the backend exposes a scoring endpoint — for now scores are derived
    // locally from `logs` via computeScores().
    setBehaviorScore(auto.behavior_score);
    setReadingScore(auto.reading_score);
    setReviewScore(auto.review_score);
    setMemorizationScore(auto.memorization_score);
    setAttendanceScore(auto.attendance_score);
  }

  function handleTrimesterChange(t) { setTrimester(t); refill(); }

  async function handleSave() {
    setError(null);
    setIsSaving(true);

    const payload = {
      student: studentId,
      behavior_score: behaviorScore,
      reading_score: readingScore,
      review_score: reviewScore,
      memorization_score: memorizationScore,
      attendance_score: attendanceScore,
      trimester,
      date: reportDate,
    };
    // Only sent if the parent screen has them on hand — otherwise the backend
    // is expected to derive these from the authenticated request.
    if (classroomId != null) payload.classroom = classroomId;

    try {
      const saved = await createReportCard(baseUrl, payload);
      setSavedReports(prev => [saved, ...prev]);
    } catch (e) {
      setError(e.message || 'Something went wrong while saving the report card.');
    } finally {
      setIsSaving(false);
    }
  }

  const scores = [
    { label: 'Behavior',     value: behaviorScore,     setter: setBehaviorScore },
    { label: 'Reading',      value: readingScore,       setter: setReadingScore },
    { label: 'Review',       value: reviewScore,        setter: setReviewScore },
    { label: 'Memorization', value: memorizationScore,  setter: setMemorizationScore },
    { label: 'Attendance',   value: attendanceScore,    setter: setAttendanceScore },
  ];

  return (
    <View>
      {/* Past report cards */}
      <View style={{ marginBottom: spacing.md }}>
        <SectionLabel text="Past Report Cards" />

        {isLoadingReports && (
          <Text style={s.helperText}>Loading past report cards…</Text>
        )}

        {loadError && (
          <View style={[s.errorBox, { backgroundColor: ext.redLight }]}>
            <Text style={[s.errorText, { color: ext.red }]}>{loadError}</Text>
          </View>
        )}

        {!isLoadingReports && !loadError && savedReports.length === 0 && (
          <Text style={s.helperText}>No report cards saved yet.</Text>
        )}

        {!isLoadingReports && savedReports.map(r => (
          <TouchableOpacity
            key={r.id}
            style={s.pastCard}
            onPress={() => setViewingReport(r)}
            activeOpacity={0.75}
          >
            <View style={s.pastCardLeft}>
              <View style={s.trimBadge}>
                <Text style={s.trimBadgeText}>T{r.trimester}</Text>
              </View>
              <View>
                <Text style={s.pastCardDate}>{r.date}</Text>
                <Text style={s.pastCardAvg}>
                  Avg {((r.behavior_score + r.reading_score + r.review_score +
                         r.memorization_score + r.attendance_score) / 5).toFixed(1)}/5
                </Text>
              </View>
            </View>
            <Text style={s.pastCardChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info banner */}
      <View style={[s.infoBox, { backgroundColor: ext.blueLight, borderColor: '#93C5FD' }]}>
        <Text style={[s.infoText, { color: ext.blue }]}>
          ✦ Scores are auto-generated from log history. Adjust any score before saving.
        </Text>
      </View>

      <SectionLabel text="Trimester" />
      <TrimesterPicker value={trimester} onChange={handleTrimesterChange} />

      <SectionLabel text="Report Date" />
      <TextInput
        style={s.dateInput}
        value={reportDate}
        onChangeText={setReportDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.placeholder}
        keyboardType="numeric"
        maxLength={10}
      />

      <SectionLabel text="Scores  (1 – 5)  — tap to adjust" />
      <View style={s.scoresCard}>
        {scores.map(({ label, value, setter }) => (
          <ScoreRow key={label} label={label} value={value} onChange={setter} />
        ))}
      </View>

      <SectionLabel text="Quran Progress This Trimester" />
      <View style={s.chipRow}>
        <StatChip label="Sessions"    value={stats.total_sessions} />
        <StatChip label="Absent Days" value={stats.absent_days} />
      </View>
      <View style={s.chipRow}>
        <StatChip
          label="Ayahs Memorized"
          value={stats.total_ayahs_memorized}
          sub={`${stats.memorization_sessions} sessions`}
        />
        <StatChip
          label="Ayahs Reviewed"
          value={stats.total_ayahs_reviewed}
          sub={`${stats.review_sessions} sessions`}
        />
      </View>

      {stats.surah_breakdown.length > 0 && (
        <View>
          <SectionLabel text="Surah Breakdown" />
          <SurahBreakdownCard rows={stats.surah_breakdown} />
        </View>
      )}

      {error && (
        <View style={[s.errorBox, { backgroundColor: ext.redLight }]}>
          <Text style={[s.errorText, { color: ext.red }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.submitBtn, isSaving && s.submitBtnDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text style={s.submitBtnText}>{isSaving ? 'Saving…' : 'Save Report Card'}</Text>
      </TouchableOpacity>

      {viewingReport && (
        <ReportCardModal report={viewingReport} onClose={() => setViewingReport(null)} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Surah breakdown card (shared between both tabs)
// ---------------------------------------------------------------------------
function SurahBreakdownCard({ rows }) {
  return (
    <View style={s.scoresCard}>
      {rows.map((row, i) => (
        <View
          key={row.surahName}
          style={[s.surahRow, i < rows.length - 1 && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          }]}
        >
          <View style={s.surahRowLeft}>
            <Text style={s.surahName}>{row.surahName}</Text>
            <Text style={s.surahSessions}>{row.sessions} session{row.sessions !== 1 ? 's' : ''}</Text>
          </View>
          <View style={s.surahRowRight}>
            <Text style={s.surahAyahs}>{row.ayahs} ayahs</Text>
            <Text style={s.surahPages}>~{(row.ayahs / AYAHS_PER_PAGE).toFixed(1)} pg</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Custom range tab
// ---------------------------------------------------------------------------
function CustomRangeTab({ logs }) {
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState(today);
  const [summary,  setSummary]  = useState(null);
  const [error,    setError]    = useState(null);

  function handleGenerate() {
    setError(null);
    if (!dateFrom || !dateTo) { setError('Please enter both a start and end date.'); return; }
    if (dateFrom > dateTo)    { setError('Start date must be before end date.'); return; }
    // This stays local — it's just a date filter + the same computeStats()
    // already used above, so there's nothing the backend needs to do here.
    const filtered = logs.filter(l => l.date >= dateFrom && l.date <= dateTo);
    setSummary({ ...computeStats(filtered), date_from: dateFrom, date_to: dateTo });
  }

  function handleClear() { setSummary(null); setDateFrom(''); setDateTo(today); setError(null); }

  return (
    <View>
      <SectionLabel text="Start Date" />
      <TextInput
        style={s.dateInput}
        value={dateFrom}
        onChangeText={setDateFrom}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.placeholder}
        keyboardType="numeric"
        maxLength={10}
      />
      <SectionLabel text="End Date" />
      <TextInput
        style={s.dateInput}
        value={dateTo}
        onChangeText={setDateTo}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.placeholder}
        keyboardType="numeric"
        maxLength={10}
      />

      {error && (
        <View style={[s.errorBox, { backgroundColor: ext.redLight }]}>
          <Text style={[s.errorText, { color: ext.red }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity style={s.submitBtn} onPress={handleGenerate}>
        <Text style={s.submitBtnText}>Generate Summary</Text>
      </TouchableOpacity>

      {summary && (
        <View style={{ marginTop: spacing.xl }}>
          <View style={s.rangeHeader}>
            <Text style={s.rangeHeaderTitle}>Quran Progress Summary</Text>
            <Text style={s.rangeHeaderDates}>{summary.date_from}  →  {summary.date_to}</Text>
          </View>
          <View style={s.chipRow}>
            <StatChip label="Sessions"    value={summary.total_sessions} />
            <StatChip label="Absent Days" value={summary.absent_days} />
          </View>
          <View style={s.chipRow}>
            <StatChip
              label="Ayahs Memorized"
              value={summary.total_ayahs_memorized}
              sub={`${summary.memorization_sessions} sessions`}
            />
            <StatChip
              label="Ayahs Reviewed"
              value={summary.total_ayahs_reviewed}
              sub={`${summary.review_sessions} sessions`}
            />
          </View>
          {summary.surah_breakdown.length > 0 && (
            <View>
              <SectionLabel text="Surah Breakdown" />
              <SurahBreakdownCard rows={summary.surah_breakdown} />
            </View>
          )}
          <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
            <Text style={s.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function ReportGenerator({ studentId, logs, classroomId, apiBaseUrl }) {
  const [activeTab, setActiveTab] = useState('trimester');

  return (
    <View>
      {/* Tab bar */}
      <View style={s.tabBar}>
        {['trimester', 'custom'].map(tab => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[s.tab, active && { backgroundColor: theme.background, ...segmentShadow }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabLabel, { color: active ? theme.text : colors.textMuted }]}>
                {tab === 'trimester' ? 'Trimester Report' : 'Custom Range'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'trimester'
        ? (
          <TrimesterTab
            studentId={studentId}
            logs={logs}
            classroomId={classroomId}
            apiBaseUrl={apiBaseUrl}
          />
        )
        : <CustomRangeTab logs={logs} />
      }
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  label: {
    fontSize: fonts.sizes.caption,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: 4,
    marginBottom: spacing.sm,
  },
  tab:      { flex: 1, paddingVertical: 10, borderRadius: radii.md, alignItems: 'center' },
  tabLabel: { fontSize: fonts.sizes.body, fontWeight: '700' },

  // Trimester segment
  segment:      { flexDirection: 'row', backgroundColor: colors.background, borderRadius: radii.lg, padding: 4 },
  segmentBtn:   { flex: 1, paddingVertical: 10, borderRadius: radii.md, alignItems: 'center' },
  segmentLabel: { fontSize: fonts.sizes.subtitle, fontWeight: '700' },

  // Date input
  dateInput: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    fontSize: fonts.sizes.body,
    backgroundColor: theme.backgroundElement,
    color: theme.text,
    borderColor: colors.inputBorder,
  },

  // Info box
  infoBox:  { marginBottom: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1 },
  infoText: { fontSize: fonts.sizes.body, lineHeight: 18 },

  // Helper / empty-state text
  helperText: {
    fontSize: fonts.sizes.body,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },

  // Scores card
  scoresCard: {
    backgroundColor: theme.backgroundElement,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  scoreLabel:    { fontSize: fonts.sizes.body, fontWeight: '600', color: colors.textMuted, flex: 1 },
  scoreDots:     { flexDirection: 'row', gap: spacing.xs },
  scoreDot: {
    width: 32, height: 32,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDotText:  { fontSize: fonts.sizes.body, fontWeight: '700' },

  // Progress bar
  barBg:   { height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radii.pill },

  // Error
  errorBox:  { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md },
  errorText: { fontSize: fonts.sizes.body, fontWeight: '600' },

  // Submit / clear buttons
  submitBtn: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: { backgroundColor: colors.placeholder },
  submitBtnText:     { color: colors.textOnPrimary, fontSize: fonts.sizes.subtitle, fontWeight: '700' },
  clearBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  clearBtnText: { fontSize: fonts.sizes.body, fontWeight: '600', color: colors.textMuted },

  // Past report cards
  pastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.backgroundElement,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadow,
  },
  pastCardLeft:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  trimBadge:       { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
  trimBadgeText:   { fontSize: fonts.sizes.body, fontWeight: '800', color: colors.primaryDark },
  pastCardDate:    { fontSize: fonts.sizes.body, fontWeight: '700', color: colors.text },
  pastCardAvg:     { fontSize: fonts.sizes.caption, color: colors.textMuted, marginTop: 2 },
  pastCardChevron: { fontSize: 20, fontWeight: '300', color: colors.textMuted },

  // Range summary header
  rangeHeader: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  rangeHeaderTitle: {
    fontSize: fonts.sizes.caption,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rangeHeaderDates: { fontSize: fonts.sizes.subtitle, fontWeight: '600', color: colors.primaryDark, marginTop: spacing.xs },

  // Stat chips
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statChip: {
    flex: 1,
    backgroundColor: theme.backgroundElement,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    ...shadow,
  },
  statChipValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statChipLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 2, textTransform: 'uppercase' },
  statChipSub:   { fontSize: fonts.sizes.caption, fontWeight: '700', color: colors.primary, marginTop: 2 },

  // Surah breakdown rows
  surahRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  surahRowLeft:  { flex: 1 },
  surahRowRight: { alignItems: 'flex-end' },
  surahName:     { fontSize: fonts.sizes.body, fontWeight: '700', color: colors.text },
  surahSessions: { fontSize: fonts.sizes.caption, color: colors.textMuted, marginTop: 2 },
  surahAyahs:    { fontSize: fonts.sizes.body, fontWeight: '700', color: colors.primaryDark },
  surahPages:    { fontSize: fonts.sizes.caption, color: colors.textMuted, marginTop: 2 },

  // Report card modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 33, 24, 0.55)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: theme.background,
    maxHeight: '85%',
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle:   { fontSize: fonts.sizes.subtitle, fontWeight: '800', color: colors.text },
  modalClose:   { fontSize: fonts.sizes.body, fontWeight: '600', color: colors.textMuted },
  modalContent: { padding: spacing.lg, paddingBottom: 40 },

  // Report card hero
  avgHero: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avgLabel: { fontSize: fonts.sizes.caption, fontWeight: '700', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 0.6 },
  avgValue: { fontSize: 36, fontWeight: '800', color: colors.primaryDark, marginTop: spacing.xs },
  avgMeta:  { fontSize: fonts.sizes.body, fontWeight: '600', color: colors.primaryDark, marginTop: spacing.xs, opacity: 0.75 },

  scoreBarRow: { marginBottom: spacing.md },
  scoreBarTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  scoreBarLabel: { fontSize: fonts.sizes.body, fontWeight: '600', color: colors.text },
  scoreBarValue: { fontSize: fonts.sizes.body, fontWeight: '700', color: colors.primaryDark },
});