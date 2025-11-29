import { supabase, User } from './supabase';
import bcrypt from 'bcryptjs';

export const login = async (email: string, password: string): Promise<User | null> => {
  try {
    // Fetch user by email
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error || !users || users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Store session
    const userData: User = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    };
    
    localStorage.setItem('taktik_user', JSON.stringify(userData));
    
    return userData;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('taktik_user');
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('taktik_user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};
