import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  calculateSalesPremium,
  convertFromCny,
  premiumRateOptions,
  priceWithPremium,
} from "./pricing.js";
import { buildOrderWorkbook, downloadOrderWorkbook } from "./order-workbook.js";
import TowerCraneSelector from "./TowerCraneSelector.jsx";
import "./styles.css";

const BASE_URL = import.meta.env.BASE_URL;
const BRAND = "#AADB1E";
const RATE_API_URL = "https://api.frankfurter.dev/v2/rates?base=CNY&quotes=USD,EUR";
const RATE_CACHE_KEY = "ztc_exchange_rates_cny_v2";
const RATE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
const FALLBACK_RATES = { CNY: 1, USD: 0.14834, EUR: 0.12833 };
const FALLBACK_RATE_DATE = "2026-08-11";
const LANGUAGES = {
  zh: "中文",
  en: "English",
  fr: "Français",
  de: "Deutsch",
};

const UI = {
  zh: {
    appTitle: "中联塔机配置确认及报价单生成软件 V1.1 Web版",
    subTitle: "塔机配置确认、选配核价与报价文件生成",
    quoteInfo: "报价单信息",
    generateQuote: "生成报价单及选配指导",
    generateOrderWorkbookLabel: "生成订单配置表",
    orderWorkbookSheet: "订单配置表",
    orderWorkbookDone: "订单配置表已生成，并保存到浏览器下载目录。",
    productSelect: "产品型号选择",
    model: "产品型号",
    form: "安装形式",
    language: "语言",
    tradeTerm: "贸易术语",
    currency: "价格单位",
    tradePlace: "交易地点",
    customer: "客户名称",
    currentPrice: "当前FOB参考价格",
    machinePrice: "整机价格",
    optionPrice: "选配价格",
    totalPrice: "当前总价",
    adminAccess: "价格管理",
    employeeId: "工号",
    password: "密码",
    login: "进入",
    cancel: "取消",
    loginError: "请输入工号，并检查密码是否正确。",
    priceSettings: "价格显示设置",
    externalPremiumRate: "外部显示溢价率",
    actualSalesPrice: "实际销售价格",
    truePrice: "真实价格",
    actualPremiumRate: "真实溢价率",
    externalDisplayPrice: "当前外部显示价格",
    exchangeRate: "当前汇率",
    rateFallback: "汇率服务暂不可用，正在使用最近汇率。",
    standardInfo: "标准配置信息",
    productCode: "产品编码",
    towerType: "塔机类型",
    height: "独立高度（HUH）",
    jib: "最大臂长",
    maxLoad: "最大起重量",
    rope: "容绳量",
    mast: "塔身种类",
    baseConfig: "产品基本配置",
    options: "可选增减配置",
    seq: "序号",
    composition: "组成",
    component: "部件",
    name: "名称",
    designation: "代号",
    itemNo: "编码",
    qty: "数量",
    select: "选择",
    changeType: "增减配",
    item: "项目",
    itemPrice: "参考价格",
    package: "包内容",
    view: "查看包内容",
    add: "增配",
    deduct: "减配",
    quoteDate: "报价日期",
    quoteCompany: "报价单位",
    quotePerson: "报价人",
    phone: "联系电话",
    email: "联系邮箱",
    address: "公司地址",
    payment: "付款方式",
    delivery: "交货期",
    validity: "报价有效期",
    transportation: "运输方案",
    warranty: "质保期",
    others: "其他",
    remark: "备注",
    tradeTerms: "交易条款及其他信息",
    noConfig: "该机型尚未录入并发布详细配置表。",
    noForms: "该机型暂无安装参数。",
    noOptions: "当前安装形式暂无可选增减配置。",
    noMainComponents: "未读取到主要部件配置。",
    priceTableSource: "增减配价格表",
    configWorkbookSource: "机型配置表",
    priceFallback: "未录入详细配置表，当前可选项来自增减配价格表。",
    published: "配置表已发布",
    notPublished: "配置表未发布",
    modelCount: "已载入型号",
    formCount: "安装形式",
    items: "项",
    close: "关闭",
    packageNote: "包内明细不显示拆分价格，整包按一条价格核算。",
    generating: "正在生成...",
    quoteDone: "报价文件已生成。浏览器会把文件保存到下载目录。",
    ltcEmpty: "请先选择至少一项增减配置。",
    excelUnavailable: "当前机型没有已发布的配置清单，无法导出。",
    loadError: "配置数据加载失败",
    quotationTitle: "中联塔机报价单",
    basicParameter: "基本参数",
    unitPrice: "单价",
    mainComponents: "主要部件配置",
    additions: "增减配置",
    noneSelected: "未选择增减配置。",
    configSheet: "配置清单",
    optionSheet: "增减配清单",
    ltcTitle: "LTC选配指导文件",
    date: "日期",
  },
  en: {
    appTitle: "ZOOMLION Tower Crane Configuration Confirmation and Quotation Generator V1.1 Web",
    subTitle: "Configuration confirmation, option pricing and quotation document generation",
    quoteInfo: "Quotation Information",
    generateQuote: "Generate Quotation & Options Guide",
    generateOrderWorkbookLabel: "Generate Order Configuration",
    orderWorkbookSheet: "Order Configuration",
    orderWorkbookDone: "The order configuration workbook has been saved to the browser download folder.",
    productSelect: "Product Model Selection",
    model: "Model",
    form: "Installation Form",
    language: "Language",
    tradeTerm: "Trade Term",
    currency: "Currency",
    tradePlace: "Trade Location",
    customer: "Customer",
    currentPrice: "Current FOB Reference Price",
    machinePrice: "Machine Price",
    optionPrice: "Option Price",
    totalPrice: "Current Total",
    adminAccess: "Price Management",
    employeeId: "Employee ID",
    password: "Password",
    login: "Enter",
    cancel: "Cancel",
    loginError: "Enter an employee ID and check the password.",
    priceSettings: "Price Display Settings",
    externalPremiumRate: "External Display Premium",
    actualSalesPrice: "Actual Sales Price",
    truePrice: "True Price",
    actualPremiumRate: "Actual Premium Rate",
    externalDisplayPrice: "Current External Display Price",
    exchangeRate: "Current Exchange Rate",
    rateFallback: "The rate service is unavailable. The latest saved rates are being used.",
    standardInfo: "Standard Configuration Information",
    productCode: "Product Code",
    towerType: "Tower Crane Type",
    height: "HUH",
    jib: "Max. Jib Length",
    maxLoad: "Max. Load",
    rope: "Rope Capacity",
    mast: "Mast Type",
    baseConfig: "Basic Configuration",
    options: "Optional Additions / Deductions",
    seq: "No.",
    composition: "Module",
    component: "Component",
    name: "Name",
    designation: "Code",
    itemNo: "Item No.",
    qty: "Qty",
    select: "Select",
    changeType: "Type",
    item: "Item",
    itemPrice: "Reference Price",
    package: "Package",
    view: "View Package",
    add: "Addition",
    deduct: "Deduction",
    quoteDate: "Quotation Date",
    quoteCompany: "Quotation Unit",
    quotePerson: "Quoted By",
    phone: "Phone",
    email: "Email",
    address: "Company Address",
    payment: "Payment",
    delivery: "Delivery Time",
    validity: "Quotation Validity",
    transportation: "Transportation",
    warranty: "Warranty",
    others: "Others",
    remark: "Remarks",
    tradeTerms: "Trade Clause & Other Information",
    noConfig: "No detailed configuration workbook has been published for this model.",
    noForms: "No installation parameters are available for this model.",
    noOptions: "No optional additions or deductions are available for this installation form.",
    noMainComponents: "No main component configuration is available.",
    priceTableSource: "Price option list",
    configWorkbookSource: "Model configuration workbook",
    priceFallback: "No detailed configuration workbook is available. Options are loaded from the price option list.",
    published: "Configuration Published",
    notPublished: "Configuration Not Published",
    modelCount: "Models Loaded",
    formCount: "Installation Forms",
    items: "items",
    close: "Close",
    packageNote: "Package details do not show split prices. The package is priced as one item.",
    generating: "Generating...",
    quoteDone: "The quotation files have been generated and saved by the browser.",
    ltcEmpty: "Select at least one addition or deduction first.",
    excelUnavailable: "No published configuration list is available for this model.",
    loadError: "Failed to load configuration data",
    quotationTitle: "TOWER CRANE QUOTATION",
    basicParameter: "BASIC PARAMETER",
    unitPrice: "UNIT PRICE",
    mainComponents: "MAIN COMPONENT CONFIGURATION",
    additions: "ADDITIONS / DEDUCTIONS",
    noneSelected: "No additions or deductions selected.",
    configSheet: "Configuration List",
    optionSheet: "Addition-Deduction List",
    ltcTitle: "LTC Optional Parts Guide",
    date: "Date",
  },
  fr: {
    appTitle: "Generateur ZOOMLION de configuration et devis de grue a tour V1.1 Web",
    subTitle: "Confirmation de configuration, chiffrage des options et generation des documents",
    quoteInfo: "Informations du devis",
    generateQuote: "Generer le devis et le guide des options",
    generateOrderWorkbookLabel: "Generer la configuration de commande",
    orderWorkbookSheet: "Configuration de commande",
    orderWorkbookDone: "Le fichier de configuration de commande a ete enregistre dans le dossier de telechargement.",
    productSelect: "Selection du modele",
    model: "Modele",
    form: "Type d'installation",
    language: "Langue",
    tradeTerm: "Incoterm",
    currency: "Devise",
    tradePlace: "Lieu de transaction",
    customer: "Client",
    currentPrice: "Prix de reference FOB actuel",
    machinePrice: "Prix de la machine",
    optionPrice: "Prix des options",
    totalPrice: "Total actuel",
    adminAccess: "Gestion des prix",
    employeeId: "Matricule",
    password: "Mot de passe",
    login: "Entrer",
    cancel: "Annuler",
    loginError: "Saisissez un matricule et verifiez le mot de passe.",
    priceSettings: "Parametres d'affichage des prix",
    externalPremiumRate: "Majoration d'affichage externe",
    actualSalesPrice: "Prix de vente reel",
    truePrice: "Prix reel",
    actualPremiumRate: "Taux de majoration reel",
    externalDisplayPrice: "Prix externe affiche",
    exchangeRate: "Taux de change actuel",
    rateFallback: "Le service de change est indisponible. Les derniers taux enregistres sont utilises.",
    standardInfo: "Informations de configuration standard",
    productCode: "Code produit",
    towerType: "Type de grue",
    height: "Hauteur autoportante (HUH)",
    jib: "Portee maximale",
    maxLoad: "Charge maximale",
    rope: "Capacite de cable",
    mast: "Type de mat",
    baseConfig: "Configuration de base",
    options: "Ajouts / deductions en option",
    seq: "No.",
    composition: "Module",
    component: "Composant",
    name: "Nom",
    designation: "Code",
    itemNo: "Reference",
    qty: "Qte",
    select: "Choix",
    changeType: "Type",
    item: "Article",
    itemPrice: "Prix de reference",
    package: "Ensemble",
    view: "Voir le contenu",
    add: "Ajout",
    deduct: "Deduction",
    quoteDate: "Date du devis",
    quoteCompany: "Unite emettrice",
    quotePerson: "Emetteur",
    phone: "Telephone",
    email: "E-mail",
    address: "Adresse de la societe",
    payment: "Modalites de paiement",
    delivery: "Delai de livraison",
    validity: "Validite du devis",
    transportation: "Transport",
    warranty: "Garantie",
    others: "Autres",
    remark: "Remarques",
    tradeTerms: "Conditions commerciales et autres informations",
    noConfig: "Aucun classeur de configuration detaillee n'est publie pour ce modele.",
    noForms: "Aucun parametre d'installation n'est disponible pour ce modele.",
    noOptions: "Aucun ajout ou deduction n'est disponible pour cette installation.",
    noMainComponents: "Aucune configuration des composants principaux n'est disponible.",
    priceTableSource: "Liste tarifaire des options",
    configWorkbookSource: "Classeur de configuration du modele",
    priceFallback: "Aucun classeur de configuration detaillee. Les options proviennent de la liste tarifaire.",
    published: "Configuration publiee",
    notPublished: "Configuration non publiee",
    modelCount: "Modeles charges",
    formCount: "Types d'installation",
    items: "articles",
    close: "Fermer",
    packageNote: "Le detail du lot n'affiche pas de prix separes. Le lot est chiffre comme un seul article.",
    generating: "Generation...",
    quoteDone: "Les fichiers du devis ont ete generes et enregistres par le navigateur.",
    ltcEmpty: "Selectionnez d'abord au moins un ajout ou une deduction.",
    excelUnavailable: "Aucune liste de configuration publiee n'est disponible pour ce modele.",
    loadError: "Echec du chargement des donnees",
    quotationTitle: "DEVIS POUR GRUE A TOUR",
    basicParameter: "PARAMETRES DE BASE",
    unitPrice: "PRIX UNITAIRE",
    mainComponents: "CONFIGURATION DES COMPOSANTS PRINCIPAUX",
    additions: "AJOUTS / DEDUCTIONS",
    noneSelected: "Aucun ajout ou deduction selectionne.",
    configSheet: "Liste de configuration",
    optionSheet: "Liste ajouts-deductions",
    ltcTitle: "Guide des options LTC",
    date: "Date",
  },
  de: {
    appTitle: "ZOOMLION Turmdrehkran-Konfigurations- und Angebotsgenerator V1.1 Web",
    subTitle: "Konfigurationsbestaetigung, Optionspreise und Dokumenterstellung",
    quoteInfo: "Angebotsinformationen",
    generateQuote: "Angebot und Optionsleitfaden erstellen",
    generateOrderWorkbookLabel: "Auftragskonfiguration erstellen",
    orderWorkbookSheet: "Auftragskonfiguration",
    orderWorkbookDone: "Die Auftragskonfiguration wurde im Download-Ordner gespeichert.",
    productSelect: "Modellauswahl",
    model: "Modell",
    form: "Aufstellungsart",
    language: "Sprache",
    tradeTerm: "Lieferbedingung",
    currency: "Waehrung",
    tradePlace: "Handelsort",
    customer: "Kunde",
    currentPrice: "Aktueller FOB-Referenzpreis",
    machinePrice: "Maschinenpreis",
    optionPrice: "Optionspreis",
    totalPrice: "Aktuelle Summe",
    adminAccess: "Preisverwaltung",
    employeeId: "Personalnummer",
    password: "Passwort",
    login: "Oeffnen",
    cancel: "Abbrechen",
    loginError: "Personalnummer eingeben und Passwort pruefen.",
    priceSettings: "Einstellungen der Preisanzeige",
    externalPremiumRate: "Externer Anzeigeaufschlag",
    actualSalesPrice: "Tatsaechlicher Verkaufspreis",
    truePrice: "Tatsaechlicher Preis",
    actualPremiumRate: "Tatsaechlicher Aufschlag",
    externalDisplayPrice: "Aktueller externer Anzeigepreis",
    exchangeRate: "Aktueller Wechselkurs",
    rateFallback: "Der Wechselkursdienst ist nicht erreichbar. Die zuletzt gespeicherten Kurse werden verwendet.",
    standardInfo: "Informationen zur Standardkonfiguration",
    productCode: "Produktcode",
    towerType: "Turmdrehkrantyp",
    height: "Freistehende Hoehe (HUH)",
    jib: "Max. Auslegerlaenge",
    maxLoad: "Max. Traglast",
    rope: "Seilkapazitaet",
    mast: "Masttyp",
    baseConfig: "Grundkonfiguration",
    options: "Optionale Zusatz- / Abwahlpositionen",
    seq: "Nr.",
    composition: "Modul",
    component: "Komponente",
    name: "Name",
    designation: "Code",
    itemNo: "Artikelnummer",
    qty: "Menge",
    select: "Auswahl",
    changeType: "Typ",
    item: "Position",
    itemPrice: "Referenzpreis",
    package: "Paket",
    view: "Paketinhalt",
    add: "Zusatz",
    deduct: "Abwahl",
    quoteDate: "Angebotsdatum",
    quoteCompany: "Angebotseinheit",
    quotePerson: "Ansprechpartner",
    phone: "Telefon",
    email: "E-Mail",
    address: "Firmenanschrift",
    payment: "Zahlungsbedingungen",
    delivery: "Lieferzeit",
    validity: "Angebotsgueltigkeit",
    transportation: "Transport",
    warranty: "Garantie",
    others: "Sonstiges",
    remark: "Bemerkungen",
    tradeTerms: "Handelsbedingungen und weitere Informationen",
    noConfig: "Fuer dieses Modell ist keine detaillierte Konfigurationsdatei veroeffentlicht.",
    noForms: "Fuer dieses Modell sind keine Aufstellungsparameter verfuegbar.",
    noOptions: "Fuer diese Aufstellungsart sind keine Zusatz- oder Abwahlpositionen verfuegbar.",
    noMainComponents: "Keine Hauptkomponentenkonfiguration verfuegbar.",
    priceTableSource: "Optionspreisliste",
    configWorkbookSource: "Modellkonfigurationsdatei",
    priceFallback: "Keine detaillierte Konfigurationsdatei vorhanden. Die Optionen stammen aus der Optionspreisliste.",
    published: "Konfiguration veroeffentlicht",
    notPublished: "Konfiguration nicht veroeffentlicht",
    modelCount: "Geladene Modelle",
    formCount: "Aufstellungsarten",
    items: "Positionen",
    close: "Schliessen",
    packageNote: "Paketdetails zeigen keine Einzelpreise. Das Paket wird als eine Position berechnet.",
    generating: "Wird erstellt...",
    quoteDone: "Die Angebotsdateien wurden erstellt und vom Browser gespeichert.",
    ltcEmpty: "Waehlen Sie zuerst mindestens eine Zusatz- oder Abwahlposition.",
    excelUnavailable: "Fuer dieses Modell ist keine veroeffentlichte Konfigurationsliste verfuegbar.",
    loadError: "Konfigurationsdaten konnten nicht geladen werden",
    quotationTitle: "ANGEBOT FUER TURMDREHKRAN",
    basicParameter: "GRUNDPARAMETER",
    unitPrice: "EINHEITSPREIS",
    mainComponents: "HAUPTKOMPONENTENKONFIGURATION",
    additions: "ZUSATZ- / ABWAHLKONFIGURATION",
    noneSelected: "Keine Zusatz- oder Abwahlkonfiguration ausgewaehlt.",
    configSheet: "Konfigurationsliste",
    optionSheet: "Zusatz-Abwahlliste",
    ltcTitle: "LTC-Leitfaden fuer optionale Teile",
    date: "Datum",
  },
};

