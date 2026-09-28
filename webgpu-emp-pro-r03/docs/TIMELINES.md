# Actor-time と5枝のタイムライン

正本の可視タイムライン定数は src/events.js のTIMELINES、離散化は src/information-state.js、権威終端の計算はtiming()/src/sampler.jsです。生成済み design/timelines.json はその機械可読書出しです。全時刻はホストの同じactor clockへ属します。

| 枝 | 未解決の状態経路 | 通常終端 / 権威早期解決 |
|---|---|---|
| charge | 0–260捕獲、260–960噛合い、960–1200ラッチ、1200以降ready-held | 解決/権威期限で240ms撤去。寿命を1200msと誤らない。 |
| normal | 0–90source split、0–180有限転送、180–330target terminal、330–520deenergize | 520msで消去。早期解決はその時点の状態で止め、最大160ms、元寿命を越えない。 |
| resonance | 0–220二入力、180–580共有路形成、580–850芯分離、850–1400個別退役、1400–1600残部消去 | 1600ms。早期解決は最大230ms、元寿命を越えない。 |
| cancellation | 0–300対向侵入、300–710噛合い、710–1340順次消費、1340–1600空の境界へ | 1600ms。早期解決は最大230ms、元寿命を越えない。 |
| suppression | 0–240target latch、以降storage-held | deadlineはホスト必須入力。標準7秒を描画側で推測しない。延長は履歴更新。終了後280msで消去。 |

stateAgeMsとageMsを分けています。ageMsは世界時刻の経過、stateAgeMsは解決後に到達済み形態を固定する時刻。terminalQが既存構造を消すためだけに進みます。既に解決済みの場があとから新たな主作用を発生させません。

B設計上のDuration=10秒は正準のallデモ観測窓です。ゲームAPI全体を10秒で止める意味ではありません。他の短いシナリオは部分状態を調べる独立preview観測窓であり、第二のworld時計や権威期限を定義しません。allでも命中判定や枝生成をVFXが行うのではなく、preview/scenarios.jsの合成authorityがそれぞれのイベントを供給します。

ループ再開始時のみpreviewのepochをresetします。通常ゲーム実行では権威状態を無断でresetしないでください。共鳴/相殺によって通常放出・lockを取り消すか、3発以上からどのpairを採用するかは未提示のサーバー規則であり、この資産が決めません。

SFXのbody/tail/保持区間はaudio/metadata.json。PCM参照音の有限尺は長いholdを試聴用に終えたもので、charge/lockの権威寿命を短縮しません。実行時は同じvoiceで必要なholdを維持します。
