import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import { LogOut } from "lucide-react";
import CmsSourceBadge from "@/features/cms/components/CmsSourceBadge";
import { CmsOptionalImage } from "@/features/cms/components/CmsOptionalImage";
import { CmsRenderRegistryProvider } from "@/features/cms/components/CmsRenderRegistry";

import CmsTailFaq from "@/features/cms/components/CmsTailFaq";
import CmsTailCta from "@/features/cms/components/CmsTailCta";
import {
  User, Database, Settings, ShieldCheck, Wrench, MessageSquare,
  Download, Key, Monitor, ArrowUpRight, Search, FileText, ChevronRight,
  ShoppingCart, Plus, Send, Package,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import AutoBreadcrumb from "@/components/AutoBreadcrumb";
import { useCmsI18n } from "@/features/cms/hooks/useCmsI18n";

/* ── Data (technical keys — UI labels resolved via i18n) ── */
const downloadCategories = [
  {
    categoryKey: "server",
    itemKeys: ["serverV421", "serverV418"],
  },
  {
    categoryKey: "gateway",
    itemKeys: ["gw4080", "gw2040"],
  },
  {
    categoryKey: "konfig",
    itemKeys: ["configoFbi", "tcskTreiber"],
  },
  {
    categoryKey: "doku",
    itemKeys: ["ivsHandbuch", "configoHandbuch"],
  },
] as const;

const shopItems = [
  { name: "ISW5030", nr: "Art. 1080130", price: "189,00 €", catKey: "innen" },
  { name: "ISH3130", nr: "Art. 1081100", price: "134,50 €", catKey: "innen" },
  { name: "ASI12000", nr: "Art. 2010120", price: "345,00 €", catKey: "aussen" },
  { name: "PNA2420", nr: "Art. 3060241", price: "78,90 €", catKey: "netzteile" },
  { name: "FVK2200", nr: "Art. 4010220", price: "24,50 €", catKey: "kabel" },
  { name: "BCM6340", nr: "Art. 5020634", price: "56,00 €", catKey: "zubehoer" },
];

const chatTopicKeys = ["device", "gateway", "firmware", "bus", "errorCodes"] as const;
const shopFilterKeys = ["alle", "innen", "aussen", "netzteile", "kabel", "zubehoer"] as const;

/* ── Tile Component ── */
interface ServiceTileProps {
  icon: React.ReactNode;
  label: string;
  title: string;
  desc: string;
  tag?: string;
  isNew?: boolean;
  newBadgeText?: string;
  onClick?: () => void;
}

const ServiceTile = ({ icon, label, title, desc, tag, isNew, newBadgeText, onClick }: ServiceTileProps) => (
  <button
    onClick={onClick}
    className="bg-background p-7 text-left flex flex-col gap-4 hover:bg-secondary transition-colors cursor-pointer relative border border-border group"
  >
    {isNew && (
      <span className="absolute top-5 right-5 text-[10px] font-medium tracking-wider uppercase bg-foreground text-background px-2 py-0.5">
        {newBadgeText}
      </span>
    )}
    <div className="w-8 h-8 text-foreground">{icon}</div>
    <div>
      <span className="text-xs text-muted-foreground tracking-wide block mb-1">{label}</span>
      <h3 className="text-base font-medium font-heading text-foreground mb-0.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
    <div className="mt-auto flex items-center justify-between">
      {tag && <span className="text-xs text-muted-foreground">{tag}</span>}
      <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all ml-auto" />
    </div>
  </button>
);

/* ── Full-row tile ── */
interface FullRowTileProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tags: string[];
  buttonLabel: string;
  onClick?: () => void;
}

const FullRowTile = ({ icon, title, desc, tags, buttonLabel, onClick }: FullRowTileProps) => (
  <div className="bg-background border border-border p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5 md:gap-10 hover:bg-secondary transition-colors">
    <div className="w-8 h-8 text-foreground flex-shrink-0">{icon}</div>
    <div className="flex-1">
      <h3 className="text-lg font-medium font-heading text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-2">{desc}</p>
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-8 py-3.5 bg-foreground text-background text-sm hover:bg-muted-foreground transition-colors flex-shrink-0"
    >
      {buttonLabel}
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
);

