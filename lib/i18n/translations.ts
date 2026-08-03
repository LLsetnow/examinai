export type Language = "zh" | "en";

export interface Translations {
  common: {
    language: string;
    newEssay: string;
    retry: string;
    history: string;
    home: string;
  };
  writing: {
    appSubtitle: string;
    instantFeedback: string;
    heroTitleStart: string;
    heroTitleAccent: string;
    heroDescription: string;
    featureScores: string;
    featureCorrections: string;
    featureVocabulary: string;
    startAssessment: string;
    noHistory: string;
    questionBank: string;
    questionBankDescription: string;
    book: string;
    test: string;
    useQuestion: string;
    loadingQuestion: string;
    bankUnavailable: string;
    source: string;
    manualEditHint: string;
    task1: string;
    task2: string;
    question: string;
    questionPlaceholder: string;
    chart: string;
    optional: string;
    remove: string;
    uploadImage: string;
    uploadedChart: string;
    yourEssay: string;
    essayPlaceholder: string;
    wordCount: string;
    assess: string;
    privacyNotice: string;
    questionText: string;
    taskChart: string;
    localChartFacts: string;
    visionChartFallback: string;
    settings: string;
    settingsTitle: string;
    settingsDescription: string;
    settingsClose: string;
    settingsScoring: string;
    settingsScoringDescription: string;
    settingsVision: string;
    settingsVisionDescription: string;
    settingsApiURL: string;
    settingsApiURLPlaceholder: string;
    settingsApiKey: string;
    settingsApiKeyPlaceholder: string;
    settingsModel: string;
    settingsModelPlaceholder: string;
    settingsSelectModel: string;
    settingsFetchModels: string;
    settingsNeedConnection: string;
    settingsNoModels: string;
    settingsModelsError: string;
    settingsSaveError: string;
    settingsLocalOnly: string;
    settingsHistoryFolder: string;
    settingsHistoryFolderDescription: string;
    settingsHistoryFolderEmpty: string;
    settingsHistoryFolderChoose: string;
    settingsHistoryFolderChange: string;
    settingsHistoryFolderClear: string;
    settingsHistoryFolderUnsupported: string;
    settingsHistoryFolderError: string;
    settingsHistoryFolderPrivacy: string;
    settingsReset: string;
    settingsSave: string;
    historyTitle: string;
    historyDescription: string;
    noHistoryRecords: string;
    historyLocalOnly: string;
    historyOpenReport: string;
    historyPartial: string;
    historyComplete: string;
    historyLoadError: string;
    historyDelete: string;
    historyDeleteConfirm: string;
    historyDeleteError: string;
    historyReadingFolder: string;
    historyFolderRequired: string;
    historyFolderPermissionDenied: string;
    historyFolderUnsupported: string;
  };
  feedback: {
    taskResponse: string;
    taskAchievement: string;
    coherenceCohesion: string;
    lexicalResource: string;
    grammaticalRange: string;
    strengths: string;
    weaknesses: string;
    correction: string;
    overview: string;
    original: string;
    waitingForFeedback: string;
    backgroundAssessmentNotice: string;
    overall: string;
    bandScore: string;
    assessmentLabel: string;
    forReference: string;
    keySignals: string;
    assessmentFailed: string;
    assessmentPartialError: string;
    assessmentIncomplete: string;
    assessmentProgressTitle: string;
    assessmentProgressPending: string;
    assessmentProgressComplete: string;
    assessmentProgressScoring: string;
    assessmentProgressLanguage: string;
    assessmentProgressImprovement: string;
    synonyms: string;
    topicPhrases: string;
    severeError: string;
    suggestion: string;
    highlight: string;
    noMappedFeedback: string;
    noCorrectionsGenerated: string;
    correctionFallbackNotice: string;
    correctionFallbackExplanation: string;
    correctionRegenerateNotice: string;
    correctionRegenerateAction: string;
    exportPdf: string;
    exportJson: string;
    exportJsonSaved: string;
    exportJsonDownloaded: string;
  };
}

