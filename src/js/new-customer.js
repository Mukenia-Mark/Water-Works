import {
  requireAuth,
  logout,
  getCustomers,
  saveCustomers,
  getTodayDate
} from './auth.js';

// New customer page functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  if (!requireAuth()) return;

  // Navigation functionality
  document.getElementById('backBtn').addEventListener('click', function() {
    window.location.href = '../html/customer-management.html';
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Clear form functionality
  document.getElementById('clearBtn').addEventListener('click', function() {
    document.getElementById('newCustomerName').value = '';
    document.getElementById('newCustomerContact').value = '';
    document.getElementById('newCustomerMeter').value = '';
    document.getElementById('initialReading').value = '';
    document.getElementById('minimumCharge').checked = true;
  });

  // Save customer functionality
  document.getElementById('saveBtn').addEventListener('click', function() {
    const name = document.getElementById('newCustomerName').value;
    const contact = document.getElementById('newCustomerContact').value;
    const meterNumber = document.getElementById('newCustomerMeter').value;
    const initialReading = document.getElementById('initialReading').value;
    const monthlyCharge = document.querySelector('input[name="monthlyCharge"]:checked').value;

    if (name && contact && meterNumber && initialReading) {
      // Get existing customers or initialize empty array
      const customers = getCustomers();

      // Check if meter number already exists
      if (customers.some(customer => customer.meterNumber === meterNumber)) {
        alert('A customer with this meter number already exists!');
        return;
      }

      // Create new customer object with initial reading
      const newCustomer = {
        name: name,
        contact: contact,
        meterNumber: meterNumber,
        monthlyCharge: monthlyCharge,
        lastReading: parseInt(initialReading),
        lastReadingDate: getTodayDate(), // Today's date in dd/mm/yyyy
        billingHistory: [] // Initialize empty billing history
      };

      // Add to customers array
      customers.push(newCustomer);

      // Save back to localStorage
      saveCustomers(customers);

      alert('Customer added successfully with initial reading!');

      // Clear form
      document.getElementById('newCustomerName').value = '';
      document.getElementById('newCustomerContact').value = '';
      document.getElementById('newCustomerMeter').value = '';
      document.getElementById('initialReading').value = '';
      document.getElementById('minimumCharge').checked = true;

      // Redirect to customer management page
      window.location.href = '../html/customer-management.html';
    } else {
      alert('Please fill in all required fields!');
    }
  });
});