function cleanText(value) {
  return String(value ?? "").trim().replaceAll("图", "");
}

function normalizePrice(value) {
  const number = Number(String(value ?? "").replaceAll(",", "").match(/-?\d+(?:\.\d+)?/)?.[0] || 0);
  return Number.isFinite(number) ? number : 0;
}

function priceOptionRow(item) {
  const rawText = [
    item.category,
    item.partName,
    item.partCode,
    item.materialDescription,
  ].join(" ");
  if (rawText.includes("电源箱总成")) return null;
  const name = cleanText(item.partName || item.materialDescription || item.partCode);
  const modelCode = cleanText(item.partCode) || "/";
  return {
    composition: cleanText(item.category),
    component: cleanText(item.category),
    name,
    code: cleanText(item.materialCode),
    modelCode,
    mark: "○",
    itemDisplay: [name, modelCode].filter(Boolean).join("、"),
    addPrice: item.addPrice,
    deductPrice: item.deductPrice,
    changeTypeCode: cleanText(item.changeTypeCode),
    defaultType: cleanText(item.changeTypeCode) === "20" ? "deduction" : "addition",
    source: "priceTable",
  };
}

function optionPrice(item, changeType) {
  if (item?.source !== "priceTable") return Math.abs(normalizePrice(item?.price));
  const preferred = changeType === "deduction" ? item.deductPrice : item.addPrice;
  const fallback = changeType === "deduction" ? item.addPrice : item.deductPrice;
  return Math.abs(normalizePrice(preferred) || normalizePrice(fallback));
}

