import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';
import { JWT_SECRET } from '../env';

export interface JwtPayload {
  userId: number;
}

export function signJwt(payload: JwtPayload, expiresIn: string | number = '7d'): string {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET as Secret, options);
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET as Secret) as JwtPayload;
}

export function generateNumericCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}


