import Joi from 'joi';

export const createWorkspaceSchema = Joi.object({
  title: Joi.string()
    .trim()
    .required()
    .messages({ 'string.empty': 'Title is required' }),
  description: Joi.string().trim().default('')
});
