import { Request } from 'express';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}
