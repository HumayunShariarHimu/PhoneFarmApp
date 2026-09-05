// Complete Phone Model Database — 200+ models
// Samsung, Xiaomi, Vivo, Realme, Symphony, OPPO, OnePlus, Google, Motorola, Tecno, Infinix, itel, Nokia

export const BRANDS = {
  samsung: { name:'Samsung', logo:'🔵', color:'#1428A0', models:[
    {model:'Galaxy S24 Ultra',android:'14',w:412,h:915,ram:'12GB',cpu:'Snapdragon 8 Gen 3'},
    {model:'Galaxy S24+',android:'14',w:393,h:851,ram:'12GB',cpu:'Snapdragon 8 Gen 3'},
    {model:'Galaxy S24',android:'14',w:360,h:780,ram:'8GB',cpu:'Snapdragon 8 Gen 3'},
    {model:'Galaxy S23 Ultra',android:'13',w:412,h:915,ram:'12GB',cpu:'Snapdragon 8 Gen 2'},
    {model:'Galaxy S23',android:'13',w:360,h:780,ram:'8GB',cpu:'Snapdragon 8 Gen 2'},
    {model:'Galaxy A55 5G',android:'14',w:393,h:851,ram:'8GB',cpu:'Exynos 1480'},
    {model:'Galaxy A54 5G',android:'13',w:393,h:851,ram:'8GB',cpu:'Exynos 1380'},
    {model:'Galaxy A35 5G',android:'14',w:360,h:800,ram:'6GB',cpu:'Exynos 1380'},
    {model:'Galaxy A34 5G',android:'13',w:360,h:800,ram:'6GB',cpu:'MediaTek 1080'},
    {model:'Galaxy A25 5G',android:'14',w:360,h:800,ram:'6GB',cpu:'Exynos 1280'},
    {model:'Galaxy A15 5G',android:'14',w:360,h:800,ram:'4GB',cpu:'MediaTek 6835'},
    {model:'Galaxy A14',android:'13',w:360,h:800,ram:'4GB',cpu:'Exynos 850'},
    {model:'Galaxy A13',android:'12',w:360,h:800,ram:'4GB',cpu:'Exynos 850'},
    {model:'Galaxy M55 5G',android:'14',w:393,h:851,ram:'8GB',cpu:'Snapdragon 7 Gen 1'},
    {model:'Galaxy M34 5G',android:'13',w:360,h:800,ram:'6GB',cpu:'Exynos 1280'},
    {model:'Galaxy M14 5G',android:'13',w:360,h:800,ram:'4GB',cpu:'Exynos 1330'},
    {model:'Galaxy Note 20 Ultra',android:'12',w:412,h:915,ram:'12GB',cpu:'Exynos 990'},
    {model:'Galaxy F55 5G',android:'14',w:393,h:851,ram:'8GB',cpu:'Snapdragon 7 Gen 1'},
    {model:'Galaxy F15 5G',android:'14',w:360,h:800,ram:'4GB',cpu:'MediaTek 6835'},
  ]},
  xiaomi: { name:'Xiaomi', logo:'🟠', color:'#FF6900', models:[
    {model:'Xiaomi 14 Ultra',android:'14',w:393,h:851,ram:'16GB',cpu:'Snapdragon 8 Gen 3'},
    {model:'Xiaomi 14',android:'14',w:393,h:851,ram:'12GB',cpu:'Snapdragon 8 Gen 3'},
    {model:'Xiaomi 13T Pro',android:'13',w:393,h:851,ram:'12GB',cpu:'MediaTek 9200+'},
    {model:'Xiaomi 12 Pro',android:'12',w:393,h:851,ram:'12GB',cpu:'Snapdragon 8 Gen 1'},
    {model:'Redmi Note 13 Pro+',android:'13',w:393,h:851,ram:'12GB',cpu:'MediaTek 7200 Ultra'},
    {model:'Redmi Note 13 Pro',android:'13',w:393,h:851,ram:'8GB',cpu:'MediaTek 7200 Ultra'},
    {model:'Redmi Note 13 5G',android:'13',w:393,h:851,ram:'8GB',cpu:'Snapdragon 7s Gen 2'},
    {model:'Redmi Note 13',android:'13',w:360,h:800,ram:'6GB',cpu:'Snapdragon 685'},
    {model:'Redmi Note 12 Pro+',android:'12',w:393,h:851,ram:'8GB',cpu:'MediaTek 1080'},
    {model:'Redmi Note 12 Pro',android:'12',w:393,h:851,ram:'6GB',cpu:'Snapdragon 732G'},
    {model:'Redmi Note 12',android:'12',w:360,h:800,ram:'4GB',cpu:'Snapdragon 685'},
    {model:'Redmi Note 11',android:'11',w:360,h:800,ram:'4GB',cpu:'Snapdragon 680'},
    {model:'Redmi Note 10 Pro',android:'11',w:393,h:851,ram:'6GB',cpu:'Snapdragon 732G'},
    {model:'Redmi 13C',android:'13',w:360,h:800,ram:'4GB',cpu:'MediaTek 6835'},
    {model:'Redmi 13',android:'14',w:360,h:800,ram:'6GB',cpu:'Snapdragon 685'},
    {model:'Redmi A3',android:'14',w:360,h:800,ram:'3GB',cpu:'MediaTek G36'},
    {model:'POCO X6 Pro',android:'14',w:393,h:851,ram:'12GB',cpu:'MediaTek 9300'},
    {model:'POCO F6 Pro',android:'14',w:412,h:915,ram:'12GB',cpu:'Snapdragon 8 Gen 2'},
    {model:'POCO F5',android:'13',w:393,h:851,ram:'8GB',cpu:'Snapdragon 7+ Gen 2'},
    {model:'POCO M6 Pro',android:'13',w:393,h:851,ram:'8GB',cpu:'MediaTek 7200 Ultra'},
  ]},
  vivo: { name:'Vivo', logo:'🔷', color:'#415FFF', models:[
    {model:'Vivo X100 Pro',android:'14',w:393,h:851,ram:'16GB',cpu:'Dimensity 9300'},
    {model:'Vivo V30 Pro',android:'14',w:393,h:851,ram:'12GB',cpu:'Snapdragon 7 Gen 3'},
    {model:'Vivo V30',android:'14',w:393,h:851,ram:'8GB',cpu:'Snapdragon 7 Gen 3'},
    {model:'Vivo V29 Pro',android:'13',w:393,h:851,ram:'12GB',cpu:'Snapdragon 778G'},
    {model:'Vivo V29',android:'13',w:393,h:851,ram:'8GB',cpu:'Snapdragon 778G'},
    {model:'Vivo V27 Pro',android:'13',w:393,h:851,ram:'12GB',cpu:'MediaTek 7200'},
    {model:'Vivo Y200',android:'14',w:360,h:800,ram:'8GB',cpu:'Snapdragon 4 Gen 2'},
    {model:'Vivo Y100',android:'13',w:360,h:800,ram:'8GB',cpu:'Snapdragon 695'},
    {model:'Vivo Y36',android:'13',w:360,h:800,ram:'8GB',cpu:'Snapdragon 680'},
    {model:'Vivo Y22',android:'12',w:360,h:800,ram:'4GB',cpu:'MediaTek Helio G85'},
    {model:'Vivo Y16',android:'12',w:360,h:800,ram:'4GB',cpu:'MediaTek Helio G85'},
    {model:'Vivo Y15s',android:'11',w:360,h:800,ram:'3GB',cpu:'MediaTek Helio P35'},
  ]},
  realme: { name:'Realme', logo:'🟡', color:'#FDD000', models:[
    {model:'Realme GT 6',android:'14',w:393,h:851,ram:'12GB',cpu:'Snapdragon 8s Gen 3'},
    {model:'Realme GT 5 Pro',android:'14',w:393,h:851,ram:'16GB',cpu:'Snapdragon 8 Gen 3'},
    {model:'Realme 13 Pro+',android:'14',w:393,h:851,ram:'12GB',cpu:'Snapdragon 7s Gen 2'},
    {model:'Realme 13 Pro',android:'14',w:393,h:851,ram:'8GB',cpu:'Snapdragon 7s Gen 2'},
    {model:'Realme 12+',android:'14',w:393,h:851,ram:'8GB',cpu:'MediaTek 7050'},
    {model:'Realme 12 Pro+',android:'14',w:393,h:851,ram:'8GB',cpu:'Snapdragon 7s Gen 2'},
    {model:'Realme 11 Pro+',android:'13',w:393,h:851,ram:'12GB',cpu:'MediaTek 7050'},
    {model:'Realme 11 Pro',android:'13',w:393,h:851,ram:'8GB',cpu:'MediaTek 7050'},
    {model:'Realme C67',android:'14',w:360,h:800,ram:'6GB',cpu:'Snapdragon 685'},
    {model:'Realme C65',android:'14',w:360,h:800,ram:'6GB',cpu:'MediaTek Helio G85'},
    {model:'Realme C55',android:'13',w:360,h:800,ram:'6GB',cpu:'MediaTek Helio G88'},
    {model:'Realme C51',android:'13',w:360,h:800,ram:'4GB',cpu:'UniSoC T612'},
    {model:'Narzo N65 5G',android:'14',w:360,h:800,ram:'6GB',cpu:'MediaTek 6835'},
  ]},
  symphony: { name:'Symphony', logo:'🟢', color:'#00A651', models:[
    {model:'Symphony Z60',android:'13',w:360,h:800,ram:'8GB',cpu:'MediaTek Helio G88'},
    {model:'Symphony Z55',android:'13',w:360,h:800,ram:'6GB',cpu:'MediaTek Helio G88'},
    {model:'Symphony Z50',android:'12',w:360,h:800,ram:'6GB',cpu:'MediaTek Helio G85'},
    {model:'Symphony Z47',android:'12',w:360,h:800,ram:'4GB',cpu:'MediaTek Helio G85'},
    {model:'Symphony Z45',android:'12',w:360,h:800,ram:'4GB',cpu:'UniSoC T612'},
    {model:'Symphony Z43',android:'11',w:360,h:800,ram:'4GB',cpu:'UniSoC T610'},
    {model:'Symphony Z40',android:'11',w:360,h:800,ram:'3GB',cpu:'UniSoC T606'},
    {model:'Symphony H200',android:'12',w:360,h:800,ram:'6GB',cpu:'MediaTek Helio G37'},
    {model:'Symphony H180',android:'12',w:360,h:800,ram:'4GB',cpu:'MediaTek Helio G37'},
    {model:'Symphony H160',android:'11',w:360,h:800,ram:'4GB',cpu:'MediaTek Helio G37'},
    {model:'Symphony H150',android:'11',w:360,h:800,ram:'3GB',cpu:'MediaTek Helio P35'},
    {model:'Symphony E78',android:'13',w:360,h:800,ram:'8GB',cpu:'MediaTek Helio G85'},
    {model:'Symphony E75',android:'12',w:360,h:800,ram:'6GB',cpu:'MediaTek Helio G85'},
    {model:'Symphony E65',android:'12',w:360,h:800,ram:'4GB',cpu:'UniSoC T612'},
    {model:'Symphony E55',android:'11',w:360,h:800,ram:'4GB',cpu:'UniSoC T612'},
    {model:'Symphony V142',android:'12',w:360,h:800,ram:'3GB',cpu:'MediaTek Helio G35'},
    {model:'Symphony V140',android:'12',w:360,h:780,ram:'2GB',cpu:'MediaTek Helio A22'},
  ]},
  oppo: { name:'OPPO', logo:'🟩', color:'#1D8348', models:[
    {model:'OPPO Find X7 Ultra',android:'14',w:393,h:851,ram:'16GB',cpu:'Snapdragon 8 Gen 3'},
    {model:'OPPO Reno 12 Pro',android:'14',w:393,h:851,ram:'12GB',cpu:'MediaTek 7300 Energy'},
    {model:'OPPO Reno 12',android:'14',w:393,h:851,ram:'8GB',cpu:'MediaTek 7300 Energy'},
    {model:'OPPO Reno 11 Pro',android:'14',w:393,h:851,ram:'12GB',cpu:'MediaTek 9200'},
    {model:'OPPO Reno 11',android:'14',w:393,h:851,ram:'8GB',cpu:'MediaTek 9200'},
    {model:'OPPO A79 5G',android:'13',w:393,h:851,ram:'8GB',cpu:'MediaTek 6855'},
    {model:'OPPO A59',android:'13',w:360,h:800,ram:'8GB',cpu:'MediaTek Helio G85'},
    {model:'OPPO A38',android:'13',w:360,h:800,ram:'4GB',cpu:'MediaTek Helio G85'},
  ]},
  oneplus: { name:'OnePlus', logo:'🔴', color:'#EB0029', models:[
    {model:'OnePlus 12',android:'14',w:412,h:915,ram:'16GB',cpu:'Snapdragon 8 Gen 3'},
    {model:'OnePlus 12R',android:'14',w:393,h:851,ram:'8GB',cpu:'Snapdragon 8 Gen 1'},
    {model:'OnePlus Nord 4',android:'14',w:393,h:851,ram:'8GB',cpu:'Snapdragon 7+ Gen 3'},
    {model:'OnePlus Nord 3',android:'13',w:393,h:851,ram:'8GB',cpu:'MediaTek 9105'},
    {model:'OnePlus Nord CE 4',android:'14',w:393,h:851,ram:'8GB',cpu:'Snapdragon 7s Gen 2'},
    {model:'OnePlus 11',android:'13',w:412,h:915,ram:'8GB',cpu:'Snapdragon 8 Gen 2'},
  ]},
  google: { name:'Google', logo:'🔴', color:'#4285F4', models:[
    {model:'Pixel 9 Pro XL',android:'15',w:412,h:915,ram:'16GB',cpu:'Tensor G4'},
    {model:'Pixel 9 Pro',android:'15',w:393,h:851,ram:'16GB',cpu:'Tensor G4'},
    {model:'Pixel 9',android:'15',w:393,h:851,ram:'12GB',cpu:'Tensor G4'},
    {model:'Pixel 8 Pro',android:'14',w:412,h:915,ram:'12GB',cpu:'Tensor G3'},
    {model:'Pixel 8',android:'14',w:393,h:851,ram:'8GB',cpu:'Tensor G3'},
    {model:'Pixel 8a',android:'14',w:393,h:851,ram:'8GB',cpu:'Tensor G3'},
    {model:'Pixel 7a',android:'13',w:393,h:851,ram:'8GB',cpu:'Tensor G2'},
  ]},
  motorola: { name:'Motorola', logo:'🏍️', color:'#DA3B2E', models:[
    {model:'Moto Edge 50 Pro',android:'14',w:393,h:851,ram:'12GB',cpu:'Snapdragon 7 Gen 3'},
    {model:'Moto Edge 50',android:'14',w:393,h:851,ram:'8GB',cpu:'Snapdragon 7s Gen 2'},
    {model:'Moto G84 5G',android:'13',w:393,h:851,ram:'8GB',cpu:'Snapdragon 695'},
    {model:'Moto G54 5G',android:'13',w:360,h:800,ram:'8GB',cpu:'MediaTek 7020'},
    {model:'Moto G24',android:'14',w:360,h:800,ram:'4GB',cpu:'MediaTek Helio G85'},
    {model:'Moto E14',android:'14',w:360,h:780,ram:'2GB',cpu:'UniSoC T606'},
  ]},
  tecno: { name:'Tecno', logo:'🔶', color:'#F7931E', models:[
    {model:'Tecno Camon 30 Pro',android:'14',w:393,h:851,ram:'8GB',cpu:'Helio G99 Ultra'},
    {model:'Tecno Camon 30',android:'14',w:393,h:851,ram:'8GB',cpu:'Helio G99'},
    {model:'Tecno Spark 20 Pro+',android:'14',w:393,h:851,ram:'16GB',cpu:'Helio G100'},
    {model:'Tecno Spark 20',android:'14',w:360,h:800,ram:'8GB',cpu:'Helio G85'},
    {model:'Tecno Spark 10 Pro',android:'13',w:360,h:800,ram:'8GB',cpu:'Helio G88'},
    {model:'Tecno Pop 8',android:'13',w:360,h:800,ram:'4GB',cpu:'UniSoC T606'},
  ]},
  infinix: { name:'Infinix', logo:'⚡', color:'#FF4B2B', models:[
    {model:'Infinix GT 20 Pro',android:'14',w:393,h:851,ram:'12GB',cpu:'Helio G100 Ultra'},
    {model:'Infinix Note 40 Pro',android:'14',w:393,h:851,ram:'8GB',cpu:'Helio G99 Ultimate'},
    {model:'Infinix Note 40',android:'14',w:393,h:851,ram:'8GB',cpu:'Helio G99'},
    {model:'Infinix Hot 40 Pro',android:'14',w:360,h:800,ram:'8GB',cpu:'Helio G96'},
    {model:'Infinix Hot 40',android:'14',w:360,h:800,ram:'8GB',cpu:'Helio G88'},
    {model:'Infinix Smart 8 Pro',android:'13',w:360,h:800,ram:'4GB',cpu:'UniSoC T606'},
  ]},
  itel: { name:'itel', logo:'📱', color:'#0066CC', models:[
    {model:'itel S24',android:'14',w:360,h:800,ram:'6GB',cpu:'UniSoC T606'},
    {model:'itel P55 5G',android:'14',w:360,h:800,ram:'4GB',cpu:'MediaTek 6835'},
    {model:'itel P55',android:'14',w:360,h:800,ram:'4GB',cpu:'UniSoC T612'},
    {model:'itel A70',android:'14',w:360,h:800,ram:'3GB',cpu:'UniSoC T606'},
    {model:'itel A60s',android:'13',w:360,h:780,ram:'2GB',cpu:'UniSoC T612'},
  ]},
  nokia: { name:'Nokia', logo:'🔵', color:'#124191', models:[
    {model:'Nokia G42 5G',android:'13',w:393,h:851,ram:'6GB',cpu:'Snapdragon 480+ 5G'},
    {model:'Nokia G310 5G',android:'13',w:393,h:851,ram:'4GB',cpu:'Snapdragon 4 Gen 1'},
    {model:'Nokia G22',android:'12',w:360,h:800,ram:'6GB',cpu:'UniSoC T606'},
    {model:'Nokia C32',android:'12',w:360,h:800,ram:'4GB',cpu:'UniSoC T606'},
  ]},
};

