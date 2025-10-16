import {
  requireAuth,
  logout,
  getCustomers,
  updateCustomer,
  getTodayDateForInput,
  calculateDueDate
} from './auth.js';

import {
  generateWhatsAppMessage,
  sendWhatsAppMessage,
  getUrlParameter
} from './utilities.js';

// Billing page functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  if (!requireAuth()) return;

  // Navigation functionality
  document.getElementById('backBtn').addEventListener('click', function() {
    window.location.href = 'customer-management.html';
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);

  // DOM elements
  const customerMeterInput = document.getElementById('customerMeter');
  const previousReadingInput = document.getElementById('previousReading');
  const previousReadingDateSpan = document.getElementById('previousReadingDate');
  const currentReadingInput = document.getElementById('currentReading');
  const readingDateInput = document.getElementById('readingDate');
  const customerNameInput = document.getElementById('customerName');
  const monthlyChargeInput = document.getElementById('monthlyCharge');

  // Set default date to today (in yyyy-mm-dd format for input)
  readingDateInput.value = getTodayDateForInput();

  // Auto-fill customer data function
  async function autoFillCustomerData(meterNumber) {
    if (!meterNumber) return;

    try {
      const customers = await getCustomers();
      const customer = customers.find(c => c.meter_number === meterNumber);

      if (customer) {
        customerNameInput.value = customer.name;
        monthlyChargeInput.value = customer.monthly_charge;

        // Use last reading if available, otherwise use initial reading
        const lastBilling = customer.billing_history && customer.billing_history.length > 0
          ? customer.billing_history[customer.billing_history.length - 1]
          : null;

        if (lastBilling) {
          previousReadingInput.value = lastBilling.currentReading;
          previousReadingDateSpan.textContent = `Last reading date: ${lastBilling.date}`;
        } else if (customer.last_reading) {
          previousReadingInput.value = customer.last_reading;
          previousReadingDateSpan.textContent = `Initial reading date: ${customer.last_reading_date}`;
        } else {
          previousReadingInput.value = '0';
          previousReadingDateSpan.textContent = 'Starting with zero reading';
        }

        // Autofocus on current reading for quick entry
        currentReadingInput.focus();
      } else {
        customerNameInput.value = '';
        monthlyChargeInput.value = '';
        previousReadingInput.value = '';
        previousReadingDateSpan.textContent = 'Customer not found';
      }
    } catch (error) {
      console.error('Error loading customer:', error);
      alert('Error loading customer data');
    }
  }

  // Check for meter number in Url parameters and pre-fill
  const meterFromUrl = getUrlParameter('meter');
  if (meterFromUrl) {
    customerMeterInput.value = meterFromUrl;
    // Trigger the blur event to autofill customer data
    autoFillCustomerData(meterFromUrl);
  }

  // Autofill previous reading when meter number is entered
  customerMeterInput.addEventListener('blur', async function () {
    await autoFillCustomerData(this.value);
  });

  // Clear form functionality
  document.getElementById('clearBtn').addEventListener('click', function() {
    customerMeterInput.value = '';
    readingDateInput.value = '';
    previousReadingInput.value = '';
    previousReadingDateSpan.textContent = '';
    currentReadingInput.value = '';
    customerNameInput.value = '';
    monthlyChargeInput.value = '';
  });

  function validateMeterReading(reading) {
    const num = parseInt(reading);
    return !isNaN(num) && num >= 0 && num <= 999999;
  }

  // Helper function to calculate previous balance
  function calculatePreviousBalance(customer, currentBilling) {
    if (!customer.billing_history || customer.billing_history.length <= 1) {
      return 0;
    }

    let previousBalance = 0;
    customer.billing_history.forEach((bill, index) => {
      // Skip the current bill (last one)
      if (index === customer.billing_history.length - 1) return;

      if (bill.payment && bill.payment.balance > 0) {
        previousBalance += bill.payment.balance;
      } else if (!bill.payment) {
        previousBalance += bill.totalCost;
      }
    });

    return previousBalance;
  }

  // Save billing record functionality
  document.getElementById('saveBtn').addEventListener('click', async function() {
    const meterNumber = customerMeterInput.value;
    const readingDate = readingDateInput.value;
    const previousReading = previousReadingInput.value;
    const currentReading = currentReadingInput.value;
    const unitCost = 100;
    const monthlyCharge = parseInt(monthlyChargeInput.value);

    if (!validateMeterReading(currentReading)) {
      alert('Please enter valid meter reading (0 - 999999)');
      return;
    }

    if (meterNumber && readingDate && previousReading && currentReading) {
      // Validate readings
      const prevReading = parseInt(previousReading);
      const currReading = parseInt(currentReading);

      if (currReading <= prevReading) {
        alert('Current reading must be greater than previous reading!');
        return;
      }

      try {
        // Get existing customers
        const customers = await getCustomers();

        // Find customer by meter number
        const customerIndex = customers.findIndex(customer =>
          customer.meter_number === meterNumber
        );

        if (customerIndex === -1) {
          alert('Customer with this meter number not found!');
          return;
        }

        const customer = customers[customerIndex];

        // Calculate consumption (units used)
        const consumption = currReading - prevReading;

        // Calculate total charge
        const totalCost = (consumption * unitCost) + parseInt(monthlyCharge);

        // Calculate previous balance
        const previousBalance = calculatePreviousBalance(customer, null);
        const totalDue = totalCost + previousBalance;

        // Create billing record
        const billingRecord = {
          date: readingDate,
          previousReading: prevReading,
          currentReading: currReading,
          consumption: consumption,
          unitCost: unitCost,
          monthlyCharge: monthlyCharge,
          totalCost: totalCost,

          payment: {
            status: 'pending', // pending, partial, paid
            amountDue: totalCost,
            amountPaid: 0,
            balance: totalCost,
            dueDate: calculateDueDate(readingDate),
            payments: [] // Array for multiple payments
          }
        };

        // Add to customer's billing history
        let billingHistory = customer.billing_history || [];
        billingHistory.push(billingRecord);

        // Update customer in Supabase
        await updateCustomer(customers[customerIndex].id, {
          last_reading: currReading,
          last_reading_date: readingDate,
          billing_history: billingHistory
        });

        // Ask if user wants to send via whatsapp
        const sendWhatsApp = confirm(`Billing record saved successfully!\nUnits Used: ${consumption}\nCurrent Bill: Ksh ${totalCost.toFixed(2)}\n${previousBalance > 0 ? `Previous Balance: Ksh ${previousBalance.toFixed(2)}\n` : ''}Total Due: Ksh ${totalDue.toFixed(2)}\n\nWould you like to send the receipt via WhatsApp?`);

        if (sendWhatsApp) {
          const message = generateWhatsAppMessage(customer, billingRecord);
          sendWhatsAppMessage(customer.contact, message);
        }

        // Clear form
        customerMeterInput.value = '';
        readingDateInput.value = '';
        previousReadingInput.value = '';
        previousReadingDateSpan.textContent = '';
        currentReadingInput.value = '';
        customerNameInput.value = '';
        monthlyChargeInput.value = '';

      } catch(error) {
        console.error('Error saving billing record:', error);
        alert('Error saving billing record: ' + error.message);
      }
    } else {
      alert('Please fill in all required fields!');
    }
  });
});