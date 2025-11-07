/* eslint-disable no-unused-vars */
import React, { useReducer, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import { AuthContext } from "./AuthContext";

const initialState = {
  user: null,
  token: localStorage.getItem("token") || null,
  loading: true,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload, loading: false };
    case "SET_TOKEN":
      return { ...state, token: action.payload, loading: false };
    case "LOGOUT":
      return { user: null, token: null, loading: false };
    default:
      return state;
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchMe = async () => {
    try {
      const res = await axiosClient.get("/me");
      dispatch({ type: "SET_USER", payload: res.data });
    } catch (err) {
      dispatch({ type: "LOGOUT" });
      localStorage.removeItem("token");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      dispatch({ type: "SET_TOKEN", payload: token });
      fetchMe();
    } else {
      dispatch({ type: "LOGOUT" });
    }
  }, []);

  const login = async (email, password) => {
    const res = await axiosClient.post("/login", { email, password });
    const token =
      res.data.token ||
      res.data.access_token ||
      res.data?.data?.token;

    if (!token) throw new Error("No token in response");

    localStorage.setItem("token", token);
    dispatch({ type: "SET_TOKEN", payload: token });
    await fetchMe();
  };

  const logout = async () => {
    try {
      await axiosClient.get("/logout");
    } catch (e) {
      /* ignore */
    }
    localStorage.removeItem("token");
    dispatch({ type: "LOGOUT" });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
