import prisma from '../src/lib/prisma';

const SUBJECTS = [
  'DASHBOARD',
  'PRODUCTS',
  'STOCK_ADJUSTMENTS',
  'LOW_STOCK_ALERTS',
  'ORDERS',
  'SALES_RETURNS',
  'PURCHASES',
  'ACCOUNTING',
  'DISCOUNTS',
  'COUPONS',
  'PAGES',
  'HERO_SLIDES',
  'SIZE_CHARTS',
  'GENERAL_SETTINGS',
  'FOOTER_SETTINGS',
  'STAFF_MEMBERS',
  'ROLE_MANAGEMENT'
];

const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE'];

async function main() {
  console.log('Starting Role & Permission Migration with 1-to-1 Sidebar Mapping...');

  // 1. Create Permissions
  const allPermissionIds: string[] = [];
  for (const subject of SUBJECTS) {
    for (const action of ACTIONS) {
      const p = await prisma.permission.upsert({
        where: {
          action_subject: { action, subject }
        },
        update: {},
        create: { action, subject }
      });
      allPermissionIds.push(p.id);
    }
  }
  
  console.log(`Generated ${allPermissionIds.length} permissions.`);

  // Cleanup legacy permissions that are not in the new subjects list
  const deleteResult = await prisma.permission.deleteMany({
    where: {
      subject: { notIn: SUBJECTS }
    }
  });
  console.log(`Deleted ${deleteResult.count} legacy permissions from database.`);

  // 2. Create SUPERADMIN role
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPERADMIN' },
    update: {
      permissions: {
        set: allPermissionIds.map(id => ({ id }))
      }
    },
    create: {
      name: 'SUPERADMIN',
      description: 'System administrator with full access to all modules.',
      permissions: {
        connect: allPermissionIds.map(id => ({ id }))
      }
    }
  });
  console.log('SUPERADMIN role ensured and updated with all permissions.');

  // 3. Create MANAGER role with standard view permissions
  const managerPerms = await prisma.permission.findMany({
    where: {
      subject: { in: ['DASHBOARD', 'PRODUCTS', 'ORDERS', 'STOCK_ADJUSTMENTS'] },
      action: { in: ['VIEW', 'CREATE', 'EDIT'] }
    }
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {
      permissions: {
        set: managerPerms.map(p => ({ id: p.id }))
      }
    },
    create: {
      name: 'MANAGER',
      description: 'Operational manager with access to orders and products.',
      permissions: {
        connect: managerPerms.map(p => ({ id: p.id }))
      }
    }
  });
  console.log('MANAGER role ensured and updated.');

  // 4. Ensure existing staff are associated with roles
  const superadminStaff = await prisma.staff.findMany({
    where: {
      OR: [
        { username: 'admin' },
        { username: 'mystic' }
      ]
    }
  });

  for (const staff of superadminStaff) {
    await prisma.staff.update({
      where: { id: staff.id },
      data: { roleId: superAdminRole.id }
    });
    console.log(`Ensured SUPERADMIN role for ${staff.username}`);
  }

  console.log('Migration Completed Successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