export const translations: Record<Language, Translations> = {
  zh: {
    common: {
      language: "语言",
      newEssay: "批改作文",
      retry: "重试",
      history: "历史记录",
      home: "返回首页",
    },
    writing: {
      appSubtitle: "IELTS 写作智能批改",
      instantFeedback: "即时 AI 批改",
      heroTitleStart: "获得清晰、",
      heroTitleAccent: "可执行的雅思报告。",
      heroDescription: "粘贴任何 Task 1 或 Task 2 题目和作文。本次评估结束后会保存到本机历史文件，Examinai 不使用账号或云端数据库保存你的内容。",
      featureScores: "按四项雅思评分标准给出分数",
      featureCorrections: "在原文中按颜色标示批改内容",
      featureVocabulary: "提供近义词与话题表达建议",
      startAssessment: "开始批改",
      noHistory: "无需登录 · 不使用线上历史记录",
      questionBank: "剑雅 Academic 真题库",
      questionBankDescription: "选择册数和 Test 后自动回填题目；上方 Task 1 / Task 2 决定载入的题型，Task 1 会一并载入图表。",
      book: "剑雅册数",
      test: "套题",
      useQuestion: "使用此题目",
      loadingQuestion: "正在载入题目…",
      bankUnavailable: "本地题库尚未导入。",
      source: "题库来源",
      manualEditHint: "题目载入后仍可在下方自由修改。",
      task1: "Task 1 小作文",
      task2: "Task 2 大作文",
      question: "作文题目",
      questionPlaceholder: "在此粘贴雅思作文题目…",
      chart: "图表或示意图",
      optional: "（选填）",
      remove: "移除",
      uploadImage: "上传图表图片",
      uploadedChart: "已上传图表",
      yourEssay: "你的作文",
      essayPlaceholder: "在此粘贴或输入你的英文作文…",
      wordCount: "词数",
      assess: "开始智能批改",
      privacyNotice: "作文会发送至模型服务生成反馈；评估结果仅保存到当前项目的本机历史文件夹。",
      questionText: "题目",
      taskChart: "Task 1 图表",
      localChartFacts: "已匹配本地核验图表数据；批改时将跳过识图。",
      visionChartFallback: "该剑雅题目暂无本地核验图表数据；有图片时会调用图表识别。",
      settings: "API 设置",
      settingsTitle: "评分服务设置",
      settingsDescription: "为当前浏览器配置 OpenAI 兼容的评分与识图服务。留空时使用部署服务器的默认配置。",
      settingsClose: "关闭设置",
      settingsScoring: "作文评分 API",
      settingsScoringDescription: "用于四项评分、批改、近义词和话题表达。",
      settingsVision: "图表识别 API",
      settingsVisionDescription: "仅用于自定义或尚无本地事实数据的 Task 1 图表。",
      settingsApiURL: "API 地址",
      settingsApiURLPlaceholder: "https://api.example.com/v1",
      settingsApiKey: "API 密钥",
      settingsApiKeyPlaceholder: "留空则使用服务器默认密钥",
      settingsModel: "模型",
      settingsModelPlaceholder: "输入模型 ID",
      settingsSelectModel: "选择模型",
      settingsFetchModels: "获取模型",
      settingsNeedConnection: "请先填写 API 地址和 API 密钥，再获取模型列表。",
      settingsNoModels: "该 API 没有返回可用模型。你仍可手动填写模型 ID。",
      settingsModelsError: "无法获取模型列表，请检查 API 地址和密钥。",
      settingsSaveError: "无法保存本浏览器设置。",
      settingsLocalOnly: "密钥仅保存在当前浏览器，并只随你的评分请求发送；不会显示、保存或同步到服务器。",
      settingsHistoryFolder: "本地历史文件夹",
      settingsHistoryFolderDescription: "选择电脑中的文件夹后，历史页会读取其中的 JSON 批改报告；导出的 JSON 也会保存到这里。",
      settingsHistoryFolderEmpty: "未选择文件夹",
      settingsHistoryFolderChoose: "选择文件夹",
      settingsHistoryFolderChange: "更换路径",
      settingsHistoryFolderClear: "清除",
      settingsHistoryFolderUnsupported: "当前浏览器不支持选择本地文件夹；JSON 将使用浏览器下载。",
      settingsHistoryFolderError: "无法取得该文件夹的读取或写入权限，请重新选择。",
      settingsHistoryFolderPrivacy: "浏览器不会提供绝对路径；历史页只会读取你明确授权的文件夹，授权仅保存在当前浏览器，可随时清除。",
      settingsReset: "恢复服务器默认",
      settingsSave: "保存设置",
      historyTitle: "批改历史",
      historyDescription: "读取已授权本地文件夹中的作文与评分报告。",
      noHistoryRecords: "该本地文件夹中还没有可读取的 JSON 批改报告。完成批改后会自动保存到这里。",
      historyLocalOnly: "仅访问你在当前浏览器中授权的本地文件夹，不会同步到云端。",
      historyOpenReport: "查看报告",
      historyPartial: "部分报告",
      historyComplete: "完整报告",
      historyLoadError: "历史记录暂时无法读取，请稍后重试。",
      historyDelete: "删除记录",
      historyDeleteConfirm: "确定删除这条本地评分记录吗？此操作无法撤销。",
      historyDeleteError: "删除记录失败，请稍后重试。",
      historyReadingFolder: "正在读取本地文件夹",
      historyFolderRequired: "请先在 API 设置中选择本地历史文件夹，然后重试。",
      historyFolderPermissionDenied: "无法读取该本地文件夹。请在 API 设置中重新选择并授予权限。",
      historyFolderUnsupported: "当前浏览器不支持读取本地文件夹历史。请使用最新版 Chrome 或 Edge。",
    },
    feedback: {
      taskResponse: "任务回应",
      taskAchievement: "任务完成度",
      coherenceCohesion: "连贯与衔接",
      lexicalResource: "词汇资源",
      grammaticalRange: "语法多样性与准确性",
      strengths: "亮点",
      weaknesses: "提升方向",
      correction: "原句批改",
      overview: "评分与综合评价",
      original: "考生原文",
      waitingForFeedback: "正在生成反馈…",
      backgroundAssessmentNotice: "即使刷新或离开页面，批改也会在后台继续；完成后会自动保存到历史记录。",
      overall: "综合分数",
      bandScore: "雅思参考分数",
      assessmentLabel: "AI 评分",
      forReference: "仅供参考",
      keySignals: "重点信号",
      assessmentFailed: "批改失败",
      assessmentPartialError: "部分反馈暂时未能生成。",
      assessmentIncomplete: "评分在完成前中断，部分结果未生成，请重试。",
      assessmentProgressTitle: "批改进度",
      assessmentProgressPending: "未完成",
      assessmentProgressComplete: "已完成",
      assessmentProgressScoring: "任务与结构评分",
      assessmentProgressLanguage: "词汇、语法与原句批改",
      assessmentProgressImprovement: "改进建议",
      synonyms: "近义词",
      topicPhrases: "相关话题",
      severeError: "严重错误或语法问题",
      suggestion: "表达优化建议",
      highlight: "亮点句子",
      noMappedFeedback: "带有原文定位的反馈会显示在这里。",
      noCorrectionsGenerated: "本次未生成原句批改，如结果不完整可点击上方重试。",
      correctionFallbackNotice: "这份历史报告未保存可直接定位的原句，以下标记已根据原文与校正版的差异自动还原。",
      correctionFallbackExplanation: "该句与校正版存在修改，已在考生原文中标记。",
      correctionRegenerateNotice: "这份历史记录的原句批改来自旧版结果，内容与考生原文不一致，无法安全高亮。可重新生成仅此部分的批改。",
      correctionRegenerateAction: "重新生成原句批改",
      exportPdf: "导出 PDF",
      exportJson: "导出 JSON",
      exportJsonSaved: "JSON 报告已保存到选定的本地文件夹。",
      exportJsonDownloaded: "JSON 报告已下载。",
    },
  },
  en: {
    common: {
      language: "Language",
      newEssay: "Assess essay",
      retry: "Retry",
      history: "History",
      home: "Home",
    },
    writing: {
      appSubtitle: "IELTS Writing Assessment",
      instantFeedback: "Instant AI feedback",
      heroTitleStart: "Get a clear,",
      heroTitleAccent: "actionable IELTS report.",
      heroDescription: "Paste any Task 1 or Task 2 prompt and your essay. Each assessment is saved only to the local history folder in this project, with no account or cloud database.",
      featureScores: "Band score across all four IELTS criteria",
      featureCorrections: "Colour-coded corrections in your original essay",
      featureVocabulary: "Contextual synonyms and topic-language guidance",
      startAssessment: "Start an assessment",
      noHistory: "No sign-in · no online history",
      questionBank: "Cambridge Academic question bank",
      questionBankDescription: "Choose a book and test to fill the prompt automatically. The Task 1 / Task 2 control above determines the question type; Task 1 also loads its chart.",
      book: "Book",
      test: "Test",
      useQuestion: "Use this question",
      loadingQuestion: "Loading question…",
      bankUnavailable: "The local question bank has not been imported yet.",
      source: "Source",
      manualEditHint: "You can still freely edit the prompt below.",
      task1: "Task 1",
      task2: "Task 2",
      question: "Question",
      questionPlaceholder: "Paste the IELTS question here…",
      chart: "Chart or diagram",
      optional: "(optional)",
      remove: "Remove",
      uploadImage: "Upload chart image",
      uploadedChart: "Uploaded chart",
      yourEssay: "Your essay",
      essayPlaceholder: "Paste or write your essay here…",
      wordCount: "Words",
      assess: "Assess my writing",
      privacyNotice: "Your essay is sent to model providers to generate feedback. The assessment is saved only to this project's local history folder.",
      questionText: "Question",
      taskChart: "Task 1 chart",
      localChartFacts: "Verified local chart facts matched; vision will be skipped for assessment.",
      visionChartFallback: "This Cambridge question has no verified local chart facts yet; chart vision will be used when an image is available.",
      settings: "API settings",
      settingsTitle: "Assessment service settings",
      settingsDescription: "Configure OpenAI-compatible scoring and vision services for this browser. Leave fields empty to use the deployed server defaults.",
      settingsClose: "Close settings",
      settingsScoring: "Writing assessment API",
      settingsScoringDescription: "Used for band scores, corrections, synonyms and topic language.",
      settingsVision: "Chart vision API",
      settingsVisionDescription: "Used only for custom Task 1 charts or questions without local verified facts.",
      settingsApiURL: "API URL",
      settingsApiURLPlaceholder: "https://api.example.com/v1",
      settingsApiKey: "API key",
      settingsApiKeyPlaceholder: "Leave blank to use the server default key",
      settingsModel: "Model",
      settingsModelPlaceholder: "Enter a model ID",
      settingsSelectModel: "Select a model",
      settingsFetchModels: "Get models",
      settingsNeedConnection: "Enter an API URL and API key before requesting the model list.",
      settingsNoModels: "The API returned no models. You can still enter a model ID manually.",
      settingsModelsError: "Unable to fetch models. Check the API URL and key.",
      settingsSaveError: "This browser could not save the settings.",
      settingsLocalOnly: "Keys are stored only in this browser and sent only with your assessment request; they are never displayed, saved or synced by the server.",
      settingsHistoryFolder: "Local history folder",
      settingsHistoryFolderDescription: "Choose a folder on this computer. History reads its JSON assessment reports, and exported reports are saved there directly.",
      settingsHistoryFolderEmpty: "No folder selected",
      settingsHistoryFolderChoose: "Choose folder",
      settingsHistoryFolderChange: "Change folder",
      settingsHistoryFolderClear: "Clear",
      settingsHistoryFolderUnsupported: "This browser cannot select a local folder. JSON reports will be downloaded instead.",
      settingsHistoryFolderError: "This folder could not be granted read or write permission. Please choose it again.",
      settingsHistoryFolderPrivacy: "Browsers do not expose an absolute path. History reads only the folder you explicitly authorise, and permission stays only in this browser.",
      settingsReset: "Use server defaults",
      settingsSave: "Save settings",
      historyTitle: "Assessment history",
      historyDescription: "Read essays and assessment reports from your authorised local folder.",
      noHistoryRecords: "No readable JSON assessment reports are in this local folder yet. Completed assessments will be saved here automatically.",
      historyLocalOnly: "Only reads the local folder authorised in this browser and never syncs it to the cloud.",
      historyOpenReport: "Open report",
      historyPartial: "Partial report",
      historyComplete: "Complete report",
      historyLoadError: "History could not be loaded. Please try again.",
      historyDelete: "Delete record",
      historyDeleteConfirm: "Delete this local assessment record? This action cannot be undone.",
      historyDeleteError: "The record could not be deleted. Please try again.",
      historyReadingFolder: "Reading local folder",
      historyFolderRequired: "Choose a local history folder in API settings, then try again.",
      historyFolderPermissionDenied: "This local folder cannot be read. Choose it again and grant permission in API settings.",
      historyFolderUnsupported: "This browser cannot read local folder history. Use the latest Chrome or Edge.",
    },
    feedback: {
      taskResponse: "Task Response",
      taskAchievement: "Task Achievement",
      coherenceCohesion: "Coherence & Cohesion",
      lexicalResource: "Lexical Resource",
      grammaticalRange: "Grammatical Range & Accuracy",
      strengths: "Strengths",
      weaknesses: "Areas for Improvement",
      correction: "Correction",
      overview: "Scoring & Overview",
      original: "Original essay",
      waitingForFeedback: "Generating feedback…",
      backgroundAssessmentNotice: "The assessment continues in the background if you refresh or leave; the completed report will be saved to history.",
      overall: "Overall score",
      bandScore: "IELTS reference band",
      assessmentLabel: "AI assessment",
      forReference: "For reference",
      keySignals: "Key signals",
      assessmentFailed: "Assessment failed",
      assessmentPartialError: "Some feedback could not be generated.",
      assessmentIncomplete: "The assessment ended before finishing, so some results are missing. Please retry.",
      assessmentProgressTitle: "Assessment progress",
      assessmentProgressPending: "Not complete",
      assessmentProgressComplete: "Complete",
      assessmentProgressScoring: "Task & structure scoring",
      assessmentProgressLanguage: "Language & sentence corrections",
      assessmentProgressImprovement: "Improvement guidance",
      synonyms: "Synonyms",
      topicPhrases: "Topic phrases",
      severeError: "Serious error or grammar issue",
      suggestion: "Expression improvement",
      highlight: "Strength",
      noMappedFeedback: "Feedback linked to the original essay will appear here.",
      noCorrectionsGenerated: "No sentence-level corrections were generated. If the result looks incomplete, retry from the notice above.",
      correctionFallbackNotice: "This historical report did not retain directly mappable excerpts. The markers below were recovered from differences between the original and corrected essays.",
      correctionFallbackExplanation: "This sentence differs from the corrected essay and has been marked in the original.",
      correctionRegenerateNotice: "The correction entries in this historical report came from an older result and do not match the original essay, so they cannot be highlighted safely. Regenerate this section to repair it.",
      correctionRegenerateAction: "Regenerate corrections",
      exportPdf: "Export PDF",
      exportJson: "Export JSON",
      exportJsonSaved: "The JSON report was saved to the selected local folder.",
      exportJsonDownloaded: "The JSON report was downloaded.",
    },
  },
};
