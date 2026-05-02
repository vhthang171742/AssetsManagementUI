import React, { useEffect, useMemo, useState } from "react";
import MiniCalendar from "components/calendar/MiniCalendar";
import WeeklyRevenue from "views/admin/default/components/WeeklyRevenue";
import TotalSpent from "views/admin/default/components/TotalSpent";
import PieChartCard from "views/admin/default/components/PieChartCard";
import { IoMdHome } from "react-icons/io";
import { IoDocuments } from "react-icons/io5";
import { MdBarChart, MdDashboard } from "react-icons/md";

import { columnsDataCheck, columnsDataComplex } from "./variables/columnsData";

import Widget from "components/widget/Widget";
import CheckTable from "views/admin/default/components/CheckTable";
import ComplexTable from "views/admin/default/components/ComplexTable";
import DailyTraffic from "views/admin/default/components/DailyTraffic";
import TaskCard from "views/admin/default/components/TaskCard";
import tableDataCheck from "./variables/tableDataCheck.json";
import tableDataComplex from "./variables/tableDataComplex.json";
import { classService, practiceSessionService } from "services/api";
import { useLanguage } from "context/LanguageContext";
import { TranslationKeys as K } from "i18n/translationKeys";

const Dashboard = () => {
  const { t } = useLanguage();
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const loadTrainingEvents = async () => {
      try {
        const [classList, sessionList] = await Promise.all([
          classService.getAll(),
          practiceSessionService.getAll(),
        ]);

        setClasses(classList || []);
        setSessions(sessionList || []);
      } catch (error) {
        console.warn("Failed to load training calendar events:", error.message);
      }
    };

    loadTrainingEvents();
  }, []);

  const trainingCalendarEvents = useMemo(() => {
    const classEvents = classes.flatMap((item) => {
      const events = [];

      if (item.startDate) {
        events.push({
          date: item.startDate,
          label: `${item.className} ${t(K.STUDENT_CLASS_START, "Class starts")}`,
        });
      }

      if (item.endDate) {
        events.push({
          date: item.endDate,
          label: `${item.className} ${t(K.STUDENT_CLASS_END, "Class ends")}`,
        });
      }

      return events;
    });

    const sessionEvents = sessions.map((session) => ({
      date: session.startTime,
      label: `Session #${session.sessionID} · Class #${session.classID}`,
    }));

    return [...classEvents, ...sessionEvents];
  }, [classes, sessions, t]);

  const selectedDateEvents = useMemo(() => {
    const key = calendarDate.toISOString().slice(0, 10);
    return trainingCalendarEvents.filter((event) => {
      const eventDate = new Date(event.date);
      return !Number.isNaN(eventDate.getTime()) && eventDate.toISOString().slice(0, 10) === key;
    });
  }, [calendarDate, trainingCalendarEvents]);

  return (
    <div>
      {/* Card widget */}

      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-6">
        <Widget
          icon={<MdBarChart className="h-7 w-7" />}
          title={"Earnings"}
          subtitle={"$340.5"}
        />
        <Widget
          icon={<IoDocuments className="h-6 w-6" />}
          title={"Spend this month"}
          subtitle={"$642.39"}
        />
        <Widget
          icon={<MdBarChart className="h-7 w-7" />}
          title={"Sales"}
          subtitle={"$574.34"}
        />
        <Widget
          icon={<MdDashboard className="h-6 w-6" />}
          title={"Your Balance"}
          subtitle={"$1,000"}
        />
        <Widget
          icon={<MdBarChart className="h-7 w-7" />}
          title={"New Tasks"}
          subtitle={"145"}
        />
        <Widget
          icon={<IoMdHome className="h-6 w-6" />}
          title={"Total Projects"}
          subtitle={"$2433"}
        />
      </div>

      {/* Charts */}

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <TotalSpent />
        <WeeklyRevenue />
      </div>

      {/* Tables & Charts */}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Check Table */}
        <div>
          <CheckTable
            columnsData={columnsDataCheck}
            tableData={tableDataCheck}
          />
        </div>

        {/* Traffic chart & Pie Chart */}

        <div className="grid grid-cols-1 gap-5 rounded-[20px] md:grid-cols-2">
          <DailyTraffic />
          <PieChartCard />
        </div>

        {/* Complex Table , Task & Calendar */}

        <ComplexTable
          columnsData={columnsDataComplex}
          tableData={tableDataComplex}
        />

        {/* Task chart & Calendar */}

        <div className="grid grid-cols-1 gap-5 rounded-[20px] md:grid-cols-2">
          <TaskCard />
          <div className="grid grid-cols-1 rounded-[20px]">
            <MiniCalendar
              value={calendarDate}
              onChange={setCalendarDate}
              events={trainingCalendarEvents}
            />
            <div className="mt-3 rounded-xl bg-white p-3 text-xs text-gray-600 dark:bg-navy-800 dark:text-gray-200">
              <p className="font-semibold text-navy-700 dark:text-white">{t(K.ADMIN_DASHBOARD_TRAINING_CALENDAR_EVENTS, "Training Calendar Events")}</p>
              {selectedDateEvents.length === 0 && <p className="mt-1">{t(K.ADMIN_DASHBOARD_NO_EVENTS_ON_DATE, "No events on selected date.")}</p>}
              {selectedDateEvents.slice(0, 4).map((event, index) => (
                <p key={`${event.label}-${index}`} className="mt-1">• {event.label}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

