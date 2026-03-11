// ============================================================
//  types.ts  —  shared types across API and frontend
// ============================================================

/** A submitted / approved letter */
export interface Letter {
  id: string;
  message: string;
  createdAt: number;
  answered: boolean;
  answer: string | null;
  answeredAt: number | null;
}

/** Raw shape stored in Redis */
export interface RawLetter {
  id?: string;
  message?: string;
  createdAt?: number;
  answered?: boolean;
  answer?: string | null;
  answeredAt?: number | null;
}

/** API base response */
export interface ApiOk<T = undefined> {
  ok: true;
  data?: T;
}
export interface ApiError {
  ok: false;
  error: string;
}
export type ApiResponse<T = undefined> = ApiOk<T> | ApiError;

/** Letters list response */
export interface LettersListPayload {
  items: Letter[];
}

/** Submit body */
export interface SubmitBody {
  message: string;
}

/** Rate-limit entry stored in memory */
export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/** GIF ids 1-4 */
export type GifId = "1" | "2" | "3" | "4";
