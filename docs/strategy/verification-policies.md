# AI2Human 验证策略库 · 起步 15 份 Policy

> 基准文档：[verification-engine-primitives.md](./verification-engine-primitives.md)
> 每份 policy = 引擎 `verify_claim(claimType, evidence)` 的一份配置。新增场景不改引擎，只加配置。

## Policy 通用 Schema

```yaml
policyId: <kebab-case>
version: 1
level: L1..L5            # 保证等级（见原语文档）
claim: <一句话声称>
evidenceSpec:
  identity: <谁做的，要求>
  time: <时间/新鲜度要求>
  location: <地点要求>
  content: <内容要求>
  process: <过程要求>
  corroboration: <佐证要求>
checkSequence:           # 对应六步链：采集→防篡改→验真→交叉核对→判断→锚定
  - capture: <证据怎么采集>
  - integrity: <怎么防篡改>
  - authenticity: <怎么验真>
  - consistency: <怎么交叉核对>
  - judgment: <规则之外怎么判>
  - anchor: <出什么凭证>
decision:               # 裁决规则
  pass: <通过条件>
  fail: <拒绝条件>
  resubmit: <可补证据条件>
  manual_review: <升级人工条件>
receipt: <凭证内容>
failureCases: <真实失败案例，用于校验>
```

---

## A. 物理现实

### 1. delivery_confirmed
```yaml
policyId: delivery_confirmed
level: L3
claim: 外卖/快递已送达
evidenceSpec:
  identity: 配送员账号与订单绑定
  time: 送达照片 EXIF 时间在配送时段内
  location: GPS 终点距收货地址 ≤50m
  content: 送达照片（门牌/门垫/包裹）
  process: 拍摄设备与配送 App 绑定，非旧图
  corroboration: 客户在线确认（可选）
checkSequence:
  - capture: App 内拍摄，禁止相册上传
  - integrity: EXIF 与 GPS 元数据一致性，防截图/翻拍
  - authenticity: 门垫/门牌特征与该地址历史照片比对
  - consistency: GPS 与订单地址距离、时间与订单窗口交叉
  - judgment: 特征比不过/客户投诉 → manual_review
  - anchor: 照片哈希 + GPS + 裁决 → 签名凭证
decision:
  pass: 时间+GPS+特征全部通过
  fail: 时间或 GPS 造假
  resubmit: 照片模糊、缺门牌
  manual_review: 客户称未收到
receipt: { 订单号, 照片哈希, GPS 快照, 裁决, 时间戳 }
failureCases: 提前点送达（假 GPS）、旧门照片复用、AI 生成门口图
```

### 2. event_attended
```yaml
policyId: event_attended
level: L3
claim: 线下活动真的到场
evidenceSpec:
  identity: 报名账号 + 一次性签到码
  time: 签到时间在活动时段内
  location: GPS 在场馆半径内
  content: 现场自拍（活动主题背景）
  corroboration: 签到码使用记录
checkSequence:
  - capture: 现场扫码 + 自拍，禁止截图
  - integrity: 签到码一次性、不可转赠
  - authenticity: 自拍背景与场地图比对
  - consistency: 跨参与者照片查重
  - judgment: 背景存疑 → manual_review
  - anchor: 签到码 + 自拍哈希 → 凭证
decision:
  pass: 签到码有效 + GPS 在场馆 + 背景匹配
  fail: 签到码被他人使用 / GPS 在外
  manual_review: 背景无法确认
receipt: { 活动ID, 签到码, 自拍哈希, GPS, 裁决 }
failureCases: 签到码转卖、代签、AI 合成背景、一人多号
```

### 3. storefront_open
```yaml
policyId: storefront_open
level: L3
claim: 店铺确实开着
evidenceSpec:
  time: 照片拍摄时间在营业时段内
  location: GPS 在店铺地址
  content: 店门/招牌/灯光现场照
  process: 非旧图（EXIF/特征比对）
checkSequence:
  - capture: 现场拍摄 + 定位
  - integrity: EXIF 与 GPS 一致
  - authenticity: 招牌与店铺注册信息一致
  - consistency: 与营业时间表交叉（仅参考，以现场为准）
  - anchor: 照片哈希 + 裁决
decision:
  pass: 现场照 + GPS + 时间全部成立
  fail: 定位不符 / 明显旧图
  manual_review: 招牌被遮挡
receipt: { 店铺ID, 照片哈希, GPS, 时间戳, 裁决 }
failureCases: 用上周照片、P 图招牌、GPS 模拟
```

