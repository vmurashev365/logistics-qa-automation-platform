/**
 * API Types
 * TypeScript interfaces for API requests, responses, and domain models
 */

// =============================================================================
// Generic HTTP Types
// =============================================================================

export interface HttpResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// =============================================================================
// Odoo JSON-RPC Types
// =============================================================================

export interface OdooJsonRpcRequest {
  jsonrpc: '2.0';
  method: 'call';
  id: number;
  params: {
    service?: string;
    method?: string;
    args?: unknown[];
    model?: string;
    domain?: unknown[];
    fields?: string[];
    kwargs?: Record<string, unknown>;
  };
}

export interface OdooJsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: OdooError;
}

export interface OdooError {
  code: number;
  message: string;
  data: {
    name: string;
    debug: string;
    message: string;
    arguments: string[];
    exception_type?: string;
  };
}

export interface OdooAuthResult {
  uid: number;
  name: string;
  username: string;
  partner_id: number;
  session_id: string;
  db: string;
  company_id: number;
  company_ids: number[];
  user_context: Record<string, unknown>;
}

// =============================================================================
// Fleet Module Types
// =============================================================================

export interface Vehicle {
  id?: number;
  name?: string;
  license_plate: string;
  model_id?: [number, string] | number | false;
  model_year?: string;
  driver_id?: [number, string] | number | false;
  fuel_type?: 'diesel' | 'gasoline' | 'full_hybrid' | 'electric' | 'plug_in_hybrid_diesel' | 'plug_in_hybrid_gasoline';
  odometer?: number;
  odometer_unit?: 'kilometers' | 'miles';
  acquisition_date?: string;
  car_value?: number;
  residual_value?: number;
  state_id?: [number, string] | number | false;
  active?: boolean;
  vin_sn?: string;
  color?: string;
  seats?: number;
  doors?: number;
  horsepower?: number;
  horsepower_tax?: number;
  power?: number;
  co2?: number;
  transmission?: 'manual' | 'automatic';
  category_id?: [number, string] | number | false;
  tag_ids?: number[];
  company_id?: [number, string] | number;
}

export interface VehicleCreateData {
  license_plate: string;
  model_id?: number;
  driver_id?: number;
  fuel_type?: Vehicle['fuel_type'];
  odometer?: number;
  acquisition_date?: string;
  car_value?: number;
  vin_sn?: string;
  color?: string;
  state_id?: number;
  active?: boolean;
}

// Vehicle update data extends partial VehicleCreateData
export type VehicleUpdateData = Partial<VehicleCreateData>;

export interface VehicleModel {
  id: number;
  name: string;
  brand_id: [number, string];
  vehicle_type?: string;
  seats?: number;
  doors?: number;
  horsepower?: number;
  power?: number;
  transmission?: 'manual' | 'automatic';
}

export interface VehicleBrand {
  id: number;
  name: string;
  image_128?: string;
}

export interface Driver {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company_id?: [number, string];
}

// =============================================================================
// API Response Wrappers
// =============================================================================

export interface ApiListResponse<T> {
  records: T[];
  length: number;
}

export interface ApiCreateResponse {
  id: number;
}

export interface ApiUpdateResponse {
  success: boolean;
}

export interface ApiDeleteResponse {
  success: boolean;
}

// =============================================================================
// Search Domain Types (Odoo ORM)
// =============================================================================

export type OdooDomainOperator = 
  | '=' | '!=' 
  | '>' | '>=' | '<' | '<=' 
  | 'like' | 'ilike' | 'not like' | 'not ilike'
  | 'in' | 'not in'
  | '=like' | '=ilike'
  | 'child_of' | 'parent_of';

export type OdooDomainCondition = [string, OdooDomainOperator, unknown];
export type OdooDomainLogical = '&' | '|' | '!';
export type OdooDomain = (OdooDomainCondition | OdooDomainLogical)[];

// =============================================================================
// Test Context Types
// =============================================================================

export interface ApiTestContext {
  lastResponse?: HttpResponse;
  createdIds: Map<string, number[]>;
  sessionData: Map<string, unknown>;
}

export default {
  // Export nothing as default, just types
};
