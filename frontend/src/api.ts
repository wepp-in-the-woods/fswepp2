import axios from "axios";

const baseURL = "https://fswepp2-api.bearhive.duckdns.org";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable sending cookies with requests
});
