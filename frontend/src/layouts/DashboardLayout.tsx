import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Layers, 
  Clock, 
  Send, 
  LogOut, 
  Menu, 
  Plus,
  Settings,
  Mail
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onOpenCompose: () => void;
  onOpenSettings?: () => void;
}

export const DashboardLayout = ({ children, onOpenCompose, onOpenSettings }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Layers },
    { name: 'Scheduled Queue', href: '/scheduled', icon: Clock },
    { name: 'Delivery Logs', href: '/sent', icon: Send },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#141413] flex flex-col font-sans selection:bg-[#EBE5DE]">
      
      {/* Top Floating Luxury Header */}
      <header className="sticky top-0 z-40 bg-[#FBFBF9]/90 backdrop-blur-md border-b border-[#E8E8E2] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#5C5C58] hover:bg-[#F0F0EB] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#141413] text-[#FBFBF9] flex items-center justify-center shadow-paper-sm transition-transform group-hover:scale-[1.03]">
                <Mail className="w-4 h-4 text-[#FBFBF9]" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-[#141413] block font-sans">
                  OUTBOX
                </span>
                <span className="text-[10px] font-semibold text-[#8C8C85] uppercase tracking-widest block -mt-1 font-mono-code">
                  Mail Studio
                </span>
              </div>
            </Link>
          </div>

          {/* Center Floating Pill Navigation (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-[#F0F0EB] rounded-full border border-[#E5E5DF] shadow-paper-sm">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#FFFFFF] text-[#141413] shadow-paper-sm font-bold'
                      : 'text-[#6B6B66] hover:text-[#141413] hover:bg-[#F7F7F4]/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#C84B26]' : 'text-[#8C8C85]'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="Sender Settings"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E2E2DC] bg-[#FFFFFF] hover:bg-[#F5F5F0] hover:border-[#D5D5CC] text-xs font-semibold text-[#5C5C58] transition-all shadow-paper-sm cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-[#8C8C85]" />
                <span>Settings</span>
              </button>
            )}

            {/* Compose Campaign Button (Terracotta Accent) */}
            <button
              onClick={onOpenCompose}
              className="flex items-center gap-2 bg-[#C84B26] hover:bg-[#B23E1B] active:scale-[0.98] text-[#FFFFFF] text-xs font-bold py-2 px-4 rounded-full shadow-paper-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Compose Email</span>
            </button>

            {/* User Profile & Dropdown */}
            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-[#E5E5DF]">
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-[#E2E2DC] shadow-paper-sm"
                />
                <div className="hidden lg:block text-left">
                  <span className="block text-xs font-bold text-[#141413] truncate max-w-[110px] leading-tight">
                    {user.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-[10px] font-semibold text-[#8C8C85] hover:text-[#C84B26] transition-colors leading-none cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-[#E5E5DF] bg-[#F5F5F0] px-4 py-3 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                  isActive ? 'bg-[#FFFFFF] text-[#141413] shadow-paper-sm font-bold' : 'text-[#6B6B66]'
                }`}
              >
                <Icon className="w-4 h-4 text-[#C84B26]" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          {onOpenSettings && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#6B6B66] hover:bg-[#FFFFFF]"
            >
              <Settings className="w-4 h-4 text-[#8C8C85]" />
              <span>Sender Settings</span>
            </button>
          )}
          {user && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#C84B26] hover:bg-[#FDF2EE]"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout Session</span>
            </button>
          )}
        </div>
      )}

      {/* Main Editorial Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-[#E8E8E2] bg-[#FBFBF9] py-6 text-center text-xs text-[#8C8C85] font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OUTBOX Mail Studio — Precision Email Delivery</span>
          <span className="font-mono-code text-[11px]">System Status: Operational</span>
        </div>
      </footer>

    </div>
  );
};
