"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard, TrendingUp, TrendingDown, Wallet,
  CreditCard, PiggyBank, ChartNoAxesCombined, Trophy,
  FileText, Plus, ArrowUpRight, ArrowDownRight,
  Menu, X, Bell, Search, CalendarDays, Trash2,
  Banknote, ChevronRight, CircleDollarSign
} from "lucide-react";

type Transaction = {
  id: number;
  title: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
};

const menuItems = [
  { label: "Genel Bakış", icon: LayoutDashboard },
  { label: "Gelirler", icon: TrendingUp },
  { label: "Giderler", icon: TrendingDown },
  { label: "Hesaplarım", icon: Wallet },
  { label: "Borçlarım", icon: CreditCard },
  { label: "Birikimlerim", icon: PiggyBank },
  { label: "Yatırımlarım", icon: ChartNoAxesCombined },
  { label: "Borsa Arenası", icon: Trophy },
  { label: "Raporlar", icon: FileText },
];

const money = (amount: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);

export default function FinansPage() {
  const [active, setActive] = useState("Genel Bakış");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("pamuk-finans-islemler");
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch {
        setTransactions([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "pamuk-finans-islemler",
      JSON.stringify(transactions)
    );
  }, [transactions]);

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expense;

  const addTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !category || Number(amount) <= 0) return;

    const newTransaction: Transaction = {
      id: Date.now(),
      title,
      category,
      amount: Number(amount),
      type: formType,
      date: new Date().toLocaleDateString("tr-TR"),
    };

    setTransactions((prev) => [newTransaction, ...prev]);
    setTitle("");
    setCategory("");
    setAmount("");
    setShowForm(false);
  };

  const deleteTransaction = (id: number) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const openForm = (type: "income" | "expense") => {
    setFormType(type);
    setShowForm(true);
  };

  const navigate = (label: string) => {
    if (label === "Borsa Arenası") {
      window.location.href = "/";
      return;
    }
    setActive(label);
    setMobileMenu(false);
  };

  return (
    <main className="min-h-screen bg-[#080d18] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-white/10 bg-[#0d1423] p-5 transition-transform lg:static lg:translate-x-0 ${
          mobileMenu ? "translate-x-0" : "-translate-x-full"
        }`}>
          <div className="mb-10 flex items-center justify-between">
            <div>
              <div className="text-2xl font-black tracking-tight">
                <span className="text-emerald-400">Pamuk</span> Eller
              </div>
              <p className="mt-1 text-xs tracking-[3px] text-slate-500">
                FİNANS
              </p>
            </div>
            <button onClick={() => setMobileMenu(false)} className="lg:hidden">
              <X />
            </button>
          </div>

          <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            MENÜ
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const selected = active === item.label;

              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.label)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    selected
                      ? "bg-emerald-500/15 font-semibold text-emerald-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                  {selected && (
                    <ChevronRight size={16} className="ml-auto" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="absolute bottom-6 left-5 right-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-emerald-400">
              <CircleDollarSign size={20} />
              <span className="text-sm font-bold">Pamuk Eller</span>
            </div>
            <p className="text-xs leading-5 text-slate-400">
              Finansal geleceğini tek bir yerden yönet.
            </p>
          </div>
        </aside>

        {/* MAIN */}
        <section className="min-w-0 flex-1">

          {/* TOPBAR */}
          <header className="flex h-20 items-center justify-between border-b border-white/10 px-5 md:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenu(true)}
                className="rounded-lg p-2 hover:bg-white/5 lg:hidden"
              >
                <Menu />
              </button>
              <div>
                <h1 className="text-lg font-bold md:text-xl">{active}</h1>
                <p className="hidden text-xs text-slate-500 sm:block">
                  Finansal kontrol panelin
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 md:flex">
                <CalendarDays size={16} />
                {new Date().toLocaleDateString("tr-TR")}
              </div>
              <button className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:text-white">
                <Bell size={19} />
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-7 p-5 md:p-8">

            {/* WELCOME */}
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-sm text-slate-400">Finansal durumun</p>
                <h2 className="mt-1 text-2xl font-bold md:text-3xl">
                  Hoş geldin! 👋
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Gelirlerini ve giderlerini tek ekrandan takip et.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openForm("income")}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-[#06130e] transition hover:bg-emerald-400"
                >
                  <Plus size={18} /> Gelir Ekle
                </button>
                <button
                  onClick={() => openForm("expense")}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
                >
                  <Plus size={18} /> Gider Ekle
                </button>
              </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Toplam Gelir"
                amount={income}
                icon={<TrendingUp size={21} />}
                color="emerald"
                subtitle="Kaydedilen gelirler"
              />
              <SummaryCard
                title="Toplam Gider"
                amount={expense}
                icon={<TrendingDown size={21} />}
                color="rose"
                subtitle="Kaydedilen giderler"
              />
              <SummaryCard
                title="Net Durum"
                amount={balance}
                icon={<Wallet size={21} />}
                color="blue"
                subtitle="Gelir - gider"
              />
              <SummaryCard
                title="Tasarruf Oranı"
                amount={income > 0 ? (balance / income) * 100 : 0}
                icon={<PiggyBank size={21} />}
                color="amber"
                subtitle="Gelirin içindeki tasarruf"
                percentage
              />
            </div>

            {/* CONTENT GRID */}
            <div className="grid gap-6 xl:grid-cols-3">

              {/* TRANSACTIONS */}
              <div className="rounded-2xl border border-white/10 bg-[#101a2b] p-5 xl:col-span-2">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Son İşlemler</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Kaydettiğin gelir ve giderler
                    </p>
                  </div>
                  <span className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">
                    {transactions.length} işlem
                  </span>
                </div>

                {transactions.length === 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center text-center">
                    <div className="mb-4 rounded-2xl bg-white/5 p-4 text-slate-500">
                      <Banknote size={30} />
                    </div>
                    <p className="font-semibold">Henüz işlem bulunmuyor</p>
                    <p className="mt-2 max-w-xs text-sm text-slate-500">
                      İlk gelirini veya giderini ekleyerek finansal takibine başla.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.slice(0, 10).map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`rounded-xl p-2.5 ${
                            t.type === "income"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {t.type === "income"
                              ? <ArrowDownRight size={19} />
                              : <ArrowUpRight size={19} />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{t.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {t.category} · {t.date}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`whitespace-nowrap text-sm font-bold ${
                            t.type === "income" ? "text-emerald-400" : "text-rose-400"
                          }`}>
                            {t.type === "income" ? "+" : "-"}{money(t.amount)}
                          </span>
                          <button
                            onClick={() => deleteTransaction(t.id)}
                            className="rounded-lg p-2 text-slate-600 hover:bg-rose-500/10 hover:text-rose-400"
                            title="İşlemi sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* QUICK ACTIONS */}
              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-[#101a2b] p-5">
                  <h3 className="font-bold">Hızlı İşlemler</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Finansal kayıtlarını yönet
                  </p>

                  <div className="mt-5 space-y-3">
                    <QuickAction
                      icon={<TrendingUp size={19} />}
                      title="Gelir Ekle"
                      desc="Yeni kazanç kaydet"
                      color="emerald"
                      onClick={() => openForm("income")}
                    />
                    <QuickAction
                      icon={<TrendingDown size={19} />}
                      title="Gider Ekle"
                      desc="Yeni harcama kaydet"
                      color="rose"
                      onClick={() => openForm("expense")}
                    />
                    <QuickAction
                      icon={<Wallet size={19} />}
                      title="Hesaplarım"
                      desc="Hesaplarını görüntüle"
                      color="blue"
                      onClick={() => setActive("Hesaplarım")}
                    />
                    <QuickAction
                      icon={<PiggyBank size={19} />}
                      title="Birikimlerim"
                      desc="Tasarruflarını takip et"
                      color="amber"
                      onClick={() => setActive("Birikimlerim")}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
                  <div className="mb-3 flex items-center gap-2 text-emerald-400">
                    <Trophy size={20} />
                    <span className="font-bold">Borsa Arenası</span>
                  </div>
                  <p className="text-sm leading-6 text-slate-400">
                    Sanal borsa yarışmasına katıl ve yatırım becerilerini geliştir.
                  </p>
                  <button
                    onClick={() => window.location.href = "/"}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-[#06130e] hover:bg-emerald-400"
                  >
                    Arenaya Git <ArrowUpRight size={17} />
                  </button>
                </div>
              </div>
            </div>

            {/* INFO */}
            <div className="rounded-2xl border border-white/10 bg-[#101a2b] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                  <ChartNoAxesCombined size={22} />
                </div>
                <div>
                  <h3 className="font-bold">Finansal Kontrol Merkezi</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Diğer finans modüllerini sırayla geliştireceğiz.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["Hesaplarım", "Borçlarım", "Yatırımlarım"].map((item) => (
                  <button
                    key={item}
                    onClick={() => setActive(item)}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-300 hover:border-emerald-500/30 hover:bg-emerald-500/5"
                  >
                    {item}
                    <ChevronRight size={17} className="text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ADD TRANSACTION MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={addTransaction}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101a2b] p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  {formType === "income" ? "Gelir Ekle" : "Gider Ekle"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  İşlem bilgilerini doldur.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5"
              >
                <X />
              </button>
            </div>

            <label className="mb-2 block text-sm text-slate-400">
              İşlem adı
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={formType === "income" ? "Örn. Maaş" : "Örn. Market"}
              className="mb-4 w-full rounded-xl border border-white/10 bg-[#080d18] px-4 py-3 text-white outline-none focus:border-emerald-500"
              required
            />

            <label className="mb-2 block text-sm text-slate-400">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mb-4 w-full rounded-xl border border-white/10 bg-[#080d18] px-4 py-3 text-white outline-none focus:border-emerald-500"
              required
            >
              <option value="">Kategori seç</option>
              {(formType === "income"
                ? ["Maaş", "Ek Ödeme", "Nöbet Ücreti", "Ek Gelir", "Diğer"]
                : ["Kira", "Faturalar", "Market", "Kredi Kartı", "Kredi", "Ulaşım", "Diğer"]
              ).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <label className="mb-2 block text-sm text-slate-400">
              Tutar (TL)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="mb-6 w-full rounded-xl border border-white/10 bg-[#080d18] px-4 py-3 text-white outline-none focus:border-emerald-500"
              required
            />

            <button
              type="submit"
              className={`w-full rounded-xl py-3 font-bold text-[#06130e] ${
                formType === "income"
                  ? "bg-emerald-500 hover:bg-emerald-400"
                  : "bg-rose-400 hover:bg-rose-300"
              }`}
            >
              İşlemi Kaydet
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  title,
  amount,
  icon,
  color,
  subtitle,
  percentage = false,
}: {
  title: string;
  amount: number;
  icon: React.ReactNode;
  color: string;
  subtitle: string;
  percentage?: boolean;
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    rose: "bg-rose-500/10 text-rose-400",
    blue: "bg-blue-500/10 text-blue-400",
    amber: "bg-amber-500/10 text-amber-400",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101a2b] p-5 transition hover:border-white/20">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{title}</span>
        <div className={`rounded-xl p-2.5 ${colors[color]}`}>{icon}</div>
      </div>
      <div className="mt-5 text-2xl font-bold tracking-tight">
        {percentage
          ? `%${amount.toFixed(1).replace(".", ",")}`
          : money(amount)}
      </div>
      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  desc,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  onClick: () => void;
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    rose: "bg-rose-500/10 text-rose-400",
    blue: "bg-blue-500/10 text-blue-400",
    amber: "bg-amber-500/10 text-amber-400",
  };

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left transition hover:border-white/10 hover:bg-white/5"
    >
      <div className={`rounded-xl p-2.5 ${colors[color]}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{desc}</p>
      </div>
      <ChevronRight size={17} className="text-slate-600" />
    </button>
  );
}
