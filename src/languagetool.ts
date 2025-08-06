// https://languagetool.org/http-api/swagger-ui/#!/default/post_check
export interface CheckResponse {
  software: {
    name: string;
    version: string;
    buildDate: string;
    apiVersion: number;
    status: string;
    premium: boolean;
  };
  language: {
    name: string;
    code: string;
    detectedLanguage: {
      name: string;
      code: string;
    };
  };
  matches: Match[];
}

export interface Match {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: {
    value: string;
  }[];
  context: {
    text: string;
    offset: number;
    length: number;
  };
  sentence: string;
  rule: {
    id: string;
    subId: string;
    description: string;
    urls: {
      value: string;
    }[];
    issueType: string;
    category: {
      id: string;
      name: string;
    };
  };
}
