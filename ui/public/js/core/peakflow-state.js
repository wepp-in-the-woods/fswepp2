import { getLocalStorage, setLocalStorage } from "../utils/storage.js";

const STORAGE_KEY = "fswepp_peakflow_state";

const DEFAULT_STATE = Object.freeze({
  description: "",
  Q: 0,
  P: 0,
  A: 0,
  L: 0,
  Sg: 0,
  Tc: 10,
  CN: 90,
  Fp: 1,
  h: 1.83,
});

function normalizeNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };
  const next = { ...DEFAULT_STATE, ...raw };

  next.description = typeof next.description === "string" ? next.description : "";
  next.Q = Math.max(0, normalizeNumber(next.Q, DEFAULT_STATE.Q));
  next.P = Math.max(0, normalizeNumber(next.P, DEFAULT_STATE.P));
  next.A = Math.max(0, normalizeNumber(next.A, DEFAULT_STATE.A));
  next.L = Math.max(0, normalizeNumber(next.L, DEFAULT_STATE.L));
  next.Sg = clamp(normalizeNumber(next.Sg, DEFAULT_STATE.Sg), 0, 1);
  next.Tc = clamp(normalizeNumber(next.Tc, DEFAULT_STATE.Tc), 0.1, 10);
  next.CN = clamp(normalizeNumber(next.CN, DEFAULT_STATE.CN), 15, 100);
  next.Fp = clamp(normalizeNumber(next.Fp, DEFAULT_STATE.Fp), 0, 1);
  next.h = clamp(normalizeNumber(next.h, DEFAULT_STATE.h), 0.3, 18.3);

  return next;
}

export function readPeakFlowState() {
  const stored = getLocalStorage(STORAGE_KEY, null);
  return normalizeState(stored);
}

export function writePeakFlowState(state) {
  const normalized = normalizeState(state);
  setLocalStorage(STORAGE_KEY, normalized);
  return normalized;
}

export const defaultPeakFlowState = DEFAULT_STATE;
