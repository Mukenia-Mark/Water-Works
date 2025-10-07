import {
  requireAuth,
  logout,
  getCustomers,
  updateCustomer,
  getTodayDateForInput
} from './auth.js';

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

  // Autofill previous reading when meter number is entered
  customerMeterInput.addEventListener('blur', async function() {
    const meterNumber = this.value;

    if (meterNumber) {
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

  function validatePhoneNumber(phone) {
    const phoneRegex = /^[0-9+\-\s()]{10,}$/;
    return phoneRegex.test(phone);
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
        const totalCost = (consumption * unitCost) + monthlyCharge;

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
        let billingHistory = customer.billing_history || [];
        billingHistory.push(billingRecord);

        // Update customer in Supabase
        await updateCustomer(customers[customerIndex].id, {
          last_reading: currReading,
          last_reading_date: readingDate,
          billing_history: billingHistory
        });

        // Ask if user wants to send via whatsapp
        const sendWhatsApp = confirm(`Billing record saved successfully!\nUnits Used: ${consumption}\n\nWould you like to send the receipt via WhatsApp?`);

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

  // WhatsApp helper functions
  function generateWhatsAppMessage(customer, billingRecord) {
    const message = `💧 *Water Bill Receipt* 💧
      *Customer:* ${customer.name}
      *Meter No:* ${customer.meter_number}
      *Bill Date:* ${billingRecord.date}
      
      *Meter Readings:*
      - Previous: ${billingRecord.previousReading} units
      - Current: ${billingRecord.currentReading} units
      - Consumption: ${billingRecord.consumption} units
      
      *Charges:*
      - Water Usage (${billingRecord.consumption} units × Ksh ${billingRecord.unitCost}): Ksh ${(billingRecord.consumption * billingRecord.unitCost).toFixed(2)}
      - Monthly Charge: Ksh ${billingRecord.monthlyCharge}
      - *Total Amount Due: Ksh ${billingRecord.totalCost}*
      
      Please make your payment to Michael Muthengi Makau
      Pochi La Biashara -> 0721416688
      as soon as possible. Thank you!`;

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