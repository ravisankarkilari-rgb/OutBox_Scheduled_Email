import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { SmtpSettings } from '../types';

interface SmtpSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const SmtpSettingsModal = ({ 
  isOpen, 
  onClose, 
  onSaved 
}: SmtpSettingsModalProps) => {
  const [smtpEmail, setSmtpEmail] = useState('');
  const [smtpAppPassword, setSmtpAppPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await api.get<SmtpSettings>('/emails/smtp-settings');
      if (res.data.smtpEmail) {
        setSmtpEmail(res.data.smtpEmail);
      }
    } catch (err: any) {
      console.error('[SMTP Settings] Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!smtpEmail || !smtpAppPassword) {
      setMessage({ type: 'error', text: 'Please enter both your Gmail address and 16-character App Password to test.' });
      return;
    }

    setIsTesting(true);
    setMessage(null);
    try {
      const res = await api.post('/emails/smtp-test', {
        smtpEmail: smtpEmail.trim(),
        smtpAppPassword: smtpAppPassword.replace(/\s+/g, ''),
      });
      setMessage({ type: 'success', text: res.data.message || 'SMTP connection verified successfully!' });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Connection failed. Please check your email and 16-character App Password.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpEmail || !smtpAppPassword) {
      setMessage({ type: 'error', text: 'Both Gmail address and App Password are required.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await api.put('/emails/smtp-settings', {
        smtpEmail: smtpEmail.trim(),
        smtpAppPassword: smtpAppPassword.replace(/\s+/g, ''),
      });
      setMessage({ type: 'success', text: 'Custom sender credentials saved successfully!' });
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to save SMTP settings.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#141413]/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#E8E8E2] shadow-paper-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#E8E8E2] bg-[#FAFAF8]">
          <div>
            <span className="text-[10px] font-bold text-[#C84B26] uppercase tracking-widest font-mono-code block">
              Preferences
            </span>
            <h2 className="text-lg font-extrabold text-[#141413] tracking-tight font-sans">
              Sender Configuration
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F0F0EB] text-[#8C8C85] hover:text-[#141413] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-[#C84B26] animate-spin" />
            <p className="text-xs text-[#8C8C85] font-mono-code">Loading settings...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-7 space-y-5">
            
            {/* Automatic Delivery Banner */}
            <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#15803D]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs text-[#141413]">Automatic Delivery Engine Active</h3>
                    <span className="text-[9px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D]">
                      Online
                    </span>
                  </div>
                  <p className="text-xs text-[#5C5C58] mt-1 leading-relaxed">
                    Emails are delivered automatically via the verified server SMTP engine. All campaigns send with <strong>zero manual configuration required</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Notification alert */}
            {message && (
              <div className={`p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 ${
                message.type === 'success' 
                  ? 'bg-[#F0FDF4] border border-[#DCFCE7] text-[#15803D]' 
                  : 'bg-[#FDF2EE] border border-[#F5C7B8] text-[#C84B26]'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#C84B26] shrink-0 mt-0.5" />
                )}
                <span className="flex-1">{message.text}</span>
              </div>
            )}

            {/* Optional Custom SMTP Form */}
            <div className="pt-2 border-t border-[#E8E8E2]">
              <span className="text-[11px] font-bold text-[#6B6B66] uppercase tracking-wider font-mono-code block mb-1">
                Optional: Custom Sender Account
              </span>
              <p className="text-xs text-[#8C8C85] mb-4 leading-relaxed">
                If you want your emails to send from a specific personal Gmail address, configure it below:
              </p>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label htmlFor="smtpEmail" className="block text-[11px] font-bold text-[#6B6B66] uppercase tracking-wider font-mono-code mb-1">
                    Gmail Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C8C85]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      id="smtpEmail"
                      placeholder="yourname@gmail.com"
                      value={smtpEmail}
                      onChange={(e) => setSmtpEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAF8] border border-[#E2E2DC] rounded-xl text-xs text-[#141413] focus:outline-none focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C84B26]/10 focus:border-[#C84B26] transition-all font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="smtpAppPassword" className="block text-[11px] font-bold text-[#6B6B66] uppercase tracking-wider font-mono-code mb-1">
                    Google App Password (16 characters)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C8C85]">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      id="smtpAppPassword"
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={smtpAppPassword}
                      onChange={(e) => setSmtpAppPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAF8] border border-[#E2E2DC] rounded-xl text-xs text-[#141413] focus:outline-none focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C84B26]/10 focus:border-[#C84B26] transition-all font-mono-code"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || isSaving}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 border border-[#E2E2DC] text-xs font-semibold rounded-full text-[#5C5C58] bg-[#FFFFFF] hover:bg-[#F5F5F0] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Testing...</span>
                      </>
                    ) : (
                      <span>Test Connection</span>
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving || isTesting || !smtpEmail || !smtpAppPassword}
                    className="flex items-center gap-1.5 bg-[#C84B26] hover:bg-[#B23E1B] text-[#FFFFFF] text-xs font-bold py-2 px-5 rounded-full shadow-paper-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Account</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
