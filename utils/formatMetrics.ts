const roundTo = (value: number, decimals: number) => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

const hasImperialToken = (value: string) =>
  /ft|in|\'|\"|feet|inch/i.test(value);

const extractNumbers = (value: string) => {
  const matches = value.match(/(\d+(?:\.\d+)?)/g);
  return matches ? matches.map(Number) : [];
};

export const formatHeight = (raw?: string | number | null) => {
  if (raw === undefined || raw === null) return "—";
  const str = `${raw}`.trim();
  if (!str) return "—";
  const lower = str.toLowerCase();

  if (lower.includes("cm")) {
    return str;
  }

  if (hasImperialToken(lower)) {
    const [feet = 0, inches = 0] = extractNumbers(str);
    const cm = Math.round(feet * 30.48 + inches * 2.54);
    return `${str} (${cm} cm)`;
  }

  const numeric = parseFloat(str);
  if (!Number.isNaN(numeric)) {
    return `${numeric} cm`;
  }

  return str;
};

export const formatVertical = (raw?: string | number | null) => {
  if (raw === undefined || raw === null) return "—";
  const str = `${raw}`.trim();
  if (!str) return "—";
  const lower = str.toLowerCase();

  if (lower.includes("cm")) {
    return str;
  }

  const [inches = NaN] = extractNumbers(str);
  if (!Number.isNaN(inches)) {
    const cm = Math.round(inches * 2.54);
    const base =
      /\"|in|inch/i.test(lower) || !lower ? str : `${str} in`;
    return `${base} (${cm} cm)`;
  }

  const numeric = parseFloat(str);
  if (!Number.isNaN(numeric)) {
    return `${numeric} cm`;
  }

  return str;
};

export const formatWeight = (raw?: string | number | null) => {
  if (raw === undefined || raw === null) return "—";
  const str = `${raw}`.trim();
  if (!str) return "—";
  const lower = str.toLowerCase();

  if (lower.includes("kg")) {
    return str;
  }

  const [pounds = NaN] = extractNumbers(str);
  if (!Number.isNaN(pounds)) {
    const kg = pounds * 0.45359237;
    const kgLabel = kg >= 100 ? Math.round(kg) : roundTo(kg, 1);
    const base =
      /lbs?|pounds?/i.test(lower) || !lower ? str : `${str} lbs`;
    return `${base} (${kgLabel} kg)`;
  }

  const numeric = parseFloat(str);
  if (!Number.isNaN(numeric)) {
    return `${numeric} kg`;
  }

  return str;
};