/* ── Section Header ── */
const SectionHeader = ({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) => (
  <div className="mb-10">
    <span className="text-xs text-muted-foreground tracking-wide mb-2 block">{eyebrow}</span>
    <h2 className="text-2xl md:text-3xl font-heading font-normal text-foreground mb-2">{title}</h2>
    <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">{desc}</p>
  </div>
);

/* ── Main Page ── */
const Serviceportal = () => {
  const { t, cms, loc } = useCmsI18n("serviceportal.login", "serviceportal", "dashboard");
  const dbSectionCount = cms.sections.filter((s) => !s.parent_section_key && s.section_type !== "hero").length;
  const hasRichContent = cms.hasDbContent && dbSectionCount > 0;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [kundennummer, setKundennummer] = useState("");
  const [passwort, setPasswort] = useState("");

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  const [dlSearch, setDlSearch] = useState("");
  const [shopFilter, setShopFilter] = useState<typeof shopFilterKeys[number]>("alle");
  const [cartCount, setCartCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<{ from: "bot" | "user"; text: string; time: string }[]>([
    { from: "bot", text: t("chat.welcome"), time: t("chat.now") },
  ]);
  const [chatInput, setChatInput] = useState("");

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (kundennummer === "123" && passwort === "tcs") {
      setIsLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError(t("login.error"));
    }
  };

  if (!isLoggedIn) {
    return (
      <>
        
      <AutoBreadcrumb />
      <CmsOptionalImage cms={cms} variant="hero" sectionKey="hero" />
      <section className="bg-background min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md mx-auto px-6"
        >
          <div className="border border-border bg-background p-8 md:p-10">
            <div className="flex items-center justify-center w-12 h-12 bg-secondary mb-6 mx-auto">
              <Lock className="w-5 h-5 text-foreground" strokeWidth={1.5} />
            </div>
            <span className="block text-xs text-muted-foreground tracking-wide text-center mb-2">{t("login.eyebrow")}</span>
            <h1 className="text-2xl md:text-3xl font-heading font-normal text-foreground text-center mb-2">
              {t("login.headline")}
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-8">
              {t("login.intro")}
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground tracking-wide mb-1.5">
                  {t("login.kundennummerLabel")}
                </label>
                <input
                  type="text"
                  value={kundennummer}
                  onChange={(e) => setKundennummer(e.target.value)}
                  placeholder={t("login.kundennummerPlaceholder")}
                  className="w-full border border-border px-4 py-2.5 text-sm text-foreground bg-background outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/40"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground tracking-wide mb-1.5">
                  {t("login.passwortLabel")}
                </label>
                <input
                  type="password"
                  value={passwort}
                  onChange={(e) => setPasswort(e.target.value)}
                  placeholder={t("login.passwortPlaceholder")}
                  className="w-full border border-border px-4 py-2.5 text-sm text-foreground bg-background outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/40"
                />
              </div>

              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-foreground text-background py-3 text-sm font-medium hover:bg-muted-foreground transition-colors"
              >
                {t("login.submit")}
              </button>
            </form>

            <div className="flex items-center justify-between mt-6">
              <Link to="/serviceportal/passwort-vergessen" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                {t("login.forgotPassword")}
              </Link>
              <Link to="/serviceportal/registrieren" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                {t("login.register")}
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
      </>
    );
  }

  const filteredShop = shopFilter === "alle" ? shopItems : shopItems.filter((i) => i.catKey === shopFilter);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages((m) => [...m, { from: "user", text: chatInput, time: t("chat.now") }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages((m) => [
        ...m,
        {
          from: "bot",
          text: t("chat.botReply"),
          time: t("chat.now"),
        },
      ]);
    }, 1200);
  };

  return (
    <CmsRenderRegistryProvider>
      <AutoBreadcrumb />
      {/* Hero */}
      <section className="bg-background">
        <div className="container mx-auto pt-12 pb-10 lg:pt-20 lg:pb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center justify-between mb-8">
              <span className="block text-xs text-muted-foreground tracking-wide">{t("dashboard.eyebrow")}</span>
              <button
                onClick={() => setIsLoggedIn(false)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border px-3 py-1.5 hover:bg-secondary"
              >
                <LogOut className="w-3 h-3" /> {t("dashboard.logout")}
              </button>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-normal leading-tight max-w-3xl mb-6">
              {t("dashboard.headline")}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
              {t("dashboard.intro")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <div className="py-16 lg:py-24">
        <div className="container mx-auto">
          {/* Section 1: Konto & Anlagen */}
          <div className="mb-16">
            <SectionHeader
              eyebrow={t("dashboard.sections.konto.eyebrow")}
              title={t("dashboard.sections.konto.title")}
              desc={t("dashboard.sections.konto.desc")}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
              <ServiceTile
                icon={<User className="w-8 h-8" strokeWidth={1.25} />}
                label={t("dashboard.sections.konto.tiles.selfService.label")}
                title={t("dashboard.sections.konto.tiles.selfService.title")}
                desc={t("dashboard.sections.konto.tiles.selfService.desc")}
              />
              <ServiceTile
                icon={<Database className="w-8 h-8" strokeWidth={1.25} />}
                label={t("dashboard.sections.konto.tiles.anlagen.label")}
                title={t("dashboard.sections.konto.tiles.anlagen.title")}
                desc={t("dashboard.sections.konto.tiles.anlagen.desc")}
                tag={t("dashboard.sections.konto.tiles.anlagen.tag")}
              />
              <ServiceTile
                icon={<Settings className="w-8 h-8" strokeWidth={1.25} />}
                label={t("dashboard.sections.konto.tiles.konfigurator.label")}
                title={t("dashboard.sections.konto.tiles.konfigurator.title")}
                desc={t("dashboard.sections.konto.tiles.konfigurator.desc")}
              />
            </div>
          </div>

          {/* Section 2: Service & Support */}
          <div className="mb-16">
            <SectionHeader
              eyebrow={t("dashboard.sections.service.eyebrow")}
              title={t("dashboard.sections.service.title")}
              desc={t("dashboard.sections.service.desc")}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
              <ServiceTile
                icon={<ShieldCheck className="w-8 h-8" strokeWidth={1.25} />}
                label={t("dashboard.sections.service.tiles.rma.label")}
                title={t("dashboard.sections.service.tiles.rma.title")}
                desc={t("dashboard.sections.service.tiles.rma.desc")}
              />
              <ServiceTile
                icon={<Wrench className="w-8 h-8" strokeWidth={1.25} />}
                label={t("dashboard.sections.service.tiles.einsatz.label")}
                title={t("dashboard.sections.service.tiles.einsatz.title")}
                desc={t("dashboard.sections.service.tiles.einsatz.desc")}
              />
              <ServiceTile
                icon={<MessageSquare className="w-8 h-8" strokeWidth={1.25} />}
                label={t("dashboard.sections.service.tiles.chat.label")}
                title={t("dashboard.sections.service.tiles.chat.title")}
                desc={t("dashboard.sections.service.tiles.chat.desc")}
                tag={t("dashboard.sections.service.tiles.chat.tag")}
                isNew
                newBadgeText={t("dashboard.newBadge")}
                onClick={() => setChatOpen(true)}
              />
            </div>
          </div>

          {/* Section 3: Software & Freischaltcodes */}
          <div className="mb-16">
            <SectionHeader
              eyebrow={t("dashboard.sections.software.eyebrow")}
              title={t("dashboard.sections.software.title")}
              desc={t("dashboard.sections.software.desc")}
            />

            <FullRowTile
              icon={<Download className="w-8 h-8" strokeWidth={1.25} />}
              title={t("dashboard.sections.software.downloads.title")}
              desc={t("dashboard.sections.software.downloads.desc")}
              tags={[
                t("dashboard.sections.software.downloads.tags.server"),
                t("dashboard.sections.software.downloads.tags.gateway"),
                t("dashboard.sections.software.downloads.tags.konfig"),
                t("dashboard.sections.software.downloads.tags.doku"),
              ]}
              buttonLabel={t("dashboard.sections.software.downloads.button")}
              onClick={() => setDownloadOpen(true)}
            />

            <div className="grid sm:grid-cols-2 gap-px bg-border border border-border mt-px">
              <ServiceTile
                icon={<Key className="w-8 h-8" strokeWidth={1.25} />}
                label={t("dashboard.sections.software.tiles.configo.label")}
                title={t("dashboard.sections.software.tiles.configo.title")}
                desc={t("dashboard.sections.software.tiles.configo.desc")}
              />
              <ServiceTile
                icon={<Monitor className="w-8 h-8" strokeWidth={1.25} />}
                label={t("dashboard.sections.software.tiles.servicegeraet.label")}
                title={t("dashboard.sections.software.tiles.servicegeraet.title")}
                desc={t("dashboard.sections.software.tiles.servicegeraet.desc")}
              />
            </div>
          </div>

          {/* Section 4: Direktbestellung */}
          <div className="mb-0">
            <SectionHeader
              eyebrow={t("dashboard.sections.shop.eyebrow")}
              title={t("dashboard.sections.shop.title")}
              desc={t("dashboard.sections.shop.desc")}
            />
            <FullRowTile
              icon={<ShoppingCart className="w-8 h-8" strokeWidth={1.25} />}
              title={t("dashboard.sections.shop.tile.title")}
              desc={t("dashboard.sections.shop.tile.desc")}
              tags={[
                t("dashboard.sections.shop.tile.tags.innen"),
                t("dashboard.sections.shop.tile.tags.aussen"),
                t("dashboard.sections.shop.tile.tags.netzteile"),
                t("dashboard.sections.shop.tile.tags.kabel"),
              ]}
              buttonLabel={t("dashboard.sections.shop.tile.button")}
              onClick={() => setShopOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* CTA — rendered by CmsTailCta from DB (standard_cta) */}


      {/* ── Download-Center Sheet ── */}
      <Sheet open={downloadOpen} onOpenChange={setDownloadOpen}>
        <SheetContent className="w-full max-w-[580px] overflow-y-auto p-0">
          <SheetHeader className="p-6 border-b border-border sticky top-0 bg-background z-10">
            <div>
              <span className="text-xs text-muted-foreground tracking-wide block mb-1">{t("downloadCenter.eyebrow")}</span>
              <SheetTitle className="text-xl font-heading font-normal tracking-tight">{t("downloadCenter.title")}</SheetTitle>
            </div>
            <SheetDescription className="sr-only">{t("downloadCenter.srDesc")}</SheetDescription>
          </SheetHeader>
          <div className="p-6">
            <div className="flex items-center gap-3 border border-border px-4 py-2.5 mb-6 bg-secondary">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder={t("downloadCenter.searchPlaceholder")}
                value={dlSearch}
                onChange={(e) => setDlSearch(e.target.value)}
                className="border-none bg-transparent text-sm text-foreground flex-1 outline-none placeholder:text-muted-foreground/40"
              />
            </div>

            {downloadCategories.map((cat) => (
              <div key={cat.categoryKey}>
                <div className="text-xs text-muted-foreground tracking-wide uppercase py-3 border-t border-border first:border-t-0 first:mt-0 mt-1">
                  {t(`downloadCenter.categories.${cat.categoryKey}`)}
                </div>
                {cat.itemKeys
                  .map((itemKey) => ({
                    itemKey,
                    name: t(`downloadCenter.items.${itemKey}.name`),
                    meta: t(`downloadCenter.items.${itemKey}.meta`),
                  }))
                  .filter((it) => !dlSearch || it.name.toLowerCase().includes(dlSearch.toLowerCase()))
                  .map((item) => (
                    <div
                      key={item.itemKey}
                      className="flex items-center gap-3.5 p-3 border border-border mb-1 hover:bg-secondary transition-colors"
                    >
                      <div className="w-8 h-8 bg-secondary flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{item.meta}</div>
                      </div>
                      <button className="inline-flex items-center gap-1.5 bg-foreground text-background text-xs font-medium px-3 py-1.5 hover:opacity-75 transition-opacity flex-shrink-0">
                        <Download className="w-3 h-3" /> {t("downloadCenter.downloadButton")}
                      </button>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Chat Sheet ── */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent className="w-full max-w-[580px] overflow-y-auto p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-border sticky top-0 bg-background z-10">
            <div>
              <span className="text-xs text-muted-foreground tracking-wide block mb-1">
                {t("chat.eyebrow")}
              </span>
              <SheetTitle className="text-xl font-heading font-normal tracking-tight">{t("chat.title")}</SheetTitle>
            </div>
            <SheetDescription className="sr-only">{t("chat.srDesc")}</SheetDescription>
          </SheetHeader>
          <div className="p-6 flex-1 flex flex-col">
            <div className="h-[360px] overflow-y-auto border border-border p-3.5 flex flex-col gap-2.5 mb-3 bg-secondary scroll-smooth">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col max-w-[84%] ${msg.from === "user" ? "self-end" : "self-start"}`}>
                  <div
                    className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.from === "user"
                        ? "bg-foreground text-background"
                        : "bg-background border border-border text-foreground"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className={`text-xs text-muted-foreground/40 mt-1 ${msg.from === "user" ? "text-right" : ""}`}>
                    {msg.time}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {chatTopicKeys.map((key) => {
                const label = t(`chat.topics.${key}`);
                return (
                  <button
                    key={key}
                    onClick={() => setChatInput(label)}
                    className="text-xs border border-border px-3 py-1 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors bg-background"
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t("chat.inputPlaceholder")}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                className="flex-1 border border-border px-3.5 py-2.5 text-sm text-foreground outline-none bg-background focus:border-foreground transition-colors"
              />
              <button
                onClick={sendChat}
                className="bg-foreground text-background px-4 py-2.5 text-sm font-medium flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              >
                <Send className="w-3.5 h-3.5" /> {t("chat.send")}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Shop Sheet ── */}
      <Sheet open={shopOpen} onOpenChange={setShopOpen}>
        <SheetContent className="w-full max-w-[580px] overflow-y-auto p-0">
          <SheetHeader className="p-6 border-b border-border sticky top-0 bg-background z-10">
            <div>
              <span className="text-xs text-muted-foreground tracking-wide block mb-1">{t("shop.eyebrow")}</span>
              <SheetTitle className="text-xl font-heading font-normal tracking-tight">{t("shop.title")}</SheetTitle>
            </div>
            <SheetDescription className="sr-only">{t("shop.srDesc")}</SheetDescription>
          </SheetHeader>
          <div className="p-6">
            <div className="flex flex-wrap border border-border w-fit mb-5">
              {shopFilterKeys.map((f) => (
                <button
                  key={f}
                  onClick={() => setShopFilter(f)}
                  className={`text-xs px-3.5 py-2 border-r border-border last:border-r-0 transition-colors ${
                    shopFilter === f
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-foreground hover:text-background"
                  }`}
                >
                  {t(`shop.filters.${f}`)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border border border-border">
              {filteredShop.map((item) => (
                <div key={item.nr} className="bg-background flex flex-col hover:bg-secondary transition-colors">
                  <div className="h-[76px] bg-secondary flex items-center justify-center border-b border-border">
                    <Package className="w-6 h-6 text-muted-foreground" strokeWidth={1.25} />
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="text-sm font-medium text-foreground mb-0.5">{item.name}</div>
                    <div className="text-xs text-muted-foreground mb-2.5">{item.nr}</div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm font-medium text-foreground">{item.price}</span>
                      <button
                        onClick={() => setCartCount((c) => c + 1)}
                        className="bg-foreground text-background px-2.5 py-1 text-xs flex items-center gap-1 hover:opacity-75 transition-opacity"
                      >
                        <Plus className="w-3 h-3" /> +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3.5 border-t border-border flex items-center justify-between mt-5 flex-wrap gap-2">
              <span className="text-sm text-foreground">
                <Trans
                  i18nKey="shop.cartLine"
                  ns="serviceportal"
                  defaults="{{cart}}: <strong>{{count}} {{items}}</strong>"
                  values={{ cart: t("shop.cart"), count: cartCount, items: t("shop.items") }}
                  components={{ strong: <strong /> }}
                />
              </span>
              <button className="bg-foreground text-background px-5 py-2 text-sm font-medium hover:opacity-80 transition-opacity">
                {t("shop.checkout")}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <CmsOptionalImage cms={cms} variant="inline" sectionKey="inline" />
      <CmsTailFaq pageKey="serviceportal.login" />
      <CmsTailCta pageKey="serviceportal.login" />
      <CmsSourceBadge
        pageKey="serviceportal.login"
        source={hasRichContent ? "db" : "fallback"}
        sectionCount={hasRichContent ? dbSectionCount : undefined}
      />
    </CmsRenderRegistryProvider>
  );
};

export default Serviceportal;
