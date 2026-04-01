export type Workflow = {
  id: string;
  name: string;
  description?: string | null;
  triggers?: unknown;
  steps?: unknown;
  createdAt?: Date | string;
};

export type Lead = {
  id: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  createdAt?: Date | string;
};

export type AIRequest = {
  model: string;
  prompt: string;
};

export type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};
