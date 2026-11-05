import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/LoginForm';
import { ProjectsView } from './components/ProjectsView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { MyTasksView } from './components/MyTasksView';
import { Loader2 } from 'lucide-react';
import { Header } from './components/header';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'projects' | 'my-tasks'>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-gray-500">
        <Loader2 className="w-9 h-9 animate-spin text-blue-600 mb-3" />
        <span className="text-sm font-medium">Инициализация CRM...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const handleNavigate = (view: 'projects' | 'my-tasks') => {
    setCurrentView(view);
    setSelectedProjectId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-gray-900 flex flex-col font-sans antialiased">
      <Header currentView={currentView} onNavigate={handleNavigate} />

      <main className="flex-1">
        {currentView === 'projects' ? (
          selectedProjectId ? (
            <ProjectDetailView
              projectId={selectedProjectId}
              onBack={() => setSelectedProjectId(null)}
            />
          ) : (
            <ProjectsView onSelectProject={(id) => setSelectedProjectId(id)} />
          )
        ) : (
          <MyTasksView />
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
