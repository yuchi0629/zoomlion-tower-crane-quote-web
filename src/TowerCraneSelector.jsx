import React, { useEffect, useMemo, useState } from "react";
import { selectTowerCranes } from "./selector-engine.js";
import "./selector.css";

const TEXT = {
  zh: {
    title: "塔机选型",
    intro: "基于幅度、吊重要求，匹配可满足性能需求的机型。",
    flat: "平臂塔机",
    luffing: "动臂塔机",
    requirements: "幅度吊重需求",
    point: "幅度",
    radius: "幅度",
    load: "吊重",
    radiusPlaceholder: "例如 50",
    loadPlaceholder: "例如 2.5",
    meter: "m",
    tonne: "t",
    add: "增加幅度吊重需求",
    remove: "删除",
    result: "机型匹配结果",
    resultCount: "款满足",
    prompt: "填写每组幅度和吊重后显示推荐结果。",
    noMatch: "当前已录入吊重数据中，没有可确认满足全部幅度吊重需求的机型。",
    nearest: "最接近方案，仍存在缺口",
    recommended: "推荐",
    normal: "普通工况",
    superlift: "超起工况",
    basedOnJib: "基于",
    jibLengthSuffix: "m 臂长",
    required: "吊重",
    capacity: "允许吊重",
    loadRate: "负载率",
    margin: "余量",
    shortage: "缺口",
    reeving: "倍率",
    catalogRadius: "保守取值档位",
    expand: "展开可满足机型名单",
    collapse: "收起可满足机型名单",
    more: "更多",
    topThree: "默认显示推荐前三种",
    disclaimer: "正式工程应按具体样本、配置和项目条件复核。",
    loadError: "起重性能数据加载失败",
    loading: "正在加载起重性能数据...",
  },
  en: {
    title: "Tower Crane Selection",
    intro: "Match models that meet the performance requirements based on radius and load requirements.",
    flat: "Flat-top Crane",
    luffing: "Luffing-jib Crane",
    requirements: "Radius and Load Requirements",
    point: "Radius",
    radius: "Radius",
    load: "Load",
    radiusPlaceholder: "e.g. 50",
    loadPlaceholder: "e.g. 2.5",
    meter: "m",
    tonne: "t",
    add: "Add Radius/Load Requirement",
    remove: "Remove",
    result: "Model Matching Results",
    resultCount: "models satisfy",
    prompt: "Enter each radius and load requirement to see recommendations.",
    noMatch: "No stored model can be confirmed to satisfy all radius and load requirements.",
    nearest: "Closest option, with a remaining shortfall",
    recommended: "Recommended",
    normal: "Normal Condition",
    superlift: "Superlift Condition",
    basedOnJib: "Based on",
    jibLengthSuffix: "m jib",
    required: "Load",
    capacity: "Rated Load",
    loadRate: "Load Rate",
    margin: "Margin",
    shortage: "Shortfall",
    reeving: "Reeving",
    catalogRadius: "Conservative chart radius",
    expand: "Show All Satisfying Models",
    collapse: "Collapse Model List",
    more: "more",
    topThree: "The top three recommendations are shown by default",
    disclaimer: "For formal engineering use, verify the specific catalog, configuration and project conditions.",
    loadError: "Failed to load lifting-performance data",
    loading: "Loading lifting-performance data...",
  },
  fr: {
    title: "Selection de grue a tour",
    intro: "Identifiez les modeles conformes a partir des exigences de portee et de charge.",
    flat: "Grue a fleche horizontale",
    luffing: "Grue a fleche relevable",
    requirements: "Exigences de portee et de charge",
    point: "Portee",
    radius: "Portee",
    load: "Charge",
    radiusPlaceholder: "ex. 50",
    loadPlaceholder: "ex. 2,5",
    meter: "m",
    tonne: "t",
    add: "Ajouter une exigence portee/charge",
    remove: "Supprimer",
    result: "Resultats de correspondance des modeles",
    resultCount: "modeles conformes",
    prompt: "Saisissez chaque exigence de portee et de charge pour afficher les recommandations.",
    noMatch: "Aucun modele enregistre ne peut etre confirme pour toutes les exigences de portee et de charge.",
    nearest: "Solution la plus proche, avec un ecart restant",
    recommended: "Recommande",
    normal: "Configuration normale",
    superlift: "Configuration Superlift",
    basedOnJib: "Base sur une fleche de",
    jibLengthSuffix: "m",
    required: "Charge",
    capacity: "Charge admissible",
    loadRate: "Taux de charge",
    margin: "Marge",
    shortage: "Ecart",
    reeving: "Mouflage",
    catalogRadius: "Portee catalogue conservative",
    expand: "Afficher tous les modeles conformes",
    collapse: "Reduire la liste",
    more: "autres",
    topThree: "Les trois premieres recommandations sont affichees par defaut",
    disclaimer: "Pour une utilisation technique formelle, verifier le catalogue, la configuration et les conditions du projet.",
    loadError: "Echec du chargement des performances de levage",
    loading: "Chargement des performances de levage...",
  },
  de: {
    title: "Turmdrehkran-Auswahl",
    intro: "Anhand der Anforderungen an Ausladung und Last werden geeignete Modelle ermittelt.",
    flat: "Obendreher mit Laufkatze",
    luffing: "Wippauslegerkran",
    requirements: "Ausladungs- und Lastanforderungen",
    point: "Ausladung",
    radius: "Ausladung",
    load: "Last",
    radiusPlaceholder: "z. B. 50",
    loadPlaceholder: "z. B. 2,5",
    meter: "m",
    tonne: "t",
    add: "Ausladungs-/Lastanforderung hinzufugen",
    remove: "Loschen",
    result: "Ergebnisse der Modellauswahl",
    resultCount: "Modelle geeignet",
    prompt: "Jede Ausladungs- und Lastanforderung eingeben, um Empfehlungen anzuzeigen.",
    noMatch: "Kein gespeichertes Modell kann alle Ausladungs- und Lastanforderungen nachweislich erfullen.",
    nearest: "Nachste Losung mit verbleibendem Defizit",
    recommended: "Empfohlen",
    normal: "Normalbetrieb",
    superlift: "Superlift-Betrieb",
    basedOnJib: "Basierend auf",
    jibLengthSuffix: "m Ausleger",
    required: "Last",
    capacity: "Zulassige Last",
    loadRate: "Auslastung",
    margin: "Reserve",
    shortage: "Defizit",
    reeving: "Einscherung",
    catalogRadius: "Konservativer Tabellenwert",
    expand: "Alle geeigneten Modelle anzeigen",
    collapse: "Modellliste einklappen",
    more: "weitere",
    topThree: "Standardmassig werden die drei besten Empfehlungen angezeigt",
    disclaimer: "Fur die formelle technische Anwendung sind Katalog, Konfiguration und Projektbedingungen zu prufen.",
    loadError: "Lastdaten konnten nicht geladen werden",
    loading: "Lastdaten werden geladen...",
  },
  tr: {
    title: "Kule Vinç Seçimi",
    intro: "Yarıçap ve yük gereksinimlerine göre gerekli performansı karşılayan modelleri eşleştirin.",
    flat: "Yatay Bomlu Vinç",
    luffing: "Kalkar Bomlu Vinç",
    requirements: "Yarıçap ve Yük Gereksinimleri",
    point: "Yarıçap",
    radius: "Yarıçap",
    load: "Yük",
    radiusPlaceholder: "örn. 50",
    loadPlaceholder: "örn. 2,5",
    meter: "m",
    tonne: "t",
    add: "Yarıçap/Yük Gereksinimi Ekle",
    remove: "Sil",
    result: "Model Eşleştirme Sonuçları",
    resultCount: "model uygun",
    prompt: "Önerileri görmek için her yarıçap ve yük gereksinimini girin.",
    noMatch: "Kayıtlı modeller arasında tüm yarıçap ve yük gereksinimlerini karşıladığı doğrulanabilen bir model yoktur.",
    nearest: "Kalan kapasite açığıyla en yakın seçenek",
    recommended: "Önerilen",
    normal: "Normal Çalışma",
    superlift: "Superlift Çalışması",
    basedOnJib: "Esas alınan bom",
    jibLengthSuffix: "m",
    required: "Yük",
    capacity: "İzin Verilen Yük",
    loadRate: "Yük Oranı",
    margin: "Kapasite Payı",
    shortage: "Eksik",
    reeving: "Palanga",
    catalogRadius: "Muhafazakâr tablo yarıçapı",
    expand: "Uygun Tüm Modelleri Göster",
    collapse: "Model Listesini Daralt",
    more: "daha fazla",
    topThree: "Varsayılan olarak ilk üç öneri gösterilir",
    disclaimer: "Resmî mühendislik çalışmaları için ilgili katalog, konfigürasyon ve proje koşulları doğrulanmalıdır.",
    loadError: "Kaldırma performansı verileri yüklenemedi",
    loading: "Kaldırma performansı verileri yükleniyor...",
  },
};

