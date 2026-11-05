/**
 * EGG / Personal AI first-contact protocol.
 *
 * This is a capability request to the USER'S external AI, not a way for EGG to
 * enumerate the user's personal AI connectors. EGG has no access to their cloud,
 * provider tokens, private conversations or local tools.
 *
 * Read-only, project-independent, no credentials and no storage side effects.
 */
export const EGG_AI_ONBOARDING_VERSION = "egg.ai-onboarding/0.1" as const;

export const EGG_AI_ONBOARDING = {
  schema: EGG_AI_ONBOARDING_VERSION,
  protocolStatus: "instructions_only",
  scope: "the user's own AI client, not the EGG website",
  product: {
    engine: "EGG",
    egg: "The Egg is the project and process controller: original Author idea, eight spheres, tasks, statuses, level, iteration and decisions.",
    yolk: "The Yolk visualizes emerging product form and its versions. An experiment is not automatically an approved design.",
    spheres: [
      "marketing", "legal", "design", "production", "testDrive",
      "procurement", "commerce", "retail",
    ],
    author: "Only the human Author may approve or reject a concept, change the approved core or make final decisions.",
    ai: "The user's AI researches, discusses, makes draft proposals and can use available, authorized tools; it never assumes Author rights.",
  },
  firstContact: [
    {
      id: "read_protocol",
      instruction: "Understand the EGG structure, your limited role and the difference between an approved decision and a proposed draft.",
    },
    {
      id: "inspect_your_own_environment",
      instruction: "Inspect ONLY the tools, connected apps and access permissions actually exposed to YOU in your AI client. Do not assume that EGG knows or can inspect them.",
    },
    {
      id: "check_cloud_storage",
      instruction: "Look for an authorized cloud/file storage integration in YOUR AI environment. If available and permitted, perform a minimal non-destructive metadata/list read to verify actual access. Do not create, upload or delete files as a test.",
    },
    {
      id: "report_or_request_connection",
      instruction: "If storage is absent, inaccessible or cannot be inspected, tell the user and offer to guide them through connecting storage within their AI provider. Do not claim it is connected or ask for passwords or API secrets.",
    },
    {
      id: "continue_with_egg",
      instruction: "With an authorized EGG project ID, use egg_get_project_state to read the actual revision before proposing project changes. For file work, verify actual storage tool results before registering any file reference in EGG.",
    },
  ],
  storage: {
    connectedTo: "user_ai_client",
    notConnectedTo: "egg_engine",
    neededFor: "Full workflows involving documents, files, images, 3D models and durable versioned artifacts.",
    examplesOnly: ["Google Drive", "OneDrive", "Dropbox", "other cloud storage exposed by the user's AI"],
    connectionAction: "User explicitly connects a supported storage provider in their AI client's own app or settings.",
    safety: "Keep provider tokens and credentials out of EGG. Use least-privilege permissions; request any required consent from the user.",
    verification: "Only claim verified when an actual permitted storage tool call returns a successful result in this session; connector listing alone is not sufficient.",
    ifMissing: "Continue non-file discussions in limited mode, with a clear warning that file saving and versioning are not ready.",
  },
  reporting: {
    validStorageStates: ["verified", "not_connected", "access_denied", "unknown"],
    defaultStorageState: "unknown",
    readyCriterion: "The AI has independently confirmed access to a file storage tool in its own environment.",
    unknownCriterion: "The AI cannot inspect or test connectors or the user has not authorized access.",
    format: "Tell the user which EGG tools you can actually access, whether storage is verified, what is missing and the smallest next user action.",
    note: "EGG itself cannot verify the AI client's private connector state from this MCP response. Never invent a successful check.",
  },
  eggPermissions: {
    read: "Read the permitted project state with egg_get_project_state.",
    propose: "Submit only authorized drafts and contributions; existing project permissions apply.",
    approve: "Not permitted to the AI.",
    files: "Store real files with the AI's own authorized storage connector, then optionally register genuine returned references in EGG.",
  },
} as const;

export function getEggAiOnboardingProtocol() {
  return {
    ok: true,
    ...EGG_AI_ONBOARDING,
    storageChecked: false,
    status: "pending_ai_side_verification",
    userMessageRu: "EGG подключён как инструмент. Проверь облачное хранилище в своей среде ИИ. Если доступа нет или проверить нельзя, сообщи об этом пользователю и предложи подключить его там.",
  };
}

/** For AI clients that cannot surface MCP initialize.instructions automatically. */
export function getEggAiFirstContactPrompt(): string {
  return [
    "Первое подключение к EGG Engine.",
    "",
    "Ты — мой личный ИИ. EGG — движок проекта, а не отдельный ИИ и не владелец твоих подключений.",
    "1. Если доступен MCP-инструмент egg_get_onboarding_protocol, вызови его и изучи правила, устройство Яйца, Желтка, восьми сфер и полномочия Автора.",
    "2. Посмотри, какие приложения и инструменты действительно доступны именно ТЕБЕ.",
    "3. Проверь облачное хранилище в своей ИИ-среде. Если оно подключено и у тебя есть разрешение, проверь доступ безопасным чтением списка или метаданных. Не создавай файлы для проверки.",
    "4. Если облако отсутствует, недоступно или ты не можешь его проверить, скажи прямо и помоги мне подключить его на твоей стороне. Не говори, что подключено, без проверки.",
    "5. Сообщи кратко: доступен ли EGG, проверено ли облако, какие есть ограничения и что мне нужно сделать. Не запрашивай у меня пароли, токены или секреты.",
    "6. Пока облако не проверено, можешь помогать с идеями и диалогом, но не обещай сохранения файлов. Все решения по проекту остаются за Автором.",
  ].join("\n");
}


/**
 * Compact first-read handoff for clients with a cached MCP tool catalog.
 * Exposed only as part of an already authorized project read.
 * This is a request for the AI to check its own apps, not EGG telemetry.
 */
export function getEggAiReadHandoff(){
  return {
    schema: EGG_AI_ONBOARDING_VERSION,
    source: "egg_project_state",
    cloudStorageStatus: "unknown" as const,
    cloudVerifiedByEgg: false,
    noteRu: "Ты — личный ИИ пользователя. EGG — движок, а не владелец твоих приложений. Проверь доступ к облачному хранилищу в своей ИИ-среде, если ранее в этом сеансе ещё не проверял. Сначала установи, какие инструменты действительно доступны тебе, и лишь при наличии разрешения сделай безопасное чтение метаданных. Не запрашивай секреты, не создавай тестовых файлов и не заявляй, что облако подключено, без фактического результата. Если проверить нельзя, кратко сообщи об ограничении. Доступ к проекту EGG не означает доступ к облаку. Автор утверждает решения; ИИ только предлагает.",
    onboardingTool: "egg_get_onboarding_protocol",
  };
}