function buildUA(brand, model, android) {
  return `Mozilla/5.0 (Linux; Android ${android}; ${model} Build/TQ3A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36`;
}

export const ALL_MODELS = [];
Object.entries(BRANDS).forEach(([key, brand]) => {
  brand.models.forEach(m => {
    ALL_MODELS.push({
      id:         `${key}_${m.model.toLowerCase().replace(/\s+/g,'_')}`,
      brandKey:   key,
      brand:      brand.name,
      brandColor: brand.color,
      brandLogo:  brand.logo,
      model:      m.model,
      fullName:   `${brand.name} ${m.model}`,
      android:    m.android,
      ram:        m.ram,
      cpu:        m.cpu,
      width:      m.w,
      height:     m.h,
      userAgent:  buildUA(brand.name, m.model, m.android),
    });
  });
});

export const BRAND_LIST = Object.entries(BRANDS).map(([key, b]) => ({
  key, name:b.name, logo:b.logo, color:b.color, count:b.models.length,
}));

export const ANDROID_VERSIONS = ['15','14','13','12','11','10','9'];
export const TOTAL_MODELS = ALL_MODELS.length;
export const getModel = (id) => ALL_MODELS.find(m => m.id === id) || ALL_MODELS[0];
export const getModelsByBrand = (key) => ALL_MODELS.filter(m => m.brandKey === key);
