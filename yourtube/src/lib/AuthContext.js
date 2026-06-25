import { signInWithPopup, signOut, getAdditionalUserInfo, updateProfile } from "firebase/auth";
// import { signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";

const UserContext = createContext();

const detectLocation = async () => {
  try {
    const res = await fetch("https://ipapi.co/json");
    const data = await res.json();
    return {
      region: data.region,
      country: data.country_name,
      countryCode: data.country_code,
    };
  } catch {
    return {};
  }
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Holds the authenticated-but-not-yet-verified account while OTP is pending.
  const [pendingAuth, setPendingAuth] = useState(null);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("user");
      }
    }
  }, []);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };
  const setToken = (token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
    if (token) {
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  };
  const logout = async () => {
    setUser(null);
    setPendingAuth(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const requestOtp = async (account, { forceEmail = false } = {}) => {
    const location = await detectLocation();
    try {
      const { data } = await axiosInstance.post("/user/otp/request", {
        userId: account._id,
        forceEmail,
        ...location,
      });
      return data;
    } catch (error) {
      const resp = error.response?.data;
      if (resp?.code === "PHONE_REQUIRED") {
        return { requiresPhone: true, message: resp.message };
      }
      throw error;
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      // await signInWithRedirect(auth, provider);
      const firebaseuser = result.user;
      const additionalInfo = getAdditionalUserInfo(result);
      const freshName = additionalInfo?.profile?.name || firebaseuser.displayName;
      const freshImage = additionalInfo?.profile?.picture || firebaseuser.photoURL;
      if (freshName && freshName !== firebaseuser.displayName) {
        try {
          await updateProfile(firebaseuser, { displayName: freshName });
        } catch (e) {
          // non-fatal
        }
      }
      const payload = {
        email: firebaseuser.email,
        name: freshName,
        image: freshImage || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);
      const account = response.data.result;
      const token = response.data.token;
      if (token) {
        localStorage.setItem("token", token);
        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
      const otp = await requestOtp(account);
      setPendingAuth({ account, ...otp });
    } catch (error) {
      if (
        error.code === "auth/popup-closed-by-user" ||
        error.code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      console.error(error);
    }
  };

  const verifyOtp = async (code) => {
    if (!pendingAuth) return;
    const { data } = await axiosInstance.post("/user/otp/verify", {
      userId: pendingAuth.account._id,
      otp: code,
    });
    login(data.user);
    setPendingAuth(null);
  };

  const resendOtp = async ({ forceEmail = false } = {}) => {
    if (!pendingAuth) return null;
    const otp = await requestOtp(pendingAuth.account, { forceEmail });
    setPendingAuth({ account: pendingAuth.account, ...otp });
    return otp;
  };

  // Save a phone number for the pending account, then re-request an OTP.
  const savePhoneForPending = async (phone) => {
    if (!pendingAuth) return null;
    const { data } = await axiosInstance.patch(
      `/user/update/${pendingAuth.account._id}`,
      { phone }
    );
    const account = data || { ...pendingAuth.account, phone };
    const otp = await requestOtp(account);
    setPendingAuth({ account, ...otp });
    return otp;
  };

  const cancelOtp = () => setPendingAuth(null);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        pendingAuth,
        verifyOtp,
        resendOtp,
        savePhoneForPending,
        cancelOtp,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