### 4. package_picked_up
```yaml
policyId: package_picked_up
level: L3
claim: 取件/签收真的拿到
evidenceSpec:
  identity: 签收人与订单取件人一致
  time: 签收时间在派送窗口
  content: 签收照片/签名/柜面屏幕
  location: GPS 在取件点
checkSequence:
  - capture: 现场拍摄签收证明
  - integrity: 照片非截图，元数据完整
  - authenticity: 签名与登记一致（可接受程度）
  - consistency: 与派送系统扫描记录交叉
  - anchor: 签收证据哈希 → 凭证
decision:
  pass: 证据 + 系统扫描一致
  fail: 证据与系统记录矛盾
  manual_review: 无法辨认
receipt: { 运单号, 签收证据哈希, 裁决 }
failureCases: 代收冒充、P 签收图、重复提交
```

### 5. on_site_photo（通用底层）
```yaml
policyId: on_site_photo
level: L3
claim: 这张照片是现场拍的
evidenceSpec:
  time: 拍摄时间合理
  location: GPS 与声称地点一致
  content: 照片内容与声称对象一致
  process: 设备信息、AI 生成检测
checkSequence:
  - capture: 指定 App/工具内拍摄
  - integrity: EXIF/GPS/哈希
  - authenticity: AI 生成检测、元数据伪造检测
  - consistency: 跨提交去重（同一照片多人用）
  - anchor: 照片哈希 + 检测结果 → 凭证
decision:
  pass: 全部检测通过
  fail: AI 生成 / 元数据造假 / 重复
  manual_review: 检测不确定
receipt: { 照片哈希, 检测结果, 时间戳, 裁决 }
failureCases: AI 生成、P 图、同图复用、模拟 GPS
```

## B. 真人真实性

### 6. is_real_human
```yaml
policyId: is_real_human
level: L4
claim: 这是真人不是 bot
evidenceSpec:
  identity: 账号生命周期、创建时间
  process: 设备指纹、行为规律（打字/作息）
  corroboration: 社交图谱、跨平台一致
checkSequence:
  - capture: 授权采集账号与设备特征
  - integrity: 指纹不可伪造声明
  - authenticity: 行为模式 vs bot 模式库
  - consistency: 跨账号关联检测
  - judgment: 存疑人工复核
  - anchor: 身份结论 → 凭证
decision:
  pass: 行为+设备+图谱全部像真人
  fail: 明确 bot 特征
  manual_review: 特征不足
receipt: { 身份标识, 结论, 检测摘要, 凭证 }
failureCases: 养号工作室、AI 生成全套人设、模拟器
```

### 7. anti_sybil
```yaml
policyId: anti_sybil
level: L4
claim: 一人一号，没刷
evidenceSpec:
  identity: 每账号独立身份
  process: 设备指纹去重
  corroboration: 社交图谱聚类
checkSequence:
  - capture: 批量账号画像
  - integrity: 设备指纹可信度
  - authenticity: 账号行为真实性
  - consistency: 同设备/互关/同步行动检测
  - judgment: 聚类存疑人工复核
  - anchor: 聚类结果 → 凭证
decision:
  pass: 无强关联
  fail: 同设备/同网络/互关批量
  manual_review: 边界情况
receipt: { 批次, 聚类摘要, 结论 }
failureCases: 工作室、模拟器多开、批量养号
```

### 8. human_made_content
```yaml
policyId: human_made_content
level: L3
claim: 手工创作，不是 AI
evidenceSpec:
  process: 草稿历史、源文件、创作时间线
  content: 作品与历史风格一致性
checkSequence:
  - capture: 创作过程证据（录屏/分阶段导出）
  - integrity: 源文件修改历史连续合理
  - authenticity: AI 生成特征检测
  - consistency: 与历史作品风格比对
  - judgment: 存疑人工评审
  - anchor: 过程证据哈希 → 凭证
decision:
  pass: 过程 + 风格 + 检测全过
  fail: AI 特征明确 / 无过程证据
  manual_review: 存疑
receipt: { 作品哈希, 过程摘要, 裁决 }
failureCases: AI 生成后伪装痕迹、买成品、代工
```

