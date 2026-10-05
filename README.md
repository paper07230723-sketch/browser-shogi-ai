# Browser Shogi AI

iPhone Safariからアクセスできる、やねうら王 NNUE K-P 搭載のブラウザ将棋AIです。

## 機能
- 先手 / 後手
- 初段 / 中間 / できるだけ強く
- 0.25～3秒
- 評価値・読み筋
- 指定なし / 鬼殺し / 嬉野流 / 村田システム
- 待った・投了
- JSON棋譜保存・読み込み、KIF読み込み
- スマホUI
- YaneuraOu K-P WebAssembly

## GitHub Pages
Settings > Pages > Source を GitHub Actions にしてください。
mainへpushするとActionsがbuildしてPagesへ公開します。

GitHub PagesではCOOP/COEPヘッダーを直接設定できないため、coi-serviceworkerを同梱してSharedArrayBufferを有効化します。YaneuraOu K-PのWeb版はSharedArrayBufferとCOOP/COEPを要求します。

## ライセンス
このアプリのUIコードは自作ですが、YaneuraOu K-PはGPL-3.0、tsshogiはMIT、coi-serviceworkerはMITです。各ライセンス条件を維持してください。
