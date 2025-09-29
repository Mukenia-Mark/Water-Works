import {
  requireAuth,
  logout,
  getCustomers,
  saveCustomers,
  formatDate,
  getCurrentUser
} from './auth.js';

// Customer management page functionality (now the home page)
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  if (!requireAuth()) return;

  // Display username
  const user = getCurrentUser();
  document.getElementById('userDisplay').textContent = user.username || 'User';

  // Navigation functionality
  document.getElementById('logoutBtn').addEventListener('click', logout);

  document.getElementById('newCustomerBtn').addEventListener('click', function() {
    window.location.href = 'new-customer.html';
  });

  document.getElementById('billingBtn').addEventListener('click', function() {
    window.location.href = 'bill-customer.html';
  });

  // DOM elements
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const customersTableBody = document.getElementById('customersTableBody');
  const noCustomersMessage = document.getElementById('noCustomersMessage');
  const customerModal = document.getElementById('customerModal');
  const closeModal = document.querySelector('.close');

  // Search functionality
  searchBtn.addEventListener('click', searchCustomers);

  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      searchCustomers();
    }
  });

  // Modal functionality
  closeModal.addEventListener('click', function() {
    customerModal.style.display = 'none';
  });

  window.addEventListener('click', function(event) {
    if (event.target === customerModal) {
      customerModal.style.display = 'none';
    }
  });

  // Whatsapp functionality functions
  function generateWhatsAppMessage(customer, latestBilling) {
    if (!latestBilling) {
      return`Hello ${customer.name}! Your water bill is ready.`;
    }

    const message = `💧 *Water Bill Receipt* 💧
    
    *Customer:* ${customer.name}
    *Meter No:* ${customer.meterNumber}
    *Bill Date:* ${formatDate(latestBilling.date)}
    
    *Meter Readings:*
    - Previous: ${latestBilling.previousReading} units
    - Current: ${latestBilling.currentReading} units
    - Consumption: ${latestBilling.consumption} units
    
    *Charges:*
    - Water Usage (${latestBilling.consumption} units x Ksh ${latestBilling.unitCost} per unit): Ksh ${(latestBilling.consumption * latestBilling.unitCost).toFixed(2)}
    - Monthly Charge: Ksh ${latestBilling.monthlyCharge}
    - *Total Amount Due: Ksh ${latestBilling.totalCost}*
    
    Please make your payment as soon as possible. Thank you!`;

    return encodeURIComponent(message);
  }

  function sendWhatsAppMessage(phoneNumber, message) {
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Check if number has a country code, if not assume kenya (+254)
    let formattedPhone = cleanPhone;
    if (!cleanPhone.startsWith('+254') && cleanPhone.length === 9) {
      formattedPhone = '254' + cleanPhone;
    } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
      formattedPhone = '254' + cleanPhone.substring(1);
    }

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  }

  function sendWhatsAppFromTable(index) {
    const customers = getCustomers();
    const customer = customers[index];

    if (!customer) return;

    const lastBilling = customer.billingHistory && customer.billingHistory.length > 0
      ? customer.billingHistory[customer.billingHistory.length - 1]
      : null;

    if (!lastBilling) {
      alert('No billing history available for this customer!');
      return;
    }

    const message = generateWhatsAppMessage(customer, lastBilling);
    sendWhatsAppMessage(customer.contact, message);
  }

  // Load customers on page load
  loadCustomers();

  function loadCustomers() {
    const customers = getCustomers();
    displayCustomers(customers);
  }

  function searchCustomers() {
    const searchTerm = searchInput.value.toLowerCase();
    const customers = getCustomers();

    if (searchTerm) {
      const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm) ||
        customer.meterNumber.toString().includes(searchTerm) ||
        customer.contact.includes(searchTerm)
      );
      displayCustomers(filteredCustomers);
    } else {
      displayCustomers(customers);
    }
  }

  function sanitizeHTML(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function displayCustomers(customers) {
    customersTableBody.innerHTML = '';

    if (customers.length === 0) {
      noCustomersMessage.style.display = 'block';
      return;
    }

    noCustomersMessage.style.display = 'none';

    customers.forEach((customer, index) => {
      const row = document.createElement('tr');

      // Get last reading info
      const lastBilling = customer.billingHistory && customer.billingHistory.length > 0
        ? customer.billingHistory[customer.billingHistory.length - 1]
        : null;

      const lastReading = lastBilling ? lastBilling.currentReading : customer.lastReading;
      const lastReadingDate = lastBilling ? formatDate(lastBilling.date) : formatDate(customer.lastReadingDate);

      row.innerHTML = `
                <td>${sanitizeHTML(customer.name)}</td>
                <td>${sanitizeHTML(customer.contact)}</td>
                <td>${sanitizeHTML(customer.meterNumber)}</td>
                <td>${sanitizeHTML(customer.monthlyCharge)}</td>
                <td>${sanitizeHTML(lastReading || 'No reading')}</td>
                <td>${sanitizeHTML(lastReadingDate || 'No date')}</td>
                <td class="actions">
                    <button class="view-btn" data-index="${index}">View</button>
                    <button class="whatsapp-btn" data-index="${index}">WhatsApp</button>
                    <button class="delete-btn" data-index="${index}">Delete</button>
                </td>
            `;

      customersTableBody.appendChild(row);
    });

    // Add event listeners to action buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        viewCustomerDetails(index);
      });
    });

    document.querySelectorAll('.whatsapp-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        sendWhatsAppFromTable(index);
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        deleteCustomer(index);
      });
    });
  }

  function viewCustomerDetails(index) {
    const customers = getCustomers();
    const customer = customers[index];

    if (!customer) return;

    // Store the current customer index for editing
    window.currentCustomerIndex = index;

    // Get last reading info
    const lastBilling = customer.billingHistory && customer.billingHistory.length > 0
      ? customer.billingHistory[customer.billingHistory.length - 1]
      : null;

    // Populate customer details
    document.getElementById('customerDetails').innerHTML = `
            <div class="customer-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${customer.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Contact:</span>
                        <span class="detail-value">${customer.contact}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Meter Number:</span>
                        <span class="detail-value">${customer.meterNumber}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Monthly Charge:</span>
                        <span class="detail-value">${customer.monthlyCharge}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Reading:</span>
                        <span class="detail-value">${lastBilling ? lastBilling.currentReading : customer.lastReading || 'No reading'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Reading Date:</span>
                        <span class="detail-value">${lastBilling ? formatDate(lastBilling.date) : formatDate(customer.lastReadingDate) || 'No date'}</span>
                    </div>
                </div>
                <div class="customer-actions" style="margin-top: 20px; text-align: center;">
                    <button id="editCustomerBtn" class="edit-btn">Edit Customer</button>
                    <button id="whatsappBtn" class="modal-whatsapp-btn">Send via Whatsapp</button>
                </div>
            </div>
        `;

    // Add event listener to edit button
    document.getElementById('editCustomerBtn').addEventListener('click', function() {
      editCustomerDetails(index);
    });

    // Add event listener to WhatsApp button
    const whatsappBtn = document.getElementById('whatsappBtn');
    if (whatsappBtn) {
      whatsappBtn.addEventListener('click', function() {
        const message = generateWhatsAppMessage(customer, lastBilling);
        sendWhatsAppMessage(customer.contact, message);
      });
    }

    // Populates billing history
    const billingHistory = customer.billingHistory || [];
    let billingHTML = 'No Billing History';

    if (billingHistory.length === 0) {
      billingHTML = '<p>No billing history available.</p>';
    } else {
      billingHTML = `
                <table class="billing-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Previous Reading</th>
                            <th>Current Reading</th>
                            <th>Units Used</th>
                            <th>Cost per Unit (Ksh)</th>
                            <th>Monthly Cost (Ksh)</th>
                            <th>Total Due (Ksh)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${billingHistory.map(billing => `
                            <tr>
                                <td>${formatDate(billing.date)}</td>
                                <td>${billing.previousReading}</td>
                                <td>${billing.currentReading}</td>
                                <td>${billing.consumption}</td>
                                <td>${billing.unitCost}</td>
                                <td>${billing.monthlyCharge}</td>
                                <td>${billing.totalCost}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
    }

    document.getElementById('billingHistoryContent').innerHTML = billingHTML;

    // Show modal
    customerModal.style.display = 'flex';
  }

  function editCustomerDetails(index) {
    const customers = getCustomers();
    const customer = customers[index];

    if (!customer) return;

    // Create a simple form for editing
    const editForm = `
      <div class="edit-form">
        <div class="form-group">
          <label for="editName">Name:</label>
          <input type="text" id="editName" value="${customer.name}" class="edit-input"/>
        </div>
        <div class="form-group">
          <label for="editContact">Contact:</label>
          <input type="text" id="editContact" value="${customer.contact}" class="edit-input"/>
        </div>
        <div class="form-group">
          <label for="editMonthlyCharge">Monthly Charge:</label>
          <select id="editMonthlyCharge" class="edit-input">
            <option value="200" ${customer.monthlyCharge === 200 ? 'selected' : ''}>Minimum Charge (200)</option>
            <option value="100" ${customer.monthlyCharge === 100 ? 'selected' : ''}>Standing Charge (100)</option> 
          </select>
        <div class="edit-actions" style="margin-top: 20px; text-align: center;">
                <button id="saveEditBtn" class="save-btn" style="background: #2ecc71; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; margin-right: 10px;">Save Changes</button>
                <button id="cancelEditBtn" class="cancel-btn" style="background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: 600;">Cancel</button>
            </div>
        </div>
      </div>
    `;

    // Replace customer details with edit form
    document.getElementById('customerDetails').innerHTML = editForm;

    // Add event listeners for edit form buttons
    document.getElementById('saveEditBtn').addEventListener('click', function() {
      saveCustomerEdits(index);
    });

    document.getElementById('cancelEditBtn').addEventListener('click', function() {
      // Reload the customer details view
      viewCustomerDetails(index);
    });
  }

  // Add the saveCustomerEdits function
  function saveCustomerEdits(index) {
    const customers = getCustomers();
    const customer = customers[index];

    if (!customer) return;

    const newName = document.getElementById('editName').value;
    const newContact = document.getElementById('editContact').value;
    const newMonthlyCharge = document.getElementById('editMonthlyCharge').value;

    // Basic validation
    if (!newName || !newContact) {
      alert("Please fill in all fields!");
      return;
    }

    // Update customer details
    customer.name = newName;
    customer.contact = newContact;
    customer.monthlyCharge = newMonthlyCharge;

    // Save changes
    saveCustomers(customers);

    // Show success message
    alert('Customer details updated successfully!');

    // Reload the customer details view
    viewCustomerDetails(index);

    // Refresh the customer list to reflect changes
    loadCustomers();
  }

  function deleteCustomer(index) {
    if (
      confirm(
        'Are you sure you want to delete this customer? This action cannot be undone.',
      )
    ) {
      const customers = getCustomers();
      customers.splice(index, 1);
      saveCustomers(customers);
      loadCustomers(); // Refresh the list
    }
  }
});