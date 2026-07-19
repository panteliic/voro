import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { authApi } from '../../services/authApi'
import type {
  AuthUser,
  LoginResponse,
  LoginRequest,
  LogoutRequest,
  RefreshTokenRequest,
  RequestPasswordResetRequest,
  ResendCodeRequest,
  ResetPasswordRequest,
  SignupRequest,
  VerifyEmailRequest,
  VerifyPasswordResetCodeRequest,
} from '../../types/auth'

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

type AuthState = {
  user: AuthUser | null
  accessToken: string
  refreshToken: string
  pendingEmail: string
  devCode: string
  loginStatus: RequestStatus
  refreshStatus: RequestStatus
  logoutStatus: RequestStatus
  requestPasswordResetStatus: RequestStatus
  verifyPasswordResetCodeStatus: RequestStatus
  resetPasswordStatus: RequestStatus
  signupStatus: RequestStatus
  verifyStatus: RequestStatus
  resendStatus: RequestStatus
  message: string
  error: string
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('voro_access_token') || '',
  refreshToken: localStorage.getItem('voro_refresh_token') || '',
  pendingEmail: '',
  devCode: '',
  loginStatus: 'idle',
  refreshStatus: 'idle',
  logoutStatus: 'idle',
  requestPasswordResetStatus: 'idle',
  verifyPasswordResetCodeStatus: 'idle',
  resetPasswordStatus: 'idle',
  signupStatus: 'idle',
  verifyStatus: 'idle',
  resendStatus: 'idle',
  message: '',
  error: '',
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export const signupUser = createAsyncThunk(
  'auth/signupUser',
  async (payload: SignupRequest, { rejectWithValue }) => {
    try {
      return await authApi.signup(payload)
    } catch (error) {
      return rejectWithValue(errorMessage(error))
    }
  },
)

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (payload: LoginRequest, { rejectWithValue }) => {
    try {
      return await authApi.login(payload)
    } catch (error) {
      return rejectWithValue(errorMessage(error))
    }
  },
)

export const refreshSession = createAsyncThunk(
  'auth/refreshSession',
  async (payload: RefreshTokenRequest, { rejectWithValue }) => {
    try {
      return await authApi.refresh(payload)
    } catch (error) {
      return rejectWithValue(errorMessage(error))
    }
  },
)

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (payload: LogoutRequest, { rejectWithValue }) => {
    try {
      return await authApi.logout(payload)
    } catch (error) {
      return rejectWithValue(errorMessage(error))
    }
  },
)

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (payload: RequestPasswordResetRequest, { rejectWithValue }) => {
    try {
      return await authApi.requestPasswordReset(payload)
    } catch (error) {
      return rejectWithValue(errorMessage(error))
    }
  },
)

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (payload: ResetPasswordRequest, { rejectWithValue }) => {
    try {
      return await authApi.resetPassword(payload)
    } catch (error) {
      return rejectWithValue(errorMessage(error))
    }
  },
)

export const verifyPasswordResetCode = createAsyncThunk(
  'auth/verifyPasswordResetCode',
  async (payload: VerifyPasswordResetCodeRequest, { rejectWithValue }) => {
    try {
      return await authApi.verifyPasswordResetCode(payload)
    } catch (error) {
      return rejectWithValue(errorMessage(error))
    }
  },
)

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (payload: VerifyEmailRequest, { rejectWithValue }) => {
    try {
      return await authApi.verifyEmail(payload)
    } catch (error) {
      return rejectWithValue(errorMessage(error))
    }
  },
)

