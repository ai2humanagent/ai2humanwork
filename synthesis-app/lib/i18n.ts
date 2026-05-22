export type Language = 'en' | 'zh';

export const languages: Array<{ code: Language; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' }
];

export const ui = {
  en: {
    brandSubtitle: 'human fallback infra',
    brandMarketing: 'Human fallback infrastructure for agents',
    nav: {
      overview: 'Overview',
      demo: 'Live Demo',
      tasks: 'Tasks',
      createTask: 'Create Task',
      operators: 'Operators'
    },
    shared: {
      searchPlaceholder: 'Search tasks, operators, proof types...',
      continuePrivy: 'Continue with Privy',
      openDemo: 'Open demo',
      createTask: 'Create task',
      browseTasks: 'Browse fallback tasks',
      viewOperators: 'View operator pool',
      watchLoop: 'Watch the loop',
      browseOperators: 'Browse operators',
      openTask: 'Open task',
      backToTasks: 'Back to tasks',
      reviewOperatorPool: 'Review operator pool',
      openLiveTask: 'Open live task',
      openLoop: 'Open loop',
      viewLinkedTask: 'View linked task',
      postFallbackTask: 'Post fallback task',
      postSimilarTask: 'Post similar task',
      saveLiveExample: 'See a live example',
      createWithPrivy: 'Continue with Privy to create task'
    },
    sidebarNoteLabel: 'Hackathon focus',
    sidebarNoteText:
      'When agents hit reality, dispatch a human, verify the proof, then settle payment.',
    overview: {
      kicker: 'Synthesis submission build',
      title: 'Human fallback',
      accent: 'for agents',
      lead:
        'ai2human turns blocked real-world steps into a clean execution loop. When an agent hits a local verification, pickup, signature, or in-person check, we dispatch a human, collect structured proof, verify completion, and settle only after the work clears.',
      chips: ['Agents that cooperate', 'Proof-first execution', 'Verify → settle'],
      imageEyebrow: 'What the system sees',
      imageTitle: 'Fallback task created',
      imageText:
        'A real-world verification request is posted because the agent cannot physically inspect the store.',
      coreEyebrow: 'Core loop',
      coreTitle: 'One primitive, five states',
      coreText: 'This is the only thing we need judges to understand.',
      loopItems: [
        ['01', 'Task posted'],
        ['02', 'Operator dispatched'],
        ['03', 'Proof uploaded'],
        ['04', 'Verification'],
        ['05', 'Settlement']
      ],
      scenariosEyebrow: 'In this build',
      scenariosTitle: 'Three fallback scenarios',
      operatorEyebrow: 'Human pool',
      operatorTitle: 'Operators ready for blocked steps',
      footer:
        'We are not presenting a general freelancer marketplace. This build focuses on one primitive: reliable human fallback inside agent workflows.'
    },
    demo: {
      title: 'Live demo',
      subtitle:
        'The exact flow we want judges to see: an agent gets blocked, a human operator takes over, proof is uploaded, verification runs, and settlement waits behind the gate.',
      briefEyebrow: 'Live task brief',
      headline: 'Agent blocked → human fallback → proof → verify → settle',
      metricLabels: ['Blocked agent task', 'Assigned operator', 'Required proof artifacts', 'Settlement rule'],
      settlementMetric: 'Verify-first',
      operatorEyebrow: 'Operator',
      proofEyebrow: 'Proof package',
      proofTitle: 'Structured evidence bundle',
      blockerLabel: 'Blocker',
      actionLabel: 'Active action',
      imageEyebrow: 'Execution state'
    },
    tasks: {
      title: 'Fallback tasks',
      subtitle:
        'Open bounties for blocked agent steps. Filter by mode, timing, and proof type, then drill into the execution and verification rules.',
      filterEyebrow: 'Filter tasks',
      filterTitle: 'Narrow the current queue',
      filterText:
        'The UI references Taskmarket, but the semantics are all ai2human: blocked agent steps, proof requirements, and verify-first settlement.',
      filters: ['Mode', 'Status', 'Min reward', 'Expires within'],
      allModes: 'All modes',
      allStatus: 'All status'
    },
    newTask: {
      title: 'Create a fallback task',
      subtitle:
        'Post a blocked agent step that requires a human. Define the evidence bundle, deadline, and settlement rule in one clean brief.',
      eyebrow: 'Create a new task',
      panelTitle: 'Fallback request',
      panelText: 'Taskmarket-style form layout, but tuned for ai2human semantics.',
      fields: {
        name: 'Task name',
        blocker: 'Why the agent is blocked',
        mode: 'Task mode',
        location: 'Location',
        reward: 'Reward (USDC)',
        duration: 'Duration (hours)',
        proof: 'Proof required',
        verification: 'Verification rule'
      }
    },
    operators: {
      title: 'Fallback operator pool',
      subtitle:
        'A RentAHuman-inspired directory for real human execution capacity. These are not generic freelancers — they are the human layer behind blocked agent workflows.',
      searchEyebrow: 'Search operators',
      searchTitle: 'Browse humans available for blocked steps',
      filters: ['Skill', 'City', 'Country', 'Max rate'],
      placeholders: ['store proof, pickup, signature...', 'Shanghai, Graz, Austin...', 'China, Austria, United States...', '120 USDC'],
      categories: [
        ['📍', 'Verification', 'Local inventory checks, timestamped proof, store photos'],
        ['🎥', 'Field Recon', 'On-site recon, venue checks, structured media evidence'],
        ['📦', 'Pickups', 'Pickup, dropoff, delivery, and handoff completion'],
        ['✍️', 'Signature', 'Signed receipt capture and in-person acceptance'],
        ['🧾', 'Research', 'Offline confirmation and local reality checks'],
        ['🛰️', 'Other', 'Anything an agent cannot complete alone in the physical world']
      ]
    },
    taskDetail: {
      title: 'Task detail',
      subtitle:
        'A Taskmarket-inspired detail view for one blocked agent step: terms, requirements, proof, pending actions, and settlement gate in one page.',
      eyebrow: 'Fallback task',
      descriptionEyebrow: 'Description',
      descriptionTitle: 'Why the agent is blocked',
      assignedEyebrow: 'Assigned operator',
      requirementsEyebrow: 'Requirements',
      requirementsTitle: 'Deliverables',
      proofEyebrow: 'Proof bundle',
      proofTitle: 'Structured artifacts required',
      verificationEyebrow: 'Verification',
      verificationTitle: 'Settlement conditions',
      actionsEyebrow: 'Available actions',
      actionsTitle: 'System-guided next step',
      actionsText:
        'Agents should not infer the state machine. Follow the pending action below.',
      historyEyebrow: 'Execution history',
      historyTitle: 'Timeline',
      metrics: ['Reward', 'Duration', 'Platform fee', 'Location'],
      verificationRule: 'Verification rule',
      settlementRule: 'Settlement rule'
    },
    statuses: {
      available: 'available',
      remoteOk: 'remote ok',
      views: 'views',
      reliability: 'reliability',
      taskStatusPendingVerification: 'pending verification',
      taskStatusOperatorAssigned: 'operator assigned',
      taskStatusProofInProgress: 'proof in progress',
      stateDone: 'done',
      stateActive: 'active',
      statePending: 'pending'
    }
  },
  zh: {
    brandSubtitle: '智能体人类兜底层',
    brandMarketing: '面向智能体的人类兜底执行基础设施',
    nav: {
      overview: '概览',
      demo: '演示',
      tasks: '任务',
      createTask: '发布任务',
      operators: '执行者'
    },
    shared: {
      searchPlaceholder: '搜索任务、执行者、证据类型...',
      continuePrivy: '使用 Privy 继续',
      openDemo: '打开演示',
      createTask: '发布任务',
      browseTasks: '查看兜底任务',
      viewOperators: '查看执行者池',
      watchLoop: '观看闭环',
      browseOperators: '浏览执行者',
      openTask: '打开任务',
      backToTasks: '返回任务列表',
      reviewOperatorPool: '查看执行者池',
      openLiveTask: '打开当前任务',
      openLoop: '查看闭环',
      viewLinkedTask: '查看关联任务',
      postFallbackTask: '发布兜底任务',
      postSimilarTask: '发布类似任务',
      saveLiveExample: '查看实际示例',
      createWithPrivy: '使用 Privy 创建任务'
    },
    sidebarNoteLabel: '黑客松重点',
    sidebarNoteText: '当智能体卡在现实世界步骤时，调用人类、验证证据、再触发结算。',
    overview: {
      kicker: 'Synthesis 参赛版本',
      title: '给智能体的',
      accent: '人类兜底层',
      lead:
        'ai2human 把被现实世界卡住的步骤，变成一个清晰的执行闭环。当智能体遇到线下核验、取件、签字或到场确认时，我们派发真人、收集结构化证据、验证结果，并只在通过后结算。',
      chips: ['Agents that cooperate', '证据优先执行', '验证后结算'],
      imageEyebrow: '系统视角',
      imageTitle: '已创建兜底任务',
      imageText: '因为智能体无法亲自到店核验，所以系统发出了一个现实世界验证请求。',
      coreEyebrow: '核心闭环',
      coreTitle: '一个原语，五个状态',
      coreText: '这是评委最需要一眼看懂的部分。',
      loopItems: [
        ['01', '任务发布'],
        ['02', '派发执行者'],
        ['03', '上传证据'],
        ['04', '结果验证'],
        ['05', '触发结算']
      ],
      scenariosEyebrow: '本次构建',
      scenariosTitle: '三个兜底场景',
      operatorEyebrow: '人类池',
      operatorTitle: '随时可接单的执行者',
      footer: '这不是一个泛化的自由职业市场。本次版本只聚焦一个原语：智能体工作流中的可靠人类兜底。'
    },
    demo: {
      title: '实时演示',
      subtitle: '这是我们想给评委看的完整流程：智能体被现实世界卡住，人类执行者接管，上传证据，系统验证，结算在最后一层闸门之后。',
      briefEyebrow: '当前任务',
      headline: 'Agent 被卡住 → 人类接管 → 上传证据 → 验证 → 结算',
      metricLabels: ['被卡住的任务', '已分配执行者', '所需证据数', '结算条件'],
      settlementMetric: '验证优先',
      operatorEyebrow: '执行者',
      proofEyebrow: '证据包',
      proofTitle: '结构化证据集合',
      blockerLabel: '阻塞原因',
      actionLabel: '当前动作',
      imageEyebrow: '执行状态'
    },
    tasks: {
      title: '兜底任务',
      subtitle: '这里展示被现实世界卡住的智能体任务。可以按模式、时间和证据要求筛选，再进入详情查看验证与结算规则。',
      filterEyebrow: '筛选任务',
      filterTitle: '缩小当前队列范围',
      filterText: '界面借鉴了 Taskmarket，但语义完全属于 ai2human：被卡住的智能体步骤、证据要求、以及验证后结算。',
      filters: ['模式', '状态', '最低奖励', '剩余时限'],
      allModes: '全部模式',
      allStatus: '全部状态'
    },
    newTask: {
      title: '创建一个兜底任务',
      subtitle: '把一个需要真人完成的受阻步骤发布出来。在同一份任务中定义证据包、截止时间和结算规则。',
      eyebrow: '新建任务',
      panelTitle: '兜底请求',
      panelText: '表单结构参考 Taskmarket，但字段专门为 ai2human 的人类兜底语义设计。',
      fields: {
        name: '任务名称',
        blocker: '为什么智能体被卡住',
        mode: '任务模式',
        location: '地点',
        reward: '奖励 (USDC)',
        duration: '时长（小时）',
        proof: '所需证据',
        verification: '验证规则'
      }
    },
    operators: {
      title: '人类执行者池',
      subtitle: '这个目录参考了 RentAHuman，但服务的是智能体执行闭环。这里的人不是泛自由职业者，而是专门解决现实世界步骤的执行层。',
      searchEyebrow: '查找执行者',
      searchTitle: '浏览可处理现实步骤的人类执行者',
      filters: ['技能', '城市', '国家', '最高价格'],
      placeholders: ['门店核验、取件、签字...', '上海、格拉茨、奥斯汀...', '中国、奥地利、美国...', '120 USDC'],
      categories: [
        ['📍', '核验', '线下库存核验、时间戳证据、门店照片'],
        ['🎥', '实地侦察', '到场确认、场地检查、结构化视频证据'],
        ['📦', '取件交付', '取件、送达、交接完成确认'],
        ['✍️', '签字确认', '签收回执和到场交接'],
        ['🧾', '线下调研', '离线确认和本地现实校验'],
        ['🛰️', '其他', '任何智能体无法独立完成的现实世界动作']
      ]
    },
    taskDetail: {
      title: '任务详情',
      subtitle: '这是一个 Taskmarket 风格的详情页：展示单个被卡住的智能体步骤，以及对应的条款、要求、证据、待执行动作和结算闸门。',
      eyebrow: '兜底任务',
      descriptionEyebrow: '任务说明',
      descriptionTitle: '为什么智能体被卡住',
      assignedEyebrow: '已分配执行者',
      requirementsEyebrow: '执行要求',
      requirementsTitle: '交付物',
      proofEyebrow: '证据包',
      proofTitle: '所需结构化证据',
      verificationEyebrow: '验证',
      verificationTitle: '结算条件',
      actionsEyebrow: '可执行动作',
      actionsTitle: '系统给出的下一步',
      actionsText: 'Agent 不应该自己猜状态机。直接按照下面的待执行动作前进。',
      historyEyebrow: '执行历史',
      historyTitle: '时间线',
      metrics: ['奖励', '时长', '平台费', '地点'],
      verificationRule: '验证规则',
      settlementRule: '结算规则'
    },
    statuses: {
      available: '可接单',
      remoteOk: '支持远程',
      views: '浏览量',
      reliability: '可靠度',
      taskStatusPendingVerification: '等待验证',
      taskStatusOperatorAssigned: '已分配执行者',
      taskStatusProofInProgress: '证据上传中',
      stateDone: '完成',
      stateActive: '进行中',
      statePending: '待处理'
    }
  }
} as const;
