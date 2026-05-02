import React, { useMemo, useState } from "react";
import Calendar from "react-calendar";
import Card from "components/card";
import "react-calendar/dist/Calendar.css";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import "assets/css/MiniCalendar.css";

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const MiniCalendar = ({ value: controlledValue, onChange, events = [] }) => {
  const [internalValue, setInternalValue] = useState(new Date());
  const value = controlledValue || internalValue;

  const eventMap = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const key = toDateKey(event.date);
      if (!key) {
        return;
      }

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(event.label || "");
    });

    return map;
  }, [events]);

  const eventDates = useMemo(() => {
    return new Set(eventMap.keys());
  }, [eventMap]);

  const handleChange = (nextValue) => {
    if (!controlledValue) {
      setInternalValue(nextValue);
    }

    if (onChange) {
      onChange(nextValue);
    }
  };

  return (
    <div>
      <Card extra="flex w-full h-full flex-col px-3 py-3">
        <Calendar
          onChange={handleChange}
          value={value}
          prevLabel={<MdChevronLeft className="ml-1 h-6 w-6 " />}
          nextLabel={<MdChevronRight className="ml-1 h-6 w-6 " />}
          tileClassName={({ date, view }) => {
            if (view !== "month") {
              return null;
            }

            return eventDates.has(toDateKey(date)) ? "mini-calendar__event-day" : null;
          }}
          tileContent={({ date, view }) => {
            const key = toDateKey(date);
            if (view !== "month" || !key || !eventDates.has(key)) {
              return null;
            }

            return (
              <span
                className="mini-calendar__event-dot"
                title={(eventMap.get(key) || []).filter(Boolean).join("\n")}
              />
            );
          }}
          view={"month"}
        />
      </Card>
    </div>
  );
};

export default MiniCalendar;
