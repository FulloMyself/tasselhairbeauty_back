const twilio = require('twilio');

/**
 * Initialize Twilio client
 */
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send WhatsApp message
 * @param {string} recipientPhoneNumber - Recipient phone number (with country code)
 * @param {string} message - Message to send
 * @returns {Promise<object>} Message response
 */
const sendWhatsAppMessage = async (recipientPhoneNumber, message) => {
  try {
    const response = await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${recipientPhoneNumber}`,
    });

    console.log(`WhatsApp message sent: ${response.sid}`);
    return {
      success: true,
      messageId: response.sid,
      status: response.status,
    };
  } catch (error) {
    console.error(`Error sending WhatsApp message: ${error.message}`);
    throw error;
  }
};

/**
 * Send booking confirmation via WhatsApp
 * @param {string} phoneNumber - Customer phone number
 * @param {object} bookingDetails - Booking information
 * @returns {Promise<object>} Message response
 */
const sendBookingConfirmation = async (phoneNumber, bookingDetails) => {
  const message = `
Hi ${bookingDetails.customerName},

Your booking has been confirmed!

Service: ${bookingDetails.serviceName}
Date: ${bookingDetails.bookingDate}
Time: ${bookingDetails.bookingTime}
Staff: ${bookingDetails.staffName}

Thank you for choosing Tassel Hair & Beauty Studio!
  `.trim();

  return sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send order confirmation via WhatsApp
 * @param {string} phoneNumber - Customer phone number
 * @param {object} orderDetails - Order information
 * @returns {Promise<object>} Message response
 */
const sendOrderConfirmation = async (phoneNumber, orderDetails) => {
  const message = `
Hi ${orderDetails.customerName},

Your order has been confirmed!

Order ID: ${orderDetails.orderId}
Amount: R${orderDetails.totalAmount}
Items: ${orderDetails.itemCount}

You will receive tracking information soon.

Thank you for shopping at Tassel Hair & Beauty Studio!
  `.trim();

  return sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send payment confirmation via WhatsApp
 * @param {string} phoneNumber - Customer phone number
 * @param {object} paymentDetails - Payment information
 * @returns {Promise<object>} Message response
 */
const sendPaymentConfirmation = async (phoneNumber, paymentDetails) => {
  const message = `
Hi ${paymentDetails.customerName},

Payment received successfully!

Amount: R${paymentDetails.amount}
Reference: ${paymentDetails.reference}
Date: ${paymentDetails.date}

Thank you for your purchase!
  `.trim();

  return sendWhatsAppMessage(phoneNumber, message);
};

/**
 * Send booking reminder via WhatsApp
 * @param {string} phoneNumber - Customer phone number
 * @param {object} bookingDetails - Booking information
 * @returns {Promise<object>} Message response
 */
const sendBookingReminder = async (phoneNumber, bookingDetails) => {
  const message = `
Hi ${bookingDetails.customerName},

Reminder: You have a booking tomorrow!

Service: ${bookingDetails.serviceName}
Time: ${bookingDetails.bookingTime}
Staff: ${bookingDetails.staffName}

See you soon!
  `.trim();

  return sendWhatsAppMessage(phoneNumber, message);
};

module.exports = {
  sendWhatsAppMessage,
  sendBookingConfirmation,
  sendOrderConfirmation,
  sendPaymentConfirmation,
  sendBookingReminder,
};
