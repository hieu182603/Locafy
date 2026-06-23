const makeCrudRouter = require('./crudFactory');
const Appointment = require('../models/Appointment');

module.exports = makeCrudRouter(Appointment);

