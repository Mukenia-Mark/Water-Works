import {
  requireAuth,
  logout,
  getCustomers,
  createCustomer,
  getTodayDate
} from './auth.js';

// New customer page functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  if (!requireAuth()) return;

  // Navigation functionality
  document.getElementById('backBtn').addEventListener('click', function() {
    window.location.href = 'customer-management.html';
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Clear form functionality
  document.getElementById('clearBtn').addEventListener('click', function() {
    document.getElementById('newCustomerName').value = '';
    document.getElementById('newCustomerContact').value = '';
    document.getElementById('newCustomerMeter').value = '';
    document.getElementById('initialReading').value = '';
  });

  // Save customer functionality
  document.getElementById('saveBtn').addEventListener('click', async function() {
    const name = document.getElementById('newCustomerName').value;
    const contact = document.getElementById('newCustomerContact').value;
    const meterNumber = document.getElementById('newCustomerMeter').value;
    const initialReading = document.getElementById('initialReading').value;

    if (name && contact && meterNumber && initialReading) {
      try {
        // Check if meter number already exists
        const customers = await getCustomers();
        if (customers.some(customer => customer.meter_number === meterNumber)) {
          alert('A customer with this meter number already exists!');
          return;
        }

        // Create new customer object
        const newCustomer = {
          name: name,
          contact: contact,
          meter_number: meterNumber,
          last_reading_date: getTodayDate(), // Today's date in dd/mm/yyyy
          billing_history: [] // Initialize empty billing history
        };

        // Save to Supabase
        await createCustomer(newCustomer);

        alert('Customer added successfully with initial reading!');

        // Clear form
        document.getElementById('newCustomerName').value = '';
        document.getElementById('newCustomerContact').value = '';
        document.getElementById('newCustomerMeter').value = '';

        // Redirect to customer management page
        window.location.href = 'customer-management.html';
      } catch (error) {
        alert("Error creating customer: " + error.message);
      }
    } else {
      alert('Please fill in all required fields!');
    }
  });
});
