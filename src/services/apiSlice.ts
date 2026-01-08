import {
  createApi,
  fetchBaseQuery,
} from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { BASE_URL } from '../configs';
import { getItem, setItem, removeItem, getTokenExpirationInfo, decodeJWT } from '../utils';
import { configs } from '../../config';
import { setCredentials, logOut } from '../features';

/* ------------------------------------------------------------------ */
/* Base query                                                          */
/* ------------------------------------------------------------------ */

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: async (headers) => {
    const token = await getItem('accessToken');
    if (token) {
      const tokenInfo = getTokenExpirationInfo(token);
      const decoded = decodeJWT(token);
            
      if (tokenInfo.expiresAt) {
        const expiresDate = new Date(tokenInfo.expiresAt * 1000);

        console.log('  - Is expired:', tokenInfo.isExpired);
        
        if (decoded && decoded.exp) {
          const duration = decoded.exp - (decoded.iat || decoded.exp);
          console.log('  - JWT duration:', duration, 'seconds');
        }
      } else {
        console.log('  - ⚠️ Could not decode token expiration');
      }
      
      headers.set('authorization', `Bearer ${token}`);
    } else {
      console.log('⚠️ [Request] No access token found');
    }
    return headers;
  },
});

/* ------------------------------------------------------------------ */
/* Refresh token mutex (prevents parallel refresh calls)               */
/* ------------------------------------------------------------------ */

let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;

/* ------------------------------------------------------------------ */
/* Helper: Check if error indicates token expiration                   */
/* ------------------------------------------------------------------ */

const isTokenExpiredError = (error: FetchBaseQueryError): boolean => {
  // Check for 401 (standard unauthorized)
  if (error.status === 401) {
    return true;
  }

  // Check for 400 with token expiration indicators
  if (error.status === 400 && 'data' in error && error.data) {
    try {
      let errorData: any;
      if (typeof error.data === 'string') {
        errorData = JSON.parse(error.data);
      } else {
        errorData = error.data;
      }
      
      // Check for FusionAuth token expiration indicators
      if (
        errorData?.error === 'invalid_token' ||
        errorData?.error_reason === 'access_token_expired' ||
        (errorData?.error_description && 
         typeof errorData.error_description === 'string' &&
         errorData.error_description.toLowerCase().includes('expired'))
      ) {
        return true;
      }
    } catch (e) {
      // If parsing fails, continue with other checks
      console.warn('Could not parse error data:', e);
    }
  }

  return false;
};

