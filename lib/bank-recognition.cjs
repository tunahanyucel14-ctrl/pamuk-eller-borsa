const BANK_ALIASES = {
  "Ziraat Bankası": ["ziraat bankasi", "tc ziraat bankasi", "ziraat"],
  "Halkbank": ["halkbank", "turkiye halk bankasi", "halk bankasi"],
  "VakıfBank": ["vakifbank", "turkiye vakiflar bankasi", "vakif bankasi"],
  "İş Bankası": ["is bankasi", "turkiye is bankasi", "isbank"],
  "Garanti BBVA": ["garanti bbva", "garanti bankasi", "turkiye garanti bankasi"],
  "Yapı Kredi": ["yapi kredi", "yapi ve kredi bankasi"],
  "Akbank": ["akbank"],
  "QNB": ["qnb", "qnb finansbank", "finansbank"],
  "DenizBank": ["denizbank", "deniz bank"],
  "TEB": ["teb", "turk ekonomi bankasi"],
  "ING": ["ing", "ing bank"],
  "Kuveyt Türk": ["kuveyt turk", "kuveyt turk katilim bankasi"],
  "Türkiye Finans": ["turkiye finans", "turkiye finans katilim bankasi"],
  "Albaraka Türk": ["albaraka", "albaraka turk"],
  "Ziraat Katılım": ["ziraat katilim"],
  "Vakıf Katılım": ["vakif katilim"],
  "Emlak Katılım": ["emlak katilim"],
  "Şekerbank": ["sekerbank"],
  "Fibabanka": ["fibabanka", "fiba banka"],
  "Odeabank": ["odeabank", "odea bank"],
  "HSBC": ["hsbc"],
  "ICBC Turkey": ["icbc turkey", "icbc"],
  "Anadolubank": ["anadolubank"],
  "Alternatif Bank": ["alternatif bank", "abank"],
  "Enpara": ["enpara", "enpara.com"],
  "Papara": ["papara"],
  "iyzico": ["iyzico"],
  "TOM Bank": ["tom bank", "hadi"],
  "Paycell": ["paycell"],
  "CEPTETEB": ["cepteteb"]
};

function normalizeBankText(value) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "").replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalBankName(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = normalizeBankText(value);
  const entries = Object.entries(BANK_ALIASES)
    .flatMap(([canonical, aliases]) => aliases.map(alias => ({ canonical, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);
  for (const { canonical, alias } of entries) {
    const candidate = normalizeBankText(alias);
    if ((" " + normalized + " ").includes(" " + candidate + " ")) return canonical;
  }
  return value.trim().slice(0, 80);
}

module.exports = { canonicalBankName };
