import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Search, Save, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SybellaLoader } from '@sybellasystems/ui';
import { isSupportedClass } from '@/lib/classes';

type Student = { id: string; full_name: string; class_name: string; stream?: string };

const TEACHER_ENROLLMENT_CUTOFF = '2027-01-01';

function isTeacherEnrollmentOpen() {
  const today = new Date();
  const localDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return localDate < TEACHER_ENROLLMENT_CUTOFF;
}

export default function TeacherStudentRegister() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    parentName: '',
    email: '',
    phone: '',
    className: '',
    stream: '',
  });
  const enrollmentOpen = isTeacherEnrollmentOpen();

  useEffect(() => {
    async function loadRegister() {
      if (!supabase) {
        setError('Your class register is unavailable right now. Please ask the school office for help.');
        setLoading(false);
        return;
      }
      const [registerResult, assignmentResult] = await Promise.all([
        supabase.from('teacher_student_register')
          .select('id, full_name, class_name, stream')
          .order('class_name').order('full_name'),
        supabase.from('teacher_class_assignments')
          .select('class_name')
          .order('class_name'),
      ]);
      if (registerResult.error || assignmentResult.error) {
        console.error('Could not load the teacher class register', registerResult.error ?? assignmentResult.error);
        setError('Your class register is unavailable right now. Please try again later.');
      }
      else {
        const registerStudents = (registerResult.data ?? []) as Student[];
        const classes = [...new Set(
          (assignmentResult.data ?? [])
            .map((assignment) => String(assignment.class_name))
            .filter(isSupportedClass),
        )].sort();
        setStudents(registerStudents);
        setAssignedClasses(classes);
        setFormData((current) => ({ ...current, className: current.className || classes[0] || '' }));
      }
      setLoading(false);
    }
    void loadRegister();
  }, []);

  async function handleAddStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddError('');
    setAddSuccess('');
    if (!enrollmentOpen) {
      setAddError('Teacher self-enrollment closed on 1 January 2027. Please ask the school office to add this student.');
      return;
    }
    if (!supabase) {
      setAddError('Student enrollment is unavailable right now. Please ask the school office for help.');
      return;
    }
    if (!formData.fullName.trim() || !formData.parentName.trim() || !formData.phone.trim() || !formData.className) {
      setAddError('Student name, parent name, parent phone, and class are required.');
      return;
    }

    setSaving(true);
    const registryCode = `GSG-${Math.floor(10000 + Math.random() * 90000)}`;
    const { data, error: insertError } = await supabase
      .from('school_students')
      .insert({
        registry_code: registryCode,
        registration_number: registryCode,
        full_name: formData.fullName.trim(),
        parent_name: formData.parentName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        class_name: formData.className,
        stream: formData.stream.trim() || 'General',
        fee_status: 'Unpaid',
        fee_amount: '0 RWF',
      })
      .select('id, full_name, class_name, stream')
      .maybeSingle();
    setSaving(false);
    if (insertError || !data) {
      console.error('Could not add student from teacher register', insertError);
      setAddError(insertError?.code === '42501'
        ? 'Teacher self-enrollment is no longer available. Please ask the school office to add this student.'
        : 'We could not add this student. Please check the details and try again.');
      return;
    }

    setStudents((current) => [...current, data as Student].sort((a, b) => a.class_name.localeCompare(b.class_name) || a.full_name.localeCompare(b.full_name)));
    setFormData((current) => ({ ...current, fullName: '', parentName: '', email: '', phone: '', stream: '' }));
    setAddSuccess(`${data.full_name} was added to ${data.class_name}.`);
  }

  const visibleStudents = students.filter((student) => `${student.full_name} ${student.class_name} ${student.stream ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <div className="space-y-5">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#ea580c]">Assigned classes</p>
      <h1 className="mt-1 text-2xl font-bold text-[#3b2314] sm:text-3xl">Your class register</h1>
      <p className="mt-1 text-sm text-stone-500">Students in the classes assigned to you.</p>
    </div>
    {enrollmentOpen ? (
      <section className="rounded-xl border border-orange-200 bg-orange-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-stone-900"><Plus size={17} className="text-orange-600" /> Add a student</h2>
            <p className="mt-1 text-sm text-stone-600">You can add students to your assigned classes until 1 January 2027.</p>
          </div>
          <button type="button" onClick={() => { setShowAddForm((current) => !current); setAddError(''); setAddSuccess(''); }} className="inline-flex items-center gap-2 rounded-lg bg-[#ea580c] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c2410c]">
            <Plus size={15} /> {showAddForm ? 'Close' : 'Add student'}
          </button>
        </div>
        {showAddForm && (
          <form onSubmit={handleAddStudent} className="mt-4 grid gap-3 border-t border-orange-200 pt-4 sm:grid-cols-2">
            <input aria-label="Student full name" required value={formData.fullName} onChange={(event) => setFormData({ ...formData, fullName: event.target.value })} placeholder="Student full name" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
            <select aria-label="Class" required value={formData.className} onChange={(event) => setFormData({ ...formData, className: event.target.value })} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
              <option value="">Select assigned class</option>
              {assignedClasses.map((className) => <option key={className} value={className}>{className}</option>)}
            </select>
            <input aria-label="Parent or guardian name" required value={formData.parentName} onChange={(event) => setFormData({ ...formData, parentName: event.target.value })} placeholder="Parent or guardian name" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
            <input aria-label="Parent phone" required value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} placeholder="Parent phone number" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
            <input type="email" aria-label="Parent email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} placeholder="Parent email (optional)" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
            <input aria-label="Stream or combination" value={formData.stream} onChange={(event) => setFormData({ ...formData, stream: event.target.value })} placeholder="Stream or combination (optional)" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" />
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">{addError && <p role="alert" className="text-rose-700">{addError}</p>}{addSuccess && <p role="status" className="text-green-700">{addSuccess}</p>}</div>
              <button type="submit" disabled={saving || !assignedClasses.length} className="inline-flex items-center gap-2 rounded-lg bg-[#3b2314] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save size={15} /> {saving ? 'Saving…' : 'Save student'}</button>
            </div>
          </form>
        )}
      </section>
    ) : (
      <div role="status" className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        Teacher self-enrollment closed on 1 January 2027. Please ask the school office to add new students.
      </div>
    )}
    <section className="rounded-xl border border-[#bae6fd] bg-white shadow-sm overflow-hidden">
      <div className="border-b border-[#e0f2fe] p-4 bg-[#faf8f5]">
        <label className="relative block max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-stone-400"/>
          <input aria-label="Search register" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student or class" className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#ea580c]"/>
        </label>
      </div>
      {loading ? (
        <SybellaLoader
          size={72}
          text="Loading your class register"
          showLabel
          primaryColor="#ea580c"
          className="py-12"
        />
      ) : error ? (
        <p role="alert" className="p-6 text-sm text-rose-700">{error}</p>
      ) : visibleStudents.length ? (
        <div className="divide-y divide-stone-100">
          {visibleStudents.map((student) => (
            <div key={student.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#faf8f5]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ffedd5] text-xs font-bold text-[#ea580c]">
                {student.full_name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-stone-900">{student.full_name}</strong>
                <span className="text-xs text-stone-500">{student.class_name}{student.stream ? ` · ${student.stream}` : ''}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-10 text-center">
          <Users className="mx-auto text-stone-300" size={25}/>
          <p className="mt-2 text-sm text-stone-500">{query ? 'No students match your search.' : 'No students are assigned to your classes yet.'}</p>
        </div>
      )}
      <footer className="border-t border-[#e0f2fe] px-5 py-3 text-xs text-stone-500 bg-[#faf8f5]">
        Total: {visibleStudents.length} students
      </footer>
    </section>
  </div>;
}
