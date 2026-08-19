import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Loader2,
  User,
  Paperclip,
  File,
  FileImage,
  FileVideo,
  FileText,
  Send
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EmailAttachment } from '../types';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: () => void;
  onOpenSettings?: () => void;
}

interface ParsingSummary {
  valid: string[];
  invalid: string[];
  duplicates: string[];
}

interface SelectedAttachment extends EmailAttachment {
  size: number;
}

export const ComposeEmailModal = ({ 
  isOpen, 
  onClose, 
  onCampaignCreated,
}: ComposeEmailModalProps) => {
  const { user } = useAuth();
  const [senderName, setSenderName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  
  // Attachments state
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
  const [isReadingAttachments, setIsReadingAttachments] = useState(false);

  // Recipients states
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientsText, setRecipientsText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsingSummary, setParsingSummary] = useState<ParsingSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Total attachment size in bytes
  const totalAttachmentBytes = attachments.reduce((sum, att) => sum + att.size, 0);
  const maxBytes = 25 * 1024 * 1024; // 25 MB max
  const isOverSizeLimit = totalAttachmentBytes > maxBytes;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Default start time to 2 minutes in the future on open
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 2);
      const offsetMs = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
      setStartTime(localISOTime);
      
      setSenderName(user?.name || '');
      setSubject('');
      setBody('');
      setDelayBetweenEmails(2);
      setHourlyLimit(200);
      setAttachments([]);
      setRecipients([]);
      setRecipientsText('');
      setFileName('');
      setParsingSummary(null);
      setErrorMessage('');
    }
  }, [isOpen, user]);

  // Reactive recipient parser
  useEffect(() => {
    if (!recipientsText.trim()) {
      setRecipients([]);
      setParsingSummary(null);
      return;
    }

    const tokens = recipientsText.split(/[\n\r,;]+/);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const valid: string[] = [];
    const invalid: string[] = [];
    const duplicates: string[] = [];
    const seen = new Set<string>();

    tokens.forEach((token) => {
      const cleaned = token.trim();
      if (!cleaned || cleaned.toLowerCase() === 'email') return;

      if (emailRegex.test(cleaned)) {
        if (seen.has(cleaned)) {
          duplicates.push(cleaned);
        } else {
          seen.add(cleaned);
          valid.push(cleaned);
        }
      } else {
        invalid.push(cleaned);
      }
    });

    setRecipients(valid);
    setParsingSummary({
      valid,
      invalid,
      duplicates,
    });
  }, [recipientsText]);

  if (!isOpen) return null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRecipientsText(text);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the uploaded recipient list file.');
    };
    reader.readAsText(file);
  };

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsReadingAttachments(true);
    setErrorMessage('');

    const newAttachments: SelectedAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const resultStr = reader.result as string;
            const commaIndex = resultStr.indexOf(',');
            const base64Data = commaIndex !== -1 ? resultStr.slice(commaIndex + 1) : resultStr;
            resolve(base64Data);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          content: base64,
          size: file.size,
        });
      } catch (err) {
        console.error(`Failed to process file ${file.name}:`, err);
        setErrorMessage(`Failed to read file: ${file.name}`);
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsReadingAttachments(false);
    event.target.value = '';
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const getAttachmentIcon = (contentType?: string, filename?: string) => {
    const type = contentType?.toLowerCase() || '';
    const name = filename?.toLowerCase() || '';

    if (type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      return <FileImage className="w-3.5 h-3.5 text-[#15803D] shrink-0" />;
    }
    if (type.startsWith('video/') || name.match(/\.(mp4|mov|avi|mkv|webm)$/)) {
      return <FileVideo className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />;
    }
    if (type.includes('pdf') || type.includes('document') || name.match(/\.(pdf|doc|docx|txt|xlsx)$/)) {
      return <FileText className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />;
    }
    return <File className="w-3.5 h-3.5 text-[#6B6B66] shrink-0" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (recipients.length === 0) {
      setErrorMessage('Please provide at least one valid recipient (typed or uploaded via file).');
      return;
    }

    if (isOverSizeLimit) {
      setErrorMessage('Total attachment size exceeds the 25 MB email delivery limit.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/emails/schedule', {
        subject,
        body,
        senderName: senderName.trim() || undefined,
        attachments: attachments.map(({ filename, contentType, content }) => ({
          filename,
          contentType,
          content,
        })),
        recipients,
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmails,
        hourlyLimit,
      });

      onCampaignCreated();
      onClose();
    } catch (err: any) {
      console.error(err);
      const apiErr = err.response?.data?.error || 'Failed to schedule campaign. Please try again.';
      setErrorMessage(apiErr);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Warm Blur Backdrop */}
      <div className="fixed inset-0 bg-[#141413]/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Card */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#E8E8E2] shadow-paper-xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#E8E8E2] bg-[#FAFAF8]">
          <div>
            <span className="text-[10px] font-bold text-[#C84B26] uppercase tracking-widest font-mono-code block">
              Outbox Composer
            </span>
            <h2 className="text-lg font-extrabold text-[#141413] tracking-tight font-sans">
              Create Email Campaign
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#F0F0EB] text-[#8C8C85] hover:text-[#141413] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-7 space-y-5">
          
          {errorMessage && (
            <div className="p-4 bg-[#FDF2EE] border border-[#F5C7B8] text-[#C84B26] text-xs rounded-2xl">
              <span className="font-bold">Error: </span> {errorMessage}
            </div>
          )}

          {/* Delivery Identity Badge */}
          <div className="p-3.5 bg-[#F5F5F0] border border-[#E8E8E2] rounded-2xl flex items-center justify-between gap-3 text-xs text-[#5C5C58]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#15803D]"></div>
              <span>
                Dispatch Identity: <strong className="text-[#141413]">{senderName || user?.name || 'User'}</strong>
              </span>
            </div>
            <span className="text-[10px] font-mono-code text-[#15803D] bg-[#F0FDF4] border border-[#DCFCE7] px-2.5 py-0.5 rounded-full font-bold">
              System Ready
            </span>
          </div>

          {/* Sender Name & Subject */}
          <div className="space-y-4">
            <div>
              <label htmlFor="senderName" className="block text-[11px] font-bold text-[#6B6B66] uppercase tracking-wider font-mono-code mb-1.5">
                Sender Name (Displayed in inbox)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8C8C85]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="senderName"
                  placeholder="e.g. Ravi Sankar Kilari"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAF8] border border-[#E2E2DC] rounded-xl text-sm text-[#141413] focus:outline-none focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C84B26]/10 focus:border-[#C84B26] transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className="block text-[11px] font-bold text-[#6B6B66] uppercase tracking-wider font-mono-code mb-1.5">
                Email Subject
              </label>
              <input
                type="text"
                id="subject"
                required
                placeholder="Enter campaign subject line..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAFAF8] border border-[#E2E2DC] rounded-xl text-sm text-[#141413] focus:outline-none focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C84B26]/10 focus:border-[#C84B26] transition-all font-sans"
              />
            </div>

            <div>
              <label htmlFor="body" className="block text-[11px] font-bold text-[#6B6B66] uppercase tracking-wider font-mono-code mb-1.5">
                Email Body Text
              </label>
              <textarea
                id="body"
                required
                rows={4}
                placeholder="Write your email body copy here..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAFAF8] border border-[#E2E2DC] rounded-xl text-sm text-[#141413] focus:outline-none focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C84B26]/10 focus:border-[#C84B26] transition-all font-sans leading-relaxed"
              />
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-[#6B6B66] uppercase tracking-wider font-mono-code flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-[#C84B26]" />
                Media & File Attachments
              </label>
              {attachments.length > 0 && (
                <span className={`text-[10px] font-mono-code font-bold ${isOverSizeLimit ? 'text-[#C84B26]' : 'text-[#8C8C85]'}`}>
                  {formatFileSize(totalAttachmentBytes)} / 25 MB
                </span>
              )}
            </div>

            {/* Attached files chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-[#FAFAF8] rounded-2xl border border-[#E8E8E2]">
                {attachments.map((att, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#FFFFFF] rounded-full border border-[#E2E2DC] shadow-paper-sm text-xs"
                  >
                    {getAttachmentIcon(att.contentType, att.filename)}
                    <span className="font-semibold text-[#141413] truncate max-w-[150px]" title={att.filename}>
                      {att.filename}
                    </span>
                    <span className="text-[10px] text-[#8C8C85] font-mono-code">
                      ({formatFileSize(att.size)})
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-[#8C8C85] hover:text-[#C84B26] p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Area */}
            <div className="relative border border-dashed border-[#D5D5CC] rounded-2xl p-3.5 flex items-center justify-center gap-2 hover:bg-[#FAFAF8] hover:border-[#C84B26]/50 transition-all cursor-pointer text-center">
              <input
                type="file"
                multiple
                onChange={handleAttachmentUpload}
                disabled={isReadingAttachments}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {isReadingAttachments ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-[#C84B26]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing files...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-[#6B6B66]">
                  <Paperclip className="w-3.5 h-3.5 text-[#C84B26]" />
                  <span>Attach Photos, Videos, PDFs, or Documents</span>
                </div>
              )}
            </div>
          </div>

          {/* Recipients Section */}
          <div className="space-y-3">
            <div>
              <label htmlFor="recipients" className="block text-[11px] font-bold text-[#6B6B66] uppercase tracking-wider font-mono-code mb-1.5">
                Recipients (Type email addresses)
              </label>
              <textarea
                id="recipients"
                rows={2}
                placeholder="Enter recipient emails (e.g. friend@example.com). Separate with commas or newlines."
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FAFAF8] border border-[#E2E2DC] rounded-xl text-sm text-[#141413] focus:outline-none focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#C84B26]/10 focus:border-[#C84B26] transition-all font-sans"
              />
            </div>

            <div>
              <div className="border border-dashed border-[#D5D5CC] rounded-2xl p-2.5 flex items-center justify-center text-center hover:bg-[#FAFAF8] transition-colors relative cursor-pointer h-12">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex items-center gap-2 text-[#6B6B66]">
                  <Upload className="w-3.5 h-3.5 text-[#C84B26]" />
                  <span className="text-xs font-semibold">
                    {fileName ? `Uploaded: ${fileName}` : 'Or load a list file (.csv / .txt)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Parsing Summary Cards */}
          {parsingSummary && (
            <div className="grid grid-cols-3 gap-2 p-2 bg-[#FAFAF8] rounded-2xl border border-[#E8E8E2]">
              <div className="text-center p-2 bg-[#FFFFFF] rounded-xl border border-[#E8E8E2]">
                <span className="block text-base font-bold text-[#15803D] font-mono-code">{parsingSummary.valid.length}</span>
                <span className="text-[9px] font-bold text-[#8C8C85] uppercase tracking-wider">Valid Emails</span>
              </div>
              <div className="text-center p-2 bg-[#FFFFFF] rounded-xl border border-[#E8E8E2]">
                <span className="block text-base font-bold text-[#B45309] font-mono-code">{parsingSummary.duplicates.length}</span>
                <span className="text-[9px] font-bold text-[#8C8C85] uppercase tracking-wider">Duplicates</span>
              </div>
              <div className="text-center p-2 bg-[#FFFFFF] rounded-xl border border-[#E8E8E2]">
                <span className="block text-base font-bold text-[#C84B26] font-mono-code">{parsingSummary.invalid.length}</span>
                <span className="text-[9px] font-bold text-[#8C8C85] uppercase tracking-wider">Invalid</span>
              </div>
            </div>
          )}

          {/* Delivery Timing & Rate Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="startTime" className="block text-[10px] font-bold text-[#6B6B66] uppercase tracking-wider font-mono-code mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                id="startTime"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAF8] border border-[#E2E2DC] rounded-xl text-xs text-[#141413] focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C84B26]"
              />
            </div>

            <div>
              <label htmlFor="delay" className="block text-[10px] font-bold text-[#6B6B66] uppercase tracking-wider font-mono-code mb-1">
                Spacing (Seconds)
              </label>
              <input
                type="number"
                id="delay"
                required
                min={0}
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-[#FAFAF8] border border-[#E2E2DC] rounded-xl text-xs text-[#141413] focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C84B26]"
              />
            </div>

            <div>
              <label htmlFor="limit" className="block text-[10px] font-bold text-[#6B6B66] uppercase tracking-wider font-mono-code mb-1">
                Hourly Limit
              </label>
              <input
                type="number"
                id="limit"
                required
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-[#FAFAF8] border border-[#E2E2DC] rounded-xl text-xs text-[#141413] focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C84B26]"
              />
            </div>
          </div>

        </form>

        {/* Modal Footer */}
        <div className="px-7 py-4 border-t border-[#E8E8E2] bg-[#FAFAF8] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-[#E2E2DC] text-xs font-semibold rounded-full text-[#5C5C58] bg-[#FFFFFF] hover:bg-[#F5F5F0] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || isOverSizeLimit || isReadingAttachments}
            className="flex items-center gap-2 bg-[#C84B26] hover:bg-[#B23E1B] active:scale-[0.98] text-[#FFFFFF] text-xs font-bold py-2.5 px-6 rounded-full shadow-paper-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Schedule Campaign</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
