export const login = async (email: string, password: string): Promise<User | null> => {
  try {
    console.log('Attempting login with:', { email, password });
    
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
      console.log('No users found');
      throw new Error('Invalid email or password');
    }

    const user = users[0];
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
