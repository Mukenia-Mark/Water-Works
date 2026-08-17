import { requireAuth, logout, getUserSettings, updateUserSettings } from './auth.js';

document.addEventListener('DOMContentLoaded', async function() {
  if (!requireAuth()) return;

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'customer-management.html';
  });
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Load existing settings
  try {
    const settings = await getUserSettings();
    document.getElementById('paymentPhone').value = settings.payment_phone || '';
  } catch (err) {
    console.error('Error loading settings:', err);
  }

  // Save settings
  document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    const paymentPhone = document.getElementById('paymentPhone').value.trim();

    if (!paymentPhone) {
      showMessage('Please enter a payment phone number.', 'error');
      return;
    }

    try {
      await updateUserSettings({
        payment_phone: paymentPhone
      });
      showMessage('Settings saved successfully!', 'success');
    } catch (err) {
      showMessage('Error saving settings: ' + err.message, 'error');
    }
  });

  function showMessage(msg, type) {
    const el = document.getElementById('message');
    el.textContent = msg;
    el.className = 'message ' + type;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }
});
