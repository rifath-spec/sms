import React, { useState } from 'react';
import { 
  Users, GraduationCap, BookOpen, School, FileText, 
  Settings, LogOut, ChevronDown, Menu, X, Upload 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate, onLogout, currentPage }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NavDropdown = ({ label, icon: Icon, items }: { label: string, icon: any, items: { label: string, key: string }[] }) => (
    <div className="relative group">
      <button className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors ${['students', 'teachers', 'classes', 'subjects'].some(k => currentPage.startsWith(k)) && label.toLowerCase().includes(currentPage.split('_')[0]) ? 'text-blue-400' : 'text-slate-200'}`}>
        <Icon size={18} />
        <span>{label}</span>
        <ChevronDown size={14} className="mt-1" />
      </button>
      <div className="absolute left-0 mt-0 w-48 bg-white rounded-md shadow-lg py-2 hidden group-hover:block z-50 border border-slate-100">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              onNavigate(item.key);
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <School className="h-8 w-8 text-blue-500" />
              <span className="ml-2 text-xl font-bold tracking-tight">SchoolAdmin Pro</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-2">
              <button onClick={() => onNavigate('dashboard')} className={`px-3 py-2 rounded hover:bg-slate-800 ${currentPage === 'dashboard' ? 'text-blue-400' : ''}`}>Dashboard</button>
              
              <NavDropdown 
                label="Students" 
                icon={GraduationCap} 
                items={[
                  { label: 'Student List', key: 'students_list' }, 
                  { label: 'Add Student', key: 'students_add' }
                ]} 
              />
              
              <NavDropdown 
                label="Teachers" 
                icon={Users} 
                items={[
                  { label: 'Teacher List', key: 'teachers_list' },
                  { label: 'Add Teacher', key: 'teachers_add' }
                ]} 
              />
              
              <NavDropdown 
                label="Academics" 
                icon={BookOpen} 
                items={[
                  { label: 'Classes', key: 'classes_list' },
                  { label: 'Subjects', key: 'subjects_list' }
                ]} 
              />

              <NavDropdown 
                label="Reports" 
                icon={FileText} 
                items={[
                  { label: 'Student Directory', key: 'report_students' },
                  { label: 'Class Roster', key: 'report_roster' }
                ]} 
              />

              <button onClick={onLogout} className="ml-4 p-2 text-slate-400 hover:text-red-400">
                <LogOut size={20} />
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800">
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-800 px-2 pt-2 pb-3 space-y-1 sm:px-3">
             <button onClick={() => onNavigate('dashboard')} className="block w-full text-left text-slate-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">Dashboard</button>
             <button onClick={() => onNavigate('students_list')} className="block w-full text-left text-slate-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">Students</button>
             <button onClick={() => onNavigate('teachers_list')} className="block w-full text-left text-slate-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">Teachers</button>
             <button onClick={() => onNavigate('classes_list')} className="block w-full text-left text-slate-300 hover:text-white px-3 py-2 rounded-md text-base font-medium">Classes</button>
             <button onClick={onLogout} className="block w-full text-left text-red-400 hover:text-red-300 px-3 py-2 rounded-md text-base font-medium">Logout</button>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
