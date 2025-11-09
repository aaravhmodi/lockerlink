export const formatHeight = (raw?: string | number | null) => {
  if (raw === undefined || raw === null) return "—";
  const str = `${raw}`.trim();
  if (!str) return "—";

  if (/'|ft|feet|cm/i.test(str)) {
    return str;
  }

  const numeric = Number(str);
  if (!Number.isNaN(numeric)) {
    return `${numeric}"`;
  }

  return str;
};

export const formatVertical = (raw?: string | number | null) => {
  if (raw === undefined || raw === null) return "—";
  const str = `${raw}`.trim();
  if (!str) return "—";
  if (/"|in|inch|cm/i.test(str)) {
    return str;
  }
  const numeric = Number(str);
  if (!Number.isNaN(numeric)) {
    return `${numeric}"`;
  }

  return str;
};

export const formatWeight = (raw?: string | number | null) => {
  if (raw === undefined || raw === null) return "—";
  const str = `${raw}`.trim();
  if (!str) return "—";
  if (/lb|lbs|pound|kg/i.test(str)) {
    return str;
  }
  const numeric = Number(str);
  if (!Number.isNaN(numeric)) {
    return `${numeric} lbs`;
  }
  return str;
};

