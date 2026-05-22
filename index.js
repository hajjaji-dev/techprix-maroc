require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const SHOPS = [
  { name:'Jumia.ma', url:'https://www.jumia.ma', logoColor:'#FFF0E0', textColor:'#C85000', deliveryHrs:24, shipCost:29 },
  { name:'Electroplanet.ma', url:'https://www.electroplanet.ma', logoColor:'#E8F0FF', textColor:'#0A3D8F', deliveryHrs:48, shipCost:0, freeFrom:2000 },
  { name:'Mytek.ma', url:'https://mytek.ma', logoColor:'#FFF0E8', textColor:'#E05000', deliveryHrs:48, shipCost:50 },
  { name:'Biougnach.ma', url:'https://biougnach.ma', logoColor:'#E8F5EE', textColor:'#1A6A3A', deliveryHrs:48, shipCost:0 },
  { name:'MarjaneMall.ma', url:'https://www.marjanemall.ma', logoColor:'#FFE8E8', textColor:'#8B0000', deliveryHrs:72, shipCost:40 },
  { name:'Micromagma.ma', url:'https://micromagma.ma', logoColor:'#F0F0F0', textColor:'#333333', deliveryHrs:48, shipCost:30 },
  { name:'Iris.ma', url:'https://www.iris.ma', logoColor:'#F0E8FF', textColor:'#5A008B', deliveryHrs:48, shipCost:30 },
  { name:'Hatif.ma', url:'https://hatif.ma', logoColor:'#E8FFF0', textColor:'#006A2A', deliveryHrs:24, shipCost:0 },
  { name:'Primini.ma', url:'https://primini.ma', logoColor:'#FFF8E8', textColor:'#8B5A00', deliveryHrs:48, shipCost:30 },
  { name:'Terratec.ma', url:'https://terratec.ma', logoColor:'#E8E8FF', textColor:'#1A1A8B', deliveryHrs:48, shipCost:30 },
];

async function seedShops() {
  for (const s of SHOPS) {
    await prisma.shop.upsert({ where:{name:s.name}, create:s, update:{} }).catch(()=>{});
  }
}

app.get('/', (req, res) => res.json({ app: 'TechPrix Morocco 🔌', status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/stats', async (req, res) => {
  try {
    const [products, prices, shops] = await Promise.all([
      prisma.product.count(),
      prisma.price.count(),
      prisma.shop.count(),
    ]);
    res.json({ products, prices, shops });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/products', async (req, res) => {
  try {
    const { q, cat, page='1', limit='40', sort='newest', promo } = req.query;
    const skip = (Number(page)-1) * Number(limit);
    const where = {};
    if (cat && cat !== 'all') where.category = cat;
    if (q) where.OR = [
      { name: { contains: q, mode:'insensitive' } },
      { brand: { contains: q, mode:'insensitive' } },
    ];
    if (promo === 'true') where.prices = { some: { discountPct: { gt: 0 } } };
    const orderBy = {
      newest: { updatedAt:'desc' },
      price_asc: { prices: { _min: { price:'asc' } } },
      price_desc: { prices: { _min: { price:'desc' } } },
      popular: { prices: { _count:'desc' } },
    }[sort] || { updatedAt:'desc' };
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where, skip, take: Number(limit), orderBy,
        include: { prices: { include:{ shop:true }, orderBy:{ price:'asc' } } },
      }),
      prisma.product.count({ where }),
    ]);
    res.json({
      products: products.map(p => ({
        ...p,
        min_price: p.prices[0]?.price ?? null,
        max_price: p.prices[p.prices.length-1]?.price ?? null,
        total_shops: p.prices.length,
        max_discount: Math.max(...p.prices.map(x => x.discountPct ?? 0), 0),
        savings: p.prices.length > 1 ? Math.round(p.prices[p.prices.length-1].price - p.prices[0].price) : 0,
        cheapest_shop: p.prices[0]?.shop?.name ?? null,
      })),
      total, page: Number(page), pages: Math.ceil(total/Number(limit)),
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const p = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: { prices: { include:{ shop:true }, orderBy:{ price:'asc' } } },
    });
    if (!p) return res.status(404).json({ error: 'Non trouvé' });
    res.json({ ...p, savings: p.prices.length > 1 ? Math.round(p.prices[p.prices.length-1].price - p.prices[0].price) : 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q='' } = req.query;
    if (q.length < 2) return res.json({ products: [] });
    const products = await prisma.product.findMany({
      where: { OR: [{ name:{ contains:q, mode:'insensitive' } }, { brand:{ contains:q, mode:'insensitive' } }] },
      include: { prices: { include:{ shop:true }, orderBy:{ price:'asc' }, take:1 } },
      take: 20,
    });
    res.json({ products: products.map(p => ({ ...p, min_price: p.prices[0]?.price })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/deals', async (req, res) => {
  try {
    const deals = await prisma.product.findMany({
      where: { prices: { some: { discountPct: { gt: 10 } } } },
      include: { prices: { include:{ shop:true }, orderBy:{ price:'asc' }, take:1 } },
      take: 40, orderBy: { updatedAt:'desc' },
    });
    res.json({ deals: deals.map(p => ({ ...p, min_price: p.prices[0]?.price, max_discount: p.prices[0]?.discountPct ?? 0 })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/categories', async (req, res) => {
  try {
    const cats = await prisma.product.groupBy({ by:['category'], _count:{ id:true }, orderBy:{ _count:{ id:'desc' } } });
    res.json({ categories: cats.map(c => ({ category:c.category, count:c._count.id })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/shops', async (req, res) => {
  try {
    const shops = await prisma.shop.findMany({ where:{ active:true }, include:{ _count:{ select:{ prices:true } } } });
    res.json({ shops });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/import', async (req, res) => {
  try {
    const { secret, products=[] } = req.body;
    if (secret !== (process.env.ADMIN_SECRET || 'techprix-admin-2026'))
      return res.status(403).json({ error: 'Non autorisé' });
    let saved=0, skipped=0;
    for (const p of products) {
      try {
        if (!p.name || !p.price || p.price < 10) { skipped++; continue; }
        const slug = `${p.brand||'autre'}-${p.name}`.toLowerCase().replace(/[^a-z0-9]+/g,'-').substring(0,100) + '-' + Math.random().toString(36).substring(2,6);
        const shop = await prisma.shop.upsert({
          where: { name: p.shop||'Jumia.ma' },
          create: { name:p.shop||'Jumia.ma', url:'https://www.jumia.ma', logoColor:'#FFF0E0', textColor:'#C85000', deliveryHrs:24, shipCost:29 },
          update: {},
        });
        const product = await prisma.product.create({ data:{ name:p.name.substring(0,200), brand:p.brand||'Autre', category:p.category||'electronique', imageUrl:p.imageUrl||null, tags:[], slug } });
        await prisma.price.create({ data:{ productId:product.id, shopId:shop.id, price:p.price, oldPrice:p.oldPrice||null, discountPct:p.discount||null, inStock:true, productUrl:p.productUrl||null, imageUrl:p.imageUrl||null } });
        saved++;
      } catch { skipped++; }
    }
    res.json({ saved, skipped, total: products.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🔌 TechPrix Morocco — Port ${PORT}`);
  try {
    await seedShops();
    const n = await prisma.product.count();
    console.log(`📦 ${n} produits en base`);
  } catch { console.log('⚠️  Ajoute DATABASE_URL dans les variables Railway'); }
});
