// auth.js - Supabase authentication
import supabase from './supabase.js';

let currentUser = null;

// Initialize auth state
async function initAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      localStorage.setItem('userId', session.user.id);
      localStorage.setItem('username', session.user.user_metadata?.username || session.user.email);
    }
  } catch (error) {
    console.error('Auth init error:', error);
  }
}

// Check if user is logged in
function checkAuth() {
  return !!currentUser || !!localStorage.getItem('userId');
}

// Require authentication
function requireAuth() {
  if (!checkAuth()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// Login function
async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;

    if (data.user) {
      currentUser = data.user;
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('username', data.user.user_metadata?.username || data.user.email);
      localStorage.setItem('loginTime', new Date().toISOString());

      return { success: true, user: currentUser };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Register new user
async function register(email, password, username) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username
        }
      }
    });

    if (error) throw error;

    return {
      success: true,
      message: 'Registration successful! Please check your email to verify your account.'
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
}

// Logout function
async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('loginTime');
    currentUser = null;
    window.location.href = 'index.html';
  }
}

// Get current user info
function getCurrentUser() {
  if (currentUser) {
    return {
      id: currentUser.id,
      username: currentUser.user_metadata?.username || currentUser.email,
      email: currentUser.email,
      loginTime: localStorage.getItem('loginTime')
    };
  } else {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');

    if (userId && username) {
      return {
        id: userId,
        username: username,
        loginTime: localStorage.getItem('loginTime')
      };
    }

    return null;
  }
}

// Customer management functions (localStorage fallback)
function getCustomers() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    console.log('No user ID found');
    return [];
  }

  try {
    const customers = localStorage.getItem(`customers_${userId}`);
    console.log('Retrieved customers:', customers);
    return customers ? JSON.parse(customers) : [];
  } catch (error) {
    console.error('Error getting customers:', error);
    return [];
  }
}

function saveCustomers(customers) {
  const userId = localStorage.getItem('userId');
  if (!userId) throw new Error('User not authenticated!');

  try {
    localStorage.setItem(`customers_${userId}`, JSON.stringify(customers));
    return true;
  } catch (error) {
    console.error('Error saving customers:', error);
    throw error;
  }
}

// Data formatting functions
function formatDate(dateString) {
  if (!dateString) return '';

  try {
  // Handle both ISO format and dd/mm/yyyy format
    let date;
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      date = new Date(parts[2], parts[1] - 1, parts[0]);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString; // Return original string on error
  }
}

function getTodayDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}

function getTodayDateForInput() {
  return new Date().toISOString().split('T')[0];
}

// Initialize auth when module loads
initAuth();

export {
  checkAuth,
  requireAuth,
  login,
  register,
  logout,
  getCurrentUser,
  getCustomers,
  saveCustomers,
  formatDate,
  getTodayDate,
  getTodayDateForInput
};