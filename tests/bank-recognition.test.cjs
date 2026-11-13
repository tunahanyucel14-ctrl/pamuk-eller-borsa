const test = require("node:test");
const assert = require("node:assert/strict");
const { canonicalBankName } = require("../lib/bank-recognition.cjs");

const cases = [
  ["T.C. ZİRAAT BANKASI A.Ş.", "Ziraat Bankası"],
  ["Ziraat Katılım Bankası", "Ziraat Katılım"],
  ["Türkiye Halk Bankası / HALKBANK", "Halkbank"],
  ["T. Vakıflar Bankası T.A.O. - VakıfBank", "VakıfBank"],
  ["Türkiye İş Bankası", "İş Bankası"],
  ["Garanti BBVA", "Garanti BBVA"],
  ["Yapı ve Kredi Bankası", "Yapı Kredi"],
  ["QNB Finansbank", "QNB"],
  ["Kuveyt Türk Katılım Bankası", "Kuveyt Türk"],
  ["Türkiye Finans Katılım Bankası", "Türkiye Finans"],
  ["Albaraka Türk", "Albaraka Türk"],
  ["Enpara.com", "Enpara"],
  ["Papara Elektronik Para A.Ş.", "Papara"],
  ["TOM Bank / Hadi", "TOM Bank"],
  ["Paycell", "Paycell"]
];

for (const [input, expected] of cases) {
  test("banka adı eşleştirme: " + input, () => {
    assert.equal(canonicalBankName(input), expected);
  });
}

test("boş veya null banka adı tahmin edilmez", () => {
  assert.equal(canonicalBankName(null), null);
  assert.equal(canonicalBankName("   "), null);
});

test("eşleşmeyen kurum adı korunur, başka bankaya zorlanmaz", () => {
  assert.equal(canonicalBankName("Örnek Finans Kurumu"), "Örnek Finans Kurumu");
});

test("kısa ING takma adı kelime içinden yanlış eşleşmez", () => {
  assert.equal(canonicalBankName("İngilizce açıklama"), "İngilizce açıklama");
});
