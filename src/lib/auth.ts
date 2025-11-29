import { supabase, User } from './supabase';

export const login = async (email: string, password: string): Promise<User | null> => {
  try {
    console.log('Attempting login with:', { email, password });

    // First, fetch ALL users to see what's in the database
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('*');
    console.log('===== ALL USERS IN TABLE =====');
    console.log('All users in database:', allUsers);
    console.log('All users error:', allUsersError);
    console.log('Number of users found:', allUsers?.length || 0);

    // Now try to find the specific user
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password_hash', password);

    console.log('Query result:', { users, error });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error('Invalid email or password');
    }

    if (!users || users.length === 0) {
      console.log('No users found with these credentials');
      throw new Error('Invalid email or password');
    }

    const user = users[0];
    console.log('User found:', user);

    // Check if the user account is active
    if (user.is_active === false) {
      console.log('User account is deactivated');
      throw new Error('Your account has been deactivated. Please contact an administrator.');
    }

    console.log('Login successful:', user);

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

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('taktik_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const logout = (): void => {
  localStorage.removeItem('taktik_user');
};

export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};
