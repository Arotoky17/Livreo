import { createHmac } from 'node:crypto';
import { ENV } from '../config/env.js';

export function passwordSession(passwordHash) {
  return createHmac('sha256', ENV.JWT_SECRET)
    .update('livreo:password-session:')
    .update(passwordHash)
    .digest('base64url');
}
