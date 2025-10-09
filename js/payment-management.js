import { calculateDueDate, getCustomers, updateCustomer } from './auth.js';

async function recordPartialPayment(customerId, billingIndex, paymentData) {
  try {
    const customers = await getCustomers();
    const customer = customers.find(c => c.id === customerId);
    const bill = customer.billing_history[billingIndex];

    if (!bill.payment) {
      // Initialize payment structure if not existing
      bill.payment = {
        status: 'pending',
        amountDue: bill.totalCost,
        amountPaid: 0,
        balance: bill.totalCost,
        dueDate: calculateDueDate(bill.date),
        payments: []
      };
    }

    // Add partial payment
    const paymentRecord = {
      date: paymentData.date,
      amount:paymentData.amount,
      method: paymentData.method,
      transactionId: paymentData.transactionId,
      notes: paymentData.notes || ''
    };

    bill.payment.payments.push(paymentRecord);
    bill.payment.amountPaid += paymentData.amount;
    bill.payment.balance= bill.payment.amountDue - bill.payment.amountPaid;

    // Update status
    if (bill.payment.balance <= 0) {
      bill.payment.status = 'paid';
    } else if (bill.payment.amountPaid > 0) {
      bill.payment.status = 'partial';
    }

    await updateCustomer(customerId, {
      billing_history: customer.billing_history
    });

    return bill.payment;

  } catch (error) {
    console.error('Error recording partial payment:', error);
    return error;
  }
}

async function checkOverduePayments() {
  const customers = await getCustomers();
  const today = new Date();
  let overdueCount = 0;

  customers.forEach(customer => {
    customer.billing_history.forEach((bill, index) => {
      if (!bill.payment) return;

      const dueDate = new Date(bill.payment.dueDate);
      const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      if (daysLate > 0 && bill.payment.balance > 0 && bill.payment.status !== 'overdue') {
        bill.payment.status = 'overdue';
        overdueCount++;

        updateCustomer(customer.id, {
          billing_history: customer.billing_history
        }).catch(console.error);
      }
    });
  });

  return overdueCount;
}

export {
  recordPartialPayment,
  checkOverduePayments
}