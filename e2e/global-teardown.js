const mongoose = require('mongoose');

const E2E_MONGODB_URI = process.env.E2E_MONGODB_URI || 'mongodb://localhost:27017/skillbridge_e2e';

/**
 * Runs once after the whole E2E suite finishes (pass or fail). Drops the
 * dedicated `skillbridge_e2e` database so repeated local runs always start
 * from a clean slate and this sandbox's shared MongoDB instance isn't left
 * holding a stray database.
 */
module.exports = async () => {
  await mongoose.connect(E2E_MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};
