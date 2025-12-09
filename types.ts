export interface Student {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  class_id: string;
  teacher_id?: string;
  roll_no: string;
  photo_path?: string;
  notes?: string;
}

export interface Teacher {
  id: string;
  teacher_no: string;
  full_name: string;
  phone: string;
  email: string;
  qualifications: string;
  hire_date: string;
  photo_path?: string;
}

export interface ClassEntity {
  id: string;
  grade: string;
  section: string;
  academic_year: string;
  class_teacher_id?: string;
  teacher_name?: string; // Joined field
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface Guardian {
  id: string;
  full_name: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
}

export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
}