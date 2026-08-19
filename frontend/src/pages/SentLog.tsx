import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { EmailJob } from '../types';
import { Search, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, ExternalLink, Loader2, Send } from 'lucide-react';

export const SentLog: React.FC = () => {
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSentEmails = async () => {
    setIsLoading(true);
    try {
      setError('');
      const response = await api.get('/emails/sent', {
        params: {
          page,
          limit: 10,
          search,
        },
      });
      setEmails(response.data.emails);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err) {
      console.error('[SentLog] Error fetching delivery records:', err);
      setError('Failed to fetch the delivery logs database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSentEmails();
    const interval = setInterval(fetchSentEmails, 10000);
    return () => clearInterval(interval);
  }, [page, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E8E2]">
        <div>
          <span className="text-[11px] font-bold text-[#C84B26] uppercase tracking-widest font-mono-code block mb-1">
            Historical Records
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141413] tracking-tight font-sans">
            Delivery Logs
          </h1>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search recipient or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FFFFFF] border border-[#E2E2DC] rounded-full text-xs text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#C84B26]/10 focus:border-[#C84B26] shadow-paper-sm transition-all"
          />
          <Search className="w-3.5 h-3.5 text-[#8C8C85] absolute left-3 top-2.5" />
        </form>
      </div>

      {error && (
        <div className="p-4 bg-[#FDF2EE] border border-[#F5C7B8] text-[#C84B26] text-xs rounded-2xl">
          <span className="font-bold">Error: </span> {error}
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E8E2] shadow-paper overflow-hidden">
        {isLoading && emails.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-[#C84B26] animate-spin" />
            <span className="text-xs font-semibold text-[#8C8C85] font-mono-code">
              Loading delivery logs...
            </span>
          </div>
        ) : emails.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F5F0] flex items-center justify-center text-[#8C8C85] mb-3">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#141413]">No delivery records found</h3>
            <p className="text-xs text-[#8C8C85] max-w-xs mt-1">
              There are no dispatched or failed emails in the log database matching your filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAF8] border-b border-[#E8E8E2]">
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">Recipient</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">Subject</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">Dispatched At</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">Status</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0EB]">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-6 py-4 text-xs font-semibold text-[#141413]">{email.recipient}</td>
                    <td className="px-6 py-4 text-xs text-[#6B6B66] truncate max-w-xs">{email.subject}</td>
                    <td className="px-6 py-4 text-[11px] text-[#8C8C85] font-mono-code">
                      {email.sentAt 
                        ? new Date(email.sentAt).toLocaleString() 
                        : new Date(email.updatedAt).toLocaleString()
                      }
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {email.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7] font-mono-code">
                          <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDF2EE] text-[#C84B26] border border-[#F5C7B8] font-mono-code">
                          <AlertCircle className="w-3 h-3 text-[#C84B26]" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#6B6B66]">
                      {email.status === 'sent' && email.previewUrl ? (
                        <a
                          href={email.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#2563EB] hover:text-[#1D4ED8] font-semibold transition-colors"
                        >
                          <span>Preview</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : email.status === 'failed' && email.errorMessage ? (
                        <span className="text-[#C84B26] text-[11px] line-clamp-1 max-w-xs font-mono-code" title={email.errorMessage}>
                          {email.errorMessage}
                        </span>
                      ) : (
                        <span className="text-[#8C8C85] text-[11px] font-mono-code">Delivered to inbox</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer / Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 bg-[#FAFAF8] border-t border-[#E8E8E2] flex items-center justify-between">
            <span className="text-[11px] font-mono-code text-[#8C8C85]">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 border border-[#E2E2DC] rounded-lg hover:bg-[#FFFFFF] text-[#6B6B66] hover:text-[#141413] transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 border border-[#E2E2DC] rounded-lg hover:bg-[#FFFFFF] text-[#6B6B66] hover:text-[#141413] transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