function quantityFromMark(mark) {
  const match = cleanText(mark).match(/●\s*[×xX]\s*(\d+(?:\.\d+)?)/);
  return match ? match[1] : "1";
}

function formatMoney(value, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function timestampToMinute() {
  const now = new Date();
  const pad = value => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function localDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function safeFilename(value) {
  return cleanText(value).replace(/[<>:"/\\|?*]+/g, "_").replace(/\s+/g, "_").replace(/^[_ .]+|[_ .]+$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function translatedText(value, language, dictionary) {
  const text = cleanText(value);
  if (!text || language === "zh") return text;
  const exact = dictionary[text]?.[language];
  if (exact) return exact;
  let result = text;
  Object.keys(dictionary)
    .sort((left, right) => right.length - left.length)
    .forEach(source => {
      if (result.includes(source)) {
        result = result.split(source).join(dictionary[source]?.[language] || dictionary[source]?.en || source);
      }
    });
  return result;
}

function translatedCell(value, language, dictionary) {
  if (typeof value === "number") return value;
  return translatedText(value, language, dictionary);
}

function translatedEditableText(value, language, dictionary) {
  const text = cleanText(value);
  for (const [source, translations] of Object.entries(dictionary)) {
    const variants = [source, translations?.en, translations?.fr, translations?.de].filter(Boolean);
    if (variants.includes(text)) {
      return language === "zh" ? source : translations?.[language] || translations?.en || source;
    }
  }
  return text;
}

function SectionTitle({ title, note }) {
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      {note ? <span className="badge">{note}</span> : null}
    </div>
  );
}

function Field({ label, className = "", children }) {
  return (
    <div className={className}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function buildExportSheet(exportData, rows, title, versionLine, language, dictionary) {
  const headers = (exportData?.headers || []).map(row => [...row]);
  while (headers.length < 4) headers.push([]);
  const width = Math.max(4, ...headers.map(row => row.length), ...rows.map(row => row.length));
  headers[0] = Array(width).fill("");
  headers[1] = Array(width).fill("");
  headers[0][0] = title;
  headers[1][0] = versionLine;
  const values = [...headers, ...rows].map(row => {
    const padded = Array(width).fill("");
    row.forEach((cell, index) => {
      padded[index] = translatedCell(cell, language, dictionary);
    });
    return padded;
  });
  const worksheet = XLSX.utils.aoa_to_sheet(values);
  const configuredMerges = (exportData?.merges || []).map(range => ({
    s: { r: range.min_row - 1, c: range.min_col - 1 },
    e: { r: range.max_row - 1, c: range.max_col - 1 },
  }));
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: width - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: width - 1 } },
    ...configuredMerges.filter(range => range.s.r > 1),
  ];
  worksheet["!cols"] = Array.from({ length: width }, (_, index) => ({
    wch: index === 0 ? 18 : index === 1 ? 38 : index === 2 ? 42 : 18,
  }));
  worksheet["!rows"] = values.map((_, index) => ({ hpt: index === 0 ? 26 : index === 1 ? 20 : 22 }));
  const border = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };
  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < width; columnIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
      const isHeader = rowIndex === 0 || rowIndex === 2 || rowIndex === 3;
      worksheet[address].s = {
        font: { name: "Arial", sz: 10, bold: isHeader },
        fill: isHeader ? { patternType: "solid", fgColor: { rgb: "AADB1E" } } : undefined,
        alignment: {
          horizontal: rowIndex === 0 ? "center" : columnIndex === width - 1 ? "center" : "left",
          vertical: "center",
          wrapText: true,
        },
        border,
      };
    }
  }
  return worksheet;
}

