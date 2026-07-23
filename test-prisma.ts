import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string })
const prisma = new PrismaClient({ adapter })

async function main() {
  try {
    const emp = await prisma.employee.create({
      data: {
        registration: 'TEST99',
        name: 'Test Name 99',
        company: 'Sesé',
        role: 'Test Role',
        work_schedule: '16:38 às 02:00',
        shift: 'Turno Noite',
        status: 'Ativo'
      }
    })
    console.log('Success:', emp)
  } catch (e: any) {
    fs.writeFileSync('prisma-err.txt', e.stack || e.message)
  }
}
main()
