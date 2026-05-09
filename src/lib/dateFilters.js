const toInputDate = (date) => {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
};

const startOfDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const endOfDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
};

export const getQuickRange = (filter, referenceDate = new Date()) => {
  const end = endOfDay(referenceDate);
  const start = startOfDay(referenceDate);

  if (filter === 'minggu') {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
  }

  if (filter === 'bulan') {
    start.setDate(1);
  }

  if (filter === 'tahun') {
    start.setMonth(0, 1);
  }

  return {
    start: toInputDate(start),
    end: toInputDate(end),
  };
};

export const isDateWithinRange = (dateString, range) => {
  if (!dateString) return false;

  const date = new Date(`${dateString}T12:00:00`);
  const start = range.start ? startOfDay(new Date(`${range.start}T00:00:00`)) : null;
  const end = range.end ? endOfDay(new Date(`${range.end}T00:00:00`)) : null;

  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};
