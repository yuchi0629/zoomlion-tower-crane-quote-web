import React, { useEffect, useMemo, useState } from "react";
import { selectTowerCranes } from "./selector-engine.js";
import "./selector.css";

const TEXT = {
  zh: {
    title: "塔机选型",
    intro: "输入全部吊点要求，按已录入厂家样本性能匹配可满足机型。",
    loaded: "已录入性能",
    models: "款",
    flat: "平臂塔机",
    luffing: "动臂塔机",
    requirements: "吊重要求",
    point: "吊点",
    radius: "幅度",
    load: "吊重",
    radiusPlaceholder: "例如 50",
    loadPlaceholder: "例如 2.5",
    meter: "m",
    tonne: "t",
    add: "添加吊点",
    remove: "删除",
    result: "匹配结果",
    resultCount: "款满足",
    prompt: "填写每个吊点的幅度和吊重后显示推荐结果。",
    noMatch: "当前已录入性能中，没有可确认满足全部吊点的机型。",
    nearest: "最接近方案，仍存在缺口",
    recommended: "推荐",
    normal: "普通工况",
    superlift: "超起工况",
    shortestJib: "最小臂长",
    required: "需求",
    capacity: "允许吊重",
    surplus: "富余量",
    shortage: "缺口",
    reeving: "倍率",
    catalogRadius: "保守取值档位",
    expand: "展开可满足机型名单",
    collapse: "收起可满足机型名单",
    more: "更多",
    topThree: "默认显示推荐前三种",
    disclaimer: "选型结果基于已录入厂家样本性能；正式工程应按具体样本、配置和项目条件复核。",
    loadError: "起重性能数据加载失败",
    loading: "正在加载起重性能数据...",
  },
  en: {
    title: "Tower Crane Selection",
    intro: "Enter every lifting point to match cranes against the stored manufacturer load charts.",
    loaded: "Load charts stored",
    models: "models",
    flat: "Flat-top Crane",
    luffing: "Luffing-jib Crane",
    requirements: "Lifting Requirements",
    point: "Point",
    radius: "Radius",
    load: "Load",
    radiusPlaceholder: "e.g. 50",
    loadPlaceholder: "e.g. 2.5",
    meter: "m",
    tonne: "t",
    add: "Add Point",
    remove: "Remove",
    result: "Matches",
    resultCount: "models satisfy",
    prompt: "Enter the radius and load for every lifting point to see recommendations.",
    noMatch: "No stored model can be confirmed to satisfy every lifting point.",
    nearest: "Closest option, with a remaining shortfall",
    recommended: "Recommended",
    normal: "Normal Condition",
    superlift: "Superlift Condition",
    shortestJib: "Shortest Jib",
    required: "Required",
    capacity: "Rated Load",
    surplus: "Surplus",
    shortage: "Shortfall",
    reeving: "Reeving",
    catalogRadius: "Conservative chart radius",
    expand: "Show All Satisfying Models",
    collapse: "Collapse Model List",
    more: "more",
    topThree: "The top three recommendations are shown by default",
    disclaimer: "Results use the stored manufacturer load charts. Verify the specific catalog, configuration and project conditions for engineering use.",
    loadError: "Failed to load lifting-performance data",
    loading: "Loading lifting-performance data...",
  },
  fr: {
    title: "Selection de grue a tour",
    intro: "Saisissez tous les points de levage pour comparer les courbes de charge constructeur enregistrees.",
    loaded: "Courbes enregistrees",
    models: "modeles",
    flat: "Grue a fleche horizontale",
    luffing: "Grue a fleche relevable",
    requirements: "Exigences de levage",
    point: "Point",
    radius: "Portee",
    load: "Charge",
    radiusPlaceholder: "ex. 50",
    loadPlaceholder: "ex. 2,5",
    meter: "m",
    tonne: "t",
    add: "Ajouter un point",
    remove: "Supprimer",
    result: "Resultats",
    resultCount: "modeles conformes",
    prompt: "Saisissez la portee et la charge de chaque point pour afficher les recommandations.",
    noMatch: "Aucun modele enregistre ne peut etre confirme pour tous les points de levage.",
    nearest: "Solution la plus proche, avec un ecart restant",
    recommended: "Recommande",
    normal: "Configuration normale",
    superlift: "Configuration Superlift",
    shortestJib: "Fleche minimale",
    required: "Besoin",
    capacity: "Charge admissible",
    surplus: "Marge",
    shortage: "Ecart",
    reeving: "Mouflage",
    catalogRadius: "Portee catalogue conservative",
    expand: "Afficher tous les modeles conformes",
    collapse: "Reduire la liste",
    more: "autres",
    topThree: "Les trois premieres recommandations sont affichees par defaut",
    disclaimer: "Les resultats utilisent les courbes constructeur enregistrees. Verifier le catalogue, la configuration et les conditions du projet avant utilisation technique.",
    loadError: "Echec du chargement des performances de levage",
    loading: "Chargement des performances de levage...",
  },
  de: {
    title: "Turmdrehkran-Auswahl",
    intro: "Alle Lastpunkte eingeben und mit den gespeicherten Hersteller-Lasttabellen vergleichen.",
    loaded: "Gespeicherte Lasttabellen",
    models: "Modelle",
    flat: "Obendreher mit Laufkatze",
    luffing: "Wippauslegerkran",
    requirements: "Lastanforderungen",
    point: "Lastpunkt",
    radius: "Ausladung",
    load: "Last",
    radiusPlaceholder: "z. B. 50",
    loadPlaceholder: "z. B. 2,5",
    meter: "m",
    tonne: "t",
    add: "Lastpunkt hinzufugen",
    remove: "Loschen",
    result: "Ergebnisse",
    resultCount: "Modelle geeignet",
    prompt: "Ausladung und Last jedes Lastpunkts eingeben, um Empfehlungen anzuzeigen.",
    noMatch: "Kein gespeichertes Modell kann alle Lastpunkte nachweislich erfullen.",
    nearest: "Nachste Losung mit verbleibendem Defizit",
    recommended: "Empfohlen",
    normal: "Normalbetrieb",
    superlift: "Superlift-Betrieb",
    shortestJib: "Kurzester Ausleger",
    required: "Anforderung",
    capacity: "Zulassige Last",
    surplus: "Reserve",
    shortage: "Defizit",
    reeving: "Einscherung",
    catalogRadius: "Konservativer Tabellenwert",
    expand: "Alle geeigneten Modelle anzeigen",
    collapse: "Modellliste einklappen",
    more: "weitere",
    topThree: "Standardmassig werden die drei besten Empfehlungen angezeigt",
    disclaimer: "Die Ergebnisse basieren auf gespeicherten Hersteller-Lasttabellen. Katalog, Konfiguration und Projektbedingungen sind fur die technische Anwendung zu prufen.",
    loadError: "Lastdaten konnten nicht geladen werden",
    loading: "Lastdaten werden geladen...",
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
          <span className="selector-jib">{labels.shortestJib} {formatNumber(result.jibLength)} m</span>
        </div>
      </div>
      <div className="selector-point-table-wrap">
        <table className="selector-point-table">
          <thead>
            <tr>
              <th>{labels.point}</th>
              <th>{labels.required}</th>
              <th>{labels.capacity}</th>
              <th>{labels.surplus}</th>
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
                  {point.surplus < 0 ? labels.shortage : labels.surplus} {formatNumber(Math.abs(point.surplus))} t
                  <small>{point.surplusRate >= 0 ? "+" : ""}{formatNumber(point.surplusRate)}%</small>
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
  const availableCount = data?.models?.filter(model => model.type === type).length || 0;

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
          <span className="selector-data-count">{labels.loaded} {data?.models?.length || 0} {labels.models}</span>
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
            <span>{ready ? `${matches.length} ${labels.resultCount}` : `${availableCount} ${labels.models}`}</span>
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
