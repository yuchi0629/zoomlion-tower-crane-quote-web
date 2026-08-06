import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const T = {
  zh: {
    appTitle: "中联塔机配置确认及报价单生成软件 V1.1",
    subTitle: "GitHub Pages 静态版：无后端、无数据库、前端读取 JSON 数据",
    quoteInfo: "报价单信息",
    printQuote: "打印报价单",
    printLtc: "打印 LTC 指导文件",
    exportList: "导出配置清单",
    productSelect: "产品型号选择",
    basicInfo: "标准配置信息",
    baseConfig: "产品基本配置",
    options: "可选增减配置",
    price: "当前 FOB 参考价格",
    dataTools: "数据维护",
    model: "产品型号",
    form: "安装形式",
    language: "报价单语言",
    tradeTerm: "贸易术语",
    currency: "价格单位",
    tradePlace: "交易地点",
    customer: "客户名称",
    towerType: "塔机类型",
    height: "独立高度",
    jib: "最大臂长",
    maxLoad: "最大起重量",
    rope: "容绳量",
    mast: "塔身种类",
    seq: "序号",
    component: "部件",
    name: "名称",
    code: "代号",
    qty: "数量",
    select: "选择",
    changeType: "增减配",
    item: "项目",
    itemPrice: "价格",
    package: "包内容",
    add: "增配",
    deduct: "减配",
    view: "查看",
    machinePrice: "整机价格",
    optionPrice: "选配价格",
    totalPrice: "合计参考价",
    exportJson: "导出 JSON",
    importJson: "导入 JSON"
  },
  en: {
    appTitle: "ZOOMLION Tower Crane Configuration and Quotation V1.1",
    subTitle: "Static GitHub Pages version: no backend, no database, JSON powered",
    quoteInfo: "Quote Info",
    printQuote: "Print Quote",
    printLtc: "Print LTC Guide",
    exportList: "Export List",
    productSelect: "Product Selection",
    basicInfo: "Standard Configuration Info",
    baseConfig: "Basic Configuration",
    options: "Optional Items",
    price: "Current FOB Reference Price",
    dataTools: "Data Tools",
    model: "Model",
    form: "Installation Form",
    language: "Language",
    tradeTerm: "Trade Term",
    currency: "Currency",
    tradePlace: "Trade Place",
    customer: "Customer",
    towerType: "Tower Type",
    height: "HUH",
    jib: "Max Jib",
    maxLoad: "Max Load",
    rope: "Rope Capacity",
    mast: "Mast Type",
    seq: "No.",
    component: "Component",
    name: "Name",
    code: "Code",
    qty: "Qty",
    select: "Select",
    changeType: "Add/Deduct",
    item: "Item",
    itemPrice: "Price",
    package: "Package",
    add: "Add",
    deduct: "Deduct",
    view: "View",
    machinePrice: "Machine Price",
    optionPrice: "Option Price",
    totalPrice: "Total Reference",
    exportJson: "Export JSON",
    importJson: "Import JSON"
  }
};
T.fr = T.en;
T.de = T.en;

const languageCode = {
  "中文": "zh",
  English: "en",
  Français: "fr",
  Deutsch: "de"
};

function CraneSvg() {
  return (
    <svg className="crane-svg" viewBox="0 0 420 140" role="img" aria-label="Tower crane">
      <rect x="15" y="124" width="165" height="7" rx="3" fill="#4d4d4d" />
      <g stroke="#3f3f3f" strokeWidth="4" fill="none">
        <path d="M92 124 L142 124 L132 34 L102 34 Z" />
        <path d="M102 34 L132 124 M132 34 L102 124" />
        <path d="M117 34 L117 124" />
      </g>
      <rect x="92" y="25" width="78" height="17" rx="3" fill="#AADB1E" />
      <path d="M160 31 L392 55" stroke="#AADB1E" strokeWidth="8" strokeLinecap="round" />
      <path d="M160 31 L360 55" stroke="#2f332b" strokeWidth="2" />
      <path d="M102 31 L28 48" stroke="#2f332b" strokeWidth="7" strokeLinecap="round" />
      <rect x="40" y="55" width="34" height="25" rx="3" fill="#3f3f3f" />
      <line x1="286" y1="45" x2="286" y2="92" stroke="#2f332b" strokeWidth="2" />
      <path d="M278 92 Q286 106 294 92" fill="none" stroke="#ff7f24" strokeWidth="5" strokeLinecap="round" />
      <text x="178" y="25" fill="#263000" fontSize="18" fontWeight="800">ZOOMLION</text>
    </svg>
  );
}

