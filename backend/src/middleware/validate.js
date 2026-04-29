const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(d => d.message),
    });
  }
  next();
};

// Schemas
const schemas = {
  register: Joi.object({
  name:       Joi.string().min(2).max(100).required(),
  email:      Joi.string().email().required(),
  phone:      Joi.string().pattern(/^[6-9]\d{9}$/).optional().allow('', null)
                 .messages({ 'string.pattern.base': 'Enter a valid 10-digit Indian mobile number' }),
  password:   Joi.string().min(6).required(),
  role:       Joi.string().valid('citizen', 'officer').default('citizen'),
  department: Joi.string().max(100).optional().allow('', null),
}),

  login: Joi.object({
    email:    Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  submitIssue: Joi.object({
    latitude:    Joi.number().min(-90).max(90).required(),
    longitude:   Joi.number().min(-180).max(180).required(),
    gpsAccuracy: Joi.number().max(100).optional(),
    category:    Joi.string()
                    .valid('pothole','garbage','streetlight',
                           'sewage','encroachment','waterlogging','other')
                    .required(),
    title:       Joi.string().max(200).optional(),
    description: Joi.string().max(1000).optional(),
    address:     Joi.string().max(300).optional(),
  }),

  updateStatus: Joi.object({
    status: Joi.string()
               .valid('assigned','in_progress','resolved','rejected','closed')
               .required(),
    note:   Joi.string().max(500).optional(),
  }),
};

module.exports = { validate, schemas };