import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { supabase, fetchStudents, fetchTeachers, fetchClasses, createEntity, uploadFile, getPublicUrl, deleteEntity } from './services/supabase';
import { generateStudentReportComment } from './services/geminiService';
import { Student, Teacher, ClassEntity } from './types';
import { 
  Plus, Trash2, Search, Sparkles, UploadCloud, Loader2, 
  GraduationCap, Users, School, BookOpen, Camera, X, AlertCircle 
} from 'lucide-react';

// --- Login Component ---
const Login = ({ onLogin }: { onLogin: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Demo Credentials
      if (username === 'admin' && password === 'admin123') {
         onLogin();
         return;
      }

      // Supabase Auth (Skipped if in Mock Mode implicitly by error handling)
      const { data, error } = await supabase
        .from('admin_user')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) {
        throw new Error('Invalid credentials');
      }

      if (data.password_hash && password.length > 0) {
         onLogin();
      } else {
         throw new Error('Invalid credentials');
      }
    } catch (err: any) {
      console.error(err);
      if (username === 'admin' && password === 'admin') {
        onLogin(); // Fallback
      } else {
        setError(typeof err === 'string' ? err : 'Login failed. (Try admin/admin)');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <School className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">SchoolAdmin Pro</h2>
        <p className="text-slate-500 text-center mb-6 text-sm">Comprehensive School Management System</p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Username</label>
            <input type="text" className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input type="password" className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition flex justify-center items-center">
            {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
          </button>
        </form>
        <div className="mt-4 text-center text-xs text-gray-400">
           Demo credentials: admin / admin
        </div>
      </div>
    </div>
  );
};

// --- Student List Component ---
const StudentsPage = ({ mode }: { mode: 'list' | 'add' }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState<Partial<Student>>({ gender: 'Male' });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Camera Stream Logic
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraOpen) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Camera error:", err);
          alert("Could not access camera.");
          setIsCameraOpen(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            const capturedFile = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setFile(capturedFile);
            setIsCameraOpen(false);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, cData, tData] = await Promise.all([fetchStudents(), fetchClasses(), fetchTeachers()]);
      setStudents(sData || []);
      setClasses(cData || []);
      setTeachers(tData || []);
    } catch (e) {
      console.error(e);
      // Fallback
      if (!students.length) setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let photo_path = '';
      if (file) {
        const path = `students/${Date.now()}_${file.name}`;
        const uploaded = await uploadFile(file, path);
        if (uploaded) photo_path = uploaded;
      }

      await createEntity('students', { ...formData, photo_path });
      alert('Student added successfully!');
      setFormData({ gender: 'Male' });
      setFile(null);
      // Refresh list logic would go here if needed immediately, or assume router handles it
    } catch (e) {
      console.error(e);
      alert('Error saving student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateReport = async (student: Student) => {
    setAiReport('Generating AI feedback...');
    const result = await generateStudentReportComment(student, student.notes || 'Good attendance, average participation.');
    setAiReport(result);
  };

  if (mode === 'add') {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Plus className="text-blue-500" /> Add New Student
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="First Name" className="border p-2 rounded" required onChange={e => setFormData({...formData, first_name: e.target.value})} />
            <input placeholder="Last Name" className="border p-2 rounded" required onChange={e => setFormData({...formData, last_name: e.target.value})} />
            <input placeholder="Admission No" className="border p-2 rounded" required onChange={e => setFormData({...formData, admission_no: e.target.value})} />
            <input type="date" className="border p-2 rounded" required onChange={e => setFormData({...formData, dob: e.target.value})} />
            <select className="border p-2 rounded" onChange={e => setFormData({...formData, gender: e.target.value as any})}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
             <select className="border p-2 rounded" onChange={e => setFormData({...formData, class_id: e.target.value})}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.grade} - {c.section}</option>)}
            </select>
            <select className="border p-2 rounded" onChange={e => setFormData({...formData, teacher_id: e.target.value})}>
              <option value="">Assign Class Teacher (Optional)</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          
          {/* Photo Upload & Camera Section */}
          <div className="border-2 border-dashed border-gray-300 p-4 rounded text-center bg-gray-50 relative">
            {isCameraOpen ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="relative w-full max-w-sm rounded-lg overflow-hidden bg-black aspect-video">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={capturePhoto} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-blue-700">
                    <Camera size={16} /> Capture
                  </button>
                  <button type="button" onClick={() => setIsCameraOpen(false)} className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-600">
                    <X size={16} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                   {file ? (
                     <div className="relative inline-block group">
                       <img src={URL.createObjectURL(file)} alt="Preview" className="h-32 w-32 object-cover rounded-full border-4 border-white shadow-md mx-auto" />
                       <button type="button" onClick={() => setFile(null)} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                         <X size={12} />
                       </button>
                       <p className="text-xs text-green-600 font-bold mt-2">{file.name}</p>
                     </div>
                   ) : (
                     <UploadCloud className="mx-auto text-gray-400 mb-2 h-10 w-10" />
                   )}
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-slate-700 px-4 py-2 rounded text-sm font-medium transition">
                    <span>{file ? 'Change Photo' : 'Upload File'}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                  </label>
                  
                  <span className="text-xs text-gray-400 font-medium">OR</span>
                  
                  <button type="button" onClick={() => setIsCameraOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition">
                    <Camera size={16} /> Use Camera
                  </button>
                </div>
              </>
            )}
          </div>

          <textarea placeholder="Initial Notes..." className="w-full border p-2 rounded" rows={3} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
          <button disabled={submitting} type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700">
            {submitting ? 'Saving...' : 'Save Student'}
          </button>
        </form>
      </div>
    );
  }

  const filtered = students.filter(s => 
    (s.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.admission_no || '').includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Students Directory</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search students..." 
            className="pl-10 pr-4 py-2 border rounded-full text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr> : filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      {s.photo_path ? (
                        <img className="h-10 w-10 rounded-full object-cover" src={getPublicUrl(s.photo_path)} alt="" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {(s.first_name || '')[0]}{(s.last_name || '')[0]}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{s.first_name} {s.last_name}</div>
                      <div className="text-sm text-gray-500">{s.gender}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.admission_no}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(s as any).classes?.grade || ''} - {(s as any).classes?.section || ''}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleGenerateReport(s)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="AI Report">
                    <Sparkles size={18} />
                  </button>
                  <button onClick={() => { if(confirm('Delete?')) deleteEntity('students', s.id).then(loadData) }} className="text-red-600 hover:text-red-900">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {aiReport && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-xl border-l-4 border-indigo-500 max-w-sm animate-in fade-in slide-in-from-bottom-4 z-50">
            <h4 className="font-bold flex items-center gap-2 text-indigo-700 mb-2"><Sparkles size={16}/> AI Insight</h4>
            <p className="text-sm text-gray-700">{aiReport}</p>
            <button onClick={() => setAiReport('')} className="mt-2 text-xs text-gray-500 underline">Dismiss</button>
        </div>
      )}
    </div>
  );
};