async function waitForImages(element) {
  const images = [...element.querySelectorAll("img")];
  await Promise.all(
    images.map(image => {
      if (image.complete) return Promise.resolve();
      return new Promise(resolve => {
        image.onload = resolve;
        image.onerror = resolve;
      });
    }),
  );
}

async function savePdf(filename, content) {
  const host = document.createElement("div");
  host.className = "pdf-export-host";
  host.innerHTML = content;
  document.body.appendChild(host);
  try {
    await waitForImages(host);
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const margin = 10;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;
    const sources = [...host.querySelectorAll(".pdf-sheet")];
    if (!sources.length) sources.push(host);
    let pageIndex = 0;
    for (const source of sources) {
      const canvas = await html2canvas(source, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: source.scrollWidth,
        windowHeight: source.scrollHeight,
      });
      if (!canvas.width || !canvas.height) {
        throw new Error("PDF page rendering returned an empty canvas.");
      }
      if (source.classList.contains("fit-page")) {
        const scale = Math.min(contentWidth / canvas.width, contentHeight / canvas.height);
        const renderedWidth = canvas.width * scale;
        const renderedHeight = canvas.height * scale;
        const offsetX = margin + (contentWidth - renderedWidth) / 2;
        const offsetY = margin + (contentHeight - renderedHeight) / 2;
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.98),
          "JPEG",
          offsetX,
          offsetY,
          renderedWidth,
          renderedHeight,
          undefined,
          "FAST",
        );
        pageIndex += 1;
        continue;
      }
      const pixelsPerPage = Math.max(1, Math.floor((canvas.width * contentHeight) / contentWidth));
      for (let offsetY = 0; offsetY < canvas.height; offsetY += pixelsPerPage) {
        const sliceHeight = Math.min(pixelsPerPage, canvas.height - offsetY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const context = pageCanvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        const renderedHeight = (sliceHeight * contentWidth) / canvas.width;
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.98), "JPEG", margin, margin, contentWidth, renderedHeight, undefined, "FAST");
        pageIndex += 1;
      }
    }
    pdf.save(filename);
  } finally {
    host.remove();
  }
}

function pdfStyles() {
  return `
    <style>
      .pdf-page{font-family:Arial,"Microsoft YaHei","Noto Sans CJK SC",sans-serif;color:#111;font-size:9px;line-height:1.22;background:#fff}
      .pdf-page table{width:100%;border-collapse:collapse;table-layout:fixed}
      .pdf-page th,.pdf-page td{border:1px solid #111;padding:2px 4px;vertical-align:middle;word-break:break-word}
      .pdf-page th{background:${BRAND};font-weight:700;text-align:center}
      .pdf-page .pdf-header td{height:34px}
      .pdf-page .pdf-logo{width:132px;height:40px;object-fit:contain}
      .pdf-page .pdf-address{font-size:10px;line-height:1.35;text-align:center}
      .pdf-page .pdf-title{font-size:18px;font-weight:700;text-align:center;background:${BRAND};padding:5px}
      .pdf-page .pdf-date{text-align:left;font-weight:700}
      .pdf-page .section-title{background:${BRAND};font-weight:700;font-size:10px;text-align:left}
      .pdf-page .center{text-align:center}
      .pdf-page .left{text-align:left}
      .pdf-page .small{font-size:8px}
      .pdf-page .space{height:5px;border:0}
      .pdf-page h1{text-align:center;font-size:22px;margin:0 0 12px}
      .pdf-page .ltc-meta{display:flex;justify-content:space-between;gap:18px;margin:0 0 10px;font-size:11px}
    </style>
  `;
}

