# jeikl 桌面�?vs 作�?Mac IDE：差异取少报�?
对照双方原生 Antigravity 报文，只抽取**有差�?*的字段；一致的沿用，有差异的取**更少注入、更少改写、更少上下文**的一侧�?
- jeikl：Windows 原生客户端，�?`docs/JEIKL_ANTIGRAVITY_CLIENT_CAPTURE.md`（样�?`docs/baogao.txt`、`docs/样本2.txt`、`docs/claude样本.txt`�?- 作者：macOS Antigravity IDE HAR，见 `docs/HAR_NATIVE_PROTOCOL_ALIGNMENT_AND_BUG_AUDIT.md`，已�?[PR #3541](https://github.com/ruofeng086/Antigravity-Manager/pull/3541) 合进 `beta`

「少」指少发给上游的字节和少做的网关发明�?*签名不是可删字段**：思维链连续靠 `thoughtSignature`，思考正文可以少，签名不能少�?
---

## 取舍原则（已拍板的三例）

| # | 差异 | 作�?Mac IDE | jeikl 桌面�?| 取少 | 理由 |
| --- | --- | --- | --- | --- | --- |
| 1 | 历史是否回传 `thought` 文本 | Gemini 历史 0 次回传；Claude 必须�?| Gemini / Claude 都带�?| **Gemini 不回传。Claude 原文保留�?* 签名都在第一个非思�?part，不压成 `...`�?|
| 2 | `toolConfig` | agent �?tools 就配 `VALIDATED` | 三份 agent 都没有该字段 | **jeikl（不发）** | 少一个对象。Windows agent 无此字段仍能跑工具。不要为 IDE 去发明�?|
| 3 | Claude / Gemini 回执角色 | Gemini FR �?`model`；Claude FR �?`user`；切模型时整段历史统一改写 | 完全一�?| **作者（�?jeikl 相同�?* | 无差异，按目标模型改写�?|

---

## 其余差异与最终取�?
### A. 拓扑与工具声�?
| �?| 作�?| jeikl | 取舍 |
| --- | --- | --- | --- |
| 每个工具单独 `{functionDeclarations:[一个]}` | 329 次带工具全是切片 | 三份 14 项全是切�?| **一致，留切�?*。网关把客户端工具切成一块一函数即可�?|
| `tools` �?`name` 字典序重�?| 代码�?`sort_by` | 客户端原序：`view_file` �?`run_command` �?�?| **jeikl（不排序�?*。排序是多出来的改写，且和作者自己说的「工具乱序打前缀缓存」相反。稳定前缀�?*保持本次请求的原�?*，不是每次改成字母序�?|
| 内层键序插入 `toolConfig` | `contents �?SI �?tools �?toolConfig �?labels �?gc �?sessionId` | `contents �?SI �?tools �?labels �?gc �?sessionId` | **jeikl**。不插入不存在的键�?|
| 工具清单 17 vs 14 | IDE �?`grep_search`、`list_dir`、`browser_subagent`、MCP �?| 桌面端是 subagent / `send_message` 一�?| **透传客户端声明，不补 IDE 工具**。少注入�?|
| `functionResponse.response` 键名 | 100% `output` | 100% `output` | **一致，�?`output`**。`result` 方言迁到 `output`�?|
| 并行 FC 同块、并�?FR 下一�?| �?| 有（Gemini FR 块为 model，Claude FR 块为 user�?| **一�?* |
| 串行 FC/FR 交替、不合并 | �?| �?| **一�?*。只合并「被客户端拆散的并行 FC」，不要把串行并成一块�?|
| 连续 user 保持独立 | IDE 有；PR 已删相邻 user 合并 | 样本 3 开头两�?user（换模型）独�?| **一致，不合�?*（少改写�?|

### B. 思考与签名（和原则 1 配套�?
| �?| 作�?| jeikl | 取舍 |
| --- | --- | --- | --- |
| 历史 `thought` 文本 | Gemini 剥；Claude 必须�?| 两家都留 | **Gemini 不回传思考正文。Claude 原文保留，不压成 `...`�?* 签名都在该轮第一个非思�?part�?|
| Gemini 签名落点 | 该轮第一个非思�?part（FC 或正文） | 相同 | **一致，�?* |
| Claude 是否�?`thoughtSignature` | 审计写「绝对无」；代码�?Claude 剥签�?| �?Gemini 同一落点：并行挂首个 FC，串行第一步挂正文 | **jeikl（留签名�?*。这不是「多发正文」，是连续锚。作者这条和原则 1 矛盾，不能跟�?|
| 思考块本身带签�?| 不带 | 不带 | **一致，思考块不挂�?* |
| 回执带签�?| 不带 | 不带 | **一�?* |
| `includeThoughts` | agent �?true | �?| **一�?* |
| Gemini high `thinkingBudget` | `-1` 或不�?| `-1` | **一�?* |
| Claude `thinkingBudget` / `maxOutputTokens` | `1024` / `64000` | �?| **一致，留作者口�?* |
| flash low/medium 默认 1000 / 4000 | 来自 `fetchAvailableModels` | 无对应样�?| **留作者模型字�?*。不是桌�?vs IDE �?agent 拓扑差�?|

### C. labels 与信�?
| �?| 作�?| jeikl | 取舍 |
| --- | --- | --- | --- |
| 信封 `project` / `userAgent` JSON / `requestType` | `aicode-consumers` / `antigravity` / `agent` | �?| **一�?* |
| HTTP `User-Agent` | `antigravity/ide/... darwin; arm64` | Windows 桌面，不是这�?| **不要�?IDE UA**。JSON 里继�?`userAgent: antigravity` 即可�?|
| `used_claude` / `used_non_gemini_model` | 随目标模�?| �?| **一致，按目标模型填** |
| `used_claude_conservative` | 代码写死 `false`（注释「关掉」） | Gemini `false`；Claude **`true`** | **少改写：不要写死 false**。Gemini �?false，Claude �?true（跟 jeikl 桌面端）。作者这是产品开关，不是双方报文的最小公约�?|
| `last_execution_id` | 审计样例没有 | 三份都有，且排在 labels 最�?| **不发�?*。没有真�?id 就不造；有则原样留下。不要为对齐 IDE 样例删掉已有字段�?|
| `model_enum` | 官方表占位符 | 有（Claude `M35`，Gemini `M298`/`M318`�?| **有官方表就填，不编�?* |
| `sessionId` | �?| 三份同一个数�?id | **有则透传，网关不要改成随�?UUID 去「对齐�?* |
| `safetySettings` 伪�?4 �?OFF | 官方默认不带 | 不带 | **一致，不发** |
| 显式 `cachedContent` | IDE 0 次；作者主张删注入 | �?| **一致，不注�?*（取少） |

### D. 作者有、jeikl 这批 agent 样本没有�?
| �?| 说明 | 取舍 |
| --- | --- | --- |
| `requestType=checkpoint` �?`toolConfig.NONE` | �?IDE 审计；jeikl �?checkpoint �?| **agent 路径不发 toolConfig**（原�?2）。checkpoint 若仍要禁工具，再单独�?`NONE`，不要绑 `VALIDATED`。未抓到之前不在 agent 上预埋�?|
| `tab` / `chat` �?tools | IDE 审计 | 与「无工具就不�?toolConfig」相容，**取少** |
| 调用 id：`call_...` vs `toolu_vrtx_01...` | IDE 示例�?`call_`；jeikl Gemini �?`call_`，Claude �?`toolu_vrtx_` | **少改写：已有 id 透传**。不要把 Claude �?`toolu_vrtx_` 强行改成 `call_`。缺 id 再补�?|
| `WaitMsBeforeAsync` 5000 vs 3000 | 客户端自己填 | **透传，网关不�?* |

### E. 签名隔离（与报文拓扑无关�?
| �?| 取舍 |
| --- | --- |
| `initial_session_sig` 进循环前快照 | **�?*。防跨轮串扰，不是多发字段�?|
| 尾轮会话签名放行 | **�?*。少误杀�?|
| 测试 `TEST_CONFIG_LOCK` | **�?*。与协议无关�?|

---

## �?PR #3541 已合代码的含�?
�?*留下**�?
- 工具切片（一块一函数�?- �?`target_model` �?FR 改成 Claude `user` / Gemini `model`
- 回执信封 `result` �?`output`
- 连续 user 不合�?- 并行 FC/FR 打包
- Gemini 历史不回传思考正文；Claude 思考正文原文保留。签名都挂在该轮第一个非思�?part
- Claude `64000` / `1024`，Gemini high `-1`
- 签名快照隔离、测试锁

�?*收回或不要做**（相对已合进 beta 的写法）�?
- �?tools 就注�?`toolConfig.VALIDATED`
- `tools` 按名字排�?- 为插�?`toolConfig` 改内层键�?- �?Claude �?`thoughtSignature`
- �?`used_claude_conservative` 写死�?`false`
- 把调�?id 一律改�?`call_...`

---

## 一句话

官方认的�?*切片工具、按模型改回执角色、签名连�?*；不认的�?*多出来的 `toolConfig`、重排工具、思考正文、以及把 Claude 签名剥掉**。差异取少：少发思考块、不�?`toolConfig`、回执角色跟作者（也跟 jeikl）那�?Claude/Gemini 分工�?
