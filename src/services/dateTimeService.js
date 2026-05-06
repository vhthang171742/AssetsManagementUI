const HAS_TZ_SUFFIX_REGEX = /[zZ]|[+\-]\d{2}:\d{2}$/;
const resolvedTimeZoneCache = new Map();
const dateKeyFormatterCache = new Map();
const timeFormatterCache = new Map();

const resolveTimeZone = (timeZoneId) => {
  if (!timeZoneId) {
    return undefined;
  }

  if (resolvedTimeZoneCache.has(timeZoneId)) {
    return resolvedTimeZoneCache.get(timeZoneId);
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone: timeZoneId });
    resolvedTimeZoneCache.set(timeZoneId, timeZoneId);
    return timeZoneId;
  } catch {
    resolvedTimeZoneCache.set(timeZoneId, undefined);
    return undefined;
  }
};

const getDateKeyFormatter = (timeZoneId) => {
  const tz = resolveTimeZone(timeZoneId);
  const cacheKey = tz || "__local__";
  if (dateKeyFormatterCache.has(cacheKey)) {
    return dateKeyFormatterCache.get(cacheKey);
  }

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  if (tz) {
    options.timeZone = tz;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", options);
  dateKeyFormatterCache.set(cacheKey, formatter);
  return formatter;
};

const getTimeFormatter = (timeZoneId) => {
  const tz = resolveTimeZone(timeZoneId);
  const cacheKey = tz || "__local__";
  if (timeFormatterCache.has(cacheKey)) {
    return timeFormatterCache.get(cacheKey);
  }

  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  if (tz) {
    options.timeZone = tz;
  }

  const formatter = new Intl.DateTimeFormat(undefined, options);
  timeFormatterCache.set(cacheKey, formatter);
  return formatter;
};

export const parseApiDateTime = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    // Some APIs return ISO without timezone; treat those as UTC first.
    if (!HAS_TZ_SUFFIX_REGEX.test(value)) {
      const parsedUtc = new Date(`${value}Z`);
      if (!Number.isNaN(parsedUtc.getTime())) {
        return parsedUtc;
      }
    }
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  return null;
};

export const toDateKeyInTimeZone = (value, timeZoneId) => {
  const parsed = parseApiDateTime(value);
  if (!parsed) {
    return null;
  }

  return getDateKeyFormatter(timeZoneId).format(parsed);
};

export const formatTimeInTimeZone = (value, timeZoneId) => {
  const parsed = parseApiDateTime(value);
  if (!parsed) {
    return "";
  }

  return getTimeFormatter(timeZoneId).format(parsed);
};

export const formatDateInTimeZone = (value, timeZoneId, options = {}) => {
  const parsed = parseApiDateTime(value);
  if (!parsed) {
    return "";
  }

  return parsed.toLocaleDateString(undefined, {
    timeZone: resolveTimeZone(timeZoneId),
    ...options,
  });
};

export const formatDateTimeInTimeZone = (value, timeZoneId, options = {}) => {
  const parsed = parseApiDateTime(value);
  if (!parsed) {
    return "";
  }

  return parsed.toLocaleString(undefined, {
    hour12: false,
    timeZone: resolveTimeZone(timeZoneId),
    ...options,
  });
};

// Converts a UTC clock time (HH:mm[:ss]) into a local clock time (HH:mm).
// referenceDateValue allows DST-aware conversion for the intended date.
export const utcClockTimeToTimeZone = (utcTimeStr, timeZoneId, referenceDateValue) => {
  if (!utcTimeStr) {
    return "";
  }

  if (!timeZoneId) {
    return String(utcTimeStr).slice(0, 5);
  }

  try {
    const [h, m] = String(utcTimeStr).split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) {
      return String(utcTimeStr).slice(0, 5);
    }

    const reference = parseApiDateTime(referenceDateValue) || new Date();
    const ref = new Date(Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate(),
      h,
      m,
      0
    ));
    const formatted = ref.toLocaleTimeString("en-US", {
      timeZone: resolveTimeZone(timeZoneId),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return formatted === "24:00" ? "00:00" : formatted;
  } catch {
    return String(utcTimeStr).slice(0, 5);
  }
};