function App() {
  const [appData, setAppData] = useState(null);
  const [liftingData, setLiftingData] = useState(null);
  const [liftingError, setLiftingError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [modelName, setModelName] = useState("");
  const [formName, setFormName] = useState("");
  const [language, setLanguage] = useState("zh");
  const [currency, setCurrency] = useState("CNY");
  const [exchangeRates, setExchangeRates] = useState(FALLBACK_RATES);
  const [exchangeRateDate, setExchangeRateDate] = useState(FALLBACK_RATE_DATE);
  const [usingFallbackRate, setUsingFallbackRate] = useState(true);
  const [externalPremiumRate, setExternalPremiumRate] = useState(2);
  const [actualSalesPriceCny, setActualSalesPriceCny] = useState("");
  const [adminModal, setAdminModal] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [tradeTerm, setTradeTerm] = useState("FOB");
  const [tradePlace, setTradePlace] = useState("上海港");
  const [customerName, setCustomerName] = useState("");
  const [selected, setSelected] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [orderGenerating, setOrderGenerating] = useState(false);
  const [quoteInfo, setQuoteInfo] = useState({
    quoteDate: localDateString(),
    quoteCompany: "中联重科建筑起重机械有限公司",
    quotePerson: "Lewis",
    phone: "+86 123456789",
    email: "liuyuchi@zoomlion.com",
    address: "Zoomlion Smart City Headquarters Building, No.613 NaqiuRoad, WangCheng District, Changsha, Hunan, China",
    payment: "合同签订后支付30%作为定金，发货前付清剩余70%合同款。",
    delivery: "收到定金后90日内发货。",
    validity: "30天",
    transportation: "以最终发运方案为准。",
    warranty: "自提单之日起保修期：钢结构12个月；机构12个月；电气部件12个月。易损件除外。",
    others: "报价含首次安装指导服务费用。",
    remark: "",
  });

  useEffect(() => {
    let cancelled = false;
    let cached = null;
    try {
      cached = JSON.parse(localStorage.getItem(RATE_CACHE_KEY) || "null");
    } catch {
      cached = null;
    }
    if (cached?.rates?.USD && cached?.rates?.EUR) {
      setExchangeRates({ CNY: 1, USD: Number(cached.rates.USD), EUR: Number(cached.rates.EUR) });
      setExchangeRateDate(cached.date || FALLBACK_RATE_DATE);
      setUsingFallbackRate(false);
    }
    if (cached?.savedAt && Date.now() - Number(cached.savedAt) < RATE_CACHE_MAX_AGE) return undefined;

    fetch(RATE_API_URL)
      .then(response => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
      })
      .then(data => {
        const rows = Array.isArray(data) ? data : data?.value;
        const usd = rows?.find(item => item.quote === "USD");
        const eur = rows?.find(item => item.quote === "EUR");
        if (!usd?.rate || !eur?.rate) {
          throw new Error("Invalid exchange-rate response");
        }
        const next = {
          rates: { CNY: 1, USD: Number(usd.rate), EUR: Number(eur.rate) },
          date: usd.date || eur.date || localDateString(),
          savedAt: Date.now(),
        };
        if (cancelled) return;
        setExchangeRates(next.rates);
        setExchangeRateDate(next.date);
        setUsingFallbackRate(false);
        localStorage.setItem(RATE_CACHE_KEY, JSON.stringify(next));
      })
      .catch(() => {
        if (!cancelled && !cached?.rates?.USD) setUsingFallbackRate(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch(`${BASE_URL}data/app-data.json`)
      .then(response => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
      })
      .then(data => {
        setAppData(data);
        const first = data.products[0];
        setModelName(first?.model || "");
        setFormName(first?.forms?.[0]?.installForm || "");
        setTradePlace(data.ui.defaultTradePlace || "上海港");
        const saved = JSON.parse(localStorage.getItem("ztc_quote_settings_v2") || "null");
        setQuoteInfo(current => ({
          ...current,
          quoteCompany: data.ui.defaultQuoteCompany || current.quoteCompany,
          quotePerson: data.ui.defaultQuotePerson || current.quotePerson,
          phone: data.ui.defaultPhone || current.phone,
          email: data.ui.defaultEmail || current.email,
          address: data.ui.defaultAddress || current.address,
          ...(data.ui.defaultTerms || {}),
          ...(saved?.quoteInfo || {}),
          quoteDate: localDateString(),
        }));
        if (saved) {
          setLanguage(saved.language || "zh");
          setCurrency(saved.currency || "CNY");
          setTradeTerm(saved.tradeTerm || "FOB");
          setTradePlace(saved.tradePlace || data.ui.defaultTradePlace || "上海港");
          setCustomerName(saved.customerName || "");
          const savedPremiumRate = Number(saved.externalPremiumRate);
          setExternalPremiumRate(
            premiumRateOptions().includes(savedPremiumRate) ? savedPremiumRate : 0,
          );
          setActualSalesPriceCny(
            saved.actualSalesPriceCny === "" || saved.actualSalesPriceCny == null
              ? ""
              : Number(saved.actualSalesPriceCny),
          );
        }
      })
      .catch(error => setLoadError(error.message));
  }, []);

  useEffect(() => {
    fetch(`${BASE_URL}data/lifting-performance.json`)
      .then(response => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return response.json();
      })
      .then(setLiftingData)
      .catch(error => setLiftingError(error.message));
  }, []);

  useEffect(() => {
    if (!appData) return;
    localStorage.setItem(
      "ztc_quote_settings_v2",
      JSON.stringify({
        language,
        currency,
        tradeTerm,
        tradePlace,
        customerName,
        quoteInfo,
        externalPremiumRate,
        actualSalesPriceCny,
      }),
    );
  }, [
    appData,
    language,
    currency,
    tradeTerm,
    tradePlace,
    customerName,
    quoteInfo,
    externalPremiumRate,
    actualSalesPriceCny,
  ]);

  const L = UI[language] || UI.zh;
  const product = appData?.products.find(item => item.model === modelName);
  const form = product?.forms.find(item => item.installForm === formName) || product?.forms?.[0] || null;
  const dictionary = appData?.translations || {};
  const tr = value => translatedText(value, language, dictionary);
  const machinePrice = normalizePrice(form?.machinePrice || 0);

  useEffect(() => {
    setSelected({});
  }, [modelName, formName]);

  const configOptionRows = form?.optionRows || [];
  const priceOptionRows = (product?.priceOptions || []).map(priceOptionRow).filter(Boolean);
  const optionRows = configOptionRows.length ? configOptionRows : priceOptionRows;
  const optionSourceLabel = configOptionRows.length ? L.configWorkbookSource : L.priceTableSource;
  const selectedOptions = useMemo(
    () =>
      optionRows
        .map((item, index) => ({ ...item, sourceIndex: index, selection: selected[index] }))
        .filter(item => item.selection?.checked),
    [optionRows, selected],
  );
  const optionTotal = useMemo(
    () =>
      selectedOptions.reduce((sum, item) => {
        const quantity = Number(item.selection?.qty || 1);
        const price = optionPrice(item, item.selection?.type);
        return sum + (item.selection?.type === "deduction" ? -price : price) * quantity;
      }, 0),
    [selectedOptions],
  );
  const totalPrice = Number(machinePrice || 0) + optionTotal;
  const displayedMachinePrice = priceWithPremium(machinePrice, externalPremiumRate, currency, exchangeRates);
  const displayedOptionTotal = priceWithPremium(optionTotal, externalPremiumRate, currency, exchangeRates);
  const displayedTotalPrice = priceWithPremium(totalPrice, externalPremiumRate, currency, exchangeRates);
  const truePrice = convertFromCny(totalPrice, currency, exchangeRates);
  const actualSalesPrice = actualSalesPriceCny === ""
    ? ""
    : convertFromCny(actualSalesPriceCny, currency, exchangeRates);
  const actualPremiumRate = actualSalesPrice === ""
    ? null
    : calculateSalesPremium(actualSalesPrice, truePrice);

  if (loadError) {
    return <div className="loading error">{UI.zh.loadError}: {loadError}</div>;
  }
  if (!appData || !product) {
    return <div className="loading">正在加载配置数据...</div>;
  }

  const infoRows = [
    [L.productCode, product.productCode || "/"],
    [L.towerType, tr(product.towerType?.zh || product.towerType?.en || "") || "/"],
    [L.height, form?.height ? `${form.height} m` : "/"],
    [L.jib, form?.jibLength || product.defaultJibLength ? `${form?.jibLength || product.defaultJibLength} m` : "/"],
    [L.maxLoad, product.maxLoad || "/"],
    [L.form, form ? tr(form.installForm) : "/"],
    [L.rope, form?.ropeCapacity ? `${form.ropeCapacity} m` : "/"],
    [L.mast, tr(product.mastType) || "/"],
  ];

  function selectModel(nextModelName) {
    const next = appData.products.find(item => item.model === nextModelName);
    setModelName(nextModelName);
    setFormName(next?.forms?.[0]?.installForm || "");
    setSelected({});
  }

  function updateSelected(index, patch) {
    const defaultType = optionRows[index]?.defaultType || "addition";
    setSelected(current => ({
      ...current,
      [index]: { checked: false, qty: 1, type: defaultType, ...(current[index] || {}), ...patch },
    }));
  }

  function updateQuoteInfo(key, value) {
    setQuoteInfo(current => ({ ...current, [key]: value }));
  }

  function openAdminLogin() {
    setEmployeeId("");
    setAdminPassword("");
    setAdminError("");
    setAdminModal("login");
  }

  function submitAdminLogin(event) {
    event.preventDefault();
    if (!employeeId.trim() || adminPassword !== "123.") {
      setAdminError(L.loginError);
      return;
    }
    setAdminPassword("");
    setAdminError("");
    setAdminModal("settings");
  }

  function updateActualSalesPrice(value) {
    if (value === "") {
      setActualSalesPriceCny("");
      return;
    }
    const rate = Number(exchangeRates[currency] || 0);
    if (rate > 0) setActualSalesPriceCny(Number(value) / rate);
  }

  function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setTradePlace(current => translatedEditableText(current, nextLanguage, dictionary));
    setQuoteInfo(current => ({
      ...current,
      quoteCompany: translatedEditableText(current.quoteCompany, nextLanguage, dictionary),
      payment: translatedEditableText(current.payment, nextLanguage, dictionary),
      delivery: translatedEditableText(current.delivery, nextLanguage, dictionary),
      validity: translatedEditableText(current.validity, nextLanguage, dictionary),
      transportation: translatedEditableText(current.transportation, nextLanguage, dictionary),
      warranty: translatedEditableText(current.warranty, nextLanguage, dictionary),
      others: translatedEditableText(current.others, nextLanguage, dictionary),
    }));
  }

  function quotationHtml() {
    const components = form?.mainComponents || [];
    const componentRows = components.length
      ? components
          .map((item, index) => {
            const componentName = tr(item.component) || item.componentEn || "";
            const name = tr(item.name);
            const display = name && name !== componentName ? `${componentName} - ${name}` : componentName;
            return `<tr><td class="center">${index + 1}</td><td>${escapeHtml(display)}</td><td>${escapeHtml(tr(item.code || "/"))}</td><td class="center">${escapeHtml(item.quantity || "1")}</td></tr>`;
          })
          .join("")
      : `<tr><td></td><td colspan="3">${escapeHtml(L.noMainComponents)}</td></tr>`;
    const optionRowsHtml = selectedOptions.length
      ? selectedOptions
          .map((item, index) => {
            const selection = item.selection || {};
            return `<tr><td class="center">${index + 1}</td><td class="center">${escapeHtml(selection.type === "deduction" ? L.deduct : L.add)}</td><td>${escapeHtml(tr(item.modelCode || "/"))}</td><td>${escapeHtml(tr(item.itemDisplay || item.name))}</td><td class="center">${escapeHtml(selection.qty || "1")}</td></tr>`;
          })
          .join("")
      : `<tr><td></td><td colspan="4">${escapeHtml(L.noneSelected)}</td></tr>`;
    const unitPrice = `${tradeTerm} ${tr(tradePlace)} (${tr("价格") || "Price"}: ${currency} ${formatNumber(displayedTotalPrice)})`;
    const quoteCompany = tr(quoteInfo.quoteCompany);
    return `
      ${pdfStyles()}
      <div class="pdf-page">
        <div class="pdf-sheet fit-page">
        <table class="pdf-header">
          <tr>
            <td style="width:25%;text-align:center"><img class="pdf-logo" src="${BASE_URL}assets/zoomlion.png" /></td>
            <td class="pdf-address">${escapeHtml(quoteInfo.address)}</td>
          </tr>
          <tr><td colspan="2" class="pdf-title">${escapeHtml(L.quotationTitle)}</td></tr>
          <tr><td colspan="2" class="pdf-date">${escapeHtml(L.quoteDate)}: ${escapeHtml(quoteInfo.quoteDate)}</td></tr>
        </table>
        <table>
          <tr><td class="center" style="width:16%">${escapeHtml(L.customer)}</td><td style="width:34%">${escapeHtml(customerName || "/")}</td><td class="center" style="width:16%">${escapeHtml(L.quoteDate)}</td><td>${escapeHtml(quoteInfo.quoteDate)}</td></tr>
          <tr><td class="center">${escapeHtml(L.quoteCompany)}</td><td>${escapeHtml(quoteCompany)}</td><td class="center">${escapeHtml(L.quotePerson)}</td><td>${escapeHtml(quoteInfo.quotePerson)}</td></tr>
          <tr><td class="center">${escapeHtml(L.email)}</td><td>${escapeHtml(quoteInfo.email)}</td><td class="center">${escapeHtml(L.phone)}</td><td>${escapeHtml(quoteInfo.phone)}</td></tr>
        </table>
        <table>
          <tr><td colspan="4" class="section-title">${escapeHtml(L.basicParameter)}</td></tr>
          <tr><td class="center">${escapeHtml(L.model)}</td><td class="center">${escapeHtml(product.model)}</td><td class="center">${escapeHtml(L.towerType)}</td><td class="center">${escapeHtml(tr(product.towerType?.zh || product.towerType?.en || ""))}</td></tr>
          <tr><td class="center">${escapeHtml(L.height)}</td><td class="center">${escapeHtml(form?.height ? `${form.height} m` : "/")}</td><td class="center">${escapeHtml(L.jib)}</td><td class="center">${escapeHtml(form?.jibLength || product.defaultJibLength ? `${form?.jibLength || product.defaultJibLength} m` : "/")}</td></tr>
          <tr><td class="center">${escapeHtml(L.maxLoad)}</td><td class="center">${escapeHtml(product.maxLoad || "/")}</td><td class="center">${escapeHtml(L.form)}</td><td class="center">${escapeHtml(form ? tr(form.installForm) : "/")}</td></tr>
          <tr><td class="center">${escapeHtml(L.rope)}</td><td class="center">${escapeHtml(form?.ropeCapacity ? `${form.ropeCapacity} m` : "/")}</td><td class="center">${escapeHtml(L.mast)}</td><td class="center">${escapeHtml(tr(product.mastType) || "/")}</td></tr>
          <tr><td class="section-title">${escapeHtml(L.unitPrice)}</td><td colspan="3" class="section-title">${escapeHtml(unitPrice)}</td></tr>
        </table>
        <table>
          <thead><tr><td colspan="4" class="section-title">${escapeHtml(L.mainComponents)}</td></tr><tr><th style="width:8%">${escapeHtml(L.seq)}</th><th>${escapeHtml(L.component)}</th><th style="width:29%">${escapeHtml(L.designation)}</th><th style="width:10%">${escapeHtml(L.qty)}</th></tr></thead>
          <tbody>${componentRows}</tbody>
        </table>
        <table>
          <thead><tr><td colspan="5" class="section-title">${escapeHtml(L.additions)}</td></tr><tr><th style="width:8%">${escapeHtml(L.seq)}</th><th style="width:14%">${escapeHtml(L.changeType)}</th><th style="width:24%">${escapeHtml(L.designation)}</th><th>${escapeHtml(L.item)}</th><th style="width:10%">${escapeHtml(L.qty)}</th></tr></thead>
          <tbody>${optionRowsHtml}</tbody>
        </table>
        <table>
          <tr><td colspan="2" class="section-title">${escapeHtml(L.tradeTerms)}</td></tr>
          <tr><td class="center" style="width:23%">${escapeHtml(L.payment)}</td><td>${escapeHtml(tr(quoteInfo.payment))}</td></tr>
          <tr><td class="center">${escapeHtml(L.delivery)}</td><td>${escapeHtml(tr(quoteInfo.delivery))}</td></tr>
          <tr><td class="center">${escapeHtml(L.validity)}</td><td>${escapeHtml(tr(quoteInfo.validity))}</td></tr>
          <tr><td class="center">${escapeHtml(L.transportation)}</td><td>${escapeHtml(tr(quoteInfo.transportation))}</td></tr>
          <tr><td class="center">${escapeHtml(L.warranty)}</td><td class="small">${escapeHtml(tr(quoteInfo.warranty))}</td></tr>
          <tr><td class="center">${escapeHtml(L.others)}</td><td>${escapeHtml(tr(quoteInfo.others))}</td></tr>
          <tr><td class="center">${escapeHtml(L.remark)}</td><td>${escapeHtml(quoteInfo.remark || "/")}</td></tr>
        </table>
        </div>
      </div>
    `;
  }

  function ltcHtml() {
    const expanded = [];
    selectedOptions.forEach(item => {
      const quantity = item.selection?.qty || "1";
      const changeType = item.selection?.type === "deduction" ? L.deduct : L.add;
      if (item.children?.length) {
        item.children.forEach(child => expanded.push({ ...child, quantity, changeType }));
      } else {
        expanded.push({ ...item, quantity, changeType });
      }
    });
    const rows = expanded
      .map(
        (item, index) => `<tr>
          <td class="center">${index + 1}</td>
          <td class="center">${escapeHtml(item.changeType)}</td>
          <td>${escapeHtml(tr(item.component || "/"))}</td>
          <td>${escapeHtml(tr(item.name || "/"))}</td>
          <td class="small">${escapeHtml(tr(item.code || "/"))}</td>
          <td class="small">${escapeHtml(tr(item.modelCode || "/"))}</td>
          <td class="center">${escapeHtml(item.quantity || "1")}</td>
        </tr>`,
      )
      .join("");
    return `
      ${pdfStyles()}
      <div class="pdf-page">
        <h1>${escapeHtml(L.ltcTitle)}</h1>
        <div class="ltc-meta"><span><strong>${escapeHtml(L.model)}:</strong> ${escapeHtml(product.model)}</span><span><strong>${escapeHtml(L.form)}:</strong> ${escapeHtml(form ? tr(form.installForm) : "/")}</span><span><strong>${escapeHtml(L.date)}:</strong> ${escapeHtml(quoteInfo.quoteDate)}</span></div>
        <table>
          <thead><tr><th style="width:6%">${escapeHtml(L.seq)}</th><th style="width:12%">${escapeHtml(L.changeType)}</th><th style="width:14%">${escapeHtml(L.component)}</th><th style="width:18%">${escapeHtml(L.name)}</th><th style="width:22%">${escapeHtml(L.itemNo)}</th><th style="width:20%">${escapeHtml(L.designation)}</th><th style="width:8%">${escapeHtml(L.qty)}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async function generateQuotation() {
    if (generating) return;
    setGenerating(true);
    try {
      const stamp = timestampToMinute();
      await savePdf(`中联塔机报价单_${safeFilename(product.model)}_${stamp}.pdf`, quotationHtml());
      if (selectedOptions.length) {
        await savePdf(`LTC选配指导文件_${safeFilename(product.model)}_${stamp}.pdf`, ltcHtml());
      }
      alert(L.quoteDone);
    } catch (error) {
      alert(`${L.loadError}: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  }

  async function generateOrderWorkbook() {
    if (orderGenerating) return;
    const workbookBase64 = product.combinedWorkbooks?.[language] || product.combinedWorkbooks?.zh;
    if (!workbookBase64 || !configOptionRows.length) {
      alert(L.excelUnavailable);
      return;
    }
    setOrderGenerating(true);
    try {
      const workbook = buildOrderWorkbook({
        workbookBase64,
        formName: tr(formName),
        optionRows: configOptionRows,
        selected,
        sheetName: L.orderWorkbookSheet,
      });
      const filename = `${safeFilename(product.model)}_${safeFilename(L.orderWorkbookSheet)}_${timestampToMinute()}.xlsx`;
      downloadOrderWorkbook(workbook, filename);
      alert(L.orderWorkbookDone);
    } catch (error) {
      alert(`${L.loadError}: ${error.message}`);
    } finally {
      setOrderGenerating(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="logo-button" type="button" onClick={openAdminLogin} aria-label={L.adminAccess} title={L.adminAccess}>
          <img className="header-crane" src={`${BASE_URL}assets/crane.png`} alt="" />
        </button>
        <div className="title-block">
          <h1>{L.appTitle}</h1>
          <div className="subtitle">{L.subTitle}</div>
        </div>
        <div className="top-actions">
          <button className="btn" disabled={generating} onClick={generateQuotation}>{generating ? L.generating : L.generateQuote}</button>
          <button className="btn secondary" disabled={orderGenerating} onClick={generateOrderWorkbook}>{orderGenerating ? L.generating : L.generateOrderWorkbookLabel}</button>
        </div>
      </header>

      <main className="main">
        <TowerCraneSelector
          data={liftingData}
          language={language}
          loading={!liftingData && !liftingError}
          error={liftingError}
        />

        <section className="top-grid">
          <div className="panel">
            <SectionTitle
              title={L.productSelect}
              note={`${L.modelCount} ${appData.products.length}`}
            />
            <div className="form-grid">
              <Field label={L.model} className="span-2">
                <select value={modelName} onChange={event => selectModel(event.target.value)}>
                  {appData.products.map(item => <option value={item.model} key={item.model}>{item.model}</option>)}
                </select>
              </Field>
              <Field label={L.form}>
                <select
                  value={form?.installForm || ""}
                  disabled={!product.forms.length}
                  onChange={event => {
                    setFormName(event.target.value);
                    setSelected({});
                  }}
                >
                  {product.forms.length
                    ? product.forms.map(item => <option value={item.installForm} key={item.installForm}>{tr(item.installForm)}</option>)
                    : <option value="">{L.noForms}</option>}
                </select>
              </Field>
              <Field label={L.language}>
                <select value={language} onChange={event => changeLanguage(event.target.value)}>
                  {Object.entries(LANGUAGES).map(([code, label]) => <option value={code} key={code}>{label}</option>)}
                </select>
              </Field>
            </div>
            <div className={`publish-state ${product.published ? "ok" : "pending"}`}>
              <span>{product.published ? L.published : L.notPublished}</span>
              <span>{L.formCount}: {product.forms.length}</span>
            </div>
          </div>

          <div className="panel compact-info">
            <SectionTitle title={L.standardInfo} />
            <div className="basic-info">
              {infoRows.map(([label, value]) => (
                <div className="info-item" key={label}>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="price-panel panel">
          <div className="panel-head price-panel-head">
            <h2>{L.currentPrice}</h2>
            <div className="price-head-controls">
              <span className="badge">FOB</span>
              <label className="currency-control">
                <span>{L.currency}</span>
                <select aria-label={L.currency} value={currency} onChange={event => setCurrency(event.target.value)}>
                  {appData.ui.currencies.map(item => <option value={item} key={item}>{item}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="price-grid">
            <div className="price-item"><span>{L.machinePrice}</span><strong>{formatMoney(displayedMachinePrice, currency)}</strong></div>
            <div className="price-item"><span>{L.optionPrice}</span><strong>{formatMoney(displayedOptionTotal, currency)}</strong></div>
            <div className="price-item total"><span>{L.totalPrice}</span><strong>{formatMoney(displayedTotalPrice, currency)}</strong></div>
          </div>
          <div className="exchange-note">
            <span>{L.exchangeRate}: 1 CNY = {Number(exchangeRates[currency] || 0).toLocaleString("en-US", { maximumFractionDigits: 6 })} {currency} · {exchangeRateDate}</span>
            {usingFallbackRate ? <span className="rate-warning">{L.rateFallback}</span> : null}
          </div>
        </section>

        <section className="tables">
          <div className="panel">
            <SectionTitle title={L.baseConfig} note={`${form?.basicRows?.length || 0} ${L.items}`} />
            {!product.published ? (
              <div className="empty-state">{L.noConfig}</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>{L.seq}</th><th>{L.composition}</th><th>{L.name}</th><th>{L.designation}</th><th>{L.qty}</th></tr></thead>
                  <tbody>
                    {(form?.basicRows || []).map((row, index) => (
                      <tr key={`${row.name}-${row.modelCode}-${index}`}>
                        <td className="center-cell">{index + 1}</td>
                        <td>{tr(row.composition) || "/"}</td>
                        <td>{tr(row.name) || "/"}</td>
                        <td>{tr(row.modelCode) || "/"}</td>
                        <td className="center-cell">{quantityFromMark(row.mark)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <SectionTitle title={L.options} note={`${optionRows.length} ${L.items} · ${optionSourceLabel}`} />
            {!configOptionRows.length && priceOptionRows.length ? (
              <div className="data-note">{L.priceFallback}</div>
            ) : null}
            {!optionRows.length ? (
              <div className="empty-state">{L.noOptions}</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>{L.select}</th><th>{L.qty}</th><th>{L.changeType}</th><th>{L.item}</th><th>{L.package}</th></tr></thead>
                  <tbody>
                    {optionRows.map((item, index) => {
                      const selection = selected[index] || {
                        checked: false,
                        qty: 1,
                        type: item.defaultType || "addition",
                      };
                      return (
                        <tr key={`${item.itemDisplay}-${index}`}>
                          <td className="center-cell"><input type="checkbox" checked={selection.checked} onChange={event => updateSelected(index, { checked: event.target.checked })} /></td>
                          <td><input className="small-input" type="number" min="1" value={selection.qty} onChange={event => updateSelected(index, { qty: event.target.value })} /></td>
                          <td><select className="mini-select" value={selection.type} onChange={event => updateSelected(index, { type: event.target.value })}><option value="addition">{L.add}</option><option value="deduction">{L.deduct}</option></select></td>
                          <td className="item-name">{tr(item.itemDisplay || item.name)}</td>
                          <td>{item.children?.length ? <button className="inline-btn" onClick={() => setModalItem(item)}>{L.view}</button> : <span className="muted">/</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="panel" id="quote-panel">
          <SectionTitle title={L.quoteInfo} />
          <div className="quote-grid">
            <Field label={L.quoteDate}><input type="date" value={quoteInfo.quoteDate} onChange={event => updateQuoteInfo("quoteDate", event.target.value)} /></Field>
            <Field label={L.tradeTerm}>
              <select value={tradeTerm} onChange={event => setTradeTerm(event.target.value)}>
                {appData.ui.tradeTerms.map(item => <option value={item} key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label={L.tradePlace}><input value={tradePlace} onChange={event => setTradePlace(event.target.value)} /></Field>
            <Field label={L.customer}><input value={customerName} onChange={event => setCustomerName(event.target.value)} /></Field>
            <Field label={L.quoteCompany} className="span-2"><input value={quoteInfo.quoteCompany} onChange={event => updateQuoteInfo("quoteCompany", event.target.value)} /></Field>
            <Field label={L.quotePerson}><input value={quoteInfo.quotePerson} onChange={event => updateQuoteInfo("quotePerson", event.target.value)} /></Field>
            <Field label={L.phone}><input value={quoteInfo.phone} onChange={event => updateQuoteInfo("phone", event.target.value)} /></Field>
            <Field label={L.email}><input value={quoteInfo.email} onChange={event => updateQuoteInfo("email", event.target.value)} /></Field>
            <Field label={L.address} className="span-3"><input value={quoteInfo.address} onChange={event => updateQuoteInfo("address", event.target.value)} /></Field>
          </div>
          <h3>{L.tradeTerms}</h3>
          <div className="terms-grid">
            <Field label={L.payment}><textarea value={quoteInfo.payment} onChange={event => updateQuoteInfo("payment", event.target.value)} /></Field>
            <Field label={L.delivery}><textarea value={quoteInfo.delivery} onChange={event => updateQuoteInfo("delivery", event.target.value)} /></Field>
            <Field label={L.validity}><textarea value={quoteInfo.validity} onChange={event => updateQuoteInfo("validity", event.target.value)} /></Field>
            <Field label={L.transportation}><textarea value={quoteInfo.transportation} onChange={event => updateQuoteInfo("transportation", event.target.value)} /></Field>
            <Field label={L.warranty} className="span-2"><textarea value={quoteInfo.warranty} onChange={event => updateQuoteInfo("warranty", event.target.value)} /></Field>
            <Field label={L.others} className="span-2"><textarea value={quoteInfo.others} onChange={event => updateQuoteInfo("others", event.target.value)} /></Field>
            <Field label={L.remark} className="span-3"><textarea value={quoteInfo.remark} onChange={event => updateQuoteInfo("remark", event.target.value)} /></Field>
          </div>
        </section>
      </main>

      {adminModal === "login" ? (
        <div className="modal-backdrop" onClick={() => setAdminModal("")}>
          <form className="modal admin-modal" onSubmit={submitAdminLogin} onClick={event => event.stopPropagation()}>
            <div className="modal-title">
              <h2>{L.adminAccess}</h2>
              <button className="btn secondary" type="button" onClick={() => setAdminModal("")}>{L.close}</button>
            </div>
            <div className="admin-login-fields">
              <Field label={L.employeeId}><input autoFocus value={employeeId} onChange={event => setEmployeeId(event.target.value)} /></Field>
              <Field label={L.password}><input type="password" value={adminPassword} onChange={event => setAdminPassword(event.target.value)} /></Field>
            </div>
            {adminError ? <div className="admin-error">{adminError}</div> : null}
            <div className="admin-actions">
              <button className="btn secondary" type="button" onClick={() => setAdminModal("")}>{L.cancel}</button>
              <button className="btn" type="submit">{L.login}</button>
            </div>
          </form>
        </div>
      ) : null}

      {adminModal === "settings" ? (
        <div className="modal-backdrop" onClick={() => setAdminModal("")}>
          <div className="modal admin-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-title">
              <h2>{L.priceSettings}</h2>
              <button className="btn secondary" type="button" onClick={() => setAdminModal("")}>{L.close}</button>
            </div>
            <div className="admin-settings-grid">
              <Field label={L.externalPremiumRate}>
                <select value={externalPremiumRate} onChange={event => setExternalPremiumRate(Number(event.target.value))}>
                  {premiumRateOptions().map(rate => <option value={rate} key={rate}>{rate}%</option>)}
                </select>
              </Field>
              <Field label={L.actualSalesPrice}>
                <div className="input-with-suffix">
                  <input type="number" min="0" step="0.01" value={actualSalesPrice} onChange={event => updateActualSalesPrice(event.target.value)} />
                  <span>{currency}</span>
                </div>
              </Field>
            </div>
            <div className="admin-price-summary">
              <div className="admin-price-card">
                <span>{L.truePrice}</span>
                <strong>{formatMoney(truePrice, currency)}</strong>
              </div>
              <div className="admin-price-card">
                <span>{L.externalDisplayPrice}</span>
                <strong>{formatMoney(displayedTotalPrice, currency)}</strong>
              </div>
              <div className="admin-price-card emphasis">
                <span>{L.actualPremiumRate}</span>
                <strong>{actualPremiumRate == null ? "/" : `${actualPremiumRate >= 0 ? "+" : ""}${actualPremiumRate.toFixed(2)}%`}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {modalItem ? (
        <div className="modal-backdrop" onClick={() => setModalItem(null)}>
          <div className="modal" onClick={event => event.stopPropagation()}>
            <div className="modal-title">
              <h2>{tr(modalItem.itemDisplay || modalItem.name)}</h2>
              <button className="btn secondary" onClick={() => setModalItem(null)}>{L.close}</button>
            </div>
            <p className="muted">{L.packageNote}</p>
            <div className="table-wrap package-table">
              <table>
                <thead><tr><th>{L.component}</th><th>{L.name}</th><th>{L.designation}</th><th>{L.qty}</th></tr></thead>
                <tbody>
                  {modalItem.children.map((row, index) => (
                    <tr key={`${row.code}-${index}`}>
                      <td>{tr(row.component) || "/"}</td>
                      <td>{tr(row.name) || "/"}</td>
                      <td>{tr(row.modelCode) || "/"}</td>
                      <td>{quantityFromMark(row.mark)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