// --- Teachers Component ---
const TeachersPage = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        fetchTeachers().then(data => {
            setTeachers(data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Faculty Directory</h2>
                <button className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800">
                  + Add Teacher
                </button>
             </div>
             
             {loading ? <div className="text-center p-4">Loading faculty...</div> : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {teachers.map(t => (
                       <div key={t.id} className="border border-gray-200 p-4 rounded-lg flex items-center gap-4 hover:shadow-md transition">
                           <div className="h-14 w-14 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
                               {t.photo_path ? (
                                   <img src={getPublicUrl(t.photo_path)} className="w-full h-full object-cover" />
                               ) : <Users className="text-gray-400" />}
                           </div>
                           <div className="overflow-hidden">
                               <p className="font-bold text-slate-800 truncate">{t.full_name}</p>
                               <p className="text-xs text-blue-600 font-medium">{t.qualifications}</p>
                               <p className="text-xs text-gray-500 truncate">{t.email}</p>
                           </div>
                       </div>
                   ))}
                   {teachers.length === 0 && <p className="text-gray-500 italic">No teachers listed yet.</p>}
               </div>
             )}
        </div>
    )
}

// --- Classes Component ---
const ClassesPage = () => {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    fetchClasses().then(data => {
      setClasses(data || []);
      setLoading(false);
    }).catch(() => setLoading(false)); 
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-6 text-slate-800">Academic Classes</h2>
      <div className="grid gap-4">
        {loading ? <p>Loading classes...</p> : classes.map(c => (
          <div key={c.id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50">
             <div className="flex items-center gap-4">
               <div className="h-10 w-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">
                 {c.grade}
               </div>
               <div>
                 <span className="font-bold text-slate-700">Section {c.section}</span>
                 <div className="text-sm text-gray-500">Teacher: {c.teacher_name || 'Unassigned'}</div>
               </div>
             </div>
             <div className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
               {c.academic_year}
             </div>
          </div>
        ))}
        {!loading && classes.length === 0 && <p className="text-gray-500">No classes defined.</p>}
      </div>
    </div>
  )
}

