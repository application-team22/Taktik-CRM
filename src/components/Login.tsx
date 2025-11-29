import { useState } from 'react';
import { LogIn, Loader } from 'lucide-react';
import { login } from '../lib/auth';
import { User } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  language: 'EN' | 'AR';
}

export default function Login({ onLoginSuccess, language }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRTL = language === 'AR';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user) {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXbGugbzv4HWLxhujILeIK99Vc7BtVSsA7Cw&s"
              alt="Taktik Travel Logo"
              className="h-16 w-auto"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Taktik CRM
            </h1>
            <p className="text-gray-600">
              {language === 'EN' ? 'Travel Client Management' : 'إدارة عملاء السفر'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'EN' ? 'Email' : 'البريد الإلكتروني'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={language === 'EN' ? 'Enter your email' : 'أدخل بريدك الإلكتروني'}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'EN' ? 'Password' : 'كلمة المرور'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={language === 'EN' ? 'Enter your password' : 'أدخل كلمة المرور'}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>{language === 'EN' ? 'Logging in...' : 'جاري تسجيل الدخول...'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>{language === 'EN' ? 'Login' : 'تسجيل الدخول'}</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 font-medium mb-2 text-center">
              {language === 'EN' ? 'Demo Credentials:' : 'بيانات تجريبية:'}
            </p>
            <p className="text-xs text-blue-600 text-center font-mono">
              admin@taktiktravel.com
            </p>
            <p className="text-xs text-blue-600 text-center font-mono">
              Admin123!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
