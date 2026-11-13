export type BankGroup = "Mevduat bankaları" | "Katılım bankaları" | "Kalkınma ve yatırım bankaları" | "TMSF";
export const BANKALAR: { name: string; group: BankGroup }[] = [
  ...["Akbank","Alternatif Bank","Anadolubank","Arap Türk Bankası","Bank of China Turkey","Burgan Bank","Citibank","Colendi Bank","DenizBank","Deutsche Bank","Enpara Bank","Fibabanka","Freedom Bank","FUPS Bank","Hepsibank","HSBC","ICBC Turkey Bank","ING","Intesa Sanpaolo İstanbul Şubesi","JPMorgan Chase İstanbul Şubesi","MUFG Bank Turkey","Odea Bank","QNB","Société Générale İstanbul Şubesi","Şekerbank","Ziraat Bankası","Turkland Bank","TEB","Türk Ticaret Bankası","Garanti BBVA","Halkbank","İş Bankası","VakıfBank","Yapı Kredi","Ziraat Dinamik Banka"].map(name => ({name, group:"Mevduat bankaları" as const})),
  ...["Aktif Yatırım Bankası","Aytemiz Yatırım Bankası","Bank of America Yatırım Bank","BankPozitif","D Yatırım Bankası","Destek Yatırım Bankası","Diler Yatırım Bankası","GSD Yatırım Bankası","Hedef Yatırım Bankası","İller Bankası (İLBANK)","Takasbank","Misyon Yatırım Bankası","Nurol Yatırım Bankası","Pasha Yatırım Bankası","Q Yatırım Bankası","Standard Chartered Yatırım Bankası","Tera Yatırım Bankası","Türk Eximbank","Türkiye Kalkınma ve Yatırım Bankası","Türkiye Sınai Kalkınma Bankası (TSKB)"].map(name => ({name, group:"Kalkınma ve yatırım bankaları" as const})),
  ...["Adil Katılım","Albaraka Türk","Dünya Katılım","Hayat Finans","Kuveyt Türk","T.O.M. Katılım (TOM Bank)","Emlak Katılım","Türkiye Finans","Vakıf Katılım","Ziraat Katılım"].map(name => ({name, group:"Katılım bankaları" as const})),
  {name:"Birleşik Fon Bankası", group:"TMSF"},
];
export const ABONELIKLER: { category: string; apps: string[] }[] = [
 {category:"Film, dizi ve TV",apps:["Netflix","Amazon Prime Video","Disney+","HBO Max","MUBI","Exxen","GAİN","TOD","beIN CONNECT","S Sport Plus","TV+","Tivibu Go","D-Smart GO","Tabii Premium","Apple TV+","Crunchyroll"]},
 {category:"Müzik ve ses",apps:["Spotify Premium","YouTube Music Premium","Apple Music","Deezer","Fizy","Muud","YouTube Premium","Storytel","Audible","Kindle Unlimited","Podimo"]},
 {category:"Bulut, depolama ve üretkenlik",apps:["Google One","iCloud+","Microsoft 365","Dropbox","Adobe Creative Cloud","Canva Pro","Notion Plus","Evernote","1Password","NordVPN","ExpressVPN"]},
 {category:"Yapay zekâ ve yazılım",apps:["ChatGPT Plus","ChatGPT Pro","Claude Pro","Google AI Pro / Gemini","Perplexity Pro","Midjourney","GitHub Copilot","Cursor Pro","JetBrains AI","Grammarly Pro"]},
 {category:"Alışveriş ve teslimat",apps:["Amazon Prime","Trendyol Plus","Hepsiburada Premium","Migros Sanal Market üyeliği","Yemeksepeti Plus","Getir üyeliği","A101 Kapıda üyeliği"]},
 {category:"Oyun",apps:["PlayStation Plus","Xbox Game Pass","Nintendo Switch Online","Apple Arcade","Google Play Pass","EA Play","Ubisoft+","World of Warcraft"]},
 {category:"Eğitim ve kariyer",apps:["Duolingo Super","Busuu Premium","Cambly","Coursera Plus","Udemy Personal Plan","LinkedIn Premium","Preply"]},
 {category:"Spor, sağlık ve yaşam",apps:["Strava","adidas Running Premium","Nike Training Club","MACFit üyeliği","Headspace","Calm","Fitbod","Sleep Cycle Premium"]},
 {category:"Haber, dergi ve diğer",apps:["The New York Times","The Economist","Financial Times","The Wall Street Journal","Medium Membership","Tinder Gold","Bumble Premium","Google Workspace","Diğer / listede yok"]},
];