// --- Dashboard Component ---
const Dashboard = () => {
    const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0 });
  
    useEffect(() => {
      const load = async () => {
        try {
          const [s, t, c] = await Promise.all([fetchStudents(), fetchTeachers(), fetchClasses()]);
          setStats({ 
            students: s?.length || 0, 
            teachers: t?.length || 0, 
            classes: c?.length || 0 
          });
        } catch(e) { console.error(e); }
      };
      load();
    }, []);

    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600',
      indigo: 'bg-indigo-50 text-indigo-600',
      emerald: 'bg-emerald-50 text-emerald-600'
    };

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${colors[color] || 'bg-gray-50 text-gray-600'}`}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Students" value={stats.students} icon={GraduationCap} color="blue" />
                <StatCard title="Total Teachers" value={stats.teachers} icon={Users} color="indigo" />
                <StatCard title="Active Classes" value={stats.classes} icon={School} color="emerald" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
               <div className="bg-white p-6 rounded-lg shadow-sm">
                 <h3 className="font-bold text-slate-700 mb-4">Quick Actions</h3>
                 <div className="space-y-2">
                    <button className="w-full text-left p-3 hover:bg-gray-50 rounded border border-gray-200 flex items-center gap-2 text-sm">
                       <Plus size={16} className="text-blue-500"/> Register New Student
                    </button>
                    <button className="w-full text-left p-3 hover:bg-gray-50 rounded border border-gray-200 flex items-center gap-2 text-sm">
                       <Plus size={16} className="text-indigo-500"/> Add Faculty Member
                    </button>
                    <button className="w-full text-left p-3 hover:bg-gray-50 rounded border border-gray-200 flex items-center gap-2 text-sm">
                       <BookOpen size={16} className="text-emerald-500"/> Create Class Schedule
                    </button>
                 </div>
               </div>
               
               <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-lg shadow-sm text-white">
                 <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Sparkles size={20}/> AI Assistant</h3>
                 <p className="text-indigo-100 text-sm mb-4">
                   Your AI assistant is ready to help generate student reports, summarize teacher profiles, and analyze class performance.
                 </p>
                 <button className="bg-white text-indigo-600 px-4 py-2 rounded font-medium text-sm hover:bg-indigo-50 transition">
                   View AI Insights
                 </button>
               </div>
            </div>
        </div>
    );
};

// --- Main App Component ---
const App = () => {
  const [session, setSession] = useState(false);
  const [page, setPage] = useState('dashboard');

  if (!session) return <Login onLogin={() => setSession(true)} />;

  const renderContent = () => {
    switch(page) {
      case 'dashboard': return <Dashboard />;
      case 'students_list': return <StudentsPage mode="list" />;
      case 'students_add': return <StudentsPage mode="add" />;
      case 'teachers_list': return <TeachersPage />;
      case 'teachers_add': return <TeachersPage />; // Reuse for now
      case 'classes_list': return <ClassesPage />;
      default: return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <School size={48} className="mb-4 opacity-20" />
          <p>Module under construction</p>
        </div>
      );
    }
  };

  return (
    <Layout currentPage={page} onNavigate={setPage} onLogout={() => setSession(false)}>
      {renderContent()}
    </Layout>
  );
};

export default App;