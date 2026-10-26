import Joi from 'joi';
import { InvitesType } from '@/types';

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string()
    .trim()
    .min(8) // at least 8 characters
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$')) // must contain lowercase, uppercase, and number
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    })
});

export const registerSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string()
    .trim()
    .min(8) // at least 8 characters
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$')) // must contain lowercase, uppercase, and number
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required()
});

export const resendEmailVerificationLinkSchema = Joi.object({
  email: Joi.string().trim().email().required()
});

export const inviteSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  organisationId: Joi.number().required(),
  targetId: Joi.number().required(),
  targetType: Joi.string()
    .valid(InvitesType.Project, InvitesType.Workspace, InvitesType.App)
    .required()
});
