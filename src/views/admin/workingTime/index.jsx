import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Card from "components/card";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { workerCalendarService, userService } from "services/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const WEEKDAY_OPTIONS = [
  { bit: 1 << 1, label: "Mon" },
  { bit: 1 << 2, label: "Tue" },
  { bit: 1 << 3, label: "Wed" },
  { bit: 1 << 4, label: "Thu" },
  { bit: 1 << 5, label: "Fri" },
  { bit: 1 << 6, label: "Sat" },
  { bit: 1 << 0, label: "Sun" },
];

const WEEKDAY_MASK = (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5);

const SHIFT_PRESETS = [
  { name: "Morning Shift",   startTime: "08:00:00", endTime: "12:00:00" },
  { name: "Afternoon Shift", startTime: "13:00:00", endTime: "17:00:00" },
  { name: "Night Shift",     startTime: "18:00:00", endTime: "06:00:00" },
];

const SHIFT_COLORS = [
  "border-l-4 border-l-amber-400",
  "border-l-4 border-l-blue-400",
  "border-l-4 border-l-indigo-500",
  "border-l-4 border-l-rose-400",
  "border-l-4 border-l-emerald-400",
];

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (UTC+00:00)" },
  { value: "Europe/London", label: "London (UTC+00:00 / +01:00)" },
  { value: "Europe/Paris", label: "Paris / Berlin (UTC+01:00 / +02:00)" },
  { value: "Europe/Moscow", label: "Moscow (UTC+03:00)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+04:00)" },
  { value: "Asia/Karachi", label: "Karachi (UTC+05:00)" },
  { value: "Asia/Kolkata", label: "India (UTC+05:30)" },
  { value: "Asia/Dhaka", label: "Dhaka (UTC+06:00)" },
  { value: "Asia/Bangkok", label: "Bangkok (UTC+07:00)" },
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City (UTC+07:00)" },
  { value: "Asia/Singapore", label: "Singapore (UTC+08:00)" },
  { value: "Asia/Shanghai", label: "Shanghai / Beijing (UTC+08:00)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+09:00)" },
  { value: "Asia/Seoul", label: "Seoul (UTC+09:00)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+10:00 / +11:00)" },
  { value: "Pacific/Auckland", label: "Auckland (UTC+12:00 / +13:00)" },
  { value: "America/Sao_Paulo", label: "Sao Paulo (UTC-03:00)" },
  { value: "America/New_York", label: "New York (UTC-05:00 / -04:00)" },
  { value: "America/Chicago", label: "Chicago (UTC-06:00 / -05:00)" },
  { value: "America/Denver", label: "Denver (UTC-07:00 / -06:00)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-08:00 / -07:00)" },
  { value: "America/Anchorage", label: "Anchorage (UTC-09:00)" },
  { value: "Pacific/Honolulu", label: "Honolulu (UTC-10:00)" },
];

const withCurrentTimeZone = (timeZoneId) => {
  if (!timeZoneId || TIMEZONE_OPTIONS.some((z) => z.value === timeZoneId)) {
    return TIMEZONE_OPTIONS;
  }

  return [{ value: timeZoneId, label: timeZoneId }, ...TIMEZONE_OPTIONS];
};

const shiftKey = (group = {}) => {
  const name = String(group.name || "").trim().toLowerCase();
  const start = String(group.startTime || "");
  const end = String(group.endTime || "");
  return `${name}|${Number(group.daysMask || 0)}|${start}|${end}`;
};

const isShiftExcluded = (excluded = [], group) =>
  excluded.some((item) => shiftKey(item) === shiftKey(group));

const makeShift = (preset = SHIFT_PRESETS[0]) => ({
  name: preset.name,
  daysMask: WEEKDAY_MASK,
  startTime: preset.startTime,
  endTime: preset.endTime,
});

const toTimeInput = (v) => (v || "08:00:00").slice(0, 5);
const fromTimeInput = (v) => `${v}:00`;

