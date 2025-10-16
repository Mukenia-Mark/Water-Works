import { formatDate } from './auth.js';

// WhatsApp message generation
function generateWhatsAppMessage(customer, billing) {
  if (!billing) {
    return encodeURIComponent('Hello ${customer.name}! Your water bill is ready.');
  }

  const message = `💧 *Water Bill Receipt* 💧
      
  *Customer:* ${customer.name}
  *Meter No:* ${customer.meter_number}
  *Bill Date:* ${formatDate(billing.date)}
  
  *Meter Readings:*
  - Previous: ${billing.previousReading} units
  - Current: ${billing.currentReading} units
  - Consumption: ${billing.consumption} units
  
  *Charges:*
  - Water Usage (${billing.consumption} units × Ksh ${billing.unitCost}): Ksh ${(billing.consumption * billing.unitCost).toFixed(2)}
  - Monthly Charge: Ksh ${billing.monthlyCharge}
  - *Total Amount Due: Ksh ${billing.totalCost}*
  
  Please make your payment as soon as possible. Thank you!`;

  return encodeURIComponent(message);
}

// WhatsApp message sending
function sendWhatsAppMessage(phoneNumber, message) {
  // Clean phone number (remove dashes, spaces, etc.)
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  // Check if number has a country code, if not assume Kenya (+254)
  let formattedPhone = cleanPhone;
  if (!cleanPhone.startsWith('254') && cleanPhone.length === 9) {
    formattedPhone = '254' + cleanPhone;
  } else if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
    formattedPhone = '254' + cleanPhone.substring(1);
  }

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
  window.open(whatsappUrl, '_blank');
}

// HTML sanitization
function sanitizeHTML(str) {
  if (typeof str !== 'string') return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Meter reading validation
function validateMeterReading(reading) {
  const num = parseInt(reading);
  return !isNaN(num) &&  num >= 0 && num <= 999999;
}

// Phone number validation
function validatePhoneNumber(phone) {
  const phoneRegex = /^[0-9+\-\s()]{10,}$/;
  return phoneRegex.test(phone);
}

// Get url parameter
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

export {
  generateWhatsAppMessage,
  sendWhatsAppMessage,
  validateMeterReading,
  validatePhoneNumber,
  sanitizeHTML,
  getUrlParameter
};