function normalizePrice(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function money(value, currency) {
  return `${currency} ${normalizePrice(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function packageOptions(rows) {
  const packed = [];
  const packageMap = new Map();
  rows.filter(row => !String(row.name || "").includes("电源箱总成")).forEach((row, index) => {
    const text = `${row.group || ""}${row.name || ""}`;
    const isClimbing = text.includes("爬升");
    const isCollector = text.includes("中央集电环");
    if (!isClimbing && !isCollector) {
      packed.push({ ...row, sourceIndex: index, displayName: `${row.group} / ${row.name} / ${row.code || "/"}` });
      return;
    }
    const key = isClimbing ? "爬升包" : "中央集电环包";
    if (!packageMap.has(key)) {
      const item = {
        group: key,
        name: key,
        code: "/",
        addPrice: 0,
        deductPrice: 0,
        isPackage: true,
        sourceIndex: `pkg-${key}`,
        displayName: key,
        children: []
      };
      packageMap.set(key, item);
      packed.push(item);
    }
    packageMap.get(key).children.push(row);
  });
  return packed;
}

function downloadBlob(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function printHtml(title, html) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("浏览器阻止了弹窗，请允许此页面打开新窗口。");
    return;
  }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    body{font-family:Arial,"Microsoft YaHei",sans-serif;margin:24px;color:#111}
    h1{font-size:22px;margin:0 0 16px}
    h2{font-size:16px;margin:18px 0 8px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #999;padding:6px;text-align:left;vertical-align:top}
    th{background:#AADB1E}
    .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:6px 18px;font-size:13px;margin-bottom:12px}
    @media print{button{display:none}}
  </style></head><body>${html}<script>setTimeout(()=>print(),300)</script></body></html>`);
  win.document.close();
}

