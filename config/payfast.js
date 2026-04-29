/**
 * PayFast Payment Gateway Configuration
 */

const payfastConfig = {
  merchantId: process.env.PAYFAST_MERCHANT_ID,
  merchantKey: process.env.PAYFAST_MERCHANT_KEY,
  passphrase: process.env.PAYFAST_PASSPHRASE,
  
  // PayFast URLs
  isSandbox: process.env.NODE_ENV !== 'production',
  
  get payfastUrl() {
    return this.isSandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';
  },
  
  get validateUrl() {
    return this.isSandbox
      ? 'https://sandbox.payfast.co.za/eng/query'
      : 'https://www.payfast.co.za/eng/query';
  },
  
  // Webhook URLs
  returnUrl: process.env.PAYFAST_RETURN_URL,
  cancelUrl: process.env.PAYFAST_CANCEL_URL,
  notifyUrl: process.env.PAYFAST_NOTIFY_URL,
};

module.exports = payfastConfig;
