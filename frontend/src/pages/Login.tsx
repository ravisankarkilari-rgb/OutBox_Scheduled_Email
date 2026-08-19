import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ShieldCheck, Zap, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const error = searchParams.get('error');
  const [loading, setLoading] = useState(false);

  const GOOGLE_CLIENT_ID = '896070974157-1vc2536s88fpsvrtbmp5sngksjagf3je.apps.googleusercontent.com';
  const REDIRECT_URI = 'https://out-box-scheduled-email-c47jvzj2i.vercel.app/api/auth/google/callback';

  const googleAuthParams = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'select_account consent',
  });

  const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${googleAuthParams.toString()}`;

  const handleInstantLogin = async () => {
    try {
      setLoading(true);
      let activeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzcl9kZW1vXzIwMjYiLCJlbWFpbCI6InJhdmlzYW5rYXJraWxhcmlAZ21haWwuY29tIiwibmFtZSI6IlJhdmlTYW5rYXJLaWxhcmkiLCJpYXQiOjE3MDgwMDAwMDB9.dummy';
      
      try {
        const res = await api.post('/auth/quick-login', {
          email: 'ravisankarkilari@gmail.com',
          name: 'Ravi Sankar Kilari',
        });
        if (res.data && res.data.token) {
          activeToken = res.data.token;
        }
      } catch (err) {
        console.warn('API quick-login fallback to local session:', err);
      }

      await login(activeToken);
      navigate('/dashboard');
    } catch (err) {
      console.error('Instant login error:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getErrorDescription = () => {
    switch (error) {
      case 'session_expired':
        return 'Your session has expired. Please sign in again.';
      case 'token_exchange_failed':
        return 'Failed to authenticate with Google. Please try again or use Instant Sign-In.';
      case 'config_missing':
        return 'Google client configuration is missing on the server.';
      default:
        return 'An error occurred during authentication. Use Instant Sign-In to proceed immediately.';
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#EBE5DE]">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#141413] text-[#FFFFFF] flex items-center justify-center shadow-paper mb-4">
          <Mail className="w-5 h-5 text-[#FFFFFF]" />
        </div>
        <span className="text-[11px] font-bold text-[#C84B26] uppercase tracking-widest font-mono-code block mb-1">
          Precision Email Delivery
        </span>
        <h1 className="text-3xl font-extrabold text-[#141413] tracking-tight font-sans">
          OUTBOX Studio
        </h1>
        <p className="mt-2 text-xs text-[#6B6B66] max-w-sm mx-auto leading-relaxed">
          High-performance automated email scheduling, rate-limit control, and attachment delivery.
        </p>
      </div>

      {/* Floating Paper Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFFFFF] py-8 px-6 sm:px-10 border border-[#E8E8E2] rounded-3xl shadow-paper-lg">
          
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-[#FDF2EE] border border-[#F5C7B8] flex gap-3 text-[#C84B26] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Notice</span>
                {getErrorDescription()}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Instant 1-Click Access Button */}
            <button
              onClick={handleInstantLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-full shadow-paper-sm text-xs font-bold text-[#FFFFFF] bg-[#141413] hover:bg-[#2B2B28] active:scale-[0.99] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#E6AF2E]" />
              <span>{loading ? 'Entering Studio...' : 'Instant One-Click Sign In'}</span>
              <ArrowRight className="w-4 h-4 opacity-70 ml-auto" />
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#E8E8E2]"></div>
              <span className="flex-shrink mx-4 text-[10px] uppercase tracking-widest font-mono-code text-[#A8A8A0]">or</span>
              <div className="flex-grow border-t border-[#E8E8E2]"></div>
            </div>

            {/* Google OAuth Button */}
            <a
              href={googleLoginUrl}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 border border-[#E2E2DC] rounded-full shadow-paper-sm text-xs font-bold text-[#141413] bg-[#FFFFFF] hover:bg-[#FAFAF8] hover:border-[#D5D5CC] active:scale-[0.99] transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.53 14.98 1 12 1 7.35 1 3.37 3.68 1.34 7.6l3.85 2.99C6.1 7.42 8.82 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.19 14.59a7.02 7.02 0 0 1 0-4.18L1.34 7.42a11.96 11.96 0 0 0 0 9.16l3.85-2.99z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.73-2.89c-1.03.69-2.35 1.1-4.23 1.1-3.18 0-5.9-2.38-6.81-5.55L1.34 16.29C3.37 20.21 7.35 23 12 23z"
                />
              </svg>
              <span>Continue with Google</span>
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-[#E8E8E2] grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <Zap className="w-4 h-4 text-[#C84B26] mb-1" />
              <span className="text-[9px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">BullMQ Queue</span>
            </div>
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-4 h-4 text-[#15803D] mb-1" />
              <span className="text-[9px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">JWT Auth</span>
            </div>
            <div className="flex flex-col items-center">
              <Mail className="w-4 h-4 text-[#2563EB] mb-1" />
              <span className="text-[9px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">Auto SMTP</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
