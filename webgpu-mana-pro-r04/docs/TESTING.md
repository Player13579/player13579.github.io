# 再現・動作確認 / r0.4

## 1. 配布の検査（内容を変更しない）

Node.js 20以上で `npm run verify`、続けて `npm run check`。後者はNodeテスト、原本の局所lint、B設計のローカル照合、manifest照合です。ログ再記録を指定しない通常コマンドは配布内容を書き換えません。

`npm start` でloopbackサーバーを起動します。`http://localhost:4184` をブラウザーで開き、原本pipelineの診断表示とエラー欄を確認します。WGSLを書き換えるadapterを挟まないこと。失敗時は原本SHA・コンパイラーメッセージ・ブラウザー／adapterを記録します。

## 2. 原本WebGPUの観察

最初は全層・bloom有効で確認します。H64は1倍tile、拡大は2／3倍tileです。暗・明とも同じshaderです。ブラウザーズームは100%を推奨する検査仮定で、全表示環境を保証するものではありません。

自然再生で少なくとも発生、最初の通過、二つ目の通過、充填完了、1260–1500msの低明度余韻、消去後を見ます。単発のスクラブ目安は0／100／300／450／650／850／1009／1200／1380／1460／1500／1700 actor-ms。単一スクラブ時刻を全寿命観察と記録しないでください。

「供給だけ」「境界だけ」「身体内だけ」は構造分離の検査です。正規表現の品質は最後に全層へ戻して判断します。bloomを切ったときも主形が残ること、bloom有効時には源周辺だけが柔らかく統合されることを比較します。

## 3. ケース行列

| 条件 | 内容 |
|---|---|
| 尺 | 1500、900 actor-ms |
| 原因 | 単発、0・160・320 actor-msの3原因 |
| actor rate | 1、2。途中pause／復帰も検査 |
| 表示 | H64、H128、H192 |
| 背景 | 暗／明。同じsource設定 |
| 遮蔽 | 前景なし／あり |
| 終了 | 自然期限、死亡、退室、ベント、透明化、セッション変更 |

2倍の単発は750 wall-ms、3原因の最終終了は910 wall-ms相当。1倍3原因の最終終了は1820 wall-msです。実表示cadenceやデバイス遅延によって端末の観測時刻は量子化されます。固定60fpsで実行したと仮定しません。

消去ボタンを押すと次の自動ループを止め、Eを取消します。「身体のみ復帰」は新規gainを起こしません。「新しい原因で再生」は別IDで再開します。同一原因再通知ボタンでは重複カウントのみ増え、音数は増えないことを確認します。

## 4. 音

ユーザー操作で「音を有効化」。既存原因の再起音を期待せず、次の新規原因を聴きます。最初は低音量を使用してください。起音、境界流量中の変化、倍音と左右幅の収束、終端を聴きます。2倍はピッチも高くなる設計です。

画面の「音要求」はledgerの要求、dispatchはadapterへの送信、Workletの「開始」はprocessor実行数です。これらと人間の実聴は別の記録です。単発に1、3原因に3を確認し、6画面で6倍にならないことを調べます。音を解錠しなかったケースを無音の品質合格とは記録しません。

## 5. ブラウザー自動採取（任意のQA依存）

PythonのplaywrightとローカルChromiumが利用できる環境では `python tools/browser-check.py --headful --browser <実行ファイル> --out <配布外のJSON>` を使用できます。サーバーは自動起動します。すでに起動している場合は `--external-server`。`--audio-telemetry` は音量0でprocessor開始数を採取するもので、実聴ではありません。

このharnessはWGSLを書き換えず、managed policyも変更しません。ナビゲーション拒否、API不在、コンパイル失敗、software adapterなどを区別して記録します。実行しても視覚品質・実聴・全寿命の人間レビューを自動passにしません。通常の実機ブラウザーとheadlessのadapter選択が異なる可能性も残します。

本提出環境の試行は `qa/browser-run.json`。localhostナビゲーションがpolicyに拒否され、WGSLコンパイル前に止まっています。

## 6. CPU／PCM資料の再生成

`npm run samples` と `npm run audio` は同梱samplerとVoiceEngineからJSON／WAVを再生成します。`python tools/cpu-reference.py` はNumPy／PillowでCPU stillを出します。これらの依存はライブプレビューには不要です。CPU filter／AAはGPUと同一実行ではありません。

再生成のbyte一致検査は `node tools/check-regeneration.mjs --record`。静的ログを更新するには `node tools/static-check.mjs --record`、B構造ログは `node tools/check-design.mjs --record`。B設計JSONをゼロから書き直す場合は `python tools/build-design.py` の後で構造検査を再記録します。未実施結果をpassとして生成しません。

HTTP配信とリンク検査は `node tools/http-check.mjs --record`。Python QAスクリプトの構文はPythonによる構文検査に留まり、実行先のGPU可用性を保証しません。

## 7. 改訂版ハッシュ

ログや資料を書き換えると配布manifestとは不一致になります。独自の改訂版を固定するときだけ `npm run manifest`。manifestは自分を除く全配布ファイルを対象にします。`node_modules`、`__pycache__` は配布対象にせずZIPへ入れないでください。外側ZIPのハッシュはZIP作成後に計算し、自己参照しない場所へ記録します。
