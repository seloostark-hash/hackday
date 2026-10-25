// Hacktivators Supabase Client & Data Layer
import { CONFIG } from './config.js';

// Zero imaginary data - clean empty start
const INITIAL_DEMO_STUDENTS = [];

class SupabaseDataService {
  constructor() {
    this.supabase = null;
    this.isSupabaseOnline = false;
    this.storageKey = 'hacktivators_local_students_v1';
    this.ratingsKey = 'hacktivators_local_ratings_v1';
    this.initSupabaseClient();
    this.ensureLocalStorageSeed();
  }

  initSupabaseClient() {
    try {
      if (window.supabase && window.supabase.createClient) {
        this.supabase = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
        this.isSupabaseOnline = true;
        console.log("⚡ Supabase Client initialized with:", CONFIG.supabaseUrl);
      } else {
        console.warn("Supabase library not yet loaded in window. Using local fallback.");
      }
    } catch (err) {
      console.error("Error creating Supabase client:", err);
      this.isSupabaseOnline = false;
    }
  }

  ensureLocalStorageSeed() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify(INITIAL_DEMO_STUDENTS));
    }
  }

  getLocalStudents() {
    this.ensureLocalStorageSeed();
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch {
      return INITIAL_DEMO_STUDENTS;
    }
  }

  saveLocalStudents(students) {
    localStorage.setItem(this.storageKey, JSON.stringify(students));
  }

  // Fetch all students
  async getStudents() {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          // Merge with any local ratings
          const localRatings = this.getLocalRatings();
          const combined = data.map(s => ({
            ...s,
            ratings: localRatings[s.id] || localRatings[s.email] || {}
          }));
          this.saveLocalStudents(combined);
          return combined;
        } else if (error) {
          console.warn("Supabase students table not ready or RLS error, using local data:", error.message);
        }
      } catch (err) {
        console.warn("Network error reaching Supabase:", err);
      }
    }
    return this.getLocalStudents();
  }

  // Add new student
  async registerStudent(studentData) {
    const localList = this.getLocalStudents();
    
    // Check if email already registered
    const existing = localList.find(s => s.email.toLowerCase() === studentData.email.toLowerCase());
    if (existing) {
      throw new Error(`Email ${studentData.email} is already registered!`);
    }

    // Determine balanced group if not specified
    let assignedGroup = studentData.group_name;
    if (!assignedGroup) {
      const groupCounts = { A: 0, B: 0, C: 0, D: 0 };
      localList.forEach(s => {
        if (groupCounts[s.group_name] !== undefined) groupCounts[s.group_name]++;
      });
      // Pick group with least attendees
      const sortedGroups = Object.keys(groupCounts).sort((a, b) => groupCounts[a] - groupCounts[b]);
      assignedGroup = sortedGroups[0] || 'A';
    }

    const uniqueCode = `HACK-${assignedGroup}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord = {
      id: "std_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      name: studentData.name.trim(),
      grade: studentData.grade.trim(),
      school: studentData.school.trim(),
      mobile: studentData.mobile.trim(),
      email: studentData.email.trim().toLowerCase(),
      password_hash: studentData.password || '123456',
      group_name: assignedGroup,
      qr_code_token: uniqueCode,
      avatar_url: studentData.avatar_url || '',
      attended: false,
      attended_at: null,
      created_at: new Date().toISOString(),
      ratings: {}
    };

    // Attempt Supabase insert
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('students')
          .insert([{
            name: newRecord.name,
            grade: newRecord.grade,
            school: newRecord.school,
            mobile: newRecord.mobile,
            email: newRecord.email,
            password_hash: newRecord.password_hash,
            group_name: newRecord.group_name,
            qr_code_token: newRecord.qr_code_token,
            avatar_url: newRecord.avatar_url,
            attended: false
          }])
          .select();

        if (!error && data && data[0]) {
          newRecord.id = data[0].id;
          console.log("✅ Synced new student to Supabase:", data[0]);
        }
      } catch (err) {
        console.warn("Could not save to Supabase directly, saved to local cache:", err);
      }
    }

    // Always update local cache
    localList.unshift(newRecord);
    this.saveLocalStudents(localList);

    return newRecord;
  }

  // Delete student
  async deleteStudent(studentId) {
    if (this.supabase) {
      try {
        await this.supabase.from('students').delete().eq('id', studentId);
      } catch (e) {
        console.warn("Supabase delete failed:", e);
      }
    }
    const current = this.getLocalStudents().filter(s => s.id !== studentId);
    this.saveLocalStudents(current);
    return true;
  }

  // Toggle or mark attendance
  async markAttendance(tokenOrId) {
    const list = this.getLocalStudents();
    const student = list.find(s => s.id === tokenOrId || s.qr_code_token === tokenOrId || s.email.toLowerCase() === tokenOrId.toLowerCase());
    
    if (!student) {
      return { success: false, message: 'Student not found with this code' };
    }

    student.attended = !student.attended;
    student.attended_at = student.attended ? new Date().toISOString() : null;
    this.saveLocalStudents(list);

    if (this.supabase) {
      try {
        await this.supabase
          .from('students')
          .update({
            attended: student.attended,
            attended_at: student.attended_at
          })
          .eq('id', student.id);
      } catch (e) {
        console.warn("Supabase attendance update error:", e);
      }
    }

    return { success: true, student };
  }

  // Save student profile photo
  async updateStudentPhoto(studentId, photoDataUrl) {
    const list = this.getLocalStudents();
    const student = list.find(s => s.id === studentId);
    if (!student) return false;

    student.avatar_url = photoDataUrl;
    this.saveLocalStudents(list);

    if (this.supabase) {
      try {
        await this.supabase.from('students').update({ avatar_url: photoDataUrl }).eq('id', student.id);
      } catch (e) {
        console.warn("Supabase photo update failed:", e);
      }
    }
    return true;
  }

  // Ratings Management
  getLocalRatings() {
    try {
      return JSON.parse(localStorage.getItem(this.ratingsKey) || '{}');
    } catch {
      return {};
    }
  }

  async saveRatings(studentId, ratingsObject) {
    // ratingsObject: { [workshopId]: { rating: number, comment: string } }
    const localRatings = this.getLocalRatings();
    localRatings[studentId] = {
      ...(localRatings[studentId] || {}),
      ...ratingsObject
    };
    localStorage.setItem(this.ratingsKey, JSON.stringify(localRatings));

    // Also update student record
    const list = this.getLocalStudents();
    const student = list.find(s => s.id === studentId);
    if (student) {
      student.ratings = localRatings[studentId];
      this.saveLocalStudents(list);
    }

    // Push to Supabase if available
    if (this.supabase && student) {
      try {
        for (const [workshopId, info] of Object.entries(ratingsObject)) {
          await this.supabase
            .from('workshop_ratings')
            .upsert({
              student_id: student.id,
              student_email: student.email,
              workshop_id: workshopId,
              rating: info.rating,
              comment: info.comment || '',
              updated_at: new Date().toISOString()
            }, { onConflict: 'student_id,workshop_id' });
        }
      } catch (err) {
        console.warn("Supabase ratings sync error:", err);
      }
    }

    return true;
  }
}

export const dbService = new SupabaseDataService();
