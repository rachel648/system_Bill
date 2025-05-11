// server/db.js
const mongoose = require('mongoose');

const setupDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Create indexes
    await mongoose.connection.db.collection('users').createIndex({ username: 1 }, { unique: true });
    console.log('Database indexes created');
  } catch (err) {
    console.error('Database setup error:', err);
    process.exit(1);
  }
};

module.exports = setupDB;