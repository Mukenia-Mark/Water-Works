import {
  requireAuth,
  logout,
  getCustomers,
  formatDate,
  getCurrentUser,
  deleteCustomerById,
  updateCustomer,
  calculateDueDate
} from './auth.js';

import {
  recordPartialPayment
} from './payment-management.js';

import {
  generateWhatsAppMessage,
  sendWhatsAppMessage,
  sanitizeHTML
} from './utilities.js';

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
    customerModal.classList.remove('show');
  });

  window.addEventListener('click', function(event) {
    if (event.target === customerModal) {
      customerModal.classList.remove('show');
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

    // Manage bill button in billing history
    if (e.target && e.target.classList.contains('manage-bill-btn')) {
      e.preventDefault();
      const meterNumber = e.target.getAttribute('data-meter-number');
      const billingIndex = parseInt(e.target.getAttribute('data-billing-index'));
      console.log("Manage bill clicked - Meter: ", meterNumber, 'Index:', billingIndex);
      viewBillDetails(meterNumber, billingIndex);
    }
  });

  // WhatsApp functionality functions
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
    try {
      const customers = await getCustomers();
      if (!customers) {
        console.error('No customer data received');
        displayCustomers([]);
        return;
      }
      displayCustomers(customers);
    } catch (error) {
      console.error('Error loading customers:', error);
      displayCustomers([])
    }
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

  // Add this function to calculate total due including all unpaid bills
  function calculateTotalDue(customer) {
    if (!customer.billing_history || customer.billing_history.length === 0) {
      return '0.00';
    }

    const totalDue = customer.billing_history.reduce((total, bill) => {
      if (bill.payment && bill.payment.balance > 0) {
        return total + bill.payment.balance;
      }
      // If no payment object, assume full amount is due
      if (!bill.payment && bill.totalCost) {
        return total + bill.totalCost;
      }
      return total;
    }, 0);

    return totalDue.toFixed(2);
  }

  // Add this function to get detailed due breakdown for display
  function getDueBreakdown(customer) {
    if (!customer.billing_history || customer.billing_history.length === 0) {
      return { current: '0.00', previous: '0.00', total: '0.00' };
    }

    let currentBill = 0;
    let previousBalance = 0;

    customer.billing_history.forEach((bill, index) => {
      const billBalance = bill.payment ? bill.payment.balance : bill.totalCost;

      // Current bill is the most recent one
      if (index === customer.billing_history.length - 1) {
        currentBill = billBalance;
      } else {
        // All other bills are previous balance
        previousBalance += billBalance;
      }
    });

    const totalDue = currentBill + previousBalance;

    return {
      current: currentBill.toFixed(2),
      previous: previousBalance.toFixed(2),
      total: totalDue.toFixed(2)
    };
  }

  function integratePaymentManagement(customer) {
    const billingHistory = customer.billing_history || [];

    if (billingHistory.length === 0) {
      return '<p>No billing history available.</p>';
    }

    // Create a billing history table with payment management
    return `
      <div class="billing-payment-section">
        <h3> Billing History & Payments</h3>
        ${displayBillingHistoryWithPayments(billingHistory, customer)}
      </div>
    `;
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

    // Calculate due breakdown
    const dueBreakdown = getDueBreakdown(customer);

    // Populate customer details
    document.getElementById('customerDetails').innerHTML = `
      <div class="customer-details-integrated">
        <div class="details-section">
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
              <span class="detail-value">Ksh ${customer.monthly_charge}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Last Reading:</span>
              <span class="detail-value">${lastBilling ? lastBilling.currentReading : customer.last_reading || 'No reading'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Last Reading Date:</span>
              <span class="detail-value">${lastBilling ? formatDate(lastBilling.date) : formatDate(customer.last_reading_date) || 'No date'}</span>
            </div>
            ${parseFloat(dueBreakdown.previous) > 0 ? `
            <div class="detail-item previous-balance-item">
              <span class="detail-label">Previous Balance:</span>
              <span class="detail-value previous-balance">Ksh ${dueBreakdown.previous}</span>
            </div>
            ` : ''}
            ${lastBilling ? `
            <div class="detail-item current-bill-item">
              <span class="detail-label">Current Bill:</span>
              <span class="detail-value current-bill">Ksh ${dueBreakdown.current}</span>
            </div>
            ` : ''}
            <div class="detail-item total-due-item">
              <span class="detail-label">Total Amount Due:</span>
              <span class="detail-value total-due">Ksh ${dueBreakdown.total}</span>
            </div>
          </div>
        </div>
        
        <div class="actions-section">
          <div class="quick-actions">
            <button id="editCustomerBtn" class="edit-btn">
              <span class="action-icon">✏️</span>
              Edit Customer
            </button>
            <button id="billCustomerBtn" class="bill-btn">
              <span class="action-icon">💰</span>
              Bill Customer
            </button>
            <button id="whatsappBtn" class="modal-whatsapp-btn">
              <span class="action-icon">💬</span>
              Send WhatsApp
            </button>
          </div>
        </div>
      </div>
    `;

    // Populate billing history
    document.getElementById('billingHistoryContent').innerHTML = integratePaymentManagement(customer);

    // Show modal
    customerModal.classList.add('show');
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
      customerModal.classList.remove('show');
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
      customerModal.classList.remove('show');

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
    <div class="payment-section ${isOverDue ? 'overdue' : ''}">
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
          <span class="payment-status ${payment.status}">${payment.status.toUpperCase()}</span>
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
          <button class="payment-btn primary" onclick="window.recordPartialPaymentForBill('${customer.meter_number}', ${billingIndex})">
            Record Payment
          </button>
          ${payment.balance > 0 ? `
            <button class="payment-btn success" 
                    onclick="window.recordFullPaymentForBill('${customer.meter_number}', ${billingIndex})">
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
                <button class="view-btn manage-bill-btn" data-meter-number="${customer.meter_number}" data-billing-index="${index}">
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

  async function recordPartialPaymentForBill(meterNumber, billingIndex) {
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
      const customers = await getCustomers();
      const customer = customers.find(c => c.meter_number === meterNumber);

      if (!customer) {
        alert('Customer not found!');
        return;
      }

      await recordPartialPayment(customer.id, billingIndex, {
        amount: paymentAmount,
        method: paymentMethod,
        transactionId: transactionId,
        date: paymentDate,
        notes: paymentNotes
      });

      alert('Payment recorded successfully!');
      viewBillDetails(meterNumber, billingIndex);
    } catch (error) {
      alert('Error recording payment: ' + error.message);
    }
  }

  async function recordFullPaymentForBill(meterNumber, billingIndex) {
    const customers = await getCustomers();
    const customer = customers.find(c => c.meter_number === meterNumber);

    if (!customer) {
      alert('Customer not found!');
      return;
    }

    const bill = customer.billing_history[billingIndex];
    const balance = bill.payment.balance;

    // Auto-fill the payment amount with the full balance
    document.getElementById('paymentAmount').value = balance;
    await recordPartialPaymentForBill(meterNumber, billingIndex);
  }

  async function viewBillDetails(meterNumber, billingIndex) {
    try {
      const customers = await getCustomers();
      const customer = customers.find(c => c.meter_number === meterNumber);

      if (!customer) {
        alert('Customer not found!');
        return;
      }

      const bill = customer.billing_history[billingIndex];

      if (!bill) {
        alert('Billing record not found!');
        return;
      }

      // Store customer index for payment functions
      window.currentCustomerIndex = customers.findIndex(c => c.meter_number === meterNumber);
      window.currentBillingIndex = billingIndex;

      // Update the modal with bill details and payment form
      document.getElementById('customerDetails').innerHTML = `
        <div class="customer-details">
          <h3>Bill Details for ${customer.name}</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Bill Date:</span>
              <span class="detail-value">${formatDate(bill.date)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Previous Reading:</span>
              <span class="detail-value">${bill.previousReading} units</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Current Reading:</span>
              <span class="detail-value">${bill.currentReading} units</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Consumption:</span>
              <span class="detail-value">${bill.consumption} units</span>
            </div>
          </div>
        </div>
      `;

      // Show payment management section in billing history area
      document.getElementById('billingHistoryContent').innerHTML = addPaymentMethodSection(customer, billingIndex);

      // Show modal if not already visible
      customerModal.classList.add('show');

    } catch (error) {
      console.error('Error viewing bill details:', error);
      alert('Error loading bill details: ' + error.message);
    }
  }

  // Load customers on page load
  loadCustomers();

  // Expose functions to window for onclick handlers
  window.recordPartialPaymentForBill = recordPartialPaymentForBill;
  window.recordFullPaymentForBill = recordFullPaymentForBill;
  window.viewBillDetails = viewBillDetails;
});