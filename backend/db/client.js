const mongoose = require('mongoose');

let _db = null;

/**
 * Returns a live mongoose connection, or null if MONGO_URI is not set.
 * The app is fully functional without a DB — job records are simply not persisted.
 */
async function getDb() {
  if (_db) return _db;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('[db] MONGO_URI not set — running without persistence');
    return null;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    _db = mongoose.connection;
    console.log('[db] Connected to MongoDB');
    return _db;
  } catch (err) {
    console.error('[db] MongoDB connection failed — running without persistence:', err.message);
    return null;
  }
}

module.exports = { getDb };
