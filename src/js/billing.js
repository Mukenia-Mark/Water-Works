import {
  requireAuth,
  logout,
  getCustomers,
  saveCustomers,
  getTodayDateForInput
} from './auth.js';

// Billing page functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  if (!requireAuth()) return;

  // Navigation functionality
  document.getElementById('backBtn').addEventListener('click', function() {
    window.location.href = '../html/customer-management.html';
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

  // Autofill previous reading when meter number is entered
  customerMeterInput.addEventListener('blur', function() {
    const meterNumber = this.value;

    if (meterNumber) {
      const customers = getCustomers();
      const customer = customers.find(c => c.meterNumber === meterNumber);

      if (customer) {
        customerNameInput.value = customer.name;
        monthlyChargeInput.value = customer.monthlyCharge;
        // Use last reading if available, otherwise use initial reading
        const lastBilling = customer.billingHistory && customer.billingHistory.length > 0
          ? customer.billingHistory[customer.billingHistory.length - 1]
          : null;

        if (lastBilling) {
          previousReadingInput.value = lastBilling.currentReading;
          previousReadingDateSpan.textContent = `Last reading date: ${lastBilling.date}`;
        } else if (customer.lastReading) {
          previousReadingInput.value = customer.lastReading;
          previousReadingDateSpan.textContent = `Initial reading date: ${customer.lastReadingDate}`;
        } else {
          previousReadingInput.value = '';
          previousReadingDateSpan.textContent = 'No previous reading found';
        }
      } else {
        customerNameInput.value = '';
        monthlyChargeInput.value = '';
        previousReadingInput.value = '';
        previousReadingDateSpan.textContent = 'Customer not found';
      }
    }
  });

  // Clear form functionality
  document.getElementById('clearBtn').addEventListener('click', function() {
    customerMeterInput.value = '';
    readingDateInput.value = '';
    previousReadingInput.value = '';
    previousReadingDateSpan.textContent = '';
    currentReadingInput.value = '';
    customerNameInput.value = '';
  });

  // Save billing record functionality
  document.getElementById('saveBtn').addEventListener('click', function() {
    const meterNumber = customerMeterInput.value;
    const readingDate = readingDateInput.value;
    const previousReading = previousReadingInput.value;
    const currentReading = currentReadingInput.value;
    const unitCost = 0.1;
    const monthlyCharge = parseInt(monthlyChargeInput.value);


    if (meterNumber && readingDate && previousReading && currentReading) {
      // Validate readings
      const prevReading = parseInt(previousReading);
      const currReading = parseInt(currentReading);

      if (currReading <= prevReading) {
        alert('Current reading must be greater than previous reading!');
        return;
      }

      // Get existing customers
      const customers = getCustomers();

      // Find customer by meter number
      const customerIndex = customers.findIndex(customer =>
        customer.meterNumber === meterNumber
      );

      if (customerIndex === -1) {
        alert('Customer with this meter number not found!');
        return;
      }

      // Calculate consumption (units used)
      const consumption = currReading - prevReading;

      // Calculate total charge
      const totalCost = (consumption * unitCost) + (monthlyCharge);

      // Create billing record
      const billingRecord = {
        date: readingDate,
        previousReading: prevReading,
        currentReading: currReading,
        consumption: consumption,
        unitCost: unitCost,
        monthlyCharge: monthlyCharge,
        totalCost: totalCost
      };

      // Add to customer's billing history
      if (!customers[customerIndex].billingHistory) {
        customers[customerIndex].billingHistory = [];
      }

      customers[customerIndex].billingHistory.push(billingRecord);

      // Update customer's last reading
      customers[customerIndex].lastReading = currReading;
      customers[customerIndex].lastReadingDate = readingDate;

      // Save back to localStorage
      saveCustomers(customers);

      // Ask if user wants to send via whatsapp
      const sendWhatsApp = confirm(`Billing record saved successfully!\nUnits Used: ${consumption}\n\nWould you like to send the receipt via WhatsApp?`);

      if (sendWhatsApp) {
        const message = generateWhatsAppMessage(customers[customerIndex], billingRecord);
        sendWhatsAppMessage(customers[customerIndex].contact, message);
      }

      // Clear form
      customerMeterInput.value = '';
      readingDateInput.value = '';
      previousReadingInput.value = '';
      previousReadingDateSpan.textContent = '';
      currentReadingInput.value = '';
      customerNameInput.value = '';
      monthlyChargeInput.value = '';

    } else {
      alert('Please fill in all required fields!');
    }
  });

  // WhatsApp helper functions
  function generateWhatsAppMessage(customer, billingRecord) {
    const message = `💧 *Water Bill Receipt* 💧
      *Customer:* ${customer.name}
      *Meter No:* ${customer.meterNumber}
      *Bill Date:* ${billingRecord.date}
      
      *Meter Readings:*
      - Previous: ${billingRecord.previousReading} units
      - Current: ${billingRecord.currentReading} units
      - Consumption: ${billingRecord.consumption} units
      
      *Charges:*
      - Water Usage (${billingRecord.consumption} units × Ksh ${billingRecord.unitCost}): Ksh ${(billingRecord.consumption * billingRecord.unitCost).toFixed(2)}
      - Monthly Charge: Ksh ${billingRecord.monthlyCharge}
      - *Total Amount Due: Ksh ${billingRecord.totalCost}*
      
      Please make payment by the due date. Thank you!`;

    return encodeURIComponent(message);
  }

  function sendWhatsAppMessage(phoneNumber, message) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    let formattedPhone = cleanPhone;

    if (!cleanPhone.startsWith('254') && cleanPhone.length === 9) {
      formattedPhone = '254' + cleanPhone;
    } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
      formattedPhone = '254' + cleanPhone.substring(1);
    }

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  }
});