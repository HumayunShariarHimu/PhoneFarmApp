'use strict';
const { prisma } = require('./client');
const bcrypt = require('bcryptjs');

async function seed() {
  // Default admin user
  const existing = await prisma.user.findFirst();
  if (!existing) {
    await prisma.user.create({
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@phonefarm.io',
        password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
        name: 'Admin',
        role: 'ADMIN',
      },
    });
    console.log('[Seed] Admin user created');
  }

  // Default settings
  const settings = [
    { key: 'farm_name',        value: 'My Phone Farm',   type: 'string' },
    { key: 'max_emulators',    value: '50',              type: 'number' },
    { key: 'auto_restart',     value: 'true',            type: 'boolean' },
    { key: 'default_ram',      value: '2048',            type: 'number' },
    { key: 'default_cpus',     value: '2',               type: 'number' },
    { key: 'screenshot_interval', value: '300',          type: 'number' },
    { key: 'metrics_interval', value: '5000',            type: 'number' },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      create: s,
      update: {},
    });
  }
  console.log('[Seed] Default settings ready');
}

seed()
  .then(() => { console.log('[Seed] Complete'); process.exit(0); })
  .catch(e => { console.error('[Seed] Error:', e); process.exit(1); });
