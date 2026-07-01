import axiosInstance from "./axiosinstance";

export const SOUTH_INDIAN_STATES = [
  "tamil nadu",
  "kerala",
  "karnataka",
  "andhra pradesh",
  "telangana",
];

const normalize = (v?: string) => (v || "").trim().toLowerCase();

export async function fetchRegion() {
  try {
    // Try browser-side geolocation API lookup first for maximum accuracy
    const res = await fetch("https://ipapi.co/json");
    if (!res.ok) throw new Error();
    const data = await res.json();
    return {
      region: normalize(data?.region),
      country: normalize(data?.country_name),
      countryCode: normalize(data?.country_code),
    };
  } catch (e) {
    // Fall back to server-side location detection if browser API fails or is rate-limited
    try {
      const { data } = await axiosInstance.get("/user/location");
      return {
        region: normalize(data?.region),
        country: normalize(data?.country),
        countryCode: normalize(data?.countryCode),
      };
    } catch {
      return null;
    }
  }
}

export function isSouthIndia(regionObj?: { region?: string; country?: string; countryCode?: string }) {
  if (!regionObj) return false;
  const { region, country, countryCode } = regionObj;
  const india = (country === "india" || countryCode === "in");
  return india && SOUTH_INDIAN_STATES.includes(normalize(region));
}

export function isBetween10and12IST(date = new Date()) {
  try {
    const str = date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const d = new Date(str);
    const h = d.getHours();
    return h >= 10 && h < 12;
  } catch (e) {
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const istOffset = 5.5 * 60 * 60000;
    const ist = new Date(utc + istOffset);
    const h = ist.getHours();
    return h >= 10 && h < 12;
  }
}
