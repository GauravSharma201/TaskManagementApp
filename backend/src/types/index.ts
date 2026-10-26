export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: any[];
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number;
  pagination: PaginationResult;
}

export interface DatabaseConfig {
  username: string;
  password: string;
  database: string;
  host: string;
  port: number;
  dialect: 'postgres';
  logging?: boolean | ((sql: string) => void);
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
  dialectOptions?: {
    ssl?: {
      require: boolean;
      rejectUnauthorized: boolean;
    };
  };
}

export enum InvitesType {
  Project = 'PROJECT',
  Workspace = 'WORKSPACE',
  App = 'APP'
}
