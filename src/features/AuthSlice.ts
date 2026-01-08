import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: null;
  token: string | null;
  isLoggedIn: boolean | null;
  refreshToken: string | null;
  userId: string | null;
  userRole: string | null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isLoggedIn: false,
    refreshToken: null,
    userId: null,
    userRole: null,
  } as AuthState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{
      token?: string;
      refreshToken?: string;
      userId?: string;
      userRole?: string;
    }>) => {
      const { token, refreshToken, userId, userRole } = action.payload;

      if (token !== undefined) {
        state.token = token;
      }
      if (refreshToken !== undefined) {
        state.refreshToken = refreshToken;
      }
      if (userId !== undefined) {
        state.userId = userId;
      }
      if (userRole !== undefined) {
        state.userRole = userRole;
      }
    },
    logOut: state => {
      state.user = null;
      state.token = null;
      state.isLoggedIn = false;
      state.refreshToken = null;
      state.userId = null;
      state.userRole = null;
    },
    logIn: state => {
      state.isLoggedIn = true;
    },
  },
});

export const { setCredentials, logOut, logIn } = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentUser = (state: { auth: AuthState }) =>
  state.auth.user;
export const selectCurrentToken = (state: { auth: AuthState }) =>
  state.auth.token;
export const selectCurrentUserId = (state: { auth: AuthState }) =>
  state.auth.userId;

