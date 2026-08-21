// ─────────────────────────────────────────────────────────
// 参加イベントの整理待ち一覧（業務アプリの画面。宣伝ページではない）
//
// 何をする画面か:
//   参加したウェビナー・セミナー録画・YouTube・音声のうち、
//   まだObsidianに書き写していないものを、古い順に片づける。
//
// 画面の骨格（この形は崩さない）:
//   左メニュー（.side）＋ 上部バー（.topbar）＋ 本体（.content）
//   一覧 / 新規登録 / 設定 の3画面を view で切り替える
// ─────────────────────────────────────────────────────────
"use client";

import { useEffect, useMemo, useState } from "react";

// ═══════════════════════════════════════════════════════════
//  画面の型 ── docs/03_spec.md「0. 画面の型」のとおりに設定
//  ⚠ 新しいCSSは書かない。用意された選択肢から選ぶこと。
// ═══════════════════════════════════════════════════════════

/** 色み。使う人が投資・事業開発まわり（BtoB）なので indigo */
const TONE = "indigo";

/** 密度。月8〜12本＝1日1本以下だが、1本60分と重いので roomy */
const DENSITY = "roomy";

/** 画面の型。「見返せないまま溜まっていく」＝古い順に片づける queue */
const LAYOUT: "queue" | "stage" | "due" = "queue";

/** 数え方。セミナー・録画・動画は「本」で数える */
const UNIT = "本";

/** 区分の選択肢。何で参加した／何に残っているか */
const CATEGORIES = ["ウェビナー", "セミナー録画", "YouTube", "音声"];

/** 何日置いたら「放置」と見なすか。月8〜12本のペースなので2週間 */
const WAIT_LIMIT = 14;

// ═══════════════════════════════════════════════════════════

/** 1{UNIT}のデータ。項目は5つまで */
type Record = {
  id: string;
  title: string;     // イベント名
  category: string;  // 種別（ウェビナー / セミナー録画 / YouTube / 音声）
  note: string;      // メモ（感じたこと・誰に繋ぐか）
  date: string;      // YYYY-MM-DD（参加日）
  done: boolean;     // Obsidianに入れたか
};

type View = "list" | "new" | "settings";
type Filter = "open" | "done" | "all";

const KEY = "event-inbox-data";
const NAME_KEY = "event-inbox-appname";

/** 画面じゅうの言葉。ここを直せば文言が揃って変わる */
const TEXT = {
  sub: "まだObsidianに入れていないものが、古い順に並びます",
  open: "未整理",
  done: "Obsidian済",
  toTo: "Obsidianに入れた",
  toBack: "未整理に戻す",
  dateLabel: "参加日",
  catLabel: "種別",
  stat2: `${WAIT_LIMIT}日以上 放置`,
  headOpen: "未整理（古い順）",
};

/** n日前の日付 */
const ago = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const today = () => ago(0);

/** 今日との差。0=今日、-3=3日過ぎている */
const diff = (d: string) =>
  Math.round(
    (new Date(d + "T00:00:00").getTime() - new Date(today() + "T00:00:00").getTime()) / 86400000
  );

/** 何日ほったらかしているか */
const waiting = (d: string) => Math.max(0, -diff(d));

/**
 * 見本データ。開いてすぐ触って試せるように入れてある。
 * ⚠ 実在の人名・会社名・連絡先は使わない
 */
const SAMPLE: Record[] = [
  { id: "s01", title: "SaaSの価格設計ウェビナー",     category: "ウェビナー",   note: "値上げの伝え方。伴走先の資料に入れたい",   date: ago(0),  done: false },
  { id: "s02", title: "資本政策の基礎（第2回）",       category: "セミナー録画", note: "転換社債のところだけ見返す",             date: ago(1),  done: false },
  { id: "s03", title: "生成AIを業務に入れる実例集",    category: "YouTube",      note: "事例3つ。手順の図を書き写したい",         date: ago(2),  done: false },
  { id: "s04", title: "事業計画の作り方 実践編",       category: "ウェビナー",   note: "売上の積み上げ方が自分の型と違う",        date: ago(3),  done: false },
  { id: "s05", title: "海外VCの投資基準を聞く回",      category: "音声",         note: "録音のみ40分。要点だけでよい",           date: ago(5),  done: false },
  { id: "s06", title: "BtoB営業の立ち上げ方",          category: "セミナー録画", note: "初期の顧客リストの作り方。まだ未着手",     date: ago(6),  done: false },
  { id: "s07", title: "採用の初期設計ミートアップ",    category: "ウェビナー",   note: "1人目の採用の話。伴走先に共有したい",     date: ago(8),  done: false },
  { id: "s08", title: "プロダクト計測の入門",          category: "YouTube",      note: "指標の決め方。ダッシュボードの例が良い",   date: ago(11), done: false },
  { id: "s09", title: "資金調達のタイミング討論",      category: "音声",         note: "冒頭20分だけでも先に入れる",             date: ago(15), done: false },
  { id: "s10", title: "事業承継とM&Aの実務",           category: "セミナー録画", note: "要点を転記済み",                        date: ago(12), done: true },
  { id: "s11", title: "カスタマーサクセスの設計",      category: "ウェビナー",   note: "章立てだけ写した。あとで追記する",        date: ago(14), done: true },
  { id: "s12", title: "決算書の読み方 速習",           category: "YouTube",      note: "既存のノートに追記済み",                 date: ago(17), done: true },
  { id: "s13", title: "スタートアップ法務の勘所",      category: "音声",         note: "契約チェックの観点を転記",               date: ago(19), done: true },
  { id: "s14", title: "新規事業の撤退基準",            category: "ウェビナー",   note: "撤退ラインの3条件をメモ済み",            date: ago(21), done: true },
];