const EMPTY_GLOBAL = {
  timeZoneId: "Asia/Ho_Chi_Minh",
  checkinWindowBeforeMinutes: 15,
  checkinWindowAfterMinutes: 15,
  checkoutWindowBeforeMinutes: 15,
  checkoutWindowAfterMinutes: 15,
  scheduleGroups: [makeShift()],
};

// ─── ShiftCard ────────────────────────────────────────────────────────────────

function ShiftCard({ group, index, colorClass, onChange, onRemove, t }) {
  return (
    <div className={`rounded-lg bg-white p-4 shadow-sm dark:bg-navy-800 ${colorClass}`}>
      <div className="mb-3 flex items-center gap-2">
        <input
          value={group.name || ""}
          onChange={(e) => onChange(index, "name", e.target.value)}
          placeholder={t(K.ADMIN_WORKING_TIME_SHIFT_NAME_PH, "e.g. Morning Shift")}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold text-navy-700 dark:border-white/10 dark:bg-navy-700 dark:text-white"
        />
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {t(K.ADMIN_WORKING_TIME_REMOVE_SHIFT, "Remove")}
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {WEEKDAY_OPTIONS.map((d) => {
          const active = (group.daysMask & d.bit) !== 0;
          return (
            <button
              key={d.bit}
              type="button"
              onClick={() => onChange(index, "daysMask", active ? (group.daysMask & ~d.bit) : (group.daysMask | d.bit))}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-navy-700 dark:text-gray-400"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="time"
          value={toTimeInput(group.startTime)}
          onChange={(e) => onChange(index, "startTime", fromTimeInput(e.target.value))}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-700"
        />
        <span className="text-gray-400">→</span>
        <input
          type="time"
          value={toTimeInput(group.endTime)}
          onChange={(e) => onChange(index, "endTime", fromTimeInput(e.target.value))}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-700"
        />
      </div>
    </div>
  );
}

// ─── WindowsSettings ─────────────────────────────────────────────────────────

function WindowsSettings({ config, onChange, t }) {
  const timezoneOptions = withCurrentTimeZone(config.timeZoneId);
  const fields = [
    { key: "checkinWindowBeforeMinutes",  label: t(K.ADMIN_WORKING_TIME_CHECKIN_BEFORE,  "Check-in before (min)") },
    { key: "checkinWindowAfterMinutes",   label: t(K.ADMIN_WORKING_TIME_CHECKIN_AFTER,   "Check-in after (min)") },
    { key: "checkoutWindowBeforeMinutes", label: t(K.ADMIN_WORKING_TIME_CHECKOUT_BEFORE, "Check-out before (min)") },
    { key: "checkoutWindowAfterMinutes",  label: t(K.ADMIN_WORKING_TIME_CHECKOUT_AFTER,  "Check-out after (min)") },
  ];

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-white/10">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {t(K.ADMIN_WORKING_TIME_WINDOWS_TITLE, "Check-In / Check-Out Windows")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          {t(K.ADMIN_WORKING_TIME_TIMEZONE, "Time Zone")}
          <select
            value={config.timeZoneId}
            onChange={(e) => onChange("timeZoneId", e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-navy-700"
          >
            {timezoneOptions.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </label>
        {fields.map(({ key, label }) => (
          <label key={key} className="text-sm">
            {label}
            <input
              type="number"
              min="0"
              value={config[key]}
              onChange={(e) => onChange(key, Number(e.target.value || 0))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-navy-700"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkingTimeAdminPage() {
  const { t } = useLanguage();

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [users, setUsers]         = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [globalConfig, setGlobalConfig] = useState(EMPTY_GLOBAL);
  const [overrideForm, setOverrideForm] = useState(null); // null = hidden

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const [config, usersData, overridesData] = await Promise.all([
        workerCalendarService.getGlobalConfig(),
        userService.getAllUsers(),
        workerCalendarService.getOverrides(),
      ]);
      setGlobalConfig({
        ...EMPTY_GLOBAL,
        ...config,
        scheduleGroups: config?.scheduleGroups?.length ? config.scheduleGroups : [makeShift()],
      });
      setUsers(usersData || []);
      setOverrides(overridesData || []);
    } catch (err) {
      toast.error(err?.message || t(K.ADMIN_WORKING_TIME_LOAD_FAILED, "Failed to load working time settings."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ────────────────────────────────────────────────────────────────

  const workerUsers = useMemo(
    () => users.filter((u) => u.workerRole?.workerID),
    [users]
  );

  // ── Global config helpers ──────────────────────────────────────────────────

  const changeGlobalField = (key, value) =>
    setGlobalConfig((prev) => ({ ...prev, [key]: value }));

  const changeShift = (idx, key, value) =>
    setGlobalConfig((prev) => {
      const groups = [...prev.scheduleGroups];
      groups[idx] = { ...groups[idx], [key]: value };
      return { ...prev, scheduleGroups: groups };
    });

  const addShift = () => {
    const next = SHIFT_PRESETS[globalConfig.scheduleGroups.length % SHIFT_PRESETS.length];
    setGlobalConfig((prev) => ({
      ...prev,
      scheduleGroups: [...prev.scheduleGroups, makeShift(next)],
    }));
  };

  const removeShift = (idx) =>
    setGlobalConfig((prev) => ({
      ...prev,
      scheduleGroups: prev.scheduleGroups.filter((_, i) => i !== idx),
    }));

  const saveGlobal = async () => {
    setSaving(true);
    try {
      await workerCalendarService.updateGlobalConfig(globalConfig);
      toast.success(t(K.ADMIN_WORKING_TIME_GLOBAL_SAVED, "Global working time saved."));
    } catch (err) {
      toast.error(err?.message || t(K.ADMIN_WORKING_TIME_SAVE_FAILED, "Failed to save."));
    } finally {
      setSaving(false);
    }
  };

  // ── Override form helpers ──────────────────────────────────────────────────

  const openAssignForm = (existing = null) => {
    if (existing) {
      const user = workerUsers.find((u) => u.workerRole?.workerID === existing.workerID);
      setOverrideForm({
        workerID:       String(existing.workerID),
        startDate:      String(existing.startDate || "").slice(0, 10),
        endDate:        String(existing.endDate || "").slice(0, 10),
        isActive:       existing.isActive ?? true,
        timeZoneId:     existing.timeZoneId || "",
        scheduleGroups: existing.scheduleGroups?.length ? existing.scheduleGroups : [],
        excludedScheduleGroups: existing.excludedScheduleGroups?.length ? existing.excludedScheduleGroups : [],
        _workerName:    user?.fullName || user?.email || null,
        _locked:        !!user,
      });
    } else {
      setOverrideForm({
        workerID: "",
        startDate: "",
        endDate: "",
        isActive: true,
        timeZoneId: "",
        scheduleGroups: [],
        excludedScheduleGroups: [],
      });
    }
  };

  const changeOverrideShift = (idx, key, value) =>
    setOverrideForm((prev) => {
      const groups = [...prev.scheduleGroups];
      groups[idx] = { ...groups[idx], [key]: value };
      return { ...prev, scheduleGroups: groups };
    });

  const addOverrideShift = () =>
    setOverrideForm((prev) => ({
      ...prev,
      scheduleGroups: [...prev.scheduleGroups, makeShift()],
    }));

  const removeOverrideShift = (idx) =>
    setOverrideForm((prev) => ({
      ...prev,
      scheduleGroups: prev.scheduleGroups.filter((_, i) => i !== idx),
    }));

  const toggleExcludedGlobalShift = (group) => {
    setOverrideForm((prev) => {
      const excluded = prev.excludedScheduleGroups || [];
      const exists = isShiftExcluded(excluded, group);
      return {
        ...prev,
        excludedScheduleGroups: exists
          ? excluded.filter((item) => shiftKey(item) !== shiftKey(group))
          : [...excluded, group],
      };
    });
  };

  const saveOverride = async (e) => {
    e.preventDefault();
    if (!overrideForm.workerID || !overrideForm.startDate) {
      toast.error(t(K.ADMIN_WORKING_TIME_OVERRIDE_REQUIRED, "Please select worker and start date."));
      return;
    }

    const effectiveEndDate = overrideForm.endDate || overrideForm.startDate;

    setSaving(true);
    try {
      await workerCalendarService.upsertOverride({
        workerID:       Number(overrideForm.workerID),
        startDate:      overrideForm.startDate,
        endDate:        effectiveEndDate,
        isActive:       overrideForm.isActive,
        timeZoneId:     overrideForm.timeZoneId || null,
        scheduleGroups: overrideForm.scheduleGroups,
        excludedScheduleGroups: overrideForm.excludedScheduleGroups,
      });
      toast.success(t(K.ADMIN_WORKING_TIME_OVERRIDE_SAVED, "Worker override saved."));
      setOverrideForm(null);
      await load();
    } catch (err) {
      toast.error(err?.message || t(K.ADMIN_WORKING_TIME_SAVE_FAILED, "Failed to save."));
    } finally {
      setSaving(false);
    }
  };

  const deleteOverride = async (item) => {
    if (!window.confirm(t(K.ADMIN_WORKING_TIME_DELETE_CONFIRM, "Delete this override?"))) return;
    try {
      await workerCalendarService.deleteOverride(item.workerID, item.startDate);
      toast.success(t(K.ADMIN_WORKING_TIME_OVERRIDE_DELETED, "Override deleted."));
      await load();
    } catch (err) {
      toast.error(err?.message || t(K.ADMIN_WORKING_TIME_DELETE_FAILED, "Failed to delete."));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Section 1: Global Working Schedule ────────────────────────── */}
      <Card extra="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-navy-700 dark:text-white">
              {t(K.ADMIN_WORKING_TIME_GLOBAL_TITLE, "Global Working Time")}
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {t(K.ADMIN_WORKING_TIME_INHERITS_GLOBAL, "Applies to all workers unless overridden per-worker")}
            </p>
          </div>
          <button
            onClick={saveGlobal}
            disabled={saving}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "..." : t(K.ADMIN_WORKING_TIME_SAVE_GLOBAL, "Save Global Settings")}
          </button>
        </div>

        <WindowsSettings config={globalConfig} onChange={changeGlobalField} t={t} />

        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-navy-700 dark:text-white">
            {t(K.ADMIN_WORKING_TIME_SHIFTS_TITLE, "Global Shift Schedules")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {globalConfig.scheduleGroups.map((group, idx) => (
              <ShiftCard
                key={idx}
                group={group}
                index={idx}
                colorClass={SHIFT_COLORS[idx % SHIFT_COLORS.length]}
                onChange={changeShift}
                onRemove={globalConfig.scheduleGroups.length > 1 ? removeShift : null}
                t={t}
              />
            ))}
            <button
              type="button"
              onClick={addShift}
              className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-500 dark:border-white/10 dark:hover:border-brand-500"
            >
              <span className="text-2xl">+</span>
              <span className="text-sm">{t(K.ADMIN_WORKING_TIME_ADD_SHIFT, "Add Shift")}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* ── Section 2: Worker Shift Assignments ───────────────────────── */}
      <Card extra="p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy-700 dark:text-white">
            {t(K.ADMIN_WORKING_TIME_WORKERS_TITLE, "Worker Shift Assignments")}
          </h3>
          <button
            onClick={() => openAssignForm()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            + {t(K.ADMIN_WORKING_TIME_ASSIGN_WORKER, "Assign Shift to Worker")}
          </button>
        </div>

        {/* Inline override form */}
        {overrideForm && (
          <form
            onSubmit={saveOverride}
            className="mb-6 rounded-xl border border-brand-200 bg-brand-50/40 p-5 dark:border-brand-800/40 dark:bg-navy-800"
          >
            <p className="mb-4 font-semibold text-navy-700 dark:text-white">
              {overrideForm._workerName
                ? `${t(K.ADMIN_WORKING_TIME_EDIT_OVERRIDE, "Edit Override")} — ${overrideForm._workerName}`
                : t(K.ADMIN_WORKING_TIME_ASSIGN_WORKER, "Assign Shift to Worker")}
            </p>

            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">
                  {t(K.ADMIN_WORKING_TIME_WORKER_COL, "Worker")}
                </label>
                <select
                  required
                  value={overrideForm.workerID}
                  disabled={!!overrideForm._locked}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, workerID: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-navy-700"
                >
                  <option value="">{t(K.ADMIN_TABLE_SELECT_WORKER, "Select Worker")}</option>
                  {workerUsers.map((u) => (
                    <option key={u.workerRole.workerID} value={u.workerRole.workerID}>
                      {u.fullName || u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">
                  {t(K.ADMIN_TABLE_START_DATE, "Start Date")}
                </label>
                <input
                  type="date"
                  required
                  value={overrideForm.startDate}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-navy-700"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-500 dark:text-gray-400">
                  {t(K.ADMIN_TABLE_END_DATE, "End Date")}
                </label>
                <input
                  type="date"
                  value={overrideForm.endDate}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full rounded border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-navy-700"
                />
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-4">
              <label className="text-sm">
                {t(K.ADMIN_WORKING_TIME_TIMEZONE_OPTIONAL, "Time Zone (optional)")}
                <select
                  value={overrideForm.timeZoneId}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, timeZoneId: e.target.value }))}
                  className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm dark:border-white/10 dark:bg-navy-700"
                >
                  <option value="">{t(K.ADMIN_WORKING_TIME_INHERITS_GLOBAL, "Inherits global schedule")}</option>
                  {withCurrentTimeZone(overrideForm.timeZoneId).map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={overrideForm.isActive}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                {t(K.ADMIN_TABLE_ACTIVE, "Active")}
              </label>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center gap-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t(K.ADMIN_WORKING_TIME_SHIFTS_TITLE, "Shifts")}
                </p>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-navy-700 dark:text-gray-400">
                  {overrideForm.scheduleGroups.length === 0
                    ? t(K.ADMIN_WORKING_TIME_INHERITS_GLOBAL, "Inherits global schedule")
                    : `${overrideForm.scheduleGroups.length} custom shift(s)`}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {overrideForm.scheduleGroups.map((group, idx) => (
                  <ShiftCard
                    key={idx}
                    group={group}
                    index={idx}
                    colorClass={SHIFT_COLORS[idx % SHIFT_COLORS.length]}
                    onChange={changeOverrideShift}
                    onRemove={removeOverrideShift}
                    t={t}
                  />
                ))}
                <button
                  type="button"
                  onClick={addOverrideShift}
                  className="flex min-h-[120px] items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-500 dark:border-white/10"
                >
                  <span className="text-xl">+</span>
                  <span className="text-sm">{t(K.ADMIN_WORKING_TIME_ADD_SHIFT, "Add Shift")}</span>
                </button>
              </div>

              {overrideForm.scheduleGroups.length === 0 && globalConfig.scheduleGroups.length > 0 && (
                <div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-white/10">
                  <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t(K.ADMIN_WORKING_TIME_EXCLUDE_GLOBAL_SHIFTS, "When inheriting global, unapply selected shifts")}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {globalConfig.scheduleGroups.map((group, idx) => {
                      const checked = isShiftExcluded(overrideForm.excludedScheduleGroups, group);
                      return (
                        <label key={`exclude-${idx}`} className="inline-flex cursor-pointer items-center gap-2 rounded border border-gray-200 px-2 py-1 text-xs dark:border-white/10">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleExcludedGlobalShift(group)}
                          />
                          <span className="text-gray-600 dark:text-gray-300">
                            {group.name || t(K.WORKER_SHIFT_LABEL, "Shift")} {toTimeInput(group.startTime)}-{toTimeInput(group.endTime)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {saving ? "..." : t(K.ADMIN_WORKING_TIME_SAVE_OVERRIDE, "Save Override")}
              </button>
              <button
                type="button"
                onClick={() => setOverrideForm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300"
              >
                {t(K.ADMIN_WORKING_TIME_CANCEL, "Cancel")}
              </button>
            </div>
          </form>
        )}

        {/* Worker table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10">
                <th className="py-2 pr-4 font-semibold text-gray-500 dark:text-gray-400">
                  {t(K.ADMIN_WORKING_TIME_WORKER_COL, "Worker")}
                </th>
                <th className="py-2 pr-4 font-semibold text-gray-500 dark:text-gray-400">
                  {t(K.ADMIN_WORKING_TIME_DATE_RANGE_COL, "Date Range")}
                </th>
                <th className="py-2 pr-4 font-semibold text-gray-500 dark:text-gray-400">
                  {t(K.ADMIN_WORKING_TIME_SHIFTS_TITLE, "Shifts")}
                </th>
                <th className="py-2 font-semibold text-gray-500 dark:text-gray-400">
                  {t(K.ADMIN_TABLE_STATUS, "Status")}
                </th>
                <th className="py-2 text-right font-semibold text-gray-500 dark:text-gray-400">
                  {t(K.ADMIN_TABLE_ACTIONS, "Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {workerUsers.map((u) => {
                const workerID = u.workerRole?.workerID;
                const workerOverrides = overrides.filter((o) => o.workerID === workerID);
                return (
                  <React.Fragment key={workerID}>
                    {workerOverrides.length === 0 ? (
                      <tr>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-navy-700 dark:text-white">{u.fullName || u.email}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-300">
                          {t(K.ADMIN_WORKING_TIME_INHERITS_GLOBAL, "Inherits global schedule")}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {globalConfig.scheduleGroups.map((g, gi) => (
                              <span key={gi} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
                                {g.name || t(K.WORKER_SHIFT_LABEL, "Shift")} {toTimeInput(g.startTime)}-{toTimeInput(g.endTime)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
                            {t(K.ADMIN_TABLE_ACTIVE, "Active")}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => openAssignForm({ workerID, scheduleGroups: [], excludedScheduleGroups: [], isActive: true, startDate: new Date().toISOString().slice(0, 10), endDate: "" })}
                            className="rounded border border-brand-300 px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300"
                          >
                            + {t(K.ADMIN_WORKING_TIME_ASSIGN_WORKER, "Assign")}
                          </button>
                        </td>
                      </tr>
                    ) : (
                      workerOverrides.map((ovr, oi) => (
                        <tr key={`${workerID}-${oi}`}>
                          {oi === 0 && (
                            <td className="py-3 pr-4 align-top" rowSpan={workerOverrides.length}>
                              <p className="font-medium text-navy-700 dark:text-white">{u.fullName || u.email}</p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                            </td>
                          )}
                          <td className="py-3 pr-4 text-xs text-gray-600 dark:text-gray-300">
                            {String(ovr.startDate).slice(0, 10)} → {String(ovr.endDate).slice(0, 10)}
                          </td>
                          <td className="py-3 pr-4">
                            {ovr.scheduleGroups?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {ovr.scheduleGroups.map((g, gi) => (
                                  <span key={gi} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
                                    {g.name || "Shift"} {toTimeInput(g.startTime)}–{toTimeInput(g.endTime)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="block text-xs text-gray-400">{t(K.ADMIN_WORKING_TIME_INHERITS_GLOBAL, "Inherits global")}</span>
                                {ovr.excludedScheduleGroups?.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {ovr.excludedScheduleGroups.map((g, gi) => (
                                      <span key={gi} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
                                        {t(K.ADMIN_WORKING_TIME_EXCLUDED_SHIFTS, "Excluded")}: {g.name || t(K.WORKER_SHIFT_LABEL, "Shift")}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {ovr.isActive ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                {t(K.ADMIN_TABLE_ACTIVE, "Active")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-navy-700 dark:text-gray-400">
                                {t(K.ADMIN_TABLE_INACTIVE, "Inactive")}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => openAssignForm(ovr)}
                              className="mr-2 rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-white/10 dark:hover:bg-navy-700"
                            >
                              {t(K.ADMIN_WORKING_TIME_EDIT_OVERRIDE, "Edit")}
                            </button>
                            <button
                              onClick={() => deleteOverride(ovr)}
                              className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                            >
                              {t(K.ADMIN_TABLE_DELETE, "Delete")}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </React.Fragment>
                );
              })}
              {workerUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    {t(K.ADMIN_TABLE_NO_DATA, "No workers found.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
