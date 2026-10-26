import Joi from 'joi';

export const createProjectSchema = Joi.object({
  title: Joi.string()
    .trim()
    .required()
    .messages({ 'string.empty': 'Title is required' }),
  description: Joi.string().trim().default('')
});
