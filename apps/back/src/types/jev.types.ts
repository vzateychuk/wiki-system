// --- 1. Доменные типы категорий ---

export type ImageCategory =
  | 'github_repo'
  | 'jira_issue' // <-- для задач/тикетов Jira  
  | 'email_draft'
  | 'web_dashboard'
  | 'messenger_chat'
  | 'ide_code'
  | 'config_editor'
  | 'unknown';

// --- 2. Типы для запросов к Jev/OpenRouter API ---

export interface JevChoiceCriteria {                                                                                                                         
     type: 'choice';                                                                                                                                                    
     instructions: string;                                                                                                                                              
     criteria: Record<ImageCategory, string>;                                                                                                                           
}
                                                                                                                                                                        
export interface JevQuestionCriteria {
  type: 'noul';
  noul?: string | number; // Сюда придет либо строка ("src/file.ts"), либо число (0.56) при неуверенности
  instructions: string;                                                                                                                                              
}

export interface JevRequest {
  model: string;
  state: string;
  questions: {
    image_type: JevChoiceCriteria;
    file_path: JevQuestionCriteria;
    browser_url: JevQuestionCriteria;
    jira_ticket: JevQuestionCriteria;
  };
}

// --- 3. Типы для ответа от Jev/OpenRouter API ---

export interface JevFreeTextAnswer {
  type: 'noul';
  noul?: string | number; // Сюда придет либо строка ("src/file.ts"), либо число (0.56) при неуверенности
  confidence?: number;
}

export interface JevDecisionChoiceAnswer {
  type: 'choice';
  choice: ImageCategory;
  probabilities?: Partial<Record<ImageCategory, number>>;
  confidence?: number;
}

export interface JevDecisionResponse {
  model: string;
  answers?: {
    image_type?: JevDecisionChoiceAnswer;
    file_path?: JevFreeTextAnswer;
    browser_url?: JevFreeTextAnswer;
    jira_ticket?: JevFreeTextAnswer;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cost: number;
  };
  id?: string;
  provider?: string;
}

// --- 4. Результаты работы контроллеров/сервисов (Discriminated Unions) ---

export interface UploadSuccessResult {
  success: true;
  originalName: string;
  savedImagePath: string;
  category: ImageCategory;
  confidence?: number;
  probabilities?: Partial<Record<ImageCategory, number>>;
}

export interface UploadErrorResult {
  success: false;
  originalName: string;
  error: string;
}

export type UploadResult = UploadSuccessResult | UploadErrorResult;