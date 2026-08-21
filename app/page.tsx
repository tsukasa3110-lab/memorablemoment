// ─────────────────────────────────────────────────────────
// トップページ（app/page.tsx）
//   見出し1つ ／ 説明3行 ／ CTAボタン1つ の最小構成。
//   色・文字サイズ・余白は app/globals.css の変数だけを使う。
//   直値（#1f5fd6 や 13px）は書かない。
// ─────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="app">
      <header className="app-bar">
        <span className="app-name">はじめてのツール</span>
      </header>

      <main className="app-body">
        <h1
          style={{
            fontSize: "var(--t-2xl)",
            lineHeight: 1.4,
            letterSpacing: "-.02em",
            margin: "0 0 var(--s5)",
          }}
        >
          自分の仕事のための、小さな道具をつくる
        </h1>

        <p
          style={{
            color: "var(--text-sub)",
            maxWidth: "34em",
            margin: "0 0 var(--s8)",
          }}
        >
          Claude Code で作っている、自分ひとりが毎日使うための画面です。
          <br />
          今はトップページだけの状態で、中の機能はこれから足していきます。
          <br />
          作るものが決まったら、ここから開いて使いはじめられるようにします。
        </p>

        <button className="btn" type="button">
          ツールを開く
        </button>
      </main>
    </div>
  );
}
