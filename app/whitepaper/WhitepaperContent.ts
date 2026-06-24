export const content = {
  en: {
    nav: {
      home: "Home",
      paper: "Paper",
      github: "GitHub",
      contact: "X / Contact"
    },
    hero: {
      eyebrow: "AI2Human Network",
      updated: "Updated June 2026",
      title: "AI2Human",
      subtitle: "Agent requests. Human proof. Verified settlement. AI2Human is the execution and verification network agents use when a workflow needs human action, policy checks, structured proof, and onchain settlement."
    },
    sections: {
      intro: {
        label: "Introduction",
        title: "WHAT IS AI2HUMAN",
        content: [
          "AI2Human is the execution and verification network for agents. It turns agent requests into human execution, structured proof, verification, and settlement.",
          "We are not building a chatbot or a generic task app. We are building the network layer agents use when a workflow requires real accounts, local action, human judgment, compliance checks, proof collection, or payout after verification.",
          "Most AI products stop at output. AI2Human is built for completed work. Every request moves through a clear loop: agent request → human execution / verification → structured proof → verify → settle."
        ]
      },
      problem: {
        label: "The Problem",
        title: "THE EXECUTION GAP",
        content: [
          "The real bottleneck is not intelligence. It is execution continuity. In production environments, work fails at handoff points, not prompt quality.",
          "Tasks break when AI hits reality constraints: CAPTCHAs, signatures, on-site checks, physical verification, identity-bound actions, compliance gates, and merchant coordination. These are steps that software alone cannot finish.",
          "Traditional freelance platforms coordinate humans but are slow, trust-heavy, and operationally expensive. Agent platforms automate digital workflows but fail at the last mile where real-world execution is required.",
          "Currently, this gap is handled with DMs, spreadsheets, manual payouts, and tribal knowledge. One team's work does not compound. One deployment learns something, and the next one often starts again from scratch."
        ],
        highlight: {
          label: "MARKET OPPORTUNITY",
          content: "AI can execute digital workflows at scale — but real-world execution and verification remain unsolved in most agent systems. Payment rails are becoming machine-native. Verifiable identity and reputation standards are maturing. This is the window."
        }
      },
      solution: {
        label: "Our Solution",
        title: "CLOSING THE LOOP",
        content: [
          "AI2Human closes that structural gap by combining agent speed with verified human execution inside one auditable network. The system has one core product: a state machine that moves every request through defined states with explicit inputs, outputs, evidence requirements, verification rules, and settlement records."
        ],
        coreLoop: {
          label: "THE CORE LOOP",
          content: "Agent Request → Human Execution / Verification → Structured Proof → Verify → Settle"
        },
        phases: [
          {
            name: "PHASE 1",
            title: "Task Intake",
            desc: "Tasks enter via direct submission, API integrations, or marketplace pipelines. Before execution starts, tasks are normalized into structured units: scope, constraints, deadline, budget, acceptance criteria, and evidence schema."
          },
          {
            name: "PHASE 2",
            title: "Planner Precheck",
            desc: "The planner runs wallet, market, and trade prechecks before deciding whether to stay autonomous. It queries signer control, payout readiness, quoted routes, and settlement readiness."
          },
          {
            name: "PHASE 3",
            title: "AI Execution",
            desc: "After precheck, AI2Human routes work through an AI-first path by default. Agents use OpenClaw for browser-level actions: scanning opportunities, operating web workflows, filling forms, collecting data."
          },
          {
            name: "PHASE 4",
            title: "Human Execution / Verification",
            desc: "When execution crosses into reality-bound territory, the network routes the step to verified humans. Typical triggers include identity-bound actions, physical pickup, in-person verification, on-site photos, compliance checks, local signatures, and document review."
          }
        ]
      },
      architecture: {
        label: "Architecture",
        title: "AI2HUMAN NETWORK ARCHITECTURE",
        content: [
          "AI2Human is not only a task surface. It is a network stack for agent workflows that need humans. The architecture starts from an agent or project request, turns it into a structured task, dispatches human execution or verification, converts output into proof, verifies that proof, settles payment, and writes reputation back into the network.",
          "The important shift is that every task becomes reusable network memory: what proof worked, which operator completed it, which reviewer accepted it, which policy was applied, and which settlement actually happened."
        ],
        flow: [
          { name: "Agent / Project Request", desc: "Agents, token teams, campaign teams, protocols, and builders request work through skills, APIs, templates, or the product UI." },
          { name: "Normalize & Route", desc: "The router turns the request into scope, deadline, reward, eligibility, proof schema, policy pack, and settlement mode." },
          { name: "Human Execution / Verification", desc: "Verified operators perform the human-needed step: account-bound action, local check, document review, social proof, KYC/KYB support, or field verification." },
          { name: "Structured Proof", desc: "The output becomes a proof bundle with URLs, screenshots, files, timestamps, wallet evidence, reviewer metadata, hashes, and status transitions." },
          { name: "Verify", desc: "Rule checks, AI review, human review, duplicate detection, fraud checks, disputes, and arbitration determine whether evidence is payable." },
          { name: "Settle & Remember", desc: "USDC, prize pools, refunds, claims, and reputation updates are triggered only after verified outcomes." }
        ],
        layers: [
          { name: "1. Agent Access Layer", desc: "Skill files, APIs, SDKs, manifests, webhooks, and templates make AI2Human usable by agents, not only human visitors." },
          { name: "2. Task Intake", desc: "Direct submission, API integrations, campaign flows, and marketplace pipelines with structured normalization." },
          { name: "3. AI2Human Router", desc: "Chooses task type, proof schema, operator eligibility, price, review mode, escalation path, and settlement mode." },
          { name: "4. Agent Context & Skill Runtime", desc: "Task memory, proof memory, operator/reviewer history, policy packs, permissions, and reusable agent skills." },
          { name: "5. AI Execution Engine", desc: "OpenClaw-powered browser automation, web workflows, data collection, form operations, and software-native execution." },
          { name: "6. Human Execution Network", desc: "Verified operators execute or verify real-world, identity-bound, compliance-sensitive, or judgment-heavy steps." },
          { name: "7. Structured Proof Layer", desc: "Logs, links, screenshots, photos, receipts, timestamps, wallet evidence, reviewer notes, hashes, and proof bundles." },
          { name: "8. Verification Engine", desc: "Deterministic checks, AI review, human review, duplicate detection, fraud signals, dispute windows, and arbitration." },
          { name: "9. Settlement Layer", desc: "Base USDC, escrow, prize pools, refunds, claims, payout records, and x402-style machine-native payment flows." },
          { name: "10. Reputation Graph", desc: "Operator reliability, reviewer accuracy, proof quality, agent behavior, dispute outcomes, and project-level history." },
          { name: "11. Compliance & RWA Oracle", desc: "Human-verified KYC/KYB, location, entity, document, and asset proof for B20, RWA, local stablecoins, and regulated assets." },
          { name: "12. Network Governance", desc: "A2H access, staking tiers, slash conditions, policy updates, dispute rules, task category openings, and ecosystem incentives." }
        ],
        modules: [
          { name: "Agent Skill Layer", desc: "Any agent can create campaigns, request verification, fetch reports, monitor settlement, or prepare B20/RWA proof workflows through reusable skills." },
          { name: "Compliance & RWA Oracle", desc: "Human verifiers produce structured compliance proof that token systems can consume before minting, role assignment, transfer policy updates, or renewal checks." },
          { name: "B20 Proof Gateway", desc: "AI2Human can prepare proof requirements, role policies, allowlist rules, freeze/seize policy inputs, and deployment checklists for B20 issuers on Base." },
          { name: "Network Memory", desc: "Every task, proof, review, dispute, payout, and operator action improves future routing instead of disappearing as a one-off job." }
        ]
      },
      agents: {
        label: "Multi-Agent System",
        title: "EIGHT SYSTEM ROLES",
        content: [
          "The system is powered by specialized roles that coordinate through the execution loop. Some are software agents, some are human actors, and some are policy modules, but each owns a specific state transition."
        ],
        roles: [
          { name: "Requester Agent", desc: "Calls AI2Human through skills, API, or templates when a workflow needs human execution, proof, or verification." },
          { name: "Planner Agent", desc: "Owns route selection, turns requests into execution plans, and decides whether tasks stay autonomous or route to human execution." },
          { name: "Context & Policy Agent", desc: "Recalls prior task outcomes, proof quality, operator reliability, reviewer accuracy, and policy constraints before routing." },
          { name: "Dispatcher Agent", desc: "Matches blocked work to payout-ready operators, writes execution briefs, proof rules, and payout targets." },
          { name: "Human Operator", desc: "Executes real-world steps and returns structured proof. Handles signatures, pickups, onsite checks." },
          { name: "Verifier Agent", desc: "Checks proof structure, field integrity, and duplicate submissions before payout moves forward." },
          { name: "Compliance Oracle Agent", desc: "Packages human-verified KYC/KYB, entity, document, asset, and location proof for B20, RWA, and regulated workflows." },
          { name: "Settlement Agent", desc: "Releases payout only after verifier marks the task payable. Writes real transaction hashes." }
        ]
      },
      settlement: {
        label: "Settlement",
        title: "ONCHAIN PAYMENT RAILS",
        content: [
          "AI2Human supports multiple settlement rails with Base as the primary product path. Settlement is coordinated through x402 so payment is machine-native and state-triggered—reducing payout delays, removing ambiguity, and lowering trust friction."
        ],
        rails: [
          { name: "Base (Primary)", desc: "USDC settlement on Base mainnet. Default product rail with live onchain receipts." },
          { name: "X Layer (Active)", desc: "USDT0 settlement on OKX X Layer. Production-ready secondary rail." },
          { name: "BNB Chain (Archived)", desc: "Historical settlement receipts preserved as proof of concept." },
          { name: "x402 Integration", desc: "Payment-gated verification bundle flow. Secondary proof-access capability." }
        ],
        liveProof: {
          label: "LIVE BASE SETTLEMENT",
          content: "Treasury top-up: 0x3fe5b99b2af4934c3b30d3087a703157e4f7cfcb... | Settlement tx: 0xee543bc107b411edd0202131b82172eb6efaf29c10457e33d2900ae890a72cf0 | Asset: 0.01 USDC | Network: Base Mainnet"
        }
      },
      users: {
        label: "Target Users",
        title: "WHO CAN PARTICIPATE",
        content: [
          "AI2Human is designed for agent builders, protocols, campaign teams, compliance-heavy issuers, and verified human operators who can complete or verify steps agents cannot safely finish alone.",
          "The network is not a generic work marketplace. It is a structured execution and verification layer where humans produce proof, reviewers verify outcomes, and settlement follows accepted evidence."
        ],
        personas: [
          { name: "Agent Builders", desc: "Teams building agents that need reliable human execution, proof collection, verification, or payout after a blocked step." },
          { name: "Human Operators", desc: "Verified people who can complete local actions, identity-bound tasks, document checks, proof collection, and review work." },
          { name: "AI Agents", desc: "Autonomous agents that hit reality constraints. Instead of failing, they dispatch tasks to human operators and receive structured proof for verification." },
          { name: "Issuers & Protocols", desc: "Projects that need human-verified KYC/KYB, entity checks, asset verification, or compliance-aware proof before tokenized asset workflows." },
          { name: "Reviewers", desc: "Network participants who review evidence, resolve disputes, and help convert human work into trusted verification results." }
        ],
        flywheel: "More verified operators → better proof coverage → more agent and protocol demand → more tasks and reviews → stronger reputation data."
      },
      marketplace: {
        label: "Marketplace",
        title: "MULTI-ROLE DESIGN",
        content: [
          "AI2Human supports role-specific participation with built-in flywheel effects: as completion quality rises, better demand attracts better supply, and better supply further increases completion quality."
        ],
        roles: [
          { name: "Task Buyers", desc: "Define requirements, acceptance criteria, and budgets. Post blocked agent steps with proof rules." },
          { name: "Human Operators", desc: "Complete reality-bound subtasks: onsite checks, signatures, physical verification, photo proof. Anyone with skills can join." },
          { name: "AI Agents", desc: "Autonomous agents that dispatch to human operators when hitting reality constraints." },
          { name: "Jurors", desc: "Ordinary people who stake A2H to participate in dispute resolution and earn arbitration rewards." }
        ],
        taskTypes: {
          title: "Task Categories",
          items: [
            { name: "Local Verification", desc: "On-site inspections, store visits, photo proof, venue verification." },
            { name: "Identity Actions", desc: "Social media posts, campaign replies, quote posts requiring human identity." },
            { name: "Physical Tasks", desc: "Pickups, deliveries, handoffs, signed receipts, document signing." },
            { name: "Digital Tasks", desc: "Form filling, data entry, account management, verification tasks." },
            { name: "Compliance & RWA Oracle", desc: "KYC/KYB support, entity checks, document proof, local stablecoin review, B20/RWA issuance verification." },
            { name: "Errands", desc: "Running tasks, shopping, queuing, local services." }
          ]
        }
      },
      liveproduct: {
        label: "Live Product",
        title: "TRY IT NOW",
        content: [
          "The platform is live. You can experience the full task lifecycle right now — from browsing tasks to accepting, completing, and getting paid onchain."
        ],
        features: [
          {
            name: "Task List",
            desc: "Browse all available tasks at /tasks. Filter by status, category, and reward amount. Each task shows requirements, deadline, and proof schema.",
            link: { label: "Open Tasks", href: "/tasks" }
          },
          {
            name: "Task Detail",
            desc: "Click any task to see full details: description, acceptance criteria, evidence requirements, reward, and SLA timers. Every task is structured for verifiable completion.",
            link: { label: "View Example Task", href: "/tasks/7bde6365-9e4a-4fa9-a2f4-e79657b354b3" }
          },
          {
            name: "Accept Task",
            desc: "Logged-in operators can accept open tasks directly from the task detail page. Once accepted, the task moves to your active queue with SLA tracking."
          },
          {
            name: "Submit Evidence",
            desc: "Complete the task and submit proof via structured evidence form: screenshots, links, photos, timestamps. The system validates proof format before acceptance."
          },
          {
            name: "Review & Settle",
            desc: "Reviewers verify submitted evidence. Approved tasks trigger automatic onchain settlement via x402. Failed submissions return for rework with reason codes."
          }
        ],
        cta: {
          label: "Start Using the Platform",
          href: "/tasks"
        }
      },
      moat: {
        label: "Competitive Moat",
        title: "WHY AI2HUMAN WINS",
        content: [
          "Building a task app is easy. Building a trusted execution and verification network for agents is hard. Here's why AI2Human creates lasting competitive advantage."
        ],
        advantages: [
          { name: "Network Effects", desc: "More operators → Faster matching → Better completion rates → More buyers → More tasks. First movers who achieve critical mass create self-reinforcing growth that newcomers cannot easily replicate." },
          { name: "AI Dispatch Efficiency", desc: "Our AI matching algorithm learns from each task completion. Over time, we know which operator handles which task type fastest and most reliably. This dispatch intelligence compounds with scale." },
          { name: "Staked Credibility System", desc: "No other platform has an economic credibility layer like ours. Operators stake real value to participate. Fake evidence gets slashed. Disputes get jury-resolved. This trust infrastructure takes time and capital to build." },
          { name: "Evidence Standards", desc: "We've defined what 'proof of completion' means across task types. This evidence schema becomes the industry standard — other platforms must either adopt our standards or appear less trustworthy." },
          { name: "Geographic Coverage", desc: "Task completion requires nearby operators. As we expand to more cities and regions, our coverage becomes denser, completion rates improve, and new entrants face the cold-start problem." },
          { name: "Jury System Moat", desc: "Our decentralized jury system creates a new class of platform participants (jurors) with skin in the game. This creates loyalty and engagement that pure payment platforms cannot replicate." }
        ]
      },
      jury: {
        label: "Jury System",
        title: "DECENTRALIZED DISPUTE RESOLUTION",
        content: [
          "What happens when a buyer rejects evidence and the operator disagrees? Traditional platforms rely on centralized support — slow, expensive, and often unfair.",
          "AI2Human solves this with a decentralized jury system where ordinary platform users resolve disputes and earn rewards for correct judgments."
        ],
        workflow: [
          { step: "1. Dispute Opened", desc: "Buyer raises a dispute within the evidence review window, citing specific issues with the submitted proof." },
          { step: "2. Jury Pool Selection", desc: "System randomly selects N jurors from the pool of A2H-staked participants. Selection considers: stake amount, dispute category expertise, historical accuracy." },
          { step: "3. Evidence Review", desc: "Jurors access the task context, evidence bundle, and both parties' statements. They deliberate privately." },
          { step: "4. Voting", desc: "Jurors vote: Buyer honest? Operator honest? Both? Neither? Votes are submitted onchain — transparent but anonymous." },
          { step: "5. Resolution", desc: "Majority vote wins. Honest party receives the dispute escrow from both sides. Jurors who voted with majority earn jury rewards." },
          { step: "6. Slash & Reward", desc: "Losing party's stake is distributed: portion to winning party, portion to correct jurors, portion to protocol treasury." }
        ],
        jurorRequirements: {
          title: "Juror Requirements",
          items: [
            { name: "Minimum Stake", desc: "Must stake minimum A2H to join jury pool. Higher stake = higher probability of selection." },
            { name: "Accuracy Track Record", desc: "Jurors with higher accuracy rates get priority selection for future disputes." },
            { name: "No Conflicts", desc: "Jurors cannot be involved in the disputed task (operator, buyer, or related). Smart contract enforces this." }
          ]
        },
        slashConditions: {
          title: "Juror Slash Conditions",
          items: [
            { name: "Majority Collusion", desc: "If majority of jurors vote incorrectly and collude, they face slash risk from protocol surveillance." },
            { name: "Non-Participation", desc: "Selected jurors who don't vote within timeframe lose their jury reputation score." },
            { name: "Random Audits", desc: "A percentage of resolved disputes are audited. Incorrect votes trigger penalties." }
          ]
        },
        rewards: {
          title: "Jury Rewards",
          content: "Correct jurors earn: dispute pool split + accuracy bonus + reputation boost. Over time, experienced jurors develop 'case accuracy' profiles that increase their selection rate and reward multiplier."
        }
      },
      identity: {
        label: "Identity & Reputation",
        title: "ERC-8004 ALIGNED",
        content: [
          "AI2Human uses erc-8004-aligned identity and reputation semantics for verifiable agent history and portable trust context. The system tracks who executed each step, completion reliability, recovery speed, and evidence quality.",
          "Reputation is generated from verifiable outcomes, not branding. As data accumulates, routing quality improves, strong operators gain visibility, and marketplace reliability compounds.",
          "Operators can unlock trust badges and routing priority through verified profiles, skill endorsements, and completion history. The identity layer enables portable reputation across deployments."
        ]
      },
      roadmap: {
        label: "Roadmap",
        title: "EXECUTION PLAN",
        phases: [
          {
            period: "D1-D14",
            title: "Launch Hardening",
            desc: "Ship landing + live demo + waitlist. Finalize task state machine. Add full evidence schema (logs, links, photos, timestamps, operator IDs). Add basic reviewer flow (approve/reject/rework with reason codes). Publish public metrics panel."
          },
          {
            period: "D15-D30",
            title: "Marketplace Reliability",
            desc: "Build AI-first routing rules (skill, urgency, geography, confidence). Build human execution dispatcher for CAPTCHA/onsite/signature/photo tasks. Add SLA timers and timeout escalation. Add operator scoring v1. Add replayable task timeline for auditability."
          },
          {
            period: "D31-D45",
            title: "Real Ops + Integrations",
            desc: "Open partner task ingestion API + webhook callbacks. Add template-based task posting (compliance, verification, field ops). Add dispute workflow v1 with evidence lock and reviewer assignment. Add settlement ledger view tied to verification status."
          },
          {
            period: "D46-D60",
            title: "Token Utility Activation",
            desc: "Activate A2H access tiers for advanced API and operator tooling. Launch staking v1 for trust tiers and routing priority. Launch rewards v1 for verified execution contributions. Launch governance v1 for fee and incentive parameter voting."
          },
          {
            period: "D61-D120",
            title: "Scale Phase",
            desc: "Expand regional coverage and operator categories. Upgrade verification engine with policy packs per task type. Add anti-abuse and quality-risk controls. Add enterprise reporting (SLA, dispute rate, settlement latency). Release integration SDK."
          },
          {
            period: "D121-D180",
            title: "Network Phase",
            desc: "Deepen erc-8004-aligned identity/reputation portability. Move core marketplace parameters to governance-controlled updates. Launch ecosystem incentives for builders/reviewers/operators. Add routing marketplace intelligence."
          }
        ]
      },
      tokenomics: {
        label: "Tokenomics",
        title: "WHY A2H TOKEN",
        content: [
          "USDC/USDT already handle payments. Why do we need a token? Because stablecoins solve HOW to pay, not WHO guarantees trust. Human operators can submit fake evidence and disappear, take tasks and never deliver — these are behaviors stablecoins cannot constraint. A2H makes credibility quantifiable and enforceable.",
          "Without token: Anyone can register, take tasks, and disappear. Platform relies on manual review, disputes move slowly.",
          "With token: Stake tier determines task access. Junior operators do simple tasks to build reputation. Senior operators unlock high-value tasks. Breach gets slashed, disputes have escrow."
        ],
        utilities: [
          { name: "Operator Eligibility", desc: "Stake A2H to become a registered operator. Low stake = entry tasks (data collection, form filling); High stake = advanced tasks (onsite verification, compliance signing). Higher stake = access to higher-value tasks." },
          { name: "Breach Collateral", desc: "Prepay collateral when accepting tasks, released after verified completion. Timeout / fake evidence / abandonment → collateral slashed, paid to task buyer. This ensures real delivery pressure." },
          { name: "Dispute Escrow", desc: "Both parties stake equal A2H in disputes. Honest party receives both stakes as reward. Cheating costs everything, honesty is profitable." },
          { name: "Task Priority", desc: "Under same conditions, high-stakers get priority matching. Long-term high-stakers gain stable premium task flow, creating positive flywheel." },
          { name: "Compliance Unlocks", desc: "Sensitive tasks (KYC, financial compliance, on-site signing) require specific stake tiers to participate. It's not about having money, it's about having credibility." },
          { name: "Governance", desc: "Holders vote on: staking threshold adjustments, slash ratios, dispute arbitration rules, new task type openings. Protocol evolves with the market." }
        ],
        totalSupply: "100,000,000,000",
        supplyLabel: "Total Supply"
      },
      milestones: {
        label: "Milestones",
        title: "KEY ACHIEVEMENTS",
        items: [
          { date: "2026-02-16", desc: "Public launch: site + live demo + waitlist" },
          { date: "2026-03-31", desc: "Reliable closed-loop MVP: evidence + review + settlement" },
          { date: "2026-04-30", desc: "API + webhook integrations live" },
          { date: "2026-05-31", desc: "A2H utility v1: access, staking, rewards, governance" }
        ]
      },
      closing: {
        label: "Closing",
        title: "THE PRODUCT IS THE LOOP",
        content: [
          "AI2Human is not trying to replace humans with AI or AI with humans. It is building the coordination layer where both are composed for reliable outcomes.",
          "AI handles scale and speed in digital environments. Humans handle reality and edge-case judgment. The system provides routing, proof, verification, and settlement across both."
        ],
        rule: {
          label: "THE RULE",
          content: "No \"analysis-only\" outputs. If work is not completed, it is not done. Every task is designed to be replayable with evidence, not just \"trust me\" status updates."
        }
      },
      links: {
        label: "Links",
        title: "PROJECT SURFACES",
        items: [
          { label: "Open AI2Human GitHub", href: "https://github.com/ai2humanagent/ai2humanwork" },
          { label: "Open AI2Human X", href: "https://x.com/ai2humannetwork" },
          { label: "Back to Home", href: "/" }
        ]
      },
      sidebar: [
        "Introduction",
        "The Problem",
        "Our Solution",
        "Architecture",
        "Multi-Agent System",
        "Settlement",
        "Target Users",
        "Marketplace",
        "Live Product",
        "Competitive Moat",
        "Jury System",
        "Identity & Reputation",
        "Roadmap",
        "Tokenomics",
        "Milestones",
        "Closing",
        "Links"
      ]
    }
  },
  zh: {
    nav: {
      home: "首页",
      paper: "白皮书",
      github: "GitHub",
      contact: "X / 联系"
    },
    hero: {
      eyebrow: "AI2Human Network",
      updated: "2026年6月更新",
      title: "AI2Human",
      subtitle: "Agent 发起请求，人类产生证明，验证后完成结算。AI2Human 是 Agent 工作流的人类执行与验证网络。"
    },
    sections: {
      intro: {
        label: "简介",
        title: "什么是 AI2Human",
        content: [
          "AI2Human 是 Agent 工作流的人类执行与验证网络。它把 Agent 或项目方的请求转化为人类执行、结构化证明、验证和链上结算。",
          "我们不是在构建聊天机器人，也不是普通任务 App。我们在构建一个网络层：当工作流需要真实账户、本地操作、人类判断、合规检查、证明收集或验证后支付时，Agent 可以调用 AI2Human。",
          "大多数 AI 产品止步于输出。AI2Human 为完成而构建。每个请求都经过清晰循环：Agent 请求 → 人类执行 / 验证 → 结构化证明 → 验证 → 结算。"
        ]
      },
      problem: {
        label: "问题",
        title: "执行差距",
        content: [
          "真正的瓶颈不是智能，而是执行连续性。在生产环境中，工作在交接点失败，而不是提示词质量。",
          "任务在AI遇到现实约束时中断：验证码、签名、现场检查、物理验证、身份绑定操作、合规门槛和商户协调。这些是软件无法单独完成的步骤。",
          "传统自由职业平台协调人类但速度慢、信任成本高、运营昂贵。Agent平台自动化数字工作流但在需要现实执行的最后一公里失败。",
          "目前，这个差距通过DM、电子表格、手动支付和口口相传来处理。一个团队的工作不会积累。一个部署学到的东西，下一个往往从头开始。"
        ],
        highlight: {
          label: "市场机会",
          content: "AI可以大规模执行数字工作流——但现实世界的备援在大多数Agent系统中仍未解决。支付轨道正在成为机器原生的。可验证的身份和声誉标准正在成熟。这就是窗口期。"
        }
      },
      solution: {
        label: "我们的方案",
        title: "闭合循环",
        content: [
          "AI2Human 通过一个可审计的状态机，把 Agent 的速度和人类的执行/验证能力组合起来。每个请求都有明确输入、输出、证明要求、验证规则和结算记录。"
        ],
        coreLoop: {
          label: "核心循环",
          content: "Agent 请求 → 人类执行 / 验证 → 结构化证明 → 验证 → 结算"
        },
        phases: [
          {
            name: "阶段1",
            title: "Agent 接入",
            desc: "Agent、协议、活动团队和项目方通过 skill、API、模板或前端提交请求，携带范围、预算、截止时间、资格条件和证明要求。"
          },
          {
            name: "阶段2",
            title: "规范化与路由",
            desc: "AI2Human Router 将请求转成结构化任务，确定任务类型、证明模式、操作员资格、审核模式、价格和结算路径。"
          },
          {
            name: "阶段3",
            title: "AI 优先执行",
            desc: "软件原生步骤优先由 Agent 和 OpenClaw 完成，包括浏览器操作、信息收集、表单流程、任务监控和数据整理。"
          },
          {
            name: "阶段4",
            title: "人类执行 / 验证",
            desc: "当工作进入身份绑定、本地操作、合规检查、现场证明、人工判断或文件验证时，网络派发给合格人类操作员或审核员。"
          },
          {
            name: "阶段5",
            title: "证明与验证",
            desc: "操作结果被整理成结构化证明包：链接、截图、照片、时间戳、钱包证据、文件、审核记录和哈希。验证通过后才进入结算。"
          },
          {
            name: "阶段6",
            title: "结算与记忆",
            desc: "Base USDC、奖池、退款、领取和声誉更新都由验证状态触发。每次完成都会成为网络记忆，改善下一次路由。"
          }
        ]
      },
      architecture: {
        label: "架构",
        title: "AI2Human Network 架构",
        content: [
          "AI2Human 不只是任务页面，而是一个面向 Agent 工作流的网络栈：Agent 或项目发起请求，系统规范化和路由，人类执行或验证，输出结构化证明，验证通过后结算，并把结果写回声誉和网络记忆。",
          "关键变化是：每个任务不再是一次性记录。证明质量、操作员表现、审核结果、争议、支付状态和策略约束都会反过来提升下一次调度。"
        ],
        flow: [
          { name: "Agent / 项目请求", desc: "Agent、代币团队、活动团队、协议和开发者通过 skill、API、模板或产品界面请求工作。" },
          { name: "规范化与路由", desc: "Router 将请求转成范围、截止时间、奖励、资格条件、证明模式、策略包和结算模式。" },
          { name: "人类执行 / 验证", desc: "合格操作员执行需要人类参与的步骤：账户绑定、本地检查、文件审核、社交证明、KYC/KYB 支持或现场验证。" },
          { name: "结构化证明", desc: "产出变成证明包：URL、截图、文件、时间戳、钱包证据、审核元数据、哈希和状态转换。" },
          { name: "验证", desc: "规则检查、AI 审核、人类审核、重复检测、欺诈检查、争议窗口和仲裁共同决定证据是否可支付。" },
          { name: "结算与记忆", desc: "USDC、奖池、退款、领取和声誉更新只在验证通过后触发，并写入网络记忆。" }
        ],
        layers: [
          { name: "1. Agent 接入层", desc: "Skill 文件、API、SDK、manifest、webhook 和任务模板，让 AI2Human 可以被 Agent 直接调用。" },
          { name: "2. 任务接收", desc: "直接提交、API 集成、活动流程和市场管道，统一做结构化规范。" },
          { name: "3. AI2Human Router", desc: "选择任务类型、证明模式、操作员资格、价格、审核模式、升级路径和结算方式。" },
          { name: "4. Agent Context & Skill Runtime", desc: "任务记忆、证明记忆、操作员/审核员历史、策略包、权限和可复用 Agent skills。" },
          { name: "5. AI 执行引擎", desc: "OpenClaw 驱动的浏览器自动化、Web 工作流、数据收集、表单操作和软件原生执行。" },
          { name: "6. 人类执行网络", desc: "验证过的操作员执行或验证现实世界、身份绑定、合规敏感或需要判断的步骤。" },
          { name: "7. 结构化证明层", desc: "日志、链接、截图、照片、收据、时间戳、钱包证据、审核记录、哈希和证明包。" },
          { name: "8. 验证引擎", desc: "确定性规则、AI 审核、人类审核、重复检测、欺诈信号、争议窗口和仲裁。" },
          { name: "9. 结算层", desc: "Base USDC、托管、奖池、退款、领取、支付记录和 x402 风格机器原生支付流程。" },
          { name: "10. 声誉图谱", desc: "操作员可靠性、审核员准确率、证明质量、Agent 行为、争议结果和项目历史。" },
          { name: "11. Compliance & RWA Oracle", desc: "为 B20、RWA、本地稳定币和受监管资产提供人类验证的 KYC/KYB、地点、实体、文件和资产证明。" },
          { name: "12. 网络治理", desc: "A2H 访问、质押等级、罚没条件、策略更新、争议规则、任务类型开放和生态激励。" }
        ],
        modules: [
          { name: "Agent Skill Layer", desc: "任何 Agent 都可以通过可复用 skill 创建活动、请求验证、读取报告、监控结算或准备 B20/RWA 证明工作流。" },
          { name: "Compliance & RWA Oracle", desc: "人类验证员产出结构化合规证明，供代币系统在 mint、角色授权、转账策略更新或续期检查前使用。" },
          { name: "B20 Proof Gateway", desc: "AI2Human 可为 Base 上的 B20 发行方准备证明要求、角色策略、allowlist 规则、freeze/seize 策略输入和部署清单。" },
          { name: "Network Memory", desc: "每个任务、证明、审核、争议、支付和操作员行为都会改善未来路由，而不是作为一次性任务消失。" }
        ]
      },
      agents: {
        label: "多Agent系统",
        title: "八种系统角色",
        content: [
          "系统由多个专业角色通过执行循环协同。它们不全是软件 Agent，也包括人类操作员和策略模块；每个角色都负责一个明确的状态转换。"
        ],
        roles: [
          { name: "Requester Agent", desc: "当工作流需要人类执行、证明或验证时，通过 skill、API 或模板调用 AI2Human。" },
          { name: "规划器Agent", desc: "负责路线选择，把请求转成执行计划，并决定任务继续自动化还是进入人类执行网络。" },
          { name: "Context & Policy Agent", desc: "在路由前读取历史任务结果、证明质量、操作员可靠性、审核准确率和策略约束。" },
          { name: "调度器Agent", desc: "将阻塞工作匹配到可支付的运营商，编写执行简报、证明规则和支付目标。" },
          { name: "人类操作员", desc: "执行现实世界的步骤并返回结构化证明。处理签名、取件、现场检查。" },
          { name: "验证器Agent", desc: "在支付移动之前检查证明结构、字段完整性和重复提交。" },
          { name: "Compliance Oracle Agent", desc: "为 B20、RWA 和受监管工作流打包人类验证的 KYC/KYB、实体、文件、资产和地点证明。" },
          { name: "结算Agent", desc: "仅在验证器标记任务可支付后释放支付。写入真实交易哈希。" }
        ]
      },
      settlement: {
        label: "结算",
        title: "链上支付轨道",
        content: [
          "AI2Human支持多个结算轨道，Base作为主要产品路径。结算通过x402协调，使支付成为机器原生和状态触发——减少支付延迟、消除歧义、降低信任摩擦。"
        ],
        rails: [
          { name: "Base（主要）", desc: "Base主网上的USDC结算。默认产品轨道，带实时链上收据。" },
          { name: "X Layer（活跃）", desc: "OKX X Layer上的USDT0结算。可投入生产的次要轨道。" },
          { name: "BNB Chain（存档）", desc: "保存的历史结算收据作为概念证明。" },
          { name: "x402集成", desc: "支付门控验证包流程。次要证明访问能力。" }
        ],
        liveProof: {
          label: "实时BASE结算",
          content: "财政部充值：0x3fe5b99b2af4934c3b30d3087a703157e4f7cfcb... | 结算交易：0xee543bc107b411edd0202131b82172eb6efaf29c10457e33d2900ae890a72cf0 | 资产：0.01 USDC | 网络：Base主网"
        }
      },
      users: {
        label: "目标用户",
        title: "谁可以参与",
        content: [
          "AI2Human 面向需要人类执行或验证能力的 Agent 构建者、协议、活动团队、合规资产发行方，以及能够提供可靠证明的人类操作员。",
          "这不是普通零工市场。它是一个结构化执行与验证层：人类产出证明，审核器验证结果，结算跟随被接受的证据。"
        ],
        personas: [
          { name: "Agent 构建者", desc: "正在构建需要人类执行、证明收集、验证或验证后支付的 Agent 团队。" },
          { name: "人类操作员", desc: "能够完成本地行动、身份绑定任务、文件检查、证明收集和审核工作的人。" },
          { name: "AI Agent", desc: "遇到现实约束的自主Agent。不再失败，而是把任务派给人类操作员，获得结构化证明用于验证。" },
          { name: "发行方与协议", desc: "需要人类验证 KYC/KYB、实体检查、资产证明或合规证明的 B20、RWA、本地稳定币和受监管资产团队。" },
          { name: "陪审员", desc: "质押A2H参与争议仲裁的普通用户。审查证据、投票决定结果，正确判决获得奖励。" }
        ],
        flywheel: "更多验证操作员 → 更强证明覆盖 → 更多 Agent / 协议需求 → 更多任务与审核 → 更强声誉数据。"
      },
      marketplace: {
        label: "市场",
        title: "多角色设计",
        content: [
          "AI2Human 支持多角色参与，但核心不是发布零工，而是把 Agent 工作流中需要人类的步骤变成可验证、可结算、可复用的网络状态。"
        ],
        roles: [
          { name: "请求方", desc: "定义需求、验收标准和预算。提交带有证明规则和结算条件的请求。" },
          { name: "人类操作员", desc: "完成现实绑定的子任务：现场检查、签名、物理验证、照片证明。任何有技能的人都可以加入。" },
          { name: "AI Agent", desc: "遇到现实约束时将任务派给人类操作员的自主Agent。" },
          { name: "陪审员", desc: "质押A2H参与争议解决的普通人。审查证据、投票决定结果，正确判决获得奖励。" }
        ],
        taskTypes: {
          title: "任务类别",
          items: [
            { name: "本地验证", desc: "现场检查、商店走访、照片证明、场地核实。" },
            { name: "身份操作", desc: "社交媒体发帖、活动回复、引用帖子，需要人类身份。" },
            { name: "实物任务", desc: "取件、配送、交接、签收单、文件签字。" },
            { name: "数字任务", desc: "填表、数据录入、账户管理、验证任务。" },
            { name: "Compliance & RWA Oracle", desc: "KYC/KYB 支持、实体检查、文件证明、本地稳定币审核、B20/RWA 发行验证。" },
            { name: "跑腿服务", desc: "跑腿、购物、排队、本地服务。" }
          ]
        }
      },
      liveproduct: {
        label: "当前产品",
        title: "立即体验",
        content: [
          "平台已上线运行。你可以体验完整的任务生命周期——从浏览任务、接单、完成、到链上结算。"
        ],
        features: [
          {
            name: "任务列表",
            desc: "访问 /tasks 浏览所有可用任务。按状态、类别、奖励金额筛选。每个任务显示需求、截止时间、证据模式。",
            link: { label: "打开任务列表", href: "/tasks" }
          },
          {
            name: "任务详情",
            desc: "点击任意任务查看完整详情：描述、验收标准、证据要求、奖励、SLA计时器。每个任务都为可验证完成而设计。",
            link: { label: "查看示例任务", href: "/tasks/7bde6365-9e4a-4fa9-a2f4-e79657b354b3" }
          },
          {
            name: "接任务",
            desc: "已登录的操作员可直接从任务详情页接单。接单后任务进入你的活跃队列，带SLA追踪。"
          },
          {
            name: "提交证据",
            desc: "完成任务后，通过结构化证据表单提交证明：截图、链接、照片、时间戳。系统在接收前验证证据格式。"
          },
          {
            name: "审核与结算",
            desc: "审核员验证提交的证据。审核通过的任务通过x402自动触发链上结算。提交失败的任务返回返工并附带原因代码。"
          }
        ],
        cta: {
          label: "开始使用平台",
          href: "/tasks"
        }
      },
      moat: {
        label: "护城河",
        title: "为什么AI2Human能赢",
        content: [
          "构建任务页面很容易。构建一个 Agent 可调用、证明可验证、结算可信、声誉可复用的人类执行网络很难。AI2Human 的护城河来自网络记忆和证明标准。"
        ],
        advantages: [
          { name: "网络效应", desc: "更多操作员 → 更快匹配 → 更好完成率 → 更多买家 → 更多任务。先达成临界质量的先行者会创造自我强化增长，后来者难以复制。" },
          { name: "AI调度效率", desc: "我们的AI匹配算法从每个任务完成中学习。随着规模增长，我们知道哪个操作员处理哪种任务类型最快最可靠。这种调度智能随规模复合。" },
          { name: "质押可信度体系", desc: "没有其他平台有我们这样的经济可信度层。操作员质押真实价值才能参与。假证据会被罚没。争议由陪审团解决。这种信任基础设施需要时间和资本来构建。" },
          { name: "证据标准", desc: "我们已经定义了各种任务类型下「完成证明」的含义。这个证据模式成为行业标准——其他平台要么采用我们的标准，要么显得不那么可信。" },
          { name: "地理覆盖", desc: "任务完成需要附近的操作员。随着我们扩展到更多城市和地区，覆盖密度增加，完成率提高，新进入者面临冷启动问题。" },
          { name: "陪审团体系护城河", desc: "我们的去中心化陪审团系统创造了新一代平台参与者（陪审员），他们有真实利益在里面。这创造了纯支付平台无法复制的忠诚度和参与度。" }
        ]
      },
      jury: {
        label: "陪审团机制",
        title: "去中心化争议解决",
        content: [
          "当买家拒绝证据而操作员不同意时会发生什么？传统平台依赖中心化客服——慢、贵、往往不公平。",
          "AI2Human通过去中心化陪审团系统解决这个问题：普通平台用户解决争议，正确判决获得奖励。"
        ],
        workflow: [
          { step: "1. 开启争议", desc: "买家在证据审核窗口内提出争议，指出提交证据的具体问题。" },
          { step: "2. 陪审团抽选", desc: "系统从A2H质押参与者池中随机选择N名陪审员。选择考虑：质押金额、争议类别专业度、历史准确率。" },
          { step: "3. 证据审查", desc: "陪审员访问任务背景、证据包和双方的陈述。私下审议。" },
          { step: "4. 投票", desc: "陪审员投票：买家诚实？操作员诚实？双方？还是都不？投票上链——透明但匿名。" },
          { step: "5. 裁决", desc: "多数票胜出。诚实方获得双方的争议押金。投票正确的陪审员获得陪审奖励。" },
          { step: "6. 罚没与奖励", desc: "输方的押金分配：部分给胜方、部分给正确投票的陪审员、部分给协议财政部。" }
        ],
        jurorRequirements: {
          title: "陪审员要求",
          items: [
            { name: "最低质押", desc: "必须质押最低A2H才能加入陪审池。质押越高，被选中概率越大。" },
            { name: "准确率记录", desc: "准确率高的陪审员在未来的争议中有优先选择权。" },
            { name: "无利益冲突", desc: "陪审员不能涉及有争议的任务（操作员、买家或相关方）。智能合约强制执行。" }
          ]
        },
        slashConditions: {
          title: "陪审员罚没条件",
          items: [
            { name: "多数串通", desc: "如果多数陪审员投票错误并串通，他们面临协议监控的罚没风险。" },
            { name: "不参与", desc: "被选中的陪审员在规定时间内不投票，失去陪审信誉分。" },
            { name: "随机审计", desc: "一定比例的已解决争议会被审计。错误的投票触发惩罚。" }
          ]
        },
        rewards: {
          title: "陪审奖励",
          content: "正确的陪审员获得：争议池分成 + 准确率奖励 + 声誉提升。随着时间推移，有经验的陪审员形成「案件准确率」档案，增加选择率和奖励倍数。"
        }
      },
      identity: {
        label: "身份与声誉",
        title: "ERC-8004对齐",
        content: [
          "AI2Human使用erc-8004对齐的身份和声誉语义，用于可验证的Agent历史和可移植信任上下文。系统跟踪谁执行了每一步、完成可靠性、恢复速度和证据质量。",
          "声誉从可验证的结果而非品牌产生。随着数据积累，路由质量提高，强者运营商获得可见度，市场可靠性复合增长。",
          "运营商可以通过经验证的配置文件、技能认可和完成历史解锁信任徽章和路由优先级。身份层支持跨部署的可移植声誉。"
        ]
      },
      roadmap: {
        label: "路线图",
        title: "执行计划",
        phases: [
          {
            period: "D1-D14",
            title: "发布强化",
            desc: "上线落地页+实时演示+等待列表。完成任务状态机。添加完整证据模式（日志、链接、照片、时间戳、运营商ID）。添加基本审核员流程（批准/驳回/返工+原因代码）。发布公共指标面板。"
          },
          {
            period: "D15-D30",
            title: "市场可靠性",
            desc: "构建AI优先路由规则（技能、紧急程度、地理位置、置信度）。构建验证码/现场/签名/照片任务的人类备援调度器。添加SLA计时器和超时升级。添加运营商评分v1。添加可回放的任务时间线以供审计。"
          },
          {
            period: "D31-D45",
            title: "真实运营+集成",
            desc: "开放合作伙伴任务摄入API+webhook回调。添加基于模板的任务发布（合规、验证、现场运营）。添加争议工作流v1（证据锁定+审核员分配）。添加与验证状态挂钩的结算账本视图。"
          },
          {
            period: "D46-D60",
            title: "代币效用激活",
            desc: "激活A2H访问层级（高级API+运营商工具）。启动信任层级和路由优先级的质押v1。启动验证执行贡献的奖励v1。启动费用和激励参数投票的治理v1。"
          },
          {
            period: "D61-D120",
            title: "规模阶段",
            desc: "扩大区域覆盖和运营商类别。使用每任务类型的策略包升级验证引擎。添加反滥用和质量风险控制。添加企业报告（SLA、争议率、结算延迟）。发布外部构建者的集成SDK。"
          },
          {
            period: "D121-D180",
            title: "网络阶段",
            desc: "深化erc-8004对齐的身份/声誉可移植性。将核心市场参数转移到治理控制更新。启动构建者/审核员/运营商的生态系统激励。添加路由市场情报。"
          }
        ]
      },
      tokenomics: {
        label: "代币经济学",
        title: "为什么需要A2H代币",
        content: [
          "USDC/USDT已经能完成支付，为什么还要发代币？因为稳定币只能解决「怎么付」，解决不了「谁来担保」。人类操作员提交假证据后消失、随便接单不交付——这些是稳定币无法约束的行为。A2H通过经济激励机制让可信度可量化、可追责。",
          "没有代币：任何人可以随便注册、随便接任务、随便消失。平台只能靠人工审核，效率低下，纠纷处理缓慢。",
          "有了代币：质押等级决定任务权限。低级操作员做简单任务积累信誉，高级操作员解锁高价值任务。违约被罚没，争议有押金担保。"
        ],
        utilities: [
          { name: "操作员资格门槛", desc: "质押A2H才能成为注册操作员。低质押 = 低级任务（数据收集、表单填写）；高质押 = 高级任务（现场验证、合规签约）。质押越高，能接的任务价值越高。" },
          { name: "违约保证金", desc: "接任务时预付保证金，任务完成并通过验证后释放。超时/假证据/中途放弃→保证金被罚没，赔付给任务买家。这确保操作员有真实的交付压力。" },
          { name: "争议仲裁押金", desc: "争议双方各押等额A2H。审核员裁定的诚实方获得双方押金。作弊代价极高，诚实有利可图。" },
          { name: "任务优先级", desc: "同等条件下，高质押者的任务匹配优先。长期高质押者获得稳定的优质任务流，形成正向飞轮。" },
          { name: "合规任务解锁", desc: "敏感任务（KYC验证、金融合规、现场签约）需要达到特定质押等级才能参与。不是有钱就能接，是有信誉才能接。" },
          { name: "治理投票", desc: "持有者投票决定：质押门槛调整、罚没比例、争议仲裁规则、新的任务类型开放。这让协议随市场成长而进化。" }
        ],
        totalSupply: "100,000,000,000",
        supplyLabel: "总供应量"
      },
      milestones: {
        label: "里程碑",
        title: "关键成就",
        items: [
          { date: "2026-02-16", desc: "公开发布：网站+实时演示+等待列表" },
          { date: "2026-03-31", desc: "可靠的闭环MVP：证据+审核+结算" },
          { date: "2026-04-30", desc: "API+webhook集成上线" },
          { date: "2026-05-31", desc: "A2H实用v1：访问、质押、奖励、治理" }
        ]
      },
      closing: {
        label: "结语",
        title: "产品即循环",
        content: [
          "AI2Human不是在试图用AI取代人类或用人类取代AI。它正在构建协调层，让两者组合以获得可靠的结果。",
          "AI在数字环境中处理规模和速度。人类处理现实和边缘情况判断。系统在两者之间提供路由、证明、验证和结算。"
        ],
        rule: {
          label: "核心规则",
          content: "没有\"仅分析\"的输出。如果工作未完成，就算未完成。每个任务都被设计成可回放的、带证据的，而不仅仅是\"相信我\"的状态更新。"
        }
      },
      links: {
        label: "链接",
        title: "项目入口",
        items: [
          { label: "访问AI2Human GitHub", href: "https://github.com/ai2humanagent/ai2humanwork" },
          { label: "访问AI2Human X", href: "https://x.com/ai2humannetwork" },
          { label: "返回首页", href: "/" }
        ]
      },
      sidebar: [
        "简介",
        "问题",
        "我们的方案",
        "架构",
        "多Agent系统",
        "结算",
        "目标用户",
        "市场",
        "当前产品",
        "护城河",
        "陪审团机制",
        "身份与声誉",
        "路线图",
        "代币经济学",
        "里程碑",
        "结语",
        "链接"
      ]
    }
  }
};
