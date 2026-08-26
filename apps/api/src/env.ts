function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Environment variable ${name} wajib diisi`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  /** Kredensial superuser — hanya dipakai untuk migrasi & pembuatan role aplikasi. */
  databaseUrl: required('DATABASE_URL'),

  /**
   * Role aplikasi. Bukan superuser dan bukan pemilik tabel, sehingga Row Level
   * Security benar-benar berlaku untuk setiap query (§4.5.5).
   */
  appDbUser: process.env.APP_DB_USER ?? 'terasol_app',
  appDbPassword: required('APP_DB_PASSWORD'),

  jwtSecret: required('JWT_SECRET'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  /** Refresh token panjang: petugas di lapangan tidak boleh ter-logout saat offline. */
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),

  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  /** Bootstrap opsional saat deploy pertama (dilewati bila sudah ada user). */
  bootstrap: {
    tenant: process.env.BOOTSTRAP_TENANT,
    email: process.env.BOOTSTRAP_EMAIL,
    password: process.env.BOOTSTRAP_PASSWORD,
    nama: process.env.BOOTSTRAP_NAMA ?? 'Admin',
  },
} as const;
