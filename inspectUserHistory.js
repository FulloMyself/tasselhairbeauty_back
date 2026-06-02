const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tassel_hair_beauty', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const user = await User.findOne().lean().exec();
    console.log('Sample user:', user ? user.email : 'none');
    if (user) {
      console.log('passwordResetHistory:', JSON.stringify(user.passwordResetHistory, null, 2));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('ERR', err);
    process.exit(1);
  }
})();
