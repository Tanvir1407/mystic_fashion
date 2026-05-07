import prisma from '../src/lib/prisma';

async function main() {
  const username = process.argv[2] || 'admin';
  const email = process.argv[3] || 'admin@example.com';
  const password = process.argv[4] || 'admin123';

  console.log(`Creating Admin: Username: ${username}, Email: ${email}`);

  // 1. Find the SUPERADMIN role
  const superadminRole = await prisma.role.findUnique({
    where: { name: 'SUPERADMIN' }
  });

  if (!superadminRole) {
    console.error('Error: SUPERADMIN role not found. Please run the migration first: npx ts-node scripts/migrate-roles.ts');
    process.exit(1);
  }

  // 2. Create or Update Staff as SUPERADMIN
  const staff = await prisma.staff.upsert({
    where: { email },
    update: {
      username,
      password,
      roleId: superadminRole.id
    },
    create: {
      username,
      email,
      password,
      roleId: superadminRole.id
    }
  });

  console.log(`Successfully created/updated SUPERADMIN staff account:`);
  console.log(`- Username: ${staff.username}`);
  console.log(`- Email:    ${staff.email}`);
  console.log(`- Password: ${staff.password}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
