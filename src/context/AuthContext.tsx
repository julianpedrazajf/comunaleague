import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { User } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profileComplete: boolean;
}

type AuthAction =
  | { type: 'SET_SESSION'; payload: Session | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PROFILE_COMPLETE'; payload: boolean }
  | { type: 'SIGN_OUT' };

const initialState: AuthState = {
  session: null,
  user: null,
  loading: true,
  profileComplete: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, session: action.payload, loading: false };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_PROFILE_COMPLETE':
      return { ...state, profileComplete: action.payload };
    case 'SIGN_OUT':
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  setProfileComplete: (complete: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function checkProfileExists(userId: string): Promise<boolean> {
  const { data } = await supabase.from('users').select('id').eq('id', userId).single();
  return !!data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // INITIAL_SESSION fires on app start with any stored session.
    // SIGNED_IN fires when the user explicitly signs in or registers.
    // Both need a profile check. TOKEN_REFRESHED and USER_UPDATED do not.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
          const complete = await checkProfileExists(session.user.id);
          dispatch({ type: 'SET_PROFILE_COMPLETE', payload: complete });
        }
        if (!session) {
          dispatch({ type: 'SET_PROFILE_COMPLETE', payload: false });
        }
        dispatch({ type: 'SET_SESSION', payload: session });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    dispatch({ type: 'SIGN_OUT' });
  }

  function setProfileComplete(complete: boolean) {
    dispatch({ type: 'SET_PROFILE_COMPLETE', payload: complete });
  }

  return (
    <AuthContext.Provider value={{ ...state, signOut, setProfileComplete }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
