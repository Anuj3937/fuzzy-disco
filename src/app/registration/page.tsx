'use client';

import { T } from '@/components/T'; // Added Import
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

type Role = 'student' | 'teacher' | 'parent' | '';

export default function ShikshaSetuRegistration() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    role: '' as Role,
    name: '',
    email: '',
    password: '',
    language: '',
    phone: '',
    className: [] as string[],
    subject: '',
    childName: '',
    childEmail: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSingleClassSelect = (value: string) => {
    setFormData(prev => ({ ...prev, className: value ? [value] : [] }));
  };

  const toggleTeacherClass = (cls: string, checked: boolean) => {
    setFormData(prev => {
      const set = new Set(prev.className);
      if (checked) set.add(cls);
      else set.delete(cls);
      return { ...prev, className: Array.from(set) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Validation checks remain the same
    if (!formData.role) return alert('Please select a role.');
    if (formData.role === 'teacher' && formData.className.length === 0) {
      return alert('Teachers must choose at least one class.');
    }
    if (formData.role === 'teacher' && !formData.subject) {
      return alert('Please select a subject.');
    }
    if (formData.role !== 'teacher' && !formData.className[0]) {
      return alert('Please select a class.');
    }
    if (formData.role === 'parent' && (!formData.childName || !formData.childEmail)) {
      return alert("Please provide your child's name and email.");
    }
    if ((formData.role === 'teacher' || formData.role === 'parent') && !formData.phone) {
      return alert('Please provide a phone number.');
    }

    try {
      setLoading(true);

      const cred = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      if (formData.name) {
        await updateProfile(cred.user, { displayName: formData.name });
      }

      const userRef = doc(db, 'users', cred.user.uid);
      const base = {
        role: formData.role,
        email: formData.email,
        language: formData.language,
        createdAt: serverTimestamp(),
      };

      if (formData.role === 'teacher') {
        await setDoc(userRef, {
          ...base,
          fullName: formData.name || 'Unknown teacher',
          className: formData.className,
          subject: formData.subject,
          phoneNumber: formData.phone,
        });
      } else if (formData.role === 'student') {
        await setDoc(userRef, {
          ...base,
          fullName: formData.name || 'Unknown',
          className: formData.className[0] || '-',
          subject: '',
        });
      } else if (formData.role === 'parent') {
        await setDoc(userRef, {
          ...base,
          fullName: formData.name || 'Unknown',
          className: formData.className[0] || '-',
          childName: formData.childName,
          childEmail: formData.childEmail,
          subject: '',
          phoneNumber: formData.phone,
        });
      }

      try {
        await sendEmailVerification(cred.user);
      } catch { /* non-blocking */ }

      localStorage.setItem('user', JSON.stringify(formData));

      alert('✅ Registered successfully! Please verify your email if requested.');
      router.push('/login');
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.code === 'auth/email-already-in-use'
          ? 'Email already in use'
          : err?.code === 'auth/weak-password'
          ? 'Weak password (min 6 characters)'
          : err?.message || 'Registration failed';
      alert(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const classOptions = ['7th', '8th', '9th'];
  const languageOptions = [
    'English',
    'Hindi',
    'Marathi',
    'Tamil',
    'Punjabi',
    'Bengali',
    'Assamese',
  ];
  const subjectOptions = ['Science', 'Maths', 'SSC'];

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#EBDDFB] via-[#F3E8FF] to-[#D8D0FF] p-6">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden opacity-40 pointer-events-none">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-purple-300 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-300 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-pink-200 rounded-full blur-3xl opacity-40 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl w-full max-w-md p-8 border border-white/40 transition-transform transform hover:scale-[1.02] duration-300 ease-in-out">
        <h1 className="text-4xl font-extrabold text-center text-purple-700 mb-3">
          Shiksha Setu {/* Brand Name */}
        </h1>
        <p className="text-center text-gray-500 mb-6">
          <T>Join the bridge to better learning</T> 🌱
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1"><T>Role</T></label>
            <select
              name="role"
              value={formData.role}
              onChange={e => {
                const val = (e.target.value as Role) || '';
                setFormData(prev => ({
                  ...prev,
                  role: val, subject: '', className: [], childName: '', childEmail: '', phone: '',
                }));
              }}
              required
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70"
            >
              <option value=""><T>Select Role</T></option>
              <option value="student"><T>Student</T></option>
              <option value="teacher"><T>Teacher</T></option>
              <option value="parent"><T>Parent</T></option>
            </select>
          </div>

          {/* Name */}
          {formData.role && (
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                {formData.role === 'parent' ? <T>Parent's Name</T> : <T>Full Name</T>}
              </label>
              <input
                type="text" name="name" value={formData.name} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70 placeholder-gray-400"
                placeholder={formData.role === 'parent' ? "Enter parent's full name" : 'Enter your full name'} // Placeholder translation is hard
              />
            </div>
          )}

          {/* Student Specific */}
          {formData.role === 'student' && (
            <>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Class</T></label>
                <select name="classNameSingle" value={formData.className[0] || ''} onChange={e => handleSingleClassSelect(e.target.value)} required className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70">
                  <option value=""><T>Select Class</T></option>
                  {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Email ID</T></label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="off" className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70" placeholder="Enter your email" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Password</T></label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} autoComplete="new-password" className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70" placeholder="Create a password" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Language</T></label>
                <select name="language" value={formData.language} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70">
                  <option value=""><T>Choose Language</T></option>
                  {languageOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Teacher Specific */}
          {formData.role === 'teacher' && (
            <>
              <div>
                <label className="block font-semibold text-gray-700 mb-2"><T>Classes</T></label>
                <div className="flex flex-wrap gap-4">
                  {classOptions.map(cls => (
                    <label key={cls} className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4 accent-purple-500" checked={formData.className.includes(cls)} onChange={e => toggleTeacherClass(cls, e.target.checked)} />
                      <span>{cls}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Subject</T></label>
                <select name="subject" value={formData.subject} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70">
                  <option value=""><T>Select Subject</T></option>
                  {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Phone Number</T></label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required inputMode="tel" minLength={7} maxLength={15} className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70" placeholder="e.g., 9876543210" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Email ID</T></label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="off" className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70" placeholder="Enter your email" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Password</T></label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} autoComplete="new-password" className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70" placeholder="Create a password" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Language</T></label>
                <select name="language" value={formData.language} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70">
                  <option value=""><T>Choose Language</T></option>
                  {languageOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Parent Specific */}
          {formData.role === 'parent' && (
            <>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Child's Name</T></label>
                <input type="text" name="childName" value={formData.childName} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70" placeholder="Enter child's full name" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Child's Email</T></label>
                <input type="email" name="childEmail" value={formData.childEmail} onChange={handleChange} required autoComplete="off" className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70" placeholder="Enter child's email" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Child's Class</T></label>
                <select name="classNameSingle" value={formData.className[0] || ''} onChange={e => handleSingleClassSelect(e.target.value)} required className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70">
                  <option value=""><T>Select Class</T></option>
                  {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Parent's Phone Number</T></label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required inputMode="tel" minLength={7} maxLength={15} className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70" placeholder="e.g., 9876543210" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Parent's Email</T></label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required autoComplete="off" className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70" placeholder="Enter parent's email" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Password</T></label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} autoComplete="new-password" className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70" placeholder="Create a password" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1"><T>Language</T></label>
                <select name="language" value={formData.language} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white/70">
                  <option value=""><T>Choose Language</T></option>
                  {languageOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Submit */}
          {formData.role && (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-lg py-3 mt-4 shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-300 disabled:opacity-60"
            >
              {loading ? <T>Registering...</T> : <T>Register</T>}
            </button>
          )}
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          <T>Already have an account?</T>{' '}
          <a href="/login" className="text-purple-700 font-semibold hover:underline">
            <T>Login</T>
          </a>
        </p>
      </div>
    </div>
  );
}