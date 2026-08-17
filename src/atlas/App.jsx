import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  geoCentroid,
  geoAzimuthalEqualArea,
  geoPath,
  geoGraticule10,
} from "d3-geo";

import { COUNTRIES, BY_A2, CONTINENTS, CONTINENT_ES } from "./countries.js";
import { decodeTopology, toFeature, dms, flagEmoji } from "./geo.js";
import { setProgress, SECTIONS } from "../lib/shell.js";
import { load, save } from "../lib/store.js";
import { getLang, onLang, t } from "../lib/i18n.js";
import * as haptic from "../lib/haptics.js";

const TOPO_URL = `${import.meta.env.BASE_URL}data/countries-50m.json`;
const ROUND_LENGTH = 12;
const TIME_LIMIT = 20;

const K_STATS = "atlas:stats";
const K_PREFS = "atlas:prefs";
const K_BOARD = "atlas:board";

const MODES = [
  { id: "flag", label: { en: "Find the flag", es: "Busca la bandera" } },
  { id: "capital", label: { en: "Find the capital", es: "Busca la capital" } },
  { id: "country", label: { en: "Name the country", es: "Nombra el país" } },
];

const UI = {
  play: { en: "Play", es: "Jugar" },
  progress: { en: "Progress", es: "Progreso" },
  scores: { en: "High scores", es: "Puntuaciones" },
  title: {
    en: "Learn every flag, capital and outline.",
    es: "Aprende cada bandera, capital y silueta.",
  },
  sub: {
    en: (n) => `${n} countries. Questions come back to the ones you keep getting wrong.`,
    es: (n) => `${n} países. Las preguntas vuelven a lo que se te resiste.`,
  },
  detected: { en: (r) => `Detected region: ${r}.`, es: (r) => `Región detectada: ${r}.` },
  playerName: { en: "Player name", es: "Nombre del jugador" },
  playerHint: { en: "who is drilling", es: "quién practica" },
  region: { en: "Region", es: "Región" },
  allCountries: { en: "All countries", es: "Todos los países" },
  nearYou: { en: (r) => `${r} · near you`, es: (r) => `${r} · cerca de ti` },
  questionType: { en: "Question type", es: "Tipo de pregunta" },
  mixed: { en: "Mixed", es: "Mezcla" },
  scoring: { en: "Scoring", es: "Puntuación" },
  untimed: { en: "Untimed", es: "Sin tiempo" },
  timedLabel: { en: `Timed · ${TIME_LIMIT}s`, es: `Con tiempo · ${TIME_LIMIT}s` },
  inRegion: { en: (n) => `${n} in this region`, es: (n) => `${n} en esta región` },
  perRound: { en: (n) => `${n} questions per round`, es: (n) => `${n} preguntas por ronda` },
  masteredCount: { en: (n) => `${n} mastered`, es: (n) => `${n} dominados` },
  start: { en: "Start round", es: "Empezar ronda" },
  loading: { en: "Loading outlines…", es: "Cargando siluetas…" },
  loadFail: {
    en: "The map data did not load. Reload the page — if it keeps failing, open the site once with a connection so it can be stored for offline use.",
    es: "No se han cargado los datos del mapa. Recarga la página; si sigue fallando, abre el sitio una vez con conexión para guardarlo sin conexión.",
  },
  sealed: { en: "chart sealed until you answer", es: "carta sellada hasta que respondas" },
  outlineOf: { en: (c) => `Outline of ${c}`, es: (c) => `Silueta de ${c}` },
  outlineHidden: {
    en: "Country outline, hidden until you answer",
    es: "Silueta del país, oculta hasta que respondas",
  },
  noOutline: {
    en: "No outline available for this country.",
    es: "No hay silueta disponible para este país.",
  },
  whichFlag: { en: "Which flag belongs to", es: "¿Qué bandera es de" },
  whichCapital: { en: "What is the capital of", es: "¿Cuál es la capital de" },
  whichCountry: { en: "Which country has this flag", es: "¿De qué país es esta bandera" },
  capitalIs: { en: (c) => `capital ${c}`, es: (c) => `capital ${c}` },
  flagToId: { en: "Flag to identify", es: "Bandera por identificar" },
  answers: { en: "Answers", es: "Respuestas" },
  correct: { en: "Correct.", es: "¡Correcto!" },
  notQuite: { en: "Not quite.", es: "Casi." },
  timeUp: { en: "Time up.", es: "Se acabó el tiempo." },
  answerWas: { en: (c) => `The answer is ${c}.`, es: (c) => `La respuesta es ${c}.` },
  alsoKnown: { en: (a) => `also ${a}`, es: (a) => `también ${a}` },
  next: { en: "Next", es: "Siguiente" },
  seeResults: { en: "See results", es: "Ver resultados" },
  roundDone: { en: "Round complete", es: "Ronda completada" },
  ofCorrect: {
    en: (r, n) => `${r} of ${n} correct`,
    es: (r, n) => `${r} de ${n} correctas`,
  },
  bestStreak: { en: (n) => `best streak ${n}`, es: (n) => `mejor racha ${n}` },
  playAgain: { en: "Play again", es: "Jugar otra vez" },
  yourProgress: { en: "Your progress", es: "Tu progreso" },
  masteredOf: {
    en: (d, n) => `${d}/${n} mastered`,
    es: (d, n) => `${d}/${n} dominados`,
  },
  needsWork: { en: "Needs work", es: "Para repasar" },
  needsWorkEmpty: {
    en: "Play a round and the weak spots show up here.",
    es: "Juega una ronda y aquí aparecerán los puntos flojos.",
  },
  accuracyOf: {
    en: (pct, seen) => `${pct}% of ${seen}`,
    es: (pct, seen) => `${pct}% de ${seen}`,
  },
  boardNote: {
    en: "High scores · saved on this device",
    es: "Puntuaciones · guardadas en este dispositivo",
  },
  boardEmpty: {
    en: "No scores here yet. Finish a round to open it.",
    es: "Aún no hay puntuaciones. Termina una ronda para estrenarla.",
  },
  anonymous: { en: "anonymous", es: "anónimo" },
  timedTag: { en: "timed", es: "con tiempo" },
  untimedTag: { en: "untimed", es: "sin tiempo" },
  question: { en: (n, of) => `Question ${n} of ${of}`, es: (n, of) => `Pregunta ${n} de ${of}` },
  score: { en: "Score", es: "Puntos" },
  multiplier: { en: "Multiplier", es: "Multiplicador" },
  timeLeft: { en: "Time left", es: "Tiempo restante" },
  mastery: { en: (c) => `Mastery in ${c}`, es: (c) => `Dominio en ${c}` },
};

