const crypto = require('crypto');
const axios = require('axios');
const payfastConfig = require('../config/payfast');

/**
 * Generate PayFast signature
 * @param {object} data - Payment data
 * @returns {string} MD5 signature
 */
const generateSignature = (data) => {
  let passphrase = payfastConfig.passphrase;
  let signature = '';

  // Sort data alphabetically
  const sortedData = Object.keys(data)
    .sort()
    .reduce((result, key) => {
      result[key] = data[key];
      return result;
    }, {});

  // Build signature string
  for (const key in sortedData) {
    if (sortedData[key] && sortedData[key] !== '') {
      signature += `${key}=${sortedData[key]}&`;
    }
  }

  // Add passphrase
  signature += `passphrase=${passphrase}`;

  // Generate MD5 hash
  return crypto.createHash('md5').update(signature).digest('hex');
};

/**
 * Create PayFast payment form data
 * @param {object} paymentData - Payment information
 * @returns {object} Form data for PayFast
 */
const createPaymentForm = (paymentData) => {
  const data = {
    merchant_id: payfastConfig.merchantId,
    merchant_key: payfastConfig.merchantKey,
    return_url: payfastConfig.returnUrl,
    cancel_url: payfastConfig.cancelUrl,
    notify_url: payfastConfig.notifyUrl,
    name_first: paymentData.firstName,
    name_last: paymentData.lastName,
    email_address: paymentData.email,
    cell_number: paymentData.phone || '',
    m_payment_id: paymentData.orderId,
    amount: paymentData.amount.toFixed(2),
    item_name: paymentData.itemName,
    item_description: paymentData.itemDescription || '',
    custom_int1: paymentData.customerId,
    custom_str1: paymentData.customReference || '',
  };

  // Generate signature
  data.signature = generateSignature(data);

  return data;
};

/**
 * Verify PayFast payment webhook
 * @param {object} postData - Data from PayFast webhook
 * @returns {boolean} Whether the signature is valid
 */
const verifyWebhookSignature = (postData) => {
  // Create a copy of the data without the signature
  const data = { ...postData };
  delete data.signature;

  // Generate expected signature
  const expectedSignature = generateSignature(data);

  // Compare signatures
  return expectedSignature === postData.signature;
};

/**
 * Verify payment with PayFast
 * @param {object} paymentData - Payment details from webhook
 * @returns {Promise<boolean>} Whether payment is valid
 */
const verifyPayment = async (paymentData) => {
  try {
    // Verify signature first
    if (!verifyWebhookSignature(paymentData)) {
      console.error('Invalid PayFast signature');
      return false;
    }

    // Verify with PayFast server
    const response = await axios.post(payfastConfig.validateUrl, {
      ...paymentData,
      validate_13t: 1,
    });

    // Check response
    if (response.status === 200 && response.data === 'VALID') {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying payment with PayFast:', error.message);
    return false;
  }
};

/**
 * Refund PayFast payment
 * @param {string} transactionId - PayFast transaction ID
 * @param {number} amount - Refund amount
 * @returns {Promise<object>} Refund response
 */
const refundPayment = async (transactionId, amount) => {
  try {
    // Note: Refund functionality depends on PayFast API version
    // This is a placeholder for future implementation
    console.log(`Refund initiated for transaction ${transactionId}: R${amount}`);
    return { success: true, message: 'Refund initiated' };
  } catch (error) {
    console.error('Error refunding payment:', error.message);
    throw error;
  }
};

module.exports = {
  generateSignature,
  createPaymentForm,
  verifyWebhookSignature,
  verifyPayment,
  refundPayment,
};
