/**
 * Application-wide constants
 */

export const APP_CONFIG = {
  APP_NAME: 'Viet Phuc Admin',
  APP_VERSION: '1.0.0',
  API_TIMEOUT: 30000,
} as const;

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50, 100],
} as const;

export const DATE_FORMAT = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_TIME: 'dd/MM/yyyy HH:mm',
  API: 'yyyy-MM-dd',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
} as const;

export const ROUTES = {
  LOGIN: '/auth/login',
  DASHBOARD: '/dashboard',
  FORBIDDEN: '/auth/forbidden',
} as const;
