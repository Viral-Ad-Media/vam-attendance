// Type definitions for dashboard analytics

export interface Row {
  [key: string]: any;
  placement?: string;
  platform?: string;
  device?: string;
  country?: string;
  age?: string;
  leads?: number;
  purchases?: number;
}
