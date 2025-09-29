// auth.js - Supabase authentication
import supabase from './supabase.js';

let currentUser = null;
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

function sanitizeInput(input) {
  if (typeof input !== "string") return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;');
}

// Initialize auth state
async function initAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      localStorage.setItem('userId', session.user.id);
      localStorage.setItem('username', session.user.user_metadata?.username || session.user.email);

      await checkCustomerSchema();
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

// Input validation functions
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

// Login function
async function login(email, password) {
  try {
    // Check if IP/email is locked out
    const now = Date.now();
    const attempt = failedAttempts.get(email);

    if (attempt && attempt.count >= MAX_ATTEMPTS) {
      if (now - attempt.lastAttempt < LOCKOUT_TIME) {
        throw new Error(
          'Too many failed attempts. Please try again in 15 minutes!',
        );
      } else {
        // Reset after lockout time
        failedAttempts.delete(email);
      }
    }

    // Validates inputs
    if (!validateEmail(email)) {
      throw new Error('Please enter a valid email address!');
    }

    if (!validatePassword(password)) {
      throw new Error('Password must be at least 6 characters long!');
    }

    const sanitizedEmail = sanitizeInput(email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password: password,
    });

    if (error) throw error;

    if (data.user) {
      currentUser = data.user;
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem(
        'username',
        data.user.user_metadata?.username || data.user.email,
      );
      localStorage.setItem('loginTime', new Date().toISOString());

      return { success: true, user: currentUser };
    }
  } catch (error) {
    // Track failed attempts
    const attempt = failedAttempts.get(email) || { count: 0, lastAttempt: 0 };
    attempt.count++;
    attempt.lastAttempt = Date.now();
    failedAttempts.set(email, attempt);

    throw error;
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
async function getCustomers() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
    console.log('No user ID found');
    return [];
  }

  try {
    const { data, error } = await supabase
        .from('customers')
        .select("")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting customers:', error);
    return [];
  }
}

async function saveCustomers(customers) {
  const userId = localStorage.getItem('userId');
  if (!userId) throw new Error('User not authenticated!');

  try {
      console.warn('saveCustomers called - consider using specific CRUD functions instead');
      return true;
  } catch (error) {
    console.error('Error saving customers:', error);
    throw error;
  }
}

async function createCustomer(customerData) {
    const userId = localStorage.getItem('userId');
    if (!userId) throw new Error('User not authenticated!');

    try {
        const { data, error } = await supabase
            .from('customers')
            .insert([
                {
                    user_id: userId,
                    name: customerData.name,
                    contact: customerData.contact,
                    meter_number: customerData.meter_number,
                    monthly_charge: customerData.monthly_charge,
                    last_reading: customerData.last_reading,
                    last_reading_date: customerData.last_reading_date,
                    billing_history: customerData.billing_history || []
                }
            ])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
}

async function updateCustomer(customerId, updates) {
  try {
    const dbUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (key === "billingHistory") {
        dbUpdates.billing_history = updates[key];
      } else if (key === "lastReading") {
        dbUpdates.last_reading = updates[key];
      } else if (key === 'lastReadingDate') {
        dbUpdates.last_reading_date = updates[key];
      } else if (key === 'meterNumber') {
        dbUpdates.meter_number = updates[key];
      } else if (key === 'monthlyCharge') {
        dbUpdates.monthly_charge = updates[key];
      } else {
        dbUpdates[key] = updates[key];
      }
    });

    const { data, error } = await supabase
      .from('customers')
      .update(dbUpdates)
      .eq("id", customerId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
}

async function deleteCustomer(customerId) {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
}

async function deleteCustomerById(customerId) {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting customer:', error);
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

// Debug database schema
async function checkCustomerSchema() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Schema check failed:', error);
      return false;
    }

    console.log('Database schema is accessible');
    return true;
  } catch (error) {
    console.error('Schema check error:', error);
    return false;
  }
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
  createCustomer,
  updateCustomer,
  deleteCustomer,
  deleteCustomerById,
  formatDate,
  getTodayDate,
  getTodayDateForInput
};