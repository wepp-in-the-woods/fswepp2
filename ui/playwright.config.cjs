module.exports = {
  testDir: "./playwright-tests",
  testMatch: "**/*.pw.cjs",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1024, height: 768 },
  },
};