function App() {
  const [appData, setAppData] = useState(null);
  const [modelName, setModelName] = useState("");
  const [formName, setFormName] = useState("");
  const [language, setLanguage] = useState("中文");
  const [currency, setCurrency] = useState("CNY");
  const [tradeTerm, setTradeTerm] = useState("FOB");
  const [tradePlace, setTradePlace] = useState("Shanghai Port");
  const [customerName, setCustomerName] = useState("");
  const [machinePrice, setMachinePrice] = useState(0);
  const [selected, setSelected] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [quoteInfo, setQuoteInfo] = useState({
    quoteDate: new Date().toISOString().slice(0, 10),
    quoteCompany: "中联重科建筑起重机械有限公司",
    quotePerson: "",
    phone: "",
    email: "liuyuchi@zoomlion.com",
    address: "Zoomlion Smart City Headquarters Building, No.613 NaqiuRoad, WangCheng District, Changsha, Hunan, China"
  });
  const fileInput = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem("ztc_quote_web_data");
    const load = stored ? Promise.resolve(JSON.parse(stored)) : fetch(`${import.meta.env.BASE_URL}data/app-data.json`).then(res => res.json());
    load.then(data => {
      setAppData(data);
      const first = data.products[0];
      setModelName(first.model);
      setFormName(first.forms[0].installForm);
      setQuoteInfo(info => ({
        ...info,
        quoteCompany: data.ui.defaultQuoteCompany || info.quoteCompany,
        email: data.ui.defaultEmail || info.email,
        address: data.ui.defaultAddress || info.address
      }));
    });
  }, []);

  const labels = T[languageCode[language] || "zh"];
  const product = appData?.products.find(item => item.model === modelName);
  const form = product?.forms.find(item => item.installForm === formName);
  const optionRows = useMemo(() => packageOptions(form?.optionRows || []), [form]);

  const optionTotal = useMemo(() => optionRows.reduce((sum, item) => {
    const row = selected[item.sourceIndex];
    if (!row?.checked) return sum;
    const qty = Number(row.qty || 1);
    const base = row.type === labels.deduct ? (item.deductPrice || item.addPrice || 0) : (item.addPrice || 0);
    return sum + normalizePrice(base) * qty * (row.type === labels.deduct ? -1 : 1);
  }, 0), [optionRows, selected, labels.deduct]);

  if (!appData || !product || !form) {
    return <div className="loading">正在加载配置数据...</div>;
  }

  const total = normalizePrice(machinePrice) + optionTotal;
  const infoRows = [
    [labels.model, product.model],
    [labels.towerType, product.towerType],
    [labels.height, `${form.height || "/"} m`],
    [labels.jib, `${form.jibLength || product.defaultJibLength || "/"} m`],
    [labels.maxLoad, product.maxLoad || "/"],
    [labels.form, form.installForm],
    [labels.rope, form.ropeCapacity ? `${form.ropeCapacity} m` : "/"],
    [labels.mast, product.mastType || "/"]
  ];
  const selectedOptions = optionRows.filter(item => selected[item.sourceIndex]?.checked);

  function updateSelected(key, patch) {
    setSelected(prev => ({
      ...prev,
      [key]: { checked: false, qty: 1, type: labels.add, ...(prev[key] || {}), ...patch }
    }));
  }

  function exportConfigCsv() {
    const basic = [[labels.baseConfig], [labels.seq, labels.component, labels.name, labels.code, labels.qty]]
      .concat(form.basicRows.map((row, index) => [index + 1, row.component, row.name, row.code, row.quantity]));
    const options = [[labels.options], [labels.select, labels.qty, labels.changeType, labels.item, labels.itemPrice]]
      .concat(optionRows.map(item => {
        const row = selected[item.sourceIndex] || {};
        return [row.checked ? "Y" : "", row.qty || 1, row.type || labels.add, item.displayName, item.addPrice || 0];
      }));
    const csv = "\ufeff" + basic.concat([[]], options).map(row => row.map(csvCell).join(",")).join("\n");
    downloadBlob(`${product.model}_配置及增减配清单.csv`, csv, "text/csv;charset=utf-8");
  }

  function exportJson() {
    downloadBlob("app-data.json", JSON.stringify(appData, null, 2), "application/json;charset=utf-8");
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        localStorage.setItem("ztc_quote_web_data", JSON.stringify(data));
        setAppData(data);
        setModelName(data.products[0].model);
        setFormName(data.products[0].forms[0].installForm);
        setSelected({});
        alert("数据已导入浏览器本地缓存。");
      } catch (error) {
        alert(`导入失败：${error.message}`);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function quoteHtml() {
    return `
      <h1>${labels.appTitle}</h1>
      <div class="meta">
        <div><strong>${labels.customer}</strong>: ${customerName || "/"}</div>
        <div><strong>${labels.model}</strong>: ${product.model}</div>
        <div><strong>${labels.form}</strong>: ${form.installForm}</div>
        <div><strong>${labels.tradeTerm}</strong>: ${tradeTerm} ${tradePlace}</div>
        <div><strong>${labels.machinePrice}</strong>: ${money(machinePrice, currency)}</div>
        <div><strong>${labels.totalPrice}</strong>: ${money(total, currency)}</div>
      </div>
      <h2>${labels.basicInfo}</h2>
      <table>${infoRows.map(row => `<tr><th>${row[0]}</th><td>${row[1]}</td></tr>`).join("")}</table>
      <h2>${labels.baseConfig}</h2>
      <table><thead><tr><th>${labels.seq}</th><th>${labels.component}</th><th>${labels.name}</th><th>${labels.code}</th><th>${labels.qty}</th></tr></thead><tbody>
      ${form.basicRows.map((row, i) => `<tr><td>${i + 1}</td><td>${row.component}</td><td>${row.name}</td><td>${row.code}</td><td>${row.quantity}</td></tr>`).join("")}
      </tbody></table>
      <h2>${labels.options}</h2>
      <table><thead><tr><th>${labels.qty}</th><th>${labels.changeType}</th><th>${labels.item}</th><th>${labels.itemPrice}</th></tr></thead><tbody>
      ${selectedOptions.map(item => {
        const row = selected[item.sourceIndex] || {};
        return `<tr><td>${row.qty || 1}</td><td>${row.type || labels.add}</td><td>${item.displayName}</td><td>${money(item.addPrice || 0, currency)}</td></tr>`;
      }).join("") || `<tr><td colspan="4">/</td></tr>`}
      </tbody></table>
    `;
  }

  function ltcHtml() {
    const rows = [];
    selectedOptions.forEach(item => {
      if (item.children?.length) {
        item.children.forEach(child => rows.push([child.group, child.name, child.code, child.quantity]));
      } else {
        rows.push([item.group, item.name, item.code, selected[item.sourceIndex]?.qty || 1]);
      }
    });
    return `
      <h1>LTC选配指导文件</h1>
      <div class="meta"><div><strong>${labels.model}</strong>: ${product.model}</div><div><strong>${labels.form}</strong>: ${form.installForm}</div></div>
      <table><thead><tr><th>${labels.component}</th><th>${labels.name}</th><th>${labels.code}</th><th>${labels.qty}</th></tr></thead><tbody>
      ${rows.map(row => `<tr>${row.map(cell => `<td>${cell || "/"}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="4">未选择增减配项目</td></tr>`}
      </tbody></table>
    `;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-mark"><CraneSvg /></div>
        <div className="title-block">
          <h1>{labels.appTitle}</h1>
          <div className="subtitle">{labels.subTitle}</div>
        </div>
        <div className="top-actions">
          <button className="btn secondary" onClick={() => document.getElementById("quote-panel")?.scrollIntoView({ behavior: "smooth" })}>{labels.quoteInfo}</button>
          <button className="btn" onClick={() => printHtml(labels.printQuote, quoteHtml())}>{labels.printQuote}</button>
          <button className="btn secondary" onClick={() => printHtml("LTC选配指导文件", ltcHtml())}>{labels.printLtc}</button>
          <button className="btn ghost" onClick={exportConfigCsv}>{labels.exportList}</button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          {["产品选择", "报价信息", "配置确认", "增减配选择", "文件生成", "数据维护"].map((step, index) => (
            <div className={`step ${index === 0 ? "active" : ""}`} key={step}>
              <span className="step-no">{index + 1}</span><span>{step}</span>
            </div>
          ))}
          <div className="side-card"><strong>静态部署</strong><br />本页面运行时只读取 JSON 文件，不连接后端、不使用数据库。</div>
          <div className="side-card"><strong>当前数据</strong><br />{product.model}：{product.forms.length} 种安装形式，配置表已发布。</div>
        </aside>

        <main className="main">
          <section className="hero">
            <div className="panel">
              <div className="panel-head"><h2>{labels.productSelect}</h2><span className="badge">GitHub Pages</span></div>
              <div className="form-grid">
                <Field label={labels.model}><select value={modelName} onChange={e => { setModelName(e.target.value); const next = appData.products.find(p => p.model === e.target.value); setFormName(next.forms[0].installForm); setSelected({}); }}>{appData.products.map(item => <option key={item.model}>{item.model}</option>)}</select></Field>
                <Field label={labels.form}><select value={formName} onChange={e => { setFormName(e.target.value); setSelected({}); }}>{product.forms.map(item => <option key={item.installForm}>{item.installForm}</option>)}</select></Field>
                <Field label={labels.language}><select value={language} onChange={e => setLanguage(e.target.value)}>{appData.ui.languages.map(item => <option key={item}>{item}</option>)}</select></Field>
                <Field label={labels.tradeTerm}><select value={tradeTerm} onChange={e => setTradeTerm(e.target.value)}>{appData.ui.tradeTerms.map(item => <option key={item}>{item}</option>)}</select></Field>
                <Field label={labels.currency}><select value={currency} onChange={e => setCurrency(e.target.value)}>{appData.ui.currencies.map(item => <option key={item}>{item}</option>)}</select></Field>
                <Field label={labels.tradePlace}><input value={tradePlace} onChange={e => setTradePlace(e.target.value)} /></Field>
                <Field label={labels.customer}><input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" /></Field>
              </div>
              <CraneSvg />
            </div>
            <div className="panel">
              <div className="panel-head"><h2>{labels.price}</h2><span className="badge">{tradeTerm} {tradePlace}</span></div>
              <div className="price-card">
                <div className="price-row"><span>{labels.machinePrice}</span><strong>{money(machinePrice, currency)}</strong></div>
                <div className="price-row"><span>{labels.optionPrice}</span><strong>{money(optionTotal, currency)}</strong></div>
                <div className="price-total"><div className="muted">{labels.totalPrice}</div><strong>{money(total, currency)}</strong></div>
                <Field label="整机价格手动输入"><input type="number" value={machinePrice} onChange={e => setMachinePrice(e.target.value)} /></Field>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>{labels.basicInfo}</h2><span className="badge">2 columns</span></div>
            <div className="basic-info">{infoRows.map(row => <div className="info-item" key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span></div>)}</div>
          </section>

          <section className="tables">
            <div className="panel">
              <div className="panel-head"><h2>{labels.baseConfig}</h2><span className="badge">{form.basicRows.length} items</span></div>
              <div className="table-wrap"><table><thead><tr><th>{labels.seq}</th><th>{labels.component}</th><th>{labels.name}</th><th>{labels.code}</th><th>{labels.qty}</th></tr></thead><tbody>{form.basicRows.map((row, index) => <tr key={`${row.name}-${index}`}><td>{index + 1}</td><td>{row.component}</td><td>{row.name}</td><td>{row.code || "/"}</td><td>{row.quantity || "1"}</td></tr>)}</tbody></table></div>
            </div>
            <div className="panel">
              <div className="panel-head"><h2>{labels.options}</h2><span className="badge">{optionRows.length} rows</span></div>
              <div className="table-wrap"><table><thead><tr><th>{labels.select}</th><th>{labels.qty}</th><th>{labels.changeType}</th><th>{labels.item}</th><th>{labels.itemPrice}</th><th>{labels.package}</th></tr></thead><tbody>{optionRows.map(item => {
                const row = selected[item.sourceIndex] || { checked: false, qty: 1, type: labels.add };
                return <tr key={item.sourceIndex}><td><input type="checkbox" checked={row.checked} onChange={e => updateSelected(item.sourceIndex, { checked: e.target.checked })} /></td><td><input className="small-input" type="number" min="1" value={row.qty} onChange={e => updateSelected(item.sourceIndex, { qty: e.target.value })} /></td><td><select className="mini-select" value={row.type} onChange={e => updateSelected(item.sourceIndex, { type: e.target.value })}><option>{labels.add}</option><option>{labels.deduct}</option></select></td><td className="item-name">{item.displayName}</td><td>{money(item.addPrice || 0, currency)}</td><td>{item.children?.length ? <button className="btn ghost" onClick={() => setModalItem(item)}>{labels.view}</button> : <span className="muted">-</span>}</td></tr>;
              })}</tbody></table></div>
            </div>
          </section>

          <section className="workbench-bottom">
            <div className="panel" id="quote-panel">
              <div className="panel-head"><h2>{labels.quoteInfo}</h2><span className="badge">local</span></div>
              <div className="quote-grid">
                <Field label="报价日期"><input type="date" value={quoteInfo.quoteDate} onChange={e => setQuoteInfo({ ...quoteInfo, quoteDate: e.target.value })} /></Field>
                <Field label="报价单位"><input value={quoteInfo.quoteCompany} onChange={e => setQuoteInfo({ ...quoteInfo, quoteCompany: e.target.value })} /></Field>
                <Field label="报价人"><input value={quoteInfo.quotePerson} onChange={e => setQuoteInfo({ ...quoteInfo, quotePerson: e.target.value })} /></Field>
                <Field label="联系电话"><input value={quoteInfo.phone} onChange={e => setQuoteInfo({ ...quoteInfo, phone: e.target.value })} /></Field>
                <Field label="联系邮箱"><input value={quoteInfo.email} onChange={e => setQuoteInfo({ ...quoteInfo, email: e.target.value })} /></Field>
                <Field label="公司地址"><input value={quoteInfo.address} onChange={e => setQuoteInfo({ ...quoteInfo, address: e.target.value })} /></Field>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head"><h2>{labels.dataTools}</h2><span className="badge">JSON</span></div>
              <div className="maintenance">
                <button className="btn secondary" onClick={exportJson}>{labels.exportJson}</button>
                <button className="btn secondary" onClick={() => fileInput.current?.click()}>{labels.importJson}</button>
                <button className="btn ghost" onClick={() => { localStorage.removeItem("ztc_quote_web_data"); location.reload(); }}>恢复仓库数据</button>
                <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={e => importJson(e.target.files?.[0])} />
              </div>
              <p className="muted">静态版不会写入服务器；导入数据只保存在当前浏览器本地缓存。</p>
            </div>
          </section>
        </main>
      </div>

      {modalItem && <div className="modal-backdrop" onClick={() => setModalItem(null)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-title"><h2>{modalItem.name}</h2><button className="btn secondary" onClick={() => setModalItem(null)}>关闭</button></div><p className="muted">包内明细不显示拆分价格。</p><div className="table-wrap package-table"><table><thead><tr><th>{labels.component}</th><th>{labels.name}</th><th>{labels.code}</th><th>{labels.qty}</th></tr></thead><tbody>{modalItem.children.map((row, index) => <tr key={index}><td>{row.group}</td><td>{row.name}</td><td>{row.code}</td><td>{row.quantity}</td></tr>)}</tbody></table></div></div></div>}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label>{label}</label>{children}</div>;
}

createRoot(document.getElementById("root")).render(<App />);
