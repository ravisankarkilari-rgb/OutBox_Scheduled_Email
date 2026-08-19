import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { EmailJob } from '../types';
import { Search, ChevronLeft, ChevronRight, Loader2, Clock } from 'lucide-react';

export const ScheduledQueue: React.FC = () => {
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchScheduledEmails = async () => {
    setIsLoading(true);
    try {
      setError('');
      const response = await api.get('/emails/scheduled', {
        params: {
          page,
          limit: 10,
          search,
        },
      });
      setEmails(response.data.emails);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err) {
      console.error('[ScheduledQueue] Error fetching data:', err);
      setError('Failed to fetch the scheduled emails queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledEmails();
    const interval = setInterval(fetchScheduledEmails, 8000);
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
            Dispatch Buffer
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141413] tracking-tight font-sans">
            Scheduled Queue
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
              Loading scheduled queue...
            </span>
          </div>
        ) : emails.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F5F0] flex items-center justify-center text-[#8C8C85] mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#141413]">No scheduled emails found</h3>
            <p className="text-xs text-[#8C8C85] max-w-xs mt-1">
              Either the queue is currently clear or all jobs have completed sending.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAF8] border-b border-[#E8E8E2]">
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">Recipient</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">Subject</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">Scheduled Window</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">Status</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">Attempts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0EB]">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-6 py-4 text-xs font-semibold text-[#141413]">{email.recipient}</td>
                    <td className="px-6 py-4 text-xs text-[#6B6B66] truncate max-w-xs">{email.subject}</td>
                    <td className="px-6 py-4 text-[11px] text-[#8C8C85] font-mono-code">
                      {new Date(email.scheduledAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {email.status === 'processing' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7] font-mono-code">
                          <Loader2 className="w-3 h-3 animate-spin text-[#B45309]" />
                          Processing
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] font-mono-code">
                          Scheduled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-[#8C8C85] font-mono-code font-medium">{email.attempts}</td>
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
