const { z } = require('zod');

const registerPatientSchema = z.object({
  clinicId: z.string().length(24, "Invalid clinic ID"),
  queueId: z.string().length(24, "Invalid queue ID"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
  name: z.string().min(2, "Name too short").max(50, "Name too long"),
  force: z.boolean().optional(),
  isReturning: z.boolean().optional(),
  visitCount: z.number().optional()
});

const emergencyPatientSchema = z.object({
  queueId: z.string().length(24, "Invalid queue ID"),
  name: z.string().min(2, "Name too short").max(50, "Name too long")
});

module.exports = { 
  registerPatientSchema,
  emergencyPatientSchema
};