/** 行の右に出す小さなバッジ。放置日数を出す */
function rowBadge(r: Record): { text: string; kind: "warn" | "danger" } | null {
  if (r.done) return null;
  const w = waiting(r.date);
  return w >= WAIT_LIMIT ? { text: `${w}日`, kind: "warn" } : null;
}

export default function Home() {
  const [items, setItems] = useState<Record[]>([]);
  const [appName, setAppName] = useState("イベント整理待ち");
  const [loaded, setLoaded] = useState(false);

  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<Filter>("open");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Record | null>(null);

  const [form, setForm] = useState({ title: "", category: CATEGORIES[0], note: "", date: today() });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setItems(raw ? (JSON.parse(raw) as Record[]) : SAMPLE);
      const n = localStorage.getItem(NAME_KEY);
      if (n) setAppName(n);
    } catch {
      setItems(SAMPLE);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(KEY, JSON.stringify(items));
    localStorage.setItem(NAME_KEY, appName);
  }, [items, appName, loaded]);

  // 見本データのまま触っていない状態か（1本でも足す・消すと false になる）
  const isSample = items.length === SAMPLE.length && items.every((i) => i.id.startsWith("s"));

  const counts = useMemo(
    () => ({
      open: items.filter((i) => !i.done).length,
      done: items.filter((i) => i.done).length,
      all: items.length,
    }),
    [items]
  );

  /** 2週間以上ほったらかしている本数 */
  const attention = useMemo(
    () => items.filter((i) => !i.done && waiting(i.date) >= WAIT_LIMIT).length,
    [items]
  );

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return items
      .filter((i) => (filter === "all" ? true : filter === "open" ? !i.done : i.done))
      .filter((i) => !k || (i.title + i.note + i.category).toLowerCase().includes(k))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [items, filter, q]);

  const headLabel = filter === "open" ? TEXT.headOpen : filter === "done" ? TEXT.done : "すべて";

  function resetForm() {
    setForm({ title: "", category: CATEGORIES[0], note: "", date: today() });
    setEditing(null);
  }

  function save() {
    const title = form.title.trim();
    if (!title) return;
    if (editing) {
      setItems(items.map((i) => (i.id === editing.id ? { ...i, ...form, title } : i)));
    } else {
      setItems([...items, { id: String(Date.now()), ...form, title, done: false }]);
    }
    resetForm();
    setView("list");
  }

  function startEdit(r: Record) {
    setEditing(r);
    setForm({ title: r.title, category: r.category, note: r.note, date: r.date });
    setView("new");
  }

  const toggle = (id: string) => setItems(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const remove = (id: string) => setItems(items.filter((i) => i.id !== id));

  const NAV: { k: View; label: string; count?: number }[] = [
    { k: "list", label: "一覧", count: counts.open },
    { k: "new", label: "新規登録" },
    { k: "settings", label: "設定" },
  ];

  const titles: { [K in View]: [string, string] } = {
    list: ["一覧", TEXT.sub],
    new: [editing ? "編集" : "新規登録", "入力して保存すると、一覧に追加されます"],
    settings: ["設定", "表示名の変更と、データの初期化"],
  };

  return (
    <div className="shell" data-tone={TONE} data-density={DENSITY}>
      {/* ───────── 左メニュー ───────── */}
      <nav className="side">
        <div className="side-brand">
          <div className="n">{appName}</div>
          <div className="s">この端末に保存</div>
        </div>
        <div className="side-label">メニュー</div>
        <div className="side-nav">
          {NAV.map((n) => (
            <button
              key={n.k}
              className="side-item"
              aria-current={view === n.k ? "page" : undefined}
              onClick={() => { if (n.k !== "new") resetForm(); setView(n.k); }}
            >
              {n.label}
              {typeof n.count === "number" && <span className="c">{n.count}</span>}
            </button>
          ))}
        </div>
        <div className="side-foot">Obsidianに書き写したら「{TEXT.toTo}」を押す</div>
      </nav>

      {/* ───────── 本体 ───────── */}
      <div className="main">
        <header className="topbar">
          <span className="t">{titles[view][0]}</span>
          <span className="d">{titles[view][1]}</span>
          {view === "list" && (
            <span className="right">
              <button className="btn" onClick={() => { resetForm(); setView("new"); }}>新規登録</button>
            </span>
          )}
        </header>

        <div className="content">
          {/* ── 一覧 ── */}
          {view === "list" && (
            <>
              {isSample && (
                <div className="notice">
                  表示中のデータは<b>見本</b>です。そのまま触って試せます。
                  消したいときは、左メニューの<b>設定</b>から。
                </div>
              )}

              <div className="stats">
                <div className="stat"><div className="n accent">{counts.open}</div><div className="l">{TEXT.open}</div></div>
                <div className="stat"><div className="n">{attention}</div><div className="l">{TEXT.stat2}</div></div>
                <div className="stat"><div className="n">{counts.all}</div><div className="l">全{UNIT}</div></div>
              </div>

              <div className="filters">
                <div className="search">
                  <input className="field" value={q} onChange={(e) => setQ(e.target.value)}
                    placeholder="タイトル・メモで検索" />
                </div>
                <div className="seg">
                  {(["open", "done", "all"] as Filter[]).map((f) => (
                    <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                      {f === "open" ? `${TEXT.open} ${counts.open}`
                        : f === "done" ? `${TEXT.done} ${counts.done}`
                        : `全部 ${counts.all}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="list">
                <div className="list-head">
                  {headLabel}
                  <span className="count">{shown.length} {UNIT}</span>
                </div>

                {shown.length === 0 ? (
                  <div className="empty">
                    <div className="t">
                      {q ? "見つかりませんでした"
                        : filter === "open" ? `${TEXT.open}はありません`
                        : "ここに表示するものがありません"}
                    </div>
                    <div className="d">
                      {q ? "検索の言葉を変えてみてください。"
                        : "参加したウェビナーや録画は、右上の「新規登録」から1本ずつ足せます。"}
                    </div>
                  </div>
                ) : (
                  shown.map((r) => {
                    const b = rowBadge(r);
                    return (
                      <div className="row" key={r.id}>
                        <div className="row-main">
                          <div className="row-title">{r.title}</div>
                          {r.note && <div className="row-sub">{r.note}</div>}
                        </div>
                        <div className="row-meta">
                          {b && <span className={`badge badge-${b.kind}`}>{b.text}</span>}
                          <span className="badge">{r.category}</span>
                          <span className="row-time">{r.date.slice(5).replace("-", "/")}</span>
                          <button className="btn-ghost" onClick={() => startEdit(r)}>編集</button>
                          <button className="btn-ghost" onClick={() => toggle(r.id)}>
                            {r.done ? TEXT.toBack : TEXT.toTo}
                          </button>
                          <button className="btn-ghost danger-btn" onClick={() => remove(r.id)}>削除</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <p className="note">データはこの端末のブラウザにだけ保存されます。外部には送信されません。</p>
            </>
          )}

          {/* ── 新規登録・編集 ── */}
          {view === "new" && (
            <div className="panel">
              <div className="form-row">
                <label className="label" htmlFor="f-title">イベント名<span className="req">必須</span></label>
                <input id="f-title" className="field" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); }}
                  placeholder="例：SaaSの価格設計ウェビナー" />
                <span className="hint">あとで見て、何の回だったか分かる書き方にします</span>
              </div>

              <div className="form-row">
                <div className="inline">
                  <div>
                    <label className="label" htmlFor="f-cat">{TEXT.catLabel}</label>
                    <select id="f-cat" className="select" value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="f-date">{TEXT.dateLabel}</label>
                    <input id="f-date" className="field" type="date" value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <label className="label" htmlFor="f-note">メモ</label>
                <textarea id="f-note" className="field" value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="感じたこと・誰に共有したいか・見返したい箇所" />
                <span className="hint">ここが一番あとで効きます。1行でいいので、その場で書いておきます</span>
              </div>

              <div className="form-actions">
                <button className="btn" onClick={save} disabled={!form.title.trim()}>
                  {editing ? "保存する" : "一覧に追加"}
                </button>
                <button className="btn-ghost" onClick={() => { resetForm(); setView("list"); }}>やめる</button>
                <span className="spacer" />
                {editing && (
                  <button className="btn-ghost danger-btn"
                    onClick={() => { remove(editing.id); resetForm(); setView("list"); }}>
                    この1{UNIT}を削除
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── 設定 ── */}
          {view === "settings" && (
            <div className="panel">
              <div className="form-row">
                <label className="label" htmlFor="f-app">画面の表示名</label>
                <input id="f-app" className="field" value={appName}
                  onChange={(e) => setAppName(e.target.value)} />
                <span className="hint">左上に表示されます。変えるとすぐ反映されます</span>
              </div>

              <div className="form-row">
                <label className="label">データ</label>
                <div className="inline">
                  <button className="btn-ghost" onClick={() => setItems(SAMPLE)}>見本データを入れ直す</button>
                  <button className="btn-ghost danger-btn"
                    onClick={() => { if (confirm("全部消します。よろしいですか？")) setItems([]); }}>
                    全部消す
                  </button>
                </div>
                <span className="hint">
                  現在 {counts.all} {UNIT}（{TEXT.open} {counts.open} / {TEXT.done} {counts.done}）
                </span>
              </div>

              <p className="note">
                データはこの端末のブラウザにだけ保存されます。
                別の端末や他の人とは共有されません（共有は第3回で扱います）。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
