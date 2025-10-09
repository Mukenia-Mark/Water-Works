import {
  requireAuth,
  logout,
  getCustomers,
  formatDate,
  getCurrentUser,
  deleteCustomerById,
  updateCustomer, calculateDueDate,
} from './auth.js';

import {
  recordPartialPayment,
  checkOverduePayments
} from './payment-management.js';

import supabase from './supabase.js';

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

  // Event delegation for all buttons
  document.addEventListener('click', function(e) {
    // WhatsApp button in modal
    if (e.target && e.target.id === 'whatsappBtn') {
      e.preventDefault();
      sendWhatsAppFromModal();
    }

    // WhatsApp buttons in table
    if (e.target && e.target.classList.contains('whatsapp-btn')) {
      e.preventDefault();
      const index = parseInt(e.target.getAttribute('data-index'));
      sendWhatsAppFromTable(index);
    }

    // View buttons in table
    if (e.target && e.target.classList.contains('view-btn')) {
      e.preventDefault();
      const index = parseInt(e.target.getAttribute('data-index'));
      viewCustomerDetails(index);
    }

    // Delete buttons in table
    if (e.target && e.target.classList.contains('delete-btn')) {
      e.preventDefault();
      const index = parseInt(e.target.getAttribute('data-index'));
      deleteCustomer(index);
    }

    if (e.target && e.target.id === 'billCustomerBtn') {
      e.preventDefault();
      billCustomerFromModal();
    }

    // Edit button in modal
    if (e.target && e.target.id === 'editCustomerBtn') {
      e.preventDefault();
      editCustomerDetails(window.currentCustomerIndex);
    }

    // Save edit button in modal
    if (e.target && e.target.id === 'saveEditBtn') {
      e.preventDefault();
      saveCustomerEdits(window.currentCustomerIndex);
    }

    // Cancel edit button in modal
    if (e.target && e.target.id === 'cancelEditBtn') {
      e.preventDefault();
      viewCustomerDetails(window.currentCustomerIndex);
    }
  });

  // WhatsApp functionality functions
  function generateWhatsAppMessage(customer, latestBilling) {
    if (!latestBilling) {
      return encodeURIComponent(`Hello ${customer.name}! Your water bill is ready.`);
    }

    const message = `💧 *Water Bill Receipt* 💧
    
*Customer:* ${customer.name}
*Meter No:* ${customer.meter_number}
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
    if (!cleanPhone.startsWith('254') && cleanPhone.length === 9) {
      formattedPhone = '254' + cleanPhone;
    } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
      formattedPhone = '254' + cleanPhone.substring(1);
    }

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  }

  // Unified WhatsApp function for modal
  async function sendWhatsAppFromModal() {
    try {
      const customers = await getCustomers();
      const customer = customers[window.currentCustomerIndex];

      if (!customer) {
        alert('Customer not found!');
        return;
      }

      await sendCustomerWhatsApp(customer);
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('Error: ' + error.message);
    }
  }

  // Unified WhatsApp function for table
  async function sendWhatsAppFromTable(index) {
    try {
      const customers = await getCustomers();
      const customer = customers[index];

      if (!customer) {
        alert('Customer not found!');
        return;
      }

      await sendCustomerWhatsApp(customer);
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('Error: ' + error.message);
    }
  }

  // Common WhatsApp sending logic
  async function sendCustomerWhatsApp(customer) {
    if (!customer.contact) {
      alert('Customer contact information is missing!');
      return;
    }

    const lastBilling = customer.billing_history && customer.billing_history.length > 0
      ? customer.billing_history[customer.billing_history.length - 1]
      : null;

    if (!lastBilling) {
      alert('No billing history available for this customer!');
      return;
    }

    const message = generateWhatsAppMessage(customer, lastBilling);
    sendWhatsAppMessage(customer.contact, message);
  }

  async function loadCustomers() {
    const customers = await getCustomers();
    displayCustomers(customers);
  }

  async function searchCustomers() {
    const searchTerm = searchInput.value.toLowerCase();
    const customers = await getCustomers();

    if (searchTerm) {
      const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm) ||
        customer.meter_number.toString().includes(searchTerm) ||
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
      const lastBilling = customer.billing_history && customer.billing_history.length > 0
        ? customer.billing_history[customer.billing_history.length - 1]
        : null;

      const lastReading = lastBilling ? lastBilling.currentReading : customer.last_reading;
      const lastReadingDate = lastBilling ? formatDate(lastBilling.date) : formatDate(customer.last_reading_date);

      row.innerHTML = `
        <td>${sanitizeHTML(customer.name)}</td>
        <td>${sanitizeHTML(customer.contact)}</td>
        <td>${sanitizeHTML(customer.meter_number)}</td>
        <td>${sanitizeHTML(customer.monthly_charge)}</td>
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
  }

  async function viewCustomerDetails(index) {
    const customers = await getCustomers();
    const customer = customers[index];

    if (!customer) return;

    // Store the current customer index for editing
    window.currentCustomerIndex = index;

    // Get last reading info
    const lastBilling = customer.billing_history && customer.billing_history.length > 0
      ? customer.billing_history[customer.billing_history.length - 1]
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
            <span class="detail-value">${customer.meter_number}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Monthly Charge:</span>
            <span class="detail-value">${customer.monthly_charge}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Last Reading:</span>
            <span class="detail-value">${lastBilling ? lastBilling.currentReading : customer.last_reading || 'No reading'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Last Reading Date:</span>
            <span class="detail-value">${lastBilling ? formatDate(lastBilling.date) : formatDate(customer.last_reading_date) || 'No date'}</span>
          </div>
        </div>
        <div class="customer-actions" style="margin-top: 20px; text-align: center;">
          <button id="editCustomerBtn" class="edit-btn">Edit Customer</button>
          <button id="billCustomerBtn" class="bill-btn">Bill Customer</button>
          <button id="whatsappBtn" class="modal-whatsapp-btn">Send bill via Whatsapp</button>
        </div>
      </div>
    `;

    // Populate billing history
    const billingHistory = customer.billing_history || [];
    let billingHTML = '';

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
                <td data-label="Date">${formatDate(billing.date)}</td>
                <td data-label="Previous Reading">${billing.previousReading}</td>
                <td data-label="Current Reading">${billing.currentReading}</td>
                <td data-label="Units Used">${billing.consumption}</td>
                <td data-label="Cost per Unit">${billing.unitCost}</td>
                <td data-label="Monthly Charge">${billing.monthlyCharge}</td>
                <td data-label="Total Due">${billing.totalCost}</td>
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

  async function editCustomerDetails(index) {
    const customers = await getCustomers();
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
            <option value="200" ${customer.monthly_charge === 200 ? 'selected' : ''}>Minimum Charge (200)</option>
            <option value="100" ${customer.monthly_charge === 100 ? 'selected' : ''}>Standing Charge (100)</option> 
          </select>
        </div>
        <div class="edit-actions" style="margin-top: 20px; text-align: center;">
          <button id="saveEditBtn" class="save-btn" style="background: #2ecc71; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; margin-right: 10px;">Save Changes</button>
          <button id="cancelEditBtn" class="cancel-btn" style="background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: 600;">Cancel</button>
        </div>
      </div>
    `;

    // Replace customer details with edit form
    document.getElementById('customerDetails').innerHTML = editForm;
  }

  async function saveCustomerEdits(index) {
    const customers = await getCustomers();
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

    try {
      await updateCustomer(customer.id, {
        name: newName,
        contact: newContact,
        monthly_charge: parseInt(newMonthlyCharge)
      });

      // Show success message
      alert("Customer details updated successfully!");

      // Close modal and refresh the customer list
      customerModal.style.display = 'none';
      await loadCustomers();
    } catch (error) {
      alert('Error updating customer: ' + error.message);
    }
  }

  async function deleteCustomer(index) {
    const customers = await getCustomers();
    const customer = customers[index];

    if (!customer) return;

    if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      try {
        await deleteCustomerById(customer.id);
        await loadCustomers(); // Refresh the list
      } catch (error) {
        alert('Error deleting customer: ' + error.message);
      }
    }
  }

  async function billCustomerFromModal() {
    try {
      const customers = await getCustomers();
      const customer = customers[window.currentCustomerIndex]

      if (!customer) {
        alert('Customer not found!');
        return;
      }

        // Close the modal first
        customerModal.style.display = 'none';

        // Redirect to billing page with customer data pre-filled
        const billingUrl = `bill-customer.html?meter=${encodeURIComponent(customer.meter_number)}`;
        window.location.href = billingUrl;

    } catch (error) {
      console.error('Error billing customer:', error);
      alert('Error: ' + error.message);
    }
  }

  function addPaymentMethodSection(customer, billingIndex) {
    const bill = customer.billing_history[billingIndex];
    const payment = bill.payment || {
      status: 'pending',
      amount: bill.totalCost,
      amountPaid: 0,
      balance: bill.totalCost,
      dueDate: calculateDueDate(bill.date),
      payments: []
    };

    const today = new Date();
    const dueDate = new Date(payment.dueDate);
    const daysLate = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
    const isOverDue = daysLate > 0 && payment.balance > 0;

    return `
    <div class="payment-section" ${isOverDue ? 'overdue' : ''}>
      <h4>Payment Management ${isOverDue ? '📅' : ''}</h4>
      
      <div class="payment-summary">
        <div>
          <strong>Total Due:</strong> Ksh ${payment.amountDue}
        </div>
        <div>
          <strong>Amount Paid:</strong> Ksh ${payment.amountPaid}
        </div>
        <div>
          <strong>Balance:</strong> Ksh ${payment.balance}
        </div>
        <div>
          <strong>Status:</strong>
          <span class="payment-status${payment.status}">${payment.status.toUpperCase()}</span>
        </div>
        <div>
          <strong>Due Date:</strong> ${formatDate(payment.dueDate)}
        </div>
        <div>
          <strong>Days Overdue</strong> ${daysLate > 0 ? daysLate + ' days' : 'On time'}
        </div>
      </div>
      
     <!-- Partial Payment Form -->
      <div class="payment-form">
        <h5>Record Payment</h5>
        <div class="payment-form-group">
          <label>Payment Amount (Ksh):</label>
          <input type="number" id="paymentAmount" class="payment-input" 
                 value="${payment.balance}" min="0" max="${payment.balance}"
                 placeholder="Enter payment amount">
        </div>
        <div class="payment-form-group">
          <label>Payment Method:</label>
          <select id="paymentMethod" class="payment-input">
            <option value="MPESA">M-Pesa</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>
        <div class="payment-form-group">
          <label>Transaction/Reference Number:</label>
          <input type="text" id="transactionId" class="payment-input" placeholder="Enter transaction reference">
        </div>
        <div class="payment-form-group">
          <label>Payment Date:</label>
          <input type="date" id="paymentDate" class="payment-input" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="payment-form-group">
          <label>Notes (optional):</label>
          <input type="text" id="paymentNotes" class="payment-input" placeholder="Any payment notes">
        </div>
        <div class="payment-actions">
          <button class="payment-btn primary" onclick="recordPartialPaymentForBill('${customer.id}', ${billingIndex})">
            Record Payment
          </button>
          ${payment.balance > 0 ? `
            <button class="payment-btn success" 
                    onclick="recordFullPaymentForBill('${customer.id}', ${billingIndex})">
              Mark as Fully Paid
            </button>
          ` : ''}
        </div>
      </div>
      
      <!-- Payment History -->
      ${payment.payments.length > 0 ? `
        <div class="payment-history">
          <h5>Payment History</h5>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${payment.payments.map(p => `
                <tr>
                  <td>${formatDate(p.date)}</td>
                  <td>Ksh ${p.amount}</td>
                  <td>${p.method}</td>
                  <td>${p.transactionId || '-'}</td>
                  <td>${p.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;
  }

  // Update billing history display function
  function displayBillingHistoryWithPayments(billingHistory, customer) {
    if (billingHistory.length === 0) {
      return '<p>No billing history available.</p>';
    }

    return `
    <table class="billing-table-with-payments">
      <thead>
        <tr>
          <th>Date</th>
          <th>Previous</th>
          <th>Current</th>
          <th>Units</th>
          <th>Total Due</th>
          <th>Amount Paid</th>
          <th>Balance</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${billingHistory.map((bill, index) => {
      const payment = bill.payment || {
        status: 'pending',
        amountDue: bill.totalCost,
        amountPaid: 0,
        balance: bill.totalCost
      };

      return `
            <tr>
              <td data-label="Date">${formatDate(bill.date)}</td>
              <td data-label="Previous">${bill.previousReading}</td>
              <td data-label="Current">${bill.currentReading}</td>
              <td data-label="Units">${bill.consumption}</td>
              <td data-label="Total Due">${payment.amountDue}</td>
              <td data-label="Amount Paid">${payment.amountPaid}</td>
              <td data-label="Balance">${payment.balance}</td>
              <td data-label="Status">
                <span class="payment-status ${payment.status}">${payment.status.toUpperCase()}</span>
              </td>
              <td data-label="Actions">
                <button class="view-btn" onclick="viewBillDetails('${customer.id}', ${index})">
                  Manage
                </button>
              </td>
            </tr>
          `;
    }).join('')}
      </tbody>
    </table>
  `;
  }

  async function recordPartialPaymentForBill(customerId, billingIndex) {
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
    const paymentMethod = document.getElementById('paymentMethod').value;
    const transactionId = document.getElementById('transactionId').value;
    const paymentDate = document.getElementById('paymentDate').value;
    const paymentNotes = document.getElementById('paymentNotes').value;

    if (!paymentAmount || paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      await recordPartialPayment(customerId, billingIndex, {
        amount: paymentAmount,
        method: paymentMethod,
        transactionId: transactionId,
        date: paymentDate,
        notes: paymentNotes
      });

      alert('Payment recorded successfully!');
      viewCustomerDetails(window.currentCustomerIndex);
    } catch (error) {
      alert('Error recording payment: ' + error.message);
    }
  }

  async function recordFullPaymentForBill(customerId, billingIndex) {
    const customers = await getCustomers();
    const customer = customers.find(c => c.id === customerId);
    const bill = customer.billing_history[billingIndex];
    const balance = bill.payment.balance;

    // Auto-fill the payment amount with the full balance
    document.getElementById('paymentAmount').value = balance;
    await recordPartialPaymentForBill(customerId, billingIndex);
  }

  function viewBillDetails(customerId, billingIndex) {
    // This function would show a detailed view of a specific bill
    // For now, we'll just open the customer modal at the specific bill
    // You can implement this based on your needs
    console.log('View bill details:', customerId, billingIndex);
  }

  // Load customers on page load
  loadCustomers();
});