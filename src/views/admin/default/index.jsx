import React, { useEffect, useState } from "react";
import MiniCalendar from "components/calendar/MiniCalendar";
import Widget from "components/widget/Widget";
import { dashboardService } from "services/api";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";
import { useAuth } from "context/AuthContext";
import { toDateKeyInTimeZone } from "services/dateTimeService";
import {
  MdBuild,
  MdDevices,
  MdPeople,
  MdSchool,
  MdSwapHoriz,
  MdReport,
} from "react-icons/md";

import AssetStatusPieChart from "./components/AssetStatusPieChart";
import AssetsByCategoryChart from "./components/AssetsByCategoryChart";
import MaintenanceTrendChart from "./components/MaintenanceTrendChart";
import UsageDowntimeChart from "./components/UsageDowntimeChart";
import UpcomingMaintenanceTable from "./components/UpcomingMaintenanceTable";

const Dashboard = () => {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const userTimeZoneId = currentUser?.timeZoneId || "";
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await dashboardService.getSummary();
        setSummary(data);
      } catch (err) {
        console.error("Dashboard load failed:", err);
        setError(t(K.ADMIN_DASHBOARD_LOAD_FAILED, "Failed to load dashboard data."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Build calendar events from upcoming maintenance schedules
  const maintenanceEvents = summary?.upcomingMaintenanceSchedules?.map((s) => ({
    date: s.nextDueDate,
    label: `[${s.assetCode}] ${s.assetName} — ${s.maintenanceType}`,
  })) ?? [];

  const selectedDateEvents = maintenanceEvents.filter((e) => {
    if (!e.date) return false;
    return toDateKeyInTimeZone(e.date, userTimeZoneId) === toDateKeyInTimeZone(calendarDate, userTimeZoneId);
  });

  return (
    <div>
      {/* KPI Widgets */}
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Widget
          icon={<MdDevices className="h-7 w-7" />}
          title={t(K.ADMIN_DASHBOARD_TOTAL_ASSETS, "Total Assets")}
          subtitle={loading ? "…" : String(summary?.totalAssets ?? 0)}
        />
        <Widget
          icon={<MdPeople className="h-7 w-7" />}
          title={t(K.ADMIN_DASHBOARD_ACTIVE_ASSIGNMENTS, "Active Worker Assignments")}
          subtitle={loading ? "…" : String(summary?.activeWorkerAssignments ?? 0)}
        />
        <Widget
          icon={<MdBuild className="h-7 w-7" />}
          title={t(K.ADMIN_DASHBOARD_OVERDUE_MAINTENANCE, "Overdue Maintenance")}
          subtitle={loading ? "…" : String(summary?.overdueMaintenanceSchedules ?? 0)}
        />
        <Widget
          icon={<MdSchool className="h-7 w-7" />}
          title={t(K.ADMIN_DASHBOARD_ACTIVE_SESSIONS_TODAY, "Active Sessions Today")}
          subtitle={loading ? "…" : String(summary?.activePracticeSessionsToday ?? 0)}
        />
        <Widget
          icon={<MdSwapHoriz className="h-7 w-7" />}
          title={t(K.ADMIN_DASHBOARD_HANDOVERS_THIS_MONTH, "Handovers This Month")}
          subtitle={loading ? "…" : String(summary?.handoversThisMonth ?? 0)}
        />
        <Widget
          icon={<MdReport className="h-7 w-7" />}
          title={t(K.ADMIN_DASHBOARD_OPEN_INCIDENTS, "Open Incidents")}
          subtitle={loading ? "…" : String(summary?.openIncidents ?? 0)}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/10">
          {error}
        </div>
      )}

      {/* Asset Charts Row */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <AssetStatusPieChart data={summary?.assetsByStatus ?? []} />
        <AssetsByCategoryChart data={summary?.assetsByCategory ?? []} />
      </div>

      {/* Maintenance Trend + Usage */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <MaintenanceTrendChart data={summary?.maintenanceRecordsLast12Months ?? []} />
        <UsageDowntimeChart data={summary?.equipmentUsageLast30Days ?? []} />
      </div>

      {/* Tables */}
      <div className="mt-5">
        <UpcomingMaintenanceTable data={summary?.upcomingMaintenanceSchedules ?? []} />
      </div>

      {/* Maintenance Calendar */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <MiniCalendar
            value={calendarDate}
            onChange={setCalendarDate}
            events={maintenanceEvents}
          />
          <div className="rounded-xl bg-white p-3 text-xs text-gray-600 dark:bg-navy-800 dark:text-gray-200">
            <p className="font-semibold text-navy-700 dark:text-white">
              {t(K.ADMIN_DASHBOARD_MAINTENANCE_CALENDAR_EVENTS, "Maintenance Events on Selected Date")}
            </p>
            {selectedDateEvents.length === 0 && (
              <p className="mt-1">{t(K.ADMIN_DASHBOARD_NO_EVENTS_ON_DATE, "No maintenance events on selected date.")}</p>
            )}
            {selectedDateEvents.slice(0, 6).map((event, i) => (
              <p key={i} className="mt-1">• {event.label}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