export const resendCode = createAsyncThunk(
  'auth/resendCode',
  async (payload: ResendCodeRequest, { rejectWithValue }) => {
    try {
      return await authApi.resendCode(payload)
    } catch (error) {
      return rejectWithValue(errorMessage(error))
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthFeedback(state) {
      state.message = ''
      state.error = ''
    },
    setPendingEmail(state, action: { payload: string }) {
      state.pendingEmail = action.payload
    },
    logout(state) {
      state.user = null
      state.accessToken = ''
      state.refreshToken = ''
      localStorage.removeItem('voro_access_token')
      localStorage.removeItem('voro_refresh_token')
    },
    setAuthSession(state, action: { payload: LoginResponse }) {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.message = action.payload.message
      state.error = ''
      localStorage.setItem('voro_access_token', action.payload.accessToken)
      localStorage.setItem('voro_refresh_token', action.payload.refreshToken)
    },
    syncAuthTokens(state, action: { payload: Pick<LoginResponse, 'accessToken' | 'refreshToken'> }) {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      localStorage.setItem('voro_access_token', action.payload.accessToken)
      localStorage.setItem('voro_refresh_token', action.payload.refreshToken)
    },
    updateAuthUser(state, action: { payload: Partial<AuthUser> }) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loginStatus = 'loading'
        state.error = ''
        state.message = ''
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loginStatus = 'succeeded'
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        state.message = action.payload.message
        localStorage.setItem('voro_access_token', action.payload.accessToken)
        localStorage.setItem('voro_refresh_token', action.payload.refreshToken)
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loginStatus = 'failed'
        state.error = String(action.payload || 'Could not sign in.')
      })
      .addCase(refreshSession.pending, (state) => {
        state.refreshStatus = 'loading'
        state.error = ''
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.refreshStatus = 'succeeded'
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        localStorage.setItem('voro_access_token', action.payload.accessToken)
        localStorage.setItem('voro_refresh_token', action.payload.refreshToken)
      })
      .addCase(refreshSession.rejected, (state, action) => {
        state.refreshStatus = 'failed'
        state.error = String(action.payload || 'Could not refresh session.')
        state.user = null
        state.accessToken = ''
        state.refreshToken = ''
        localStorage.removeItem('voro_access_token')
        localStorage.removeItem('voro_refresh_token')
      })
      .addCase(logoutUser.pending, (state) => {
        state.logoutStatus = 'loading'
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.logoutStatus = 'succeeded'
        state.user = null
        state.accessToken = ''
        state.refreshToken = ''
        localStorage.removeItem('voro_access_token')
        localStorage.removeItem('voro_refresh_token')
      })
      .addCase(logoutUser.rejected, (state) => {
        state.logoutStatus = 'failed'
        state.user = null
        state.accessToken = ''
        state.refreshToken = ''
        localStorage.removeItem('voro_access_token')
        localStorage.removeItem('voro_refresh_token')
      })
      .addCase(requestPasswordReset.pending, (state) => {
        state.requestPasswordResetStatus = 'loading'
        state.error = ''
        state.message = ''
      })
      .addCase(requestPasswordReset.fulfilled, (state, action) => {
        state.requestPasswordResetStatus = 'succeeded'
        state.pendingEmail = action.payload.email
        state.devCode = action.payload.devCode || ''
        state.message = action.payload.devCode
          ? `Dev reset code: ${action.payload.devCode}`
          : action.payload.message
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.requestPasswordResetStatus = 'failed'
        state.error = String(action.payload || 'Could not send reset code.')
      })
      .addCase(verifyPasswordResetCode.pending, (state) => {
        state.verifyPasswordResetCodeStatus = 'loading'
        state.error = ''
      })
      .addCase(verifyPasswordResetCode.fulfilled, (state, action) => {
        state.verifyPasswordResetCodeStatus = 'succeeded'
        state.pendingEmail = action.payload.email
        state.message = action.payload.message
        state.error = ''
      })
      .addCase(verifyPasswordResetCode.rejected, (state, action) => {
        state.verifyPasswordResetCodeStatus = 'failed'
        state.error = String(action.payload || 'Could not verify reset code.')
      })
      .addCase(resetPassword.pending, (state) => {
        state.resetPasswordStatus = 'loading'
        state.error = ''
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.resetPasswordStatus = 'succeeded'
        state.message = action.payload.message
        state.error = ''
        state.devCode = ''
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.resetPasswordStatus = 'failed'
        state.error = String(action.payload || 'Could not reset password.')
      })
      .addCase(signupUser.pending, (state) => {
        state.signupStatus = 'loading'
        state.error = ''
        state.message = ''
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.signupStatus = 'succeeded'
        state.pendingEmail = action.payload.email
        state.devCode = action.payload.devCode || ''
        state.message = action.payload.devCode
          ? `Dev code: ${action.payload.devCode}`
          : action.payload.message
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.signupStatus = 'failed'
        state.error = String(action.payload || 'Could not create account.')
      })
      .addCase(verifyEmail.pending, (state) => {
        state.verifyStatus = 'loading'
        state.error = ''
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.verifyStatus = 'succeeded'
        state.message = action.payload.message
        state.error = ''
        state.devCode = ''
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.verifyStatus = 'failed'
        state.error = String(action.payload || 'Could not verify email.')
      })
      .addCase(resendCode.pending, (state) => {
        state.resendStatus = 'loading'
        state.error = ''
      })
      .addCase(resendCode.fulfilled, (state, action) => {
        state.resendStatus = 'succeeded'
        state.devCode = action.payload.devCode || ''
        state.message = action.payload.devCode
          ? `New dev code: ${action.payload.devCode}`
          : action.payload.message
      })
      .addCase(resendCode.rejected, (state, action) => {
        state.resendStatus = 'failed'
        state.error = String(action.payload || 'Could not resend code.')
      })
  },
})

export const { clearAuthFeedback, logout, setAuthSession, setPendingEmail, syncAuthTokens, updateAuthUser } =
  authSlice.actions
export const authReducer = authSlice.reducer
