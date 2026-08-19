import { useEffect, useState } from 'react';
import api from '../services/api';
import { DashboardStats, EmailCampaign } from '../types';
import { 
  Clock, 
  Send, 
  AlertCircle, 
  Layers, 
  Calendar, 
  ArrowUpRight,
  Loader2,
  Paperclip,
  User,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardProps {
  onOpenCompose: () => void;
}

export const Dashboard = ({ onOpenCompose }: DashboardProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setError('');
      const [statsRes, campaignsRes] = await Promise.all([
        api.get('/emails/stats'),
        api.get('/emails/campaigns'),
      ]);
      setStats(statsRes.data);
      setCampaigns(campaignsRes.data.campaigns);
    } catch (err) {
      console.error('[Dashboard] Error fetching overview data:', err);
      setError('Failed to fetch dashboard statistics. Please verify backend connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Poll stats every 10 seconds to show dynamic worker updates
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-6 h-6 text-[#C84B26] animate-spin" />
        <span className="text-xs font-semibold text-[#8C8C85] tracking-wider uppercase font-mono-code">
          Loading telemetry...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Page Title & Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E8E2]">
        <div>
          <span className="text-[11px] font-bold text-[#C84B26] uppercase tracking-widest font-mono-code block mb-1">
            Telemetry & Campaigns
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141413] tracking-tight font-sans">
            Campaign Overview
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E8E8E2] text-xs font-medium text-[#5C5C58] shadow-paper-sm">
            <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
            <span className="font-mono-code text-[11px]">System Ready</span>
          </div>

          <button
            onClick={onOpenCompose}
            className="flex items-center gap-1.5 bg-[#141413] hover:bg-[#2A2A28] text-[#FFFFFF] text-xs font-bold py-2 px-4 rounded-full shadow-paper-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[#FDF2EE] border border-[#F5C7B8] text-[#C84B26] text-xs rounded-2xl">
          <span className="font-bold">Error: </span> {error}
        </div>
      )}

      {/* Nordic Bento KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Scheduled */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E8E8E2] shadow-paper hover:border-[#D5D5CC] transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">
              Queue
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#141413] tracking-tight">
              {stats?.scheduled || 0}
            </span>
            <span className="text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full font-mono-code">
              Pending
            </span>
          </div>
        </div>

        {/* Card 2: Sent */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E8E8E2] shadow-paper hover:border-[#D5D5CC] transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">
              Delivered
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#15803D] flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#15803D] tracking-tight">
              {stats?.sent || 0}
            </span>
            <span className="text-[11px] font-semibold text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded-full font-mono-code">
              Success
            </span>
          </div>
        </div>

        {/* Card 3: Failed */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E8E8E2] shadow-paper hover:border-[#D5D5CC] transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">
              Failed
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FDF2EE] text-[#C84B26] flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#C84B26] tracking-tight">
              {stats?.failed || 0}
            </span>
            <span className="text-[11px] font-semibold text-[#C84B26] bg-[#FDF2EE] px-2 py-0.5 rounded-full font-mono-code">
              Errors
            </span>
          </div>
        </div>

        {/* Card 4: Total Campaigns */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#E8E8E2] shadow-paper hover:border-[#D5D5CC] transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">
              Campaigns
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F5F5F0] text-[#141413] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#141413] tracking-tight">
              {stats?.totalCampaigns || 0}
            </span>
            <span className="text-[11px] font-semibold text-[#5C5C58] bg-[#F5F5F0] px-2 py-0.5 rounded-full font-mono-code">
              Total
            </span>
          </div>
        </div>

      </div>

      {/* Campaigns Editorial Table */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E8E2] shadow-paper overflow-hidden">
        
        {/* Table Header */}
        <div className="px-6 py-5 border-b border-[#E8E8E2] flex items-center justify-between bg-[#FAFAF8]">
          <div>
            <h2 className="text-base font-bold text-[#141413] tracking-tight">
              Recent Campaigns
            </h2>
            <p className="text-xs text-[#8C8C85]">
              Active schedules, recipient allocations, and dispatch constraints
            </p>
          </div>
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-1 text-xs font-bold text-[#C84B26] hover:text-[#B23E1B] transition-colors cursor-pointer"
          >
            <span>Create New</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F5F0] flex items-center justify-center text-[#8C8C85] mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#141413]">No campaigns created yet</h3>
            <p className="text-xs text-[#8C8C85] max-w-xs mt-1">
              Start your first automated email campaign to schedule and track deliveries.
            </p>
            <button
              onClick={onOpenCompose}
              className="mt-4 text-xs font-bold bg-[#C84B26] hover:bg-[#B23E1B] text-[#FFFFFF] px-5 py-2.5 rounded-full shadow-paper-sm transition-all cursor-pointer"
            >
              Compose First Campaign
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0EB]">
            {campaigns.map((campaign) => (
              <div 
                key={campaign.id} 
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAFAF8] transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#141413] truncate max-w-md">
                      {campaign.subject}
                    </h3>
                    {campaign.senderName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5F5F0] text-[10px] font-semibold text-[#5C5C58]">
                        <User className="w-3 h-3 text-[#8C8C85]" />
                        {campaign.senderName}
                      </span>
                    )}
                    {campaign.attachments && Array.isArray(campaign.attachments) && campaign.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[10px] font-semibold text-[#2563EB]">
                        <Paperclip className="w-3 h-3 text-[#2563EB]" />
                        {campaign.attachments.length} attached
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#6B6B66] line-clamp-1 max-w-xl">
                    {campaign.body}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-[#8C8C85] font-mono-code">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#8C8C85]" />
                      {new Date(campaign.startTime).toLocaleString()}
                    </span>
                    <span>•</span>
                    <span>Delay: {campaign.delayBetweenEmails}s</span>
                    <span>•</span>
                    <span>Limit: {campaign.hourlyLimit}/hr</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-[#8C8C85] uppercase tracking-wider font-mono-code">
                      Recipients
                    </span>
                    <span className="text-base font-extrabold text-[#141413]">
                      {campaign._count?.jobs || 0}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link
                      to="/scheduled"
                      className="px-3.5 py-1.5 border border-[#E2E2DC] hover:border-[#C8C8BE] hover:bg-[#FFFFFF] text-xs font-semibold text-[#5C5C58] hover:text-[#141413] bg-[#FAFAF8] rounded-full transition-all shadow-paper-sm"
                    >
                      Queue
                    </Link>
                    <Link
                      to="/sent"
                      className="px-3.5 py-1.5 border border-[#E2E2DC] hover:border-[#C8C8BE] hover:bg-[#FFFFFF] text-xs font-semibold text-[#5C5C58] hover:text-[#141413] bg-[#FAFAF8] rounded-full transition-all shadow-paper-sm"
                    >
                      Logs
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
