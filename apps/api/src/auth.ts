import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RequestContext, Tx } from './db.js';
import { env } from './env.js';

export type Role = RequestContext['role'];

export type AccessClaims = {
  sub: string;   // user id
  tid: string;   // tenant id
  role: Role;
  sid: string;   // device session id
  did: string;   // device id
};

export function newRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshExpiry(): Date {
  return new Date(Date.now() + env.refreshTokenTtlDays * 86_400_000);
}

/** Konteks tenant milik request yang sudah terautentikasi. */
export function ctxOf(req: FastifyRequest): RequestContext {
  const c = req.user as AccessClaims;
  return { tenantId: c.tid, userId: c.sub, role: c.role };
}

export function claimsOf(req: FastifyRequest): AccessClaims {
  return req.user as AccessClaims;
}

/**
 * Memverifikasi access token DAN memastikan sesi perangkatnya masih hidup.
 * Sesi yang dicabut harus langsung berhenti berlaku — menunggu access token
 * kedaluwarsa sendiri akan membuat "remote wipe" tidak berarti apa-apa.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'unauthorized', message: 'Token tidak valid atau kedaluwarsa.' });
  }
  const c = claimsOf(req);
  const { rows } = await req.server.db.adminPool.query<{ revoked_at: Date | null; wipe_requested: boolean }>(
    'select revoked_at, wipe_requested from device_sessions where id = $1',
    [c.sid],
  );
  const session = rows[0];
  if (!session || session.revoked_at) {
    return reply.code(401).send({
      error: 'session_revoked',
      wipe: session?.wipe_requested ?? true,
      message: 'Sesi perangkat sudah dicabut.',
    });
  }
  if (session.wipe_requested) {
    return reply.code(409).send({
      error: 'wipe_required',
      wipe: true,
      message: 'Perangkat ini diminta menghapus data lokal.',
    });
  }
}

export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const done = await requireAuth(req, reply);
    if (done !== undefined || reply.sent) return done;
    if (!roles.includes(claimsOf(req).role)) {
      return reply.code(403).send({
        error: 'forbidden',
        message: `Butuh peran: ${roles.join(' atau ')}.`,
      });
    }
  };
}

/** Menandai perangkat masih aktif — dipakai koordinator untuk melihat sesi hidup. */
export async function touchSession(tx: Tx, sessionId: string) {
  await tx.query('update device_sessions set last_seen_at = now() where id = $1', [sessionId]);
}
