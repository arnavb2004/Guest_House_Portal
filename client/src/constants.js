// export const BASE_URL = "http://172.30.8.212:4751";
// export const BASE_URL = "http://localhost:4751";
// Use environment variable in production or fallback to localhost for development
export const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4751";