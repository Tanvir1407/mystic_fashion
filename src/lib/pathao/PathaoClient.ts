import prisma from "@/lib/prisma";

/**
 * Pathao Courier Merchant API Client
 * This module handles all communications with the Pathao API, including token management and caching.
 */

export interface PathaoTokenRequest {
  client_id: string;
  client_secret: string;
  grant_type: 'password' | 'refresh_token';
  username?: string;
  password?: string;
  refresh_token?: string;
}

export interface PathaoTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export interface PathaoErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

export interface PathaoCity {
  city_id: number;
  city_name: string;
}

export interface PathaoZone {
  zone_id: number;
  zone_name: string;
}

export interface PathaoArea {
  area_id: number;
  area_name: string;
}

export interface PathaoStore {
  store_id: number;
  store_name: string;
}

export interface PathaoOrderPayload {
  store_id: number;
  merchant_order_id?: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: number;
  recipient_zone: number;
  recipient_area?: number;
  delivery_type: number; // 48: normal, 12: on demand
  item_type: number; // 1: document, 2: parcel
  special_instruction?: string;
  item_quantity: number;
  item_weight: number;
  amount_to_collect: number;
  item_description?: string;
}

export interface PathaoOrderResponse {
  consignment_id: string;
  order_status: string;
}

class PathaoClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private username: string;
  private password: string;

  constructor() {
    this.baseUrl = process.env.PATHAO_BASE_URL || 'https://courier-api-sandbox.pathao.com';
    this.clientId = process.env.PATHAO_CLIENT_ID || '';
    this.clientSecret = process.env.PATHAO_CLIENT_SECRET || '';
    this.username = process.env.PATHAO_USERNAME || '';
    this.password = process.env.PATHAO_PASSWORD || '';

    if (!this.clientId || !this.clientSecret || !this.username || !this.password) {
      console.warn(
        '[PathaoClient] Missing credentials. Please check your .env file for PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, and PATHAO_PASSWORD.'
      );
    }
  }

  /**
   * Generates a new access token using the password grant type.
   */
  async issueToken(): Promise<PathaoTokenResponse> {
    const endpoint = `${this.baseUrl}/aladdin/api/v1/issue-token`;

    const payload: PathaoTokenRequest = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'password',
      username: this.username,
      password: this.password,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as PathaoErrorResponse;
        throw new Error(errorData.message || `Pathao API Error: ${response.status} ${response.statusText}`);
      }

      const tokenData = data as PathaoTokenResponse;
      await this.upsertToken(tokenData);

      return tokenData;
    } catch (error) {
      console.error('[PathaoClient] Token Generation Failed (Password Grant):', error);
      if (error instanceof Error) throw error;
      throw new Error('An unknown error occurred during token generation');
    }
  }

  /**
   * Refreshes the access token using a refresh token.
   */
  async issueTokenFromRefresh(refreshToken: string): Promise<PathaoTokenResponse> {
    const endpoint = `${this.baseUrl}/aladdin/api/v1/issue-token`;

    const payload: PathaoTokenRequest = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as PathaoErrorResponse;
        throw new Error(errorData.message || `Pathao Refresh Error: ${response.status}`);
      }

      const tokenData = data as PathaoTokenResponse;
      await this.upsertToken(tokenData);

      return tokenData;
    } catch (error) {
      console.error('[PathaoClient] Token Refresh Failed:', error);
      throw error;
    }
  }

  /**
   * Saves or updates the token in the database.
   */
  private async upsertToken(tokenData: PathaoTokenResponse) {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    try {
      await prisma.apiToken.upsert({
        where: { id: 'pathao' },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: expiresAt,
        },
        create: {
          id: 'pathao',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: expiresAt,
        },
      });
    } catch (error) {
      console.error('[PathaoClient] Database Upsert Failed:', error);
      // We don't throw here to allow the application to proceed with the current token
    }
  }

  /**
   * Single source of truth for getting a valid access token.
   * Handles caching, expiration checks, and auto-refresh logic.
   */
  async getValidAccessToken(): Promise<string> {
    try {
      // 1. Fetch stored token from database
      const storedToken = await prisma.apiToken.findUnique({
        where: { id: 'pathao' },
      });

      if (storedToken) {
        const bufferTime = 5 * 60 * 1000; // 5 minute safety buffer
        const isExpired = new Date(Date.now() + bufferTime) > storedToken.expiresAt;

        // 2. If token exists and is valid, return it
        if (!isExpired) {
          return storedToken.accessToken;
        }

        // 3. If expired but has refresh token, attempt refresh
        if (storedToken.refreshToken) {
          try {
            console.log('[PathaoClient] Token expired, attempting refresh...');
            const refreshed = await this.issueTokenFromRefresh(storedToken.refreshToken);
            return refreshed.access_token;
          } catch (refreshError) {
            console.error('[PathaoClient] Refresh failed, falling back to password grant');
          }
        }
      }

      // 4. Fallback to password grant if no token or refresh failed
      console.log('[PathaoClient] Requesting fresh token via password grant...');
      const freshToken = await this.issueToken();
      return freshToken.access_token;
    } catch (error) {
      console.error('[PathaoClient] getValidAccessToken Error:', error);
      // Last resort fallback
      const freshToken = await this.issueToken();
      return freshToken.access_token;
    }
  }

  /**
   * Fetches the list of cities from Pathao.
   */
  async getCities(): Promise<PathaoCity[]> {
    const token = await this.getValidAccessToken();
    const endpoint = `${this.baseUrl}/aladdin/api/v1/city-list`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch cities');
      return data.data.data;
    } catch (error) {
      console.error('[PathaoClient] getCities Error:', error);
      throw error;
    }
  }

  /**
   * Fetches the list of zones for a given city from Pathao.
   */
  async getZones(cityId: number): Promise<PathaoZone[]> {
    const token = await this.getValidAccessToken();
    const endpoint = `${this.baseUrl}/aladdin/api/v1/cities/${cityId}/zone-list`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch zones');
      return data.data.data;
    } catch (error) {
      console.error('[PathaoClient] getZones Error:', error);
      throw error;
    }
  }

  /**
   * Fetches the list of areas for a given zone from Pathao.
   */
  async getAreas(zoneId: number): Promise<PathaoArea[]> {
    const token = await this.getValidAccessToken();
    const endpoint = `${this.baseUrl}/aladdin/api/v1/zones/${zoneId}/area-list`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch areas');
      return data.data.data;
    } catch (error) {
      console.error('[PathaoClient] getAreas Error:', error);
      throw error;
    }
  }

  /**
   * Fetches the list of stores for the merchant.
   */
  async getStores(): Promise<PathaoStore[]> {
    const token = await this.getValidAccessToken();
    const endpoint = `${this.baseUrl}/aladdin/api/v1/stores`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch stores');
      return data.data.data;
    } catch (error) {
      console.error('[PathaoClient] getStores Error:', error);
      throw error;
    }
  }

  /**
   * Creates a new order in Pathao.
   */
  async createOrder(payload: PathaoOrderPayload): Promise<PathaoOrderResponse> {
    const token = await this.getValidAccessToken();
    const endpoint = `${this.baseUrl}/aladdin/api/v1/orders`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[PathaoClient] Create Order API Error:', data);
        throw new Error(data.message || 'Failed to create Pathao order');
      }

      return data.data as PathaoOrderResponse;
    } catch (error) {
      console.error('[PathaoClient] createOrder Error:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const pathaoClient = new PathaoClient();
