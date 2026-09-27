import { 
  JevRequest, 
  JevDecisionResponse,
  ImageCategory 
} from '../types/jev.types.js';

const IMAGE_CATEGORY: Record<ImageCategory, string> = {
  github_repo: 'GitHub repository with file tree, branches, and commits',
  jira_issue: 'Jira or Atlassian task, issue page, ticket details, backlog board, or acceptance criteria',
  email_draft: 'Email draft, text document, or written report',
  web_dashboard: 'Generic web dashboard, analytics page, status cards, or admin forms',
  system_notification: 'System notification panel or alert popups',
  messenger_chat: 'Chat or messaging application (Slack, Teams, Telegram)',
  ide_code: 'IDE code editor with source code file open',
  config_editor: 'Configuration file editor (XML, YAML, JSON, ENV)',
  unknown: 'Unknown interface or unrecognized content',
};

export class JevService {
  private readonly apiUrl: string;
  private readonly model: string;

  constructor(private readonly apiKey: string) {
    if (!this.apiKey) {
      throw new Error('JevService requires an OpenRouter API key');
    }
    this.apiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/alpha/decisions';
    this.model = process.env.JEV_MODEL || 'typesafe/jev-1.13';
  }

  /**
   * Отправляет OCR-текст в OpenRouter API и возвращает определенную категорию скриншота
   * с метриками уверенности.
   */
  async getCategory(ocrText: string): Promise<{
    category: ImageCategory;
    confidence?: number;
    probabilities?: Partial<Record<ImageCategory, number>>;
  }> {
    const requestBody: JevRequest = {
      model: this.model,
      state: ocrText,
      questions: {
        image_type: {
          type: 'choice',
          instructions: 'Identify the UI screenshot type',
          criteria: IMAGE_CATEGORY,
        },
      },
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as JevDecisionResponse;
      
      const answer = data.answers?.image_type;
      const category = answer?.choice;

      if (!this.isValidCategory(category)) {
        console.warn(`[JevService] API returned unknown or missing category: ${String(category)}`);
        return { category: 'unknown' };
      }
      
      return {
        category,
        confidence: answer?.confidence,
        probabilities: this.filterProbabilities(answer?.probabilities),
      };

    } catch (error) {
      console.error('[JevService] Failed to categorize screenshot:', error);
      return { category: 'unknown' };
    }
  }

  /**
   * Type Guard для проверки, что ответ действительно является одной из допустимых категорий.
   */
  private isValidCategory(category: unknown): category is ImageCategory {
    return typeof category === 'string' && Object.hasOwn(IMAGE_CATEGORY, category);
  }

  /**
   * Удаляет нулевые и близкие к нулю вероятности, оставляя только значимые.
   * Это уменьшает размер ответа и убирает шум.
   */
  private filterProbabilities(
    probs?: Partial<Record<ImageCategory, number>>
  ): Partial<Record<ImageCategory, number>> | undefined {
    if (!probs) return undefined;
    
    const filtered: Partial<Record<ImageCategory, number>> = {};
    for (const [key, value] of Object.entries(probs)) {
      if (value && value > 0) {
        filtered[key as ImageCategory] = value;
      }
    }
    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }
}