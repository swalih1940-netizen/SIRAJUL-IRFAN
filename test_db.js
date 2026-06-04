const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        const User = mongoose.model('User', new mongoose.Schema({ fullName: String }), 'Signup Details');
        const first = await User.findOne();
        console.log('First user:', first);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
