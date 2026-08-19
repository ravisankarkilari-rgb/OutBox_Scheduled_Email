import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const runOnce = useRef(false);

  useEffect(() => {
    if (runOnce.current) return;
    runOnce.current = true;

    const token = searchParams.get('token');

    if (token) {
      login(token)
        .then(() => {
          navigate('/dashboard', { replace: true });
        })
        .catch((error) => {
          console.error('[AuthCallback] Failed login via query token:', error);
          navigate('/login?error=token_exchange_failed', { replace: true });
        });
    } else {
      navigate('/login?error=missing_code', { replace: true });
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-[#FBFBF9] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-[#C84B26] animate-spin" />
      <h3 className="text-base font-extrabold text-[#141413] tracking-tight">Syncing secure session...</h3>
      <p className="text-xs text-[#8C8C85] font-mono-code">Completing Google authentication</p>
    </div>
  );
};