/* ------------------------------------------------------------------ */
/* Base query with re-auth                                             */
/* ------------------------------------------------------------------ */

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const requestUrl = typeof args === 'string' ? args : args.url;
  console.log('📡 [API Request] Making request to:', requestUrl);
  
  let result = await baseQuery(args, api, extraOptions);

  // Check if error indicates token expiration (401 or 400 with expired token message)
  if (result.error && isTokenExpiredError(result.error)) {
    const errorStatus = result.error.status;
    let errorData: any = null;
    
    if ('data' in result.error && result.error.data) {
      try {
        errorData = typeof result.error.data === 'string' 
          ? JSON.parse(result.error.data) 
          : result.error.data;
      } catch (e) {
        console.warn('Could not parse error data for logging:', e);
      }
    }
    
    console.log(`🔄 [Token Refresh] Access token expired (${errorStatus} error detected) - attempting automatic refresh...`);
    if (errorData) {
      console.log('ℹ️ [Token Refresh] Error details:', {
        error: errorData.error,
        error_description: errorData.error_description,
        error_reason: errorData.error_reason,
      });
    }
    
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        console.log('🔄 [Token Refresh] Starting token refresh process...');

        refreshPromise = (async () => {
          const refreshToken = await getItem('refreshToken');
          if (!refreshToken) {
            console.error('❌ [Token Refresh] No refresh token found');
            throw new Error('No refresh token');
          }

          // Log refresh token details
          console.log('🔑 [Token Refresh] Refresh token found, requesting new access token...');
          console.log('🔑 [Token Refresh] Refresh token details:');

          
          // Try to decode refresh token if it's a JWT
          const refreshTokenInfo = getTokenExpirationInfo(refreshToken);
          const decodedRefreshToken = decodeJWT(refreshToken);
          if (decodedRefreshToken) {
            console.log('  - Refresh token expiration info:');
            if (refreshTokenInfo.expiresAt) {
              const expiresDate = new Date(refreshTokenInfo.expiresAt * 1000);
              console.log('    - Expires at:', expiresDate.toISOString());
              console.log('    - Remaining seconds:', refreshTokenInfo.remainingSeconds);
              console.log('    - Is expired:', refreshTokenInfo.isExpired);
            }
           
          } else {
            
          }

          const tokenEndpoint =
            configs.fusionauth.serviceConfiguration?.tokenEndpoint;

          if (!tokenEndpoint) {
            console.error('❌ [Token Refresh] Token endpoint not configured');
            throw new Error('Token endpoint not configured');
          }

          const body = new URLSearchParams();
          body.append('grant_type', 'refresh_token');
          body.append('refresh_token', refreshToken);
          body.append('client_id', configs.fusionauth.clientId);
          body.append('client_secret', configs.fusionauth.clientSecret || '');

          console.log('📤 [Token Refresh] Sending refresh token request to:', tokenEndpoint);
         


          const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorData: any = null;
            try {
              errorData = JSON.parse(errorText);
            } catch (e) {
              errorData = errorText;
            }
            
            console.error('❌ [Token Refresh] Refresh token request failed with status:', response.status);
            console.error('❌ [Token Refresh] Response status text:', response.statusText);
            console.error('❌ [Token Refresh] Error response:', errorData);
            throw new Error('Refresh token request failed');
          }

          const data = await response.json();
          console.log('✅ [Token Refresh] New tokens received successfully');
          return data;
        })().finally(() => {
          isRefreshing = false;
          console.log('🔓 [Token Refresh] Refresh mutex released');
        });
      } else {
        console.log('⏳ [Token Refresh] Refresh already in progress, waiting...');
      }

      const refreshData = await refreshPromise;

      // Persist new tokens
      console.log('💾 [Token Refresh] Saving new access token to storage...');
      await setItem('accessToken', refreshData.access_token);
      console.log('✅ [Token Refresh] New access token saved:', refreshData.access_token.substring(0, 20) + '...');

      if (refreshData.refresh_token) {
        console.log('💾 [Token Refresh] Saving new refresh token to storage...');
        await setItem('refreshToken', refreshData.refresh_token);
        console.log('✅ [Token Refresh] New refresh token saved');
      }

      // Update redux auth state
      console.log('🔄 [Token Refresh] Updating Redux auth state...');
      api.dispatch(
        setCredentials({
          token: refreshData.access_token,
          refreshToken: refreshData.refresh_token,
        }),
      );
      console.log('✅ [Token Refresh] Redux auth state updated');

      // Retry original request
      console.log('🔄 [Token Refresh] Retrying original request with new token...');
      result = await baseQuery(args, api, extraOptions);
      
      // Log final result after retry
      if (result.error) {
        console.error('❌ [API Error] Request failed after token refresh:', {
          status: result.error.status,
          statusText: 'data' in result.error ? JSON.stringify(result.error.data) : 'No data',
          url: requestUrl,
        });
        if ('data' in result.error && result.error.data) {
          console.error('❌ [API Error] Error details:', JSON.stringify(result.error.data, null, 2));
        }
      } else {
       
      }
    } catch (error) {
      // Refresh failed → logout
      console.error('❌ [Token Refresh] Token refresh failed:', error);
      console.log('🚪 [Token Refresh] Logging out user...');
      await removeItem('accessToken');
      await removeItem('refreshToken');
      api.dispatch(logOut());
    }
  } else if (result.error) {
    // Log non-token-expiration errors
    console.error('❌ [API Error] Request failed:', {
      status: result.error.status,
      statusText: 'data' in result.error ? JSON.stringify(result.error.data) : 'No data',
      url: requestUrl,
    });
    
    // Log full error data if available
    if ('data' in result.error && result.error.data) {
      console.error('❌ [API Error] Error details:', JSON.stringify(result.error.data, null, 2));
    }
  } else {
    console.log('✅ [API Request] Request successful');
  }

  if (result.error && result.error.status === 400) {
    // Log 400 errors with token info (for non-expiration errors)
    // Only log if it's not a token expiration error (those are handled above)
    if (!isTokenExpiredError(result.error)) {
      const token = await getItem('accessToken');
      if (token) {
        const tokenInfo = getTokenExpirationInfo(token);
        console.error('🔴 [400 Error] Bad Request - Token status:', {
          isExpired: tokenInfo.isExpired,
          remainingSeconds: tokenInfo.remainingSeconds,
          expiresAt: tokenInfo.expiresAt ? new Date(tokenInfo.expiresAt * 1000).toISOString() : null,
        });
        
        const decoded = decodeJWT(token);
        if (decoded) {
          console.error('🔴 [400 Error] Token payload:', {
            exp: decoded.exp,
            iat: decoded.iat,
            duration: decoded.exp && decoded.iat ? decoded.exp - decoded.iat : null,
          });
        }
      }
    }
  }

  return result;
};

/* ------------------------------------------------------------------ */
/* API Slice                                                          */
/* ------------------------------------------------------------------ */

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [],
  endpoints: () => ({}),
});
