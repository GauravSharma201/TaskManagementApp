interface JWTConfig {
  secret: string;
  refreshSecretKey: string;
  expiresIn: string;
  algorithm?: string;
  refreshTokenExpiresIn?: string;
  emailVerificationSecretKey: string;
  emailVerificationExpiry: string;
  inviteSecretKey: string;
  inviteExpiry: string;
}

export const JWT_CONFIG: JWTConfig = {
  secret: process.env['JWT_SECRET'] || 'supersecretkey',
  refreshSecretKey:
    process.env['JWT_REFRESH_SECRET'] || 'super-secret-refresh-token-key',
  expiresIn: process.env['JWT_ACCESS_EXPIRE'] || '1h',
  algorithm: 'HS256',
  refreshTokenExpiresIn: process.env['JWT_REFRESH_EXPIRE'] || '7d',
  emailVerificationSecretKey:
    process.env['JWT_EMAIL_VERIF_SECRET_KEY'] ||
    'super-secret-email-verification-key',
  emailVerificationExpiry: process.env['JWT_EMAIL_VERIF_EXPIRY'] || '1d',
  inviteSecretKey:
    process.env['JWT_INVITE_SECRET_KEY'] || 'super-secret-invite-key',
  inviteExpiry: process.env['JWT_INVITE_EXPIRY'] || '7d'
};
