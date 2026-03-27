const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main(){
    const hashedPassword = await bcrypt.hash('password123',10);
    const admin = await prisma.user.upsert({
        where:{email:'admin@gmail.com'},
        update:{},
        create:{
            email: 'admin@gmail.com',
      name: 'System Admin',
      password: hashedPassword,
      role: 'admin',
      phone: '01000000000'
        }
    
    })
    console.log(admin);

}
main()
.catch((e)=> console.error(e))
.finally(async () => await prisma.$disconnect());