function formatNumber(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function ResultCard({ result, rank, labels, nearest = false }) {
  return (
    <article className={`selector-result-card${nearest ? " nearest" : ""}`}>
      <div className="selector-result-head">
        <div className="selector-rank">{rank}</div>
        <div className="selector-model-name">
          <strong>{result.code}</strong>
          <span>{result.condition === "superlift" ? labels.superlift : labels.normal}</span>
        </div>
        <div className="selector-result-tags">
          {rank === 1 && !nearest ? <span className="selector-recommended">{labels.recommended}</span> : null}
          <span className="selector-jib">{labels.basedOnJib} {formatNumber(result.jibLength)} {labels.jibLengthSuffix}</span>
        </div>
      </div>
      <div className="selector-point-table-wrap">
        <table className="selector-point-table">
          <thead>
            <tr>
              <th>{labels.point}</th>
              <th>{labels.required}</th>
              <th>{labels.capacity}</th>
              <th>{labels.loadRate}</th>
              <th>{labels.reeving}</th>
            </tr>
          </thead>
          <tbody>
            {result.points.map((point, index) => (
              <tr key={`${point.radius}-${point.required}-${index}`}>
                <td>{formatNumber(point.radius)} m</td>
                <td>{formatNumber(point.required)} t</td>
                <td>
                  <strong>{formatNumber(point.capacity)} t</strong>
                  <small>{labels.catalogRadius} {formatNumber(point.lookupRadius)} m</small>
                </td>
                <td className={point.surplus < 0 ? "selector-shortfall" : "selector-surplus"}>
                  <strong>{formatNumber(point.loadRate)}%</strong>
                  <small>{point.surplus < 0 ? labels.shortage : labels.margin} {formatNumber(Math.abs(point.surplus))} t</small>
                </td>
                <td>{formatNumber(point.reeving)}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function TowerCraneSelector({ data, language = "zh", loading = false, error = "" }) {
  const labels = TEXT[language] || TEXT.zh;
  const [type, setType] = useState("flat");
  const [requirements, setRequirements] = useState([{ id: 1, radius: "", load: "" }]);
  const [expanded, setExpanded] = useState(false);

  const ready = requirements.every(item => Number(item.radius) > 0 && Number(item.load) > 0);
  const selection = useMemo(
    () => (ready && data?.models
      ? selectTowerCranes(data.models, { type, requirements })
      : { matches: [], nearest: null }),
    [data, ready, requirements, type],
  );
  const { matches, nearest } = selection;
  const visibleMatches = expanded ? matches : matches.slice(0, 3);
  useEffect(() => setExpanded(false), [type, requirements]);

  function updateRequirement(id, field, value) {
    setRequirements(current => current.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function addRequirement() {
    setRequirements(current => [
      ...current,
      { id: Math.max(...current.map(item => item.id), 0) + 1, radius: "", load: "" },
    ]);
  }

  function removeRequirement(id) {
    setRequirements(current => (current.length > 1 ? current.filter(item => item.id !== id) : current));
  }

  return (
    <section className="selector-panel panel" aria-labelledby="tower-selector-title">
      <div className="selector-header">
        <div>
          <h2 id="tower-selector-title">{labels.title}</h2>
          <p>{labels.intro}</p>
        </div>
        <div className="selector-header-actions">
          <div className="selector-type-toggle" role="group" aria-label={labels.title}>
            <button type="button" className={type === "flat" ? "active" : ""} onClick={() => setType("flat")}>{labels.flat}</button>
            <button type="button" className={type === "luffing" ? "active" : ""} onClick={() => setType("luffing")}>{labels.luffing}</button>
          </div>
        </div>
      </div>

      <div className="selector-workspace">
        <div className="selector-requirements">
          <div className="selector-section-head">
            <strong>{labels.requirements}</strong>
            <span>{requirements.length}</span>
          </div>
          <div className="selector-requirement-list">
            {requirements.map((item, index) => (
              <div className="selector-requirement-row" key={item.id}>
                <span className="selector-point-number">{index + 1}</span>
                <label>
                  <span>{labels.radius}</span>
                  <div className="selector-input-unit">
                    <input type="number" min="0.1" step="0.1" value={item.radius} placeholder={labels.radiusPlaceholder} onChange={event => updateRequirement(item.id, "radius", event.target.value)} />
                    <b>{labels.meter}</b>
                  </div>
                </label>
                <label>
                  <span>{labels.load}</span>
                  <div className="selector-input-unit">
                    <input type="number" min="0.01" step="0.01" value={item.load} placeholder={labels.loadPlaceholder} onChange={event => updateRequirement(item.id, "load", event.target.value)} />
                    <b>{labels.tonne}</b>
                  </div>
                </label>
                <button type="button" className="selector-remove" disabled={requirements.length === 1} onClick={() => removeRequirement(item.id)}>{labels.remove}</button>
              </div>
            ))}
          </div>
          <button type="button" className="btn secondary selector-add" onClick={addRequirement}>+ {labels.add}</button>
          <p className="selector-disclaimer">{labels.disclaimer}</p>
        </div>

        <div className="selector-results">
          <div className="selector-section-head">
            <strong>{labels.result}</strong>
            {ready ? <span>{matches.length} {labels.resultCount}</span> : null}
          </div>
          {loading ? <div className="selector-empty">{labels.loading}</div> : null}
          {error ? <div className="selector-empty error">{labels.loadError}: {error}</div> : null}
          {!loading && !error && !ready ? <div className="selector-empty">{labels.prompt}</div> : null}
          {!loading && !error && ready && !matches.length ? (
            <div>
              <div className="selector-empty">{labels.noMatch}</div>
              {nearest ? (
                <div className="selector-nearest-block">
                  <strong>{labels.nearest}</strong>
                  <ResultCard result={nearest} rank="-" labels={labels} nearest />
                </div>
              ) : null}
            </div>
          ) : null}
          {visibleMatches.length ? (
            <div className="selector-result-list">
              {visibleMatches.map((result, index) => <ResultCard key={`${result.code}-${result.condition}`} result={result} rank={index + 1} labels={labels} />)}
            </div>
          ) : null}
          {matches.length > 3 ? (
            <div className="selector-expand-row">
              <span>{labels.topThree}</span>
              <button type="button" className="btn ghost" onClick={() => setExpanded(current => !current)}>
                {expanded ? labels.collapse : `${labels.expand} (+${matches.length - 3} ${labels.more})`}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
