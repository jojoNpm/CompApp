const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const brandsList = [
  { brand_name: 'Accro', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1557-accro' },
  { brand_name: 'Accro', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/191-accro' },
  { brand_name: 'Accro', site_name: 'Chronodrive', brand_url: 'https://www.chronodrive.com/search/accro' },
  { brand_name: 'Accro', site_name: 'Carrefour', brand_url: 'https://www.carrefour.fr/s?q=accro' },
  { brand_name: 'Beyond Meat', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1037-beyond-meat' },
  { brand_name: 'Bertyn', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1130-bertyn' },
  { brand_name: 'Dream Farm', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1675-dream-farm' },
  { brand_name: 'Dream Farm', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/326-dreamfarm' },
  { brand_name: 'Garden Gourmet', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1576-garden-gourmet' },
  { brand_name: 'Garden Gourmet', site_name: 'Chronodrive', brand_url: 'https://www.chronodrive.com/search/garden%20gourmet' },
  { brand_name: 'Garden Gourmet', site_name: 'Carrefour', brand_url: 'https://www.carrefour.fr/s?q=garden+gourmet' },
  { brand_name: 'Garden Gourmet', site_name: 'Intermarché', brand_url: 'https://www.intermarche.com/recherche/garden%20gourmet' },
  { brand_name: 'Greenvie', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/241-greenvie' },
  { brand_name: 'Happyvore', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1093-happyvore' },
  { brand_name: 'Happyvore', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/297-happyvore' },
  { brand_name: 'Happyvore', site_name: 'Chronodrive', brand_url: 'https://www.chronodrive.com/search/happyvore' },
  { brand_name: 'Happyvore', site_name: 'Carrefour', brand_url: 'https://www.carrefour.fr/s?q=happyvore' },
  { brand_name: 'Happyvore', site_name: 'Intermarché', brand_url: 'https://www.intermarche.com/recherche/happyvore' },
  { brand_name: 'Hari&Co', site_name: 'Carrefour', brand_url: 'https://www.carrefour.fr/s?q=hari%26co' },
  { brand_name: 'Hellmanns', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1510-hellmanns' },
  { brand_name: 'Heura', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1195-heura' },
  { brand_name: 'Heura', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/211-heura' },
  { brand_name: 'Heura', site_name: 'Carrefour', brand_url: 'https://www.carrefour.fr/s?q=heura' },
  { brand_name: 'Jay and Joy', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1045-jay-and-joy' },
  { brand_name: 'Jay and Joy', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/232-jay-joy' },
  { brand_name: 'Juicy Marbles', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1605-juicy-marbles' },
  { brand_name: 'Juicy Marbles', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/216-juicy-marbles' },
  { brand_name: 'Kokiriki', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1211-kokiriki' },
  { brand_name: 'Kokiriki', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/98-kokiriki' },
  { brand_name: 'La Vie', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1335-la-vie' },
  { brand_name: 'La Vie', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/109-la-vie' },
  { brand_name: 'La Vie', site_name: 'Chronodrive', brand_url: 'https://www.chronodrive.com/search/lavie' },
  { brand_name: 'La Vie', site_name: 'Carrefour', brand_url: 'https://www.carrefour.fr/s?q=la+vie' },
  { brand_name: 'La Vie', site_name: 'Intermarché', brand_url: 'https://www.intermarche.com/recherche/la%20vie?marques=14204' },
  { brand_name: 'Le Grand Bluff', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1539-le-grand-bluff' },
  { brand_name: 'Le Grand Bluff', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/317-le-grand-bluff' },
  { brand_name: 'Les nouveaux Affineurs', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1142-les-nouveaux-affineurs' },
  { brand_name: 'Les nouveaux affineurs', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/276-les-nouveaux-affineurs' },
  { brand_name: 'Markal', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/937-markal' },
  { brand_name: 'New Roots', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1343-new-roots' },
  { brand_name: 'New Roots', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/180-new-roots' },
  { brand_name: 'Ocean Kiss', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1617-ocean-kiss' },
  { brand_name: 'Ocean Kiss', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/229-ocean-kiss' },
  { brand_name: 'Ocean Kiss', site_name: 'Carrefour', brand_url: 'https://www.carrefour.fr/s?q=ocean+kiss' },
  { brand_name: 'Planted', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1278-planted' },
  { brand_name: 'Planted', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/254-planted-foods' },
  { brand_name: 'Planted', site_name: 'Carrefour', brand_url: 'https://www.carrefour.fr/s?q=planted' },
  { brand_name: 'Plantjoy', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1787-plantjoy' },
  { brand_name: 'Real Vegy', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1681-real-vegy' },
  { brand_name: 'Revo', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1427-revo' },
  { brand_name: 'Revo', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/313-revo' },
  { brand_name: 'Richesmonts', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1720-richesmonts' },
  { brand_name: 'Richesmonts', site_name: 'Carrefour', brand_url: 'https://www.carrefour.fr/s?q=richesmont+v%C3%A9g%C3%A9tal' },
  { brand_name: 'Rollito Vegano', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1426-rollito-vegano' },
  { brand_name: 'Rollito Vegano', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/205-rollito-vegano' },
  { brand_name: 'Senfas', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/988-senfas' },
  { brand_name: 'Senfas', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/243-senfas' },
  { brand_name: 'Soy', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/928-soy' },
  { brand_name: 'Taifun', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1033-taifun' },
  { brand_name: 'Veggie Deli', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1244-veggie-deli' },
  { brand_name: 'Vegusto', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1057-vegusto' },
  { brand_name: 'Violife', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1035-violife' },
  { brand_name: 'Violife', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/47-violife' },
  { brand_name: 'Violife', site_name: 'Carrefour', brand_url: 'https://www.carrefour.fr/s?q=violife' },
  { brand_name: 'Vivera', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1419-vivera' },
  { brand_name: 'Wheaty', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/969-wheaty' },
  { brand_name: 'Zuger', site_name: 'OVS', brand_url: 'https://www.officialveganshop.com/brand/1568-zuger' },
  { brand_name: 'Unconventional', site_name: 'Vegetal Food', brand_url: 'https://www.vegetalfood.fr/brand/284-unconventional' },
  { brand_name: 'Tartare Vegetal', site_name: 'Chronodrive', brand_url: 'https://www.chronodrive.com/search/tartare%20vegetal' },
  { brand_name: 'Tartare Vegetal', site_name: 'Carrefour', brand_url: 'https://www.carrefour.fr/s?q=tartare+vegetal' }
];

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand_name TEXT NOT NULL,
      site_name TEXT NOT NULL,
      brand_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(brand_name, site_name)
    )
  `);

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO brands (brand_name, site_name, brand_url)
    VALUES (?, ?, ?)
  `);

  brandsList.forEach(b => {
    stmt.run(b.brand_name, b.site_name, b.brand_url);
  });

  stmt.finalize();
  console.log('Toutes les marques ont été insérées ou ignorées si déjà présentes.');
});

db.close();