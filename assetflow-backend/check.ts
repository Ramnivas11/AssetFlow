import { prisma } from './src/lib/prisma';

async function main() {
  const assets = await prisma.asset.findMany();
  console.log(`Total Assets: ${assets.length}`);
  
  const available = await prisma.asset.findMany({ where: { status: 'AVAILABLE' } });
  console.log(`Available Assets: ${available.length}`);

  const categories = await prisma.assetCategory.findMany();
  for (const cat of categories) {
    const count = available.filter(a => a.categoryId === cat.id).length;
    console.log(`Category: ${cat.name}, Available Assets: ${count}`);
  }
}

main().finally(() => prisma.$disconnect());
