import { apiSlice } from './apiSlice';

export interface UserInfo {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export const userApi = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getUserInfo: builder.query<UserInfo, void>({
      query: () => '/oauth2/userinfo',
    }),
  }),
});

export const { useGetUserInfoQuery, useLazyGetUserInfoQuery } = userApi;