/* ---------- helpers ---------- */

const emptyStat = () => ({ seen: 0, right: 0 });

const shuffle = (list) => {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const totals = (per) => {
  const cells = Object.values(per ?? {});
  return {
    seen: cells.reduce((sum, cell) => sum + cell.seen, 0),
    right: cells.reduce((sum, cell) => sum + cell.right, 0),
  };
};

const isMastered = (per) => {
  const { seen, right } = totals(per);
  return seen >= 3 && right / seen >= 0.8;
};

/** A region worth drilling needs more countries than a round has questions. */
const MIN_REGION = 16;

const bigEnough = (sub) =>
  COUNTRIES.filter((c) => c.sub === sub).length >= MIN_REGION ? sub : null;

const detectHome = () => {
  for (const tag of navigator.languages || [navigator.language || ""]) {
    const match = /-([A-Z]{2})\b/.exec(tag || "");
    const hit = match && COUNTRIES.find((c) => c.a2 === match[1]);
    if (hit) return { sub: bigEnough(hit.sub), cont: hit.cont };
  }
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const byZone = {
    Europe: "Europe",
    Africa: "Africa",
    Asia: "Asia",
    America: "Americas",
    Australia: "Oceania",
    Pacific: "Oceania",
  }[zone.split("/")[0]];
  return byZone ? { sub: null, cont: byZone } : null;
};

/** Weighted so unseen and shaky countries come round more often. */
const pickWeighted = (pool, stats, mode, recent) => {
  // Only fall back to merely down-weighting when the region is small.
  const fresh = pool.filter((c) => !recent.includes(c.a2));
  if (fresh.length >= 4) pool = fresh;

  const weights = pool.map((c) => {
    const cell = stats?.[c.a2]?.[mode] || emptyStat();
    const accuracy = cell.seen ? cell.right / cell.seen : 0;
    let weight = cell.seen === 0 ? 3.2 : 1 + 3 * (1 - accuracy);
    if (recent.includes(c.a2)) weight *= 0.12;
    return weight;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
};

/** Decoys from the same subregion first, then continent, then anywhere. */
const buildQuestion = (pool, stats, mode, recent, lang) => {
  const target = pickWeighted(pool, stats, mode, recent);
  const labelOf = (c) => (mode === "capital" ? c.cap[lang] : c.name[lang]);
  const buckets = [
    COUNTRIES.filter((c) => c.a2 !== target.a2 && c.sub === target.sub),
    COUNTRIES.filter((c) => c.a2 !== target.a2 && c.cont === target.cont),
    COUNTRIES.filter((c) => c.a2 !== target.a2),
  ];
  const picks = [];
  const used = new Set([labelOf(target)]);
  for (const bucket of buckets) {
    for (const candidate of shuffle(bucket)) {
      if (picks.length === 3) break;
      const label = labelOf(candidate);
      if (used.has(label)) continue;
      used.add(label);
      picks.push(candidate);
    }
    if (picks.length === 3) break;
  }
  return { target, mode, options: shuffle([target, ...picks]) };
};

/* ---------- chart ---------- */

function ChartCard({ feature, world, country, revealed, mode, lang, width = 520, height = 320 }) {
  const path = useMemo(() => {
    if (!feature) return null;
    const centroid = geoCentroid(feature);
    const projection = geoAzimuthalEqualArea()
      .rotate([-centroid[0], -centroid[1]])
      .clipAngle(72);
    projection.fitExtent(
      [
        [26, 26],
        [width - 26, height - 26],
      ],
      feature,
    );
    // Stop a tiny island from being blown up to fill the frame.
    const maxScale = (height - 52) / ((2.5 * Math.PI) / 180);
    if (projection.scale() > maxScale) {
      projection.scale(maxScale);
      const [cx, cy] = projection(centroid);
      projection.translate([
        projection.translate()[0] + width / 2 - cx,
        projection.translate()[1] + height / 2 - cy,
      ]);
    }
    const gen = geoPath(projection);
    const [[x0, y0], [x1, y1]] = gen.bounds(feature);
    return { projection, gen, centroid, tiny: Math.max(x1 - x0, y1 - y0) < 22 };
  }, [feature, width, height]);

  const hidden = mode === "country" && !revealed;
  const label = hidden
    ? t(UI.outlineHidden)
    : country
      ? t(UI.outlineOf, country.name[lang])
      : "";

  return (
    <div className="chart-card">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        <rect x="0" y="0" width={width} height={height} className="ocean" />
        {path && (
          <>
            <path d={path.gen(geoGraticule10())} className="graticule" />
            <path d={path.gen({ type: "Sphere" })} className="sphere" fill="none" />
            <path
              d={path.gen({ type: "FeatureCollection", features: world })}
              className="land"
            />
            {!hidden && (
              <>
                <path d={path.gen(feature)} className="target" />
                {path.tiny && (
                  <circle
                    cx={path.projection(path.centroid)[0]}
                    cy={path.projection(path.centroid)[1]}
                    r="13"
                    className="locator"
                  />
                )}
              </>
            )}
          </>
        )}
        {hidden && (
          <g>
            <rect x="0" y="0" width={width} height={height} className="veil" />
            <text x={width / 2} y={height / 2 + 5} className="veil-label">
              {t(UI.sealed)}
            </text>
          </g>
        )}
      </svg>
      <p className="readout" aria-hidden="true">
        <span>{path && !hidden ? dms(path.centroid) : "—°—′—  —°—′—"}</span>
        <span>{country && (mode !== "country" || revealed) ? country.a2 : "··"}</span>
      </p>
    </div>
  );
}

/* ---------- radio group ---------- */

function Segmented({ value, onChange, items, label, id }) {
  const ref = useRef(null);

  const move = (event) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const index = items.findIndex((item) => item.id === value);
    const next = items[(index + step + items.length) % items.length];
    onChange(next.id);
    // keep focus on the newly selected radio
    requestAnimationFrame(() => {
      ref.current?.querySelector('[aria-checked="true"]')?.focus();
    });
  };

  return (
    <div className="field">
      <span className="label" id={`${id}-label`}>
        {label}
      </span>
      <div
        className="seg"
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        ref={ref}
        onKeyDown={move}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={value === item.id}
            tabIndex={value === item.id ? 0 : -1}
            className={value === item.id ? "on" : ""}
            onClick={() => {
              haptic.tap();
              onChange(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- app ---------- */

export default function AtlasDrill() {
  const [lang, setLangState] = useState(getLang());
  useEffect(() => onLang(setLangState), []);

  const prefs = useRef(load(K_PREFS, {})).current;

  const [shapes, setShapes] = useState(null);
  const [world, setWorld] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [screen, setScreen] = useState("home");
  const [player, setPlayer] = useState(prefs.player ?? "");
  const [scope, setScope] = useState(prefs.scope ?? "World");
  const [mode, setMode] = useState(prefs.mode ?? "mixed");
  const [timed, setTimed] = useState(prefs.timed ?? true);
  const [stats, setStats] = useState(() => load(K_STATS, {}));
  const [board, setBoard] = useState(() => load(K_BOARD, {}));
  const [boardScope, setBoardScope] = useState(prefs.scope ?? "World");
  const [home] = useState(detectHome);
  const [question, setQuestion] = useState(null);
  const [picked, setPicked] = useState(null);
  const [round, setRound] = useState(null);
  const [left, setLeft] = useState(TIME_LIMIT);

  const recent = useRef([]);
  const deadline = useRef(0);
  const locked = useRef(false);
  const heading = useRef(null);
  const nextButton = useRef(null);
  const statsRef = useRef(stats);
  statsRef.current = stats;

  /* map data — local file, so it works offline from the first visit */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(TOPO_URL);
        if (!response.ok) throw new Error(String(response.status));
        const topo = await response.json();
        if (cancelled) return;
        const map = decodeTopology(topo);
        setWorld(
          [...map.values()].map((polygons) => ({
            type: "Feature",
            geometry: { type: "MultiPolygon", coordinates: polygons },
          })),
        );
        setShapes(map);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!prefs.scope && home) setScope(home.sub ?? home.cont);
  }, [home, prefs.scope]);

  const persist = useCallback(
    (patch) => save(K_PREFS, { player, scope, mode, timed, ...patch }),
    [player, scope, mode, timed],
  );

  const pool = useMemo(() => {
    if (scope === "World") return COUNTRIES;
    const byContinent = COUNTRIES.filter((c) => c.cont === scope);
    return byContinent.length ? byContinent : COUNTRIES.filter((c) => c.sub === scope);
  }, [scope]);

  const featureFor = useCallback(
    (country) => {
      if (!shapes || !country) return null;
      const polygons = shapes.get(country.n3);
      return polygons ? toFeature(polygons, country.a2) : null;
    },
    [shapes],
  );

  const nextQuestion = useCallback(
    (state) => {
      const askMode =
        mode === "mixed" ? MODES[(state.asked + state.seed) % MODES.length].id : mode;
      const usable = pool.filter((c) => shapes?.has(c.n3));
      const built = buildQuestion(
        usable.length > 8 ? usable : pool,
        statsRef.current,
        askMode,
        recent.current,
        getLang(),
      );
      recent.current = [built.target.a2, ...recent.current].slice(0, 12);
      locked.current = false;
      setQuestion(built);
      setPicked(null);
      setLeft(TIME_LIMIT);
      deadline.current = Date.now() + TIME_LIMIT * 1000;
    },
    [mode, pool, shapes],
  );

  const startRound = () => {
    haptic.tap();
    const state = {
      asked: 0,
      right: 0,
      score: 0,
      streak: 0,
      best: 0,
      seed: Math.floor(Math.random() * MODES.length),
      log: [],
    };
    recent.current = [];
    setRound(state);
    setScreen("play");
    nextQuestion(state);
  };

  const answer = useCallback(
    (choice) => {
      // One answer per question. React may run a state updater more than
      // once, so the guard is a ref and every update below is pure.
      if (locked.current || !question) return;
      locked.current = true;

      const ok = choice != null && choice.a2 === question.target.a2;
      const remaining = timed ? Math.max(0, (deadline.current - Date.now()) / 1000) : 0;

      setPicked(choice ?? { a2: "__timeout__" });

      setRound((state) => {
        const streak = ok ? state.streak + 1 : 0;
        const multiplier = 1 + Math.min(Math.max(streak - 1, 0), 5) * 0.1;
        const base = timed ? 60 + Math.round((140 * remaining) / TIME_LIMIT) : 100;
        return {
          ...state,
          asked: state.asked + 1,
          right: state.right + (ok ? 1 : 0),
          score: state.score + (ok ? Math.round(base * multiplier) : 0),
          streak,
          best: Math.max(state.best, streak),
          log: [...state.log, { a2: question.target.a2, mode: question.mode, ok }],
        };
      });

      const per = { ...(statsRef.current[question.target.a2] || {}) };
      const cell = { ...(per[question.mode] || emptyStat()) };
      cell.seen += 1;
      cell.right += ok ? 1 : 0;
      per[question.mode] = cell;
      const nextStats = { ...statsRef.current, [question.target.a2]: per };
      statsRef.current = nextStats;
      setStats(nextStats);
      save(K_STATS, nextStats);

      if (choice == null) haptic.timeout();
      else if (ok) haptic.win();
      else haptic.miss();
    },
    [question, timed],
  );

  /* countdown driven by a deadline, so a slow frame cannot skew it */
  useEffect(() => {
    if (screen !== "play" || !timed || !question || picked) return;
    const id = setInterval(() => {
      const remaining = (deadline.current - Date.now()) / 1000;
      if (remaining <= 0) {
        clearInterval(id);
        setLeft(0);
        answer(null);
      } else {
        setLeft(remaining);
      }
    }, 100);
    return () => clearInterval(id);
  }, [screen, timed, question, picked, answer]);

  /* the game header carries the only progress readout */
  useEffect(() => {
    if (screen === "play" && round) {
      const asked = Math.min(round.asked + (picked ? 0 : 1), ROUND_LENGTH);
      setProgress({
        label: `${t(UI.question, asked, ROUND_LENGTH)} · ${round.score}`,
        value: round.asked,
        max: ROUND_LENGTH,
      });
    } else if (screen === "summary") {
      setProgress({ label: t(UI.roundDone), value: ROUND_LENGTH, max: ROUND_LENGTH });
    } else {
      setProgress({ label: t(SECTIONS[1].title) });
    }
  }, [screen, round, picked, lang]);

  /* focus the fresh content after every screen or question change */
  useEffect(() => {
    heading.current?.focus();
  }, [screen]);

  useEffect(() => {
    if (picked) nextButton.current?.focus();
  }, [picked]);

  const advance = () => {
    haptic.tap();
    if (round.asked >= ROUND_LENGTH) {
      const name = (player || "").trim() || t(UI.anonymous);
      const entry = {
        name,
        score: round.score,
        right: round.right,
        of: ROUND_LENGTH,
        mode,
        timed,
        at: Date.now(),
      };
      const nextBoard = { ...board };
      const list = [...(nextBoard[scope] || [])];
      const seat = list.findIndex((row) => row.name === name);
      if (seat === -1) list.push(entry);
      else if (list[seat].score < entry.score) list[seat] = entry;
      list.sort((a, b) => b.score - a.score);
      nextBoard[scope] = list.slice(0, 15);
      setBoard(nextBoard);
      setBoardScope(scope);
      save(K_BOARD, nextBoard);
      haptic.fanfare();
      setScreen("summary");
      return;
    }
    nextQuestion(round);
  };

  /* number keys answer, Enter/Space advances */
  useEffect(() => {
    const onKey = (event) => {
      if (screen !== "play" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
        return;
      if (picked) {
        if (event.key === "Enter" || event.key === " ") {
          if (target instanceof HTMLButtonElement) return; // let the button click
          event.preventDefault();
          advance();
        }
        return;
      }
      const n = Number.parseInt(event.key, 10);
      if (n >= 1 && n <= 4 && question) {
        event.preventDefault();
        answer(question.options[n - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const mastered = useMemo(
    () => Object.values(stats).filter(isMastered).length,
    [stats],
  );

  const weakest = useMemo(() => {
    const rows = [];
    for (const country of COUNTRIES) {
      const per = stats[country.a2];
      if (!per) continue;
      const { seen, right } = totals(per);
      if (seen >= 2 && right / seen < 0.75)
        rows.push({ country, seen, accuracy: right / seen });
    }
    return rows.sort((a, b) => a.accuracy - b.accuracy).slice(0, 8);
  }, [stats]);

  const regionLabel = (id) =>
    id === "World"
      ? t(UI.allCountries)
      : lang === "es"
        ? (CONTINENT_ES[id] ?? id)
        : id;

  const scopeItems = [
    { id: "World", label: t(UI.allCountries) },
    ...CONTINENTS.map((c) => ({ id: c, label: regionLabel(c) })),
    ...(home?.sub && !CONTINENTS.includes(home.sub)
      ? [{ id: home.sub, label: t(UI.nearYou, home.sub) }]
      : []),
  ];

  const revealed = !!picked;
  const feature = question ? featureFor(question.target) : null;
  const target = question?.target;
  const timedOut = picked?.a2 === "__timeout__";
  const wasRight = revealed && !timedOut && picked.a2 === target.a2;

  return (
    <main id="main" className="wrap wrap--narrow" tabIndex={-1}>
      {screen !== "play" && screen !== "summary" && (
        <nav className="tabs" aria-label={lang === "es" ? "Vistas" : "Views"}>
          {[
            ["home", UI.play],
            ["progress", UI.progress],
            ["board", UI.scores],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={screen === id ? "on" : ""}
              aria-current={screen === id ? "page" : undefined}
              onClick={() => {
                haptic.tap();
                setScreen(id);
              }}
            >
              {t(label)}
            </button>
          ))}
        </nav>
      )}

      {screen === "home" && (
        <div className="stack fade">
          <div>
            <h1 ref={heading} tabIndex={-1} className="atlas-title">
              {t(UI.title)}
            </h1>
            <p className="story">
              {t(UI.sub, COUNTRIES.length)}{" "}
              {home && (
                <span className="hint">
                  {t(UI.detected, regionLabel(home.sub || home.cont))}
                </span>
              )}
            </p>
          </div>

          <div className="field">
            <label className="label" htmlFor="player">
              {t(UI.playerName)}
            </label>
            <input
              id="player"
              className="input"
              value={player}
              maxLength={18}
              autoComplete="nickname"
              enterKeyHint="done"
              placeholder={t(UI.playerHint)}
              onChange={(event) => setPlayer(event.target.value)}
              onBlur={() => persist({ player })}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          </div>

          <Segmented
            id="region"
            label={t(UI.region)}
            value={scope}
            items={scopeItems}
            onChange={(value) => {
              setScope(value);
              persist({ scope: value });
            }}
          />
          <Segmented
            id="type"
            label={t(UI.questionType)}
            value={mode}
            items={[
              { id: "mixed", label: t(UI.mixed) },
              ...MODES.map((m) => ({ id: m.id, label: t(m.label) })),
            ]}
            onChange={(value) => {
              setMode(value);
              persist({ mode: value });
            }}
          />
          <Segmented
            id="scoring"
            label={t(UI.scoring)}
            value={timed ? "timed" : "relaxed"}
            items={[
              { id: "relaxed", label: t(UI.untimed) },
              { id: "timed", label: t(UI.timedLabel) },
            ]}
            onChange={(value) => {
              setTimed(value === "timed");
              persist({ timed: value === "timed" });
            }}
          />

          <p className="meta mono">
            <span>{t(UI.inRegion, pool.length)}</span>
            <span>{t(UI.perRound, ROUND_LENGTH)}</span>
            <span>{t(UI.masteredCount, mastered)}</span>
          </p>

          {loadState === "failed" ? (
            <p className="note note--miss" role="alert">
              {t(UI.loadFail)}
            </p>
          ) : (
            <p aria-live="polite">
              <button
                className="btn"
                type="button"
                disabled={loadState !== "ready"}
                onClick={startRound}
              >
                {loadState === "ready" ? t(UI.start) : t(UI.loading)}
              </button>
            </p>
          )}
        </div>
      )}

      {screen === "play" && question && round && (
        <div className="stack fade">
          <h1 ref={heading} tabIndex={-1} className="sr-only">
            {t(UI.question, Math.min(round.asked + 1, ROUND_LENGTH), ROUND_LENGTH)}
          </h1>

          {timed && (
            <div
              className={`meter timer${left <= 5 ? " low" : ""}`}
              role="progressbar"
              aria-label={t(UI.timeLeft)}
              aria-valuemin={0}
              aria-valuemax={TIME_LIMIT}
              aria-valuenow={Math.ceil(left)}
              aria-valuetext={`${Math.ceil(left)}s`}
            >
              <i style={{ width: `${(left / TIME_LIMIT) * 100}%` }} />
            </div>
          )}

          <ChartCard
            feature={feature}
            world={world}
            country={target}
            revealed={revealed}
            mode={question.mode}
            lang={lang}
          />

          {!feature && <p className="note">{t(UI.noOutline)}</p>}

          <div className="ask">
            {question.mode === "flag" && (
              <>
                <span className="eyebrow">{t(UI.whichFlag)}</span>
                <strong id="ask">{target.name[lang]}</strong>
                <span className="mono dim">{t(UI.capitalIs, target.cap[lang])}</span>
              </>
            )}
            {question.mode === "capital" && (
              <>
                <span className="eyebrow">{t(UI.whichCapital)}</span>
                <strong id="ask">{target.name[lang]}</strong>
                <span className="flag flag-sm" aria-hidden="true">
                  {flagEmoji(target.a2)}
                </span>
              </>
            )}
            {question.mode === "country" && (
              <>
                <span className="eyebrow">{t(UI.whichCountry)}</span>
                <span
                  className="flag flag-xl"
                  role="img"
                  aria-label={`${t(UI.flagToId)}: ${target.name[lang]}`}
                  id="ask"
                >
                  {flagEmoji(target.a2)}
                </span>
              </>
            )}
          </div>

          <div
            className={`opts${question.mode === "flag" ? " opts--flags" : ""}`}
            role="group"
            aria-labelledby="ask"
          >
            {question.options.map((option, index) => {
              const isTarget = option.a2 === target.a2;
              const isPick = revealed && picked.a2 === option.a2;
              const state = !revealed
                ? ""
                : isTarget
                  ? " right"
                  : isPick
                    ? " wrong"
                    : " faded";
              const text =
                question.mode === "capital" ? option.cap[lang] : option.name[lang];
              return (
                <button
                  key={option.a2}
                  type="button"
                  className={`opt${state}`}
                  onClick={() => answer(option)}
                  disabled={revealed}
                  aria-label={question.mode === "flag" ? option.name[lang] : undefined}
                >
                  <span className="key" aria-hidden="true">
                    {index + 1}
                  </span>
                  {question.mode === "flag" ? (
                    <span className="flag flag-lg" aria-hidden="true">
                      {flagEmoji(option.a2)}
                    </span>
                  ) : (
                    <span className="opt-text">{text}</span>
                  )}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="reveal">
              <p
                className={`note ${wasRight ? "note--win" : "note--miss"} pop`}
                role="status"
              >
                <b>{timedOut ? t(UI.timeUp) : wasRight ? t(UI.correct) : t(UI.notQuite)}</b>{" "}
                {wasRight ? "" : t(UI.answerWas, target.name[lang])}
              </p>
              <div className="reveal-body">
                <span className="flag flag-md" aria-hidden="true">
                  {flagEmoji(target.a2)}
                </span>
                <span>
                  <strong>{target.name[lang]}</strong>
                  <span className="mono dim">
                    {target.cap[lang]}
                    {target.alt ? ` · ${t(UI.alsoKnown, target.alt[lang])}` : ""}
                  </span>
                  <span className="mono dim">{target.subName[lang]}</span>
                </span>
              </div>
              <button className="btn" type="button" onClick={advance} ref={nextButton}>
                {round.asked >= ROUND_LENGTH ? t(UI.seeResults) : t(UI.next)}
              </button>
            </div>
          )}
        </div>
      )}

      {screen === "summary" && round && (
        <div className="stack fade">
          <span className="eyebrow">{t(UI.roundDone)}</span>
          <h1 ref={heading} tabIndex={-1} className="final">
            <span className="final-score">{round.score}</span>
            <span className="mono dim">
              {t(UI.ofCorrect, round.right, ROUND_LENGTH)} · {t(UI.bestStreak, round.best)} ·{" "}
              {regionLabel(scope)}
            </span>
          </h1>
          <ul className="log">
            {round.log.map((entry, index) => {
              const country = BY_A2.get(entry.a2);
              return (
                <li key={index} className={entry.ok ? "" : "miss"}>
                  <span className="flag flag-xs" aria-hidden="true">
                    {flagEmoji(entry.a2)}
                  </span>
                  <span>{country.name[lang]}</span>
                  <span className="mono dim">{country.cap[lang]}</span>
                  <span className="sr-only">
                    {entry.ok ? t(UI.correct) : t(UI.notQuite)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="row row--split">
            <button className="btn" type="button" onClick={startRound}>
              {t(UI.playAgain)}
            </button>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => setScreen("board")}
            >
              {t(UI.scores)}
            </button>
          </div>
        </div>
      )}

      {screen === "progress" && (
        <div className="stack fade">
          <h1 ref={heading} tabIndex={-1} className="eyebrow h-plain">
            {t(UI.yourProgress)}
          </h1>
          <div className="cards">
            {CONTINENTS.map((continent) => {
              const list = COUNTRIES.filter((c) => c.cont === continent);
              const done = list.filter((c) => isMastered(stats[c.a2])).length;
              const pct = Math.round((done / list.length) * 100);
              return (
                <div className="progress-card" key={continent}>
                  <span className="card-name">{regionLabel(continent)}</span>
                  <div
                    className="meter"
                    role="progressbar"
                    aria-label={t(UI.mastery, regionLabel(continent))}
                    aria-valuemin={0}
                    aria-valuemax={list.length}
                    aria-valuenow={done}
                    aria-valuetext={t(UI.masteredOf, done, list.length)}
                  >
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  <span className="mono dim">{t(UI.masteredOf, done, list.length)}</span>
                </div>
              );
            })}
          </div>
          <h2 className="eyebrow">{t(UI.needsWork)}</h2>
          {weakest.length === 0 ? (
            <p className="note">{t(UI.needsWorkEmpty)}</p>
          ) : (
            <ul className="log">
              {weakest.map(({ country, seen, accuracy }) => (
                <li key={country.a2}>
                  <span className="flag flag-xs" aria-hidden="true">
                    {flagEmoji(country.a2)}
                  </span>
                  <span>{country.name[lang]}</span>
                  <span className="mono dim">
                    {t(UI.accuracyOf, Math.round(accuracy * 100), seen)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {screen === "board" && (
        <div className="stack fade">
          <h1 ref={heading} tabIndex={-1} className="eyebrow h-plain">
            {t(UI.boardNote)}
          </h1>
          <Segmented
            id="board-scope"
            label={t(UI.region)}
            value={boardScope}
            items={[
              { id: "World", label: t(UI.allCountries) },
              ...CONTINENTS.map((c) => ({ id: c, label: regionLabel(c) })),
              ...(home?.sub && !CONTINENTS.includes(home.sub)
                ? [{ id: home.sub, label: home.sub }]
                : []),
            ]}
            onChange={setBoardScope}
          />
          {(board[boardScope] || []).length === 0 ? (
            <p className="note">{t(UI.boardEmpty)}</p>
          ) : (
            <ol className="board">
              {(board[boardScope] || []).map((entry, index) => (
                <li key={entry.name + index}>
                  <span className="mono rank">{String(index + 1).padStart(2, "0")}</span>
                  <span className="board-name">{entry.name}</span>
                  <span className="mono dim">
                    {entry.right}/{entry.of} · {entry.timed ? t(UI.timedTag) : t(UI.untimedTag)}
                  </span>
                  <span className="mono score">{entry.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </main>
  );
}
