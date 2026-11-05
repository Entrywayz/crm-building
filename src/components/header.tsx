import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, CheckSquare, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';

interface Props {
  currentView: 'projects' | 'my-tasks';
  onNavigate: (view: 'projects' | 'my-tasks') => void;
}

export const Header: React.FC<Props> = ({ currentView, onNavigate }) => {
  const { profile, user, signOut, isManager } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-gray-900 tracking-tight leading-none block">
                  СтройCRM
                </span>
                <span className="text-[11px] text-gray-500 font-medium">Объекты и задачи</span>
              </div>
            </div>

            <nav className="flex space-x-1">
              <button
                onClick={() => onNavigate('projects')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'projects'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Объекты
              </button>

              <button
                onClick={() => onNavigate('my-tasks')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentView === 'my-tasks'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                {isManager ? 'Задачи исполнителей' : 'Мои задачи'}
              </button>
            </nav>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-gray-800 leading-tight">
                  {profile?.full_name || user?.email}
                </div>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.2 rounded-full ${
                      isManager
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    {isManager ? 'Постановщик' : 'Исполнитель'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              title="Выйти"
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
