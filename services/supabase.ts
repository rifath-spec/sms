import { createClient } from '@supabase/supabase-js';
import type { Student, Teacher, ClassEntity, Subject, Guardian } from '../types';

// Safe check for process to avoid crashing in browser environments
const getEnv = (key: string) => (typeof process !== 'undefined' && process.env && process.env[key]) || '';

// Updated to the provided Supabase Project URL
const SUPABASE_URL = getEnv('SUPABASE_URL') || 'https://wxuwxognxlcdfejfsqcl.supabase.co';
const SUPABASE_KEY = getEnv('SUPABASE_KEY') || 'process.env.SUPABASE_KEY';

// Check if we are using placeholder credentials OR if the key is missing.
// This ensures we fallback to mock data if the environment isn't fully configured.
const isDemo = SUPABASE_URL.includes('xyz.supabase.co') || !SUPABASE_KEY;

// Initialize client (fallback key prevents crash during init if key is missing)
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || 'fallback-key');

// --- MOCK DATA STORE (For Demo Mode) ---
let mockStudents: Student[] = [
  { id: '1', admission_no: 'ADM001', first_name: 'John', last_name: 'Doe', dob: '2015-05-15', gender: 'Male', class_id: '1', roll_no: '101', notes: 'Excellent in mathematics' },
  { id: '2', admission_no: 'ADM002', first_name: 'Jane', last_name: 'Smith', dob: '2016-02-20', gender: 'Female', class_id: '2', roll_no: '102', notes: 'Needs improvement in reading' }
];
let mockTeachers: Teacher[] = [
  { id: '1', teacher_no: 'T001', full_name: 'Sarah Connor', phone: '555-0123', email: 'sarah@school.edu', qualifications: 'M.Ed Mathematics', hire_date: '2020-01-15' },
  { id: '2', teacher_no: 'T002', full_name: 'James Logan', phone: '555-0987', email: 'logan@school.edu', qualifications: 'B.Sc Physics', hire_date: '2021-08-20' }
];
let mockClasses: any[] = [
  { id: '1', grade: '5', section: 'A', academic_year: '2024', class_teacher_id: '1' },
  { id: '2', grade: '6', section: 'B', academic_year: '2024', class_teacher_id: '2' }
];

// --- Helpers ---

export const uploadFile = async (file: File, path: string): Promise<string | null> => {
  if (isDemo) {
    // In demo mode, convert file to base64 data URL to simulate storage
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }

  try {
    const { data, error } = await supabase.storage.from('photos').upload(path, file, { upsert: true });
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    return data?.path || null;
  } catch (err) {
    console.error('Network error during upload:', err);
    return null;
  }
};

export const getPublicUrl = (path: string) => {
  if (!path) return '';
  // If it's a data URL (from demo mode), return it directly
  if (path.startsWith('data:') || path.startsWith('blob:')) return path;
  
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
};

// --- Generic Fetchers ---

export const fetchStudents = async () => {
  if (isDemo) {
    // Join with mock classes
    return mockStudents.map(s => ({
      ...s,
      classes: mockClasses.find(c => c.id === s.class_id) || { grade: 'N/A', section: '' }
    }));
  }
  const { data, error } = await supabase
    .from('students')
    .select(`*, classes(grade, section)`)
    .order('last_name');
  if (error) throw error;
  return data;
};

export const fetchTeachers = async () => {
  if (isDemo) return mockTeachers;
  const { data, error } = await supabase.from('teachers').select('*').order('full_name');
  if (error) throw error;
  return data;
};

export const fetchClasses = async () => {
  if (isDemo) {
    return mockClasses.map(c => ({
      ...c,
      teacher_name: mockTeachers.find(t => t.id === c.class_teacher_id)?.full_name || 'Unknown'
    }));
  }
  const { data, error } = await supabase
    .from('classes')
    .select('*, teachers(full_name)')
    .order('grade');
  
  if (error) throw error;
  return data.map((c: any) => ({
    ...c,
    teacher_name: c.teachers?.full_name
  }));
};

export const fetchSubjects = async () => {
  if (isDemo) return [];
  const { data, error } = await supabase.from('subjects').select('*').order('name');
  if (error) throw error;
  return data;
};

// --- Generic CRUD ---

export const createEntity = async (table: string, payload: any) => {
  if (isDemo) {
    const newItem = { ...payload, id: Math.random().toString(36).substr(2, 9) };
    if (table === 'students') mockStudents.push(newItem);
    if (table === 'teachers') mockTeachers.push(newItem);
    if (table === 'classes') mockClasses.push(newItem);
    return newItem;
  }

  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
};

export const updateEntity = async (table: string, id: string, payload: any) => {
  if (isDemo) return payload; // No-op for demo
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteEntity = async (table: string, id: string) => {
  if (isDemo) {
    if (table === 'students') mockStudents = mockStudents.filter(s => s.id !== id);
    if (table === 'teachers') mockTeachers = mockTeachers.filter(t => t.id !== id);
    if (table === 'classes') mockClasses = mockClasses.filter(c => c.id !== id);
    return;
  }
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
};