import { sendWhatsappAction } from "./sendWhatsapp";
import { sendEmailAction } from "./sendEmail";
import { analyzeAIAction } from "./analyzeAI";
import { sheetsReadAction } from "./sheetsRead";
import { sheetsAppendAction } from "./sheetsAppend";
import { aiDecisionAction } from "./aiDecision";
import { httpRequest } from "@/lib/actions/httpRequest";
import { whatsappReply } from "./whatsappReply";

export const actions: Record<string, Function> = {
  send_whatsapp: sendWhatsappAction,
  send_email: sendEmailAction,
  ai_process: analyzeAIAction,
  sheets_read: sheetsReadAction,
  sheets_append: sheetsAppendAction,
  ai_decision: aiDecisionAction,
  http_request: httpRequest,
  whatsapp_reply: whatsappReply,
};

export default actions;
