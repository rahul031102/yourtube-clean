export const SOUTH_INDIAN_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
] as const;

const normalize = (value: string | undefined | null) =>
  (value || "").trim().toLowerCase();

export const isSouthIndianState = (region: string | undefined | null) => {
  const target = normalize(region);
  return SOUTH_INDIAN_STATES.some((state) => normalize(state) === target);
};

const isIndia = (
  country: string | undefined | null,
  countryCode: string | undefined | null
) => normalize(country) === "india" || normalize(countryCode) === "in";

export const getISTHour = (date: Date = new Date()) => {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hour12: false,
  }).format(date);
  return Number(hour) % 24;
};

const isWithinLightWindow = (date: Date = new Date()) => {
  const hour = getISTHour(date);
  return hour >= 10 && hour < 12;
  // return hour >= 21 || hour === 0;
};

export type GeoLocation = {
  region?: string;
  country?: string;
  countryCode?: string;
};

// Light theme requires BOTH: IST time in 10:00-12:00 AND a south Indian state.
// Dark theme is the default whenever either condition is not met.
export const isLightTheme = (location: GeoLocation, date: Date = new Date()) => {
  const inSouthIndia =
    isIndia(location.country, location.countryCode) &&
    isSouthIndianState(location.region);
  return isWithinLightWindow(date) && inSouthIndia;
};
