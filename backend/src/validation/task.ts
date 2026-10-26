import Joi from 'joi';
export const createTaskSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional(),
  comments: Joi.string().optional(),
  label: Joi.string().optional(),
  priority: Joi.string().optional(),
  status: Joi.string().optional(),
  assigneeId: Joi.number().optional(),
  assignerId: Joi.number().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  category: Joi.string().optional(),
  projectId: Joi.number().required()
});
