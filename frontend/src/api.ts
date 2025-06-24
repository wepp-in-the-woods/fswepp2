import axios from "axios";

const baseURL = "https://fswepp2-api.bearhive.duckdns.org";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    "x-corsfix-headers": JSON.stringify({
      Origin: "https://www.google.com",
      Referer: "https://www.google.com",
    }),
  },
});