### 9. genuine_review
```yaml
policyId: genuine_review
level: L4
claim: 评价/反馈是真实用户
evidenceSpec:
  identity: 账号生命周期
  process: 行为一致性
  corroboration: 跨平台交叉
checkSequence:
  - capture: 评价时采集账号上下文
  - authenticity: 账号像真人（历史/频次）
  - consistency: 同内容复用检测、时间合理性
  - judgment: 存疑人工
  - anchor: 结论 + 凭证
decision:
  pass: 账号真实 + 行为合理
  fail: 批量/重复/新号即评
  manual_review: 存疑
receipt: { 评价ID, 结论, 凭证 }
failureCases: 刷评团队、AI 生成评论、同文复用
```

## C. 独立裁决

### 10. dispute_resolved
```yaml
policyId: dispute_resolved
level: L5
claim: 纠纷谁有理
evidenceSpec:
  content: 双方证据包
  corroboration: 第三方记录
checkSequence:
  - capture: 双方证据封存（哈希）
  - integrity: 证据链完整
  - consistency: 证据互证/矛盾分析
  - judgment: 规则 + 独立仲裁员
  - anchor: 裁决书 + 证据哈希 → 凭证
decision:
  pass/fail: 依裁决
  manual_review: 默认升级仲裁
receipt: { 争议ID, 裁决, 证据哈希, 仲裁员 }
failureCases: 单方伪证、证据缺失
```

### 11. refund_eligible
```yaml
policyId: refund_eligible
level: L5
claim: 该不该退款/赔偿
evidenceSpec:
  content: 订单 + 交付记录 + 客户描述
  corroboration: 系统日志
checkSequence:
  - capture: 事件封存
  - integrity: 记录防篡改
  - consistency: 规则匹配 + 证据交叉
  - judgment: 高金额人工复核
  - anchor: 决定 + 凭证
decision:
  pass: 规则 + 证据成立
  fail: 证据不足
  manual_review: 高金额/争议
receipt: { 工单ID, 决定, 依据摘要, 凭证 }
failureCases: 虚构问题、重复索赔
```

### 12. fact_checked
```yaml
policyId: fact_checked
level: L3
claim: 这个事实是真是假
evidenceSpec:
  content: 声称文本 + 检索证据
  corroboration: 权威源
checkSequence:
  - capture: 多源检索 + 页面快照
  - integrity: 快照哈希、时间
  - consistency: 证据与结论一致性
  - judgment: 规则 + 模型辅助（仅判断层）
  - anchor: 快照 + 结论 → 凭证
decision:
  pass: 权威源支持
  fail: 无支持/相悖
  resubmit: 证据不足
receipt: { 声称哈希, 证据快照, 结论, 凭证 }
failureCases: 过期数据、单一来源、幻觉引用
```

## D. 凭证

### 13. completion_credential
```yaml
policyId: completion_credential
level: L3
claim: 完成培训/认证
evidenceSpec:
  identity: 学员身份
  content: 权威系统完成记录
checkSequence:
  - capture: 权威系统记录（非自报）
  - integrity: 记录签名
  - authenticity: 签发者可信
  - anchor: 签名凭证（可独立核验）
decision:
  pass: 记录真实 + 凭证可验
  fail: 无记录/凭证无效
receipt: { 学员ID, 凭证编号, 签发者, 哈希 }
failureCases: 假证书、PS 截图
```

### 14. document_submitted
```yaml
policyId: document_submitted
level: L3
claim: 提交过这份材料
evidenceSpec:
  time: 提交时间
  content: 材料哈希
checkSequence:
  - capture: 提交时即时哈希
  - integrity: 防篡改时间戳
  - consistency: 与受理记录交叉
  - anchor: 哈希 + 时间戳 → 凭证
decision:
  pass: 哈希一致 + 时间戳可信
  fail: 哈希不符
receipt: { 材料哈希, 时间戳, 受理记录 }
failureCases: 事后补材料、篡改日期
```

### 15. verified_receipt（凭证流转）
```yaml
policyId: verified_receipt
level: L2
claim: 交付被验证过（凭证可流转）
evidenceSpec:
  content: 原验证凭证（签名/锚定）
checkSequence:
  - authenticity: 凭证签名有效
  - consistency: 签发者可信 + 未撤销
  - anchor: 复核结果 → 新凭证
decision:
  pass: 凭证有效
  fail: 凭证无效/已撤销
receipt: { 原凭证ID, 复核结果, 时间戳 }
failureCases: 伪造凭证、凭证撤销后复用
```

---

## 使用说明

- 新增场景 = 新增一份配置，引擎与六步链不变。
- 每份 policy 的 `failureCases` 用于测试与评审（构建时作为反例数据集）。
- 对外只暴露 `verify_claim(claimType, evidence)`；claimType 即 policyId。
