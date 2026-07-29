"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Eye, Home, RotateCcw, Send } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "@/components/chat/message-bubble";
import { UserProfileMenu } from "@/components/user-profile-menu";
import { WritingFeedbackReport } from "@/components/writing/writing-feedback-report";
import type {
  WritingImprovementFeedback,
  WritingLanguageFeedback,
  WritingOverviewFeedback,
  WritingScoringFeedback,
  WritingSubmission,
} from "@/lib/types";

export interface AssessmentData {
  overview: WritingOverviewFeedback | null;
  scoring: WritingScoringFeedback | null;
  languageAnalysis: WritingLanguageFeedback | null;
  improvement: WritingImprovementFeedback | null;
  done: boolean;
  failedSections: Record<string, string>;
}

interface WritingAssessmentReportProps {
  assessment: AssessmentData;
  submission: WritingSubmission;
  conversationId: string | null;
  initialFollowUpMessages?: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
  }>;
  onBack: () => void;
  onViewSubmission: () => void;
  onRetry?: (experts: string[]) => void;
  taskTabs: ReactNode;
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function WritingAssessmentReport({
  assessment,
  submission,
  conversationId,
  initialFollowUpMessages,
  onBack,
  onViewSubmission,
  onRetry,
  taskTabs,
}: WritingAssessmentReportProps) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ conversationId: conversationIdRef.current }),
      }),
    [],
  );

  const { messages: chatMessages, sendMessage, setMessages, status } = useChat({
    transport,
  });

  useEffect(() => {
    if (initializedRef.current) return;
    if (initialFollowUpMessages && initialFollowUpMessages.length > 0) {
      initializedRef.current = true;
      setMessages(
        initialFollowUpMessages.map((message) => ({
          id: message.id,
          role: message.role,
          parts: [{ type: "text" as const, text: message.content }],
        })) as UIMessage[],
      );
    }
  }, [initialFollowUpMessages, setMessages]);

  const isChatLoading = status === "submitted" || status === "streaming";
  const displayMessages = useMemo(
    () =>
      chatMessages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({
          id: message.id,
          role: message.role as "user" | "assistant",
          content: getMessageText(message),
        }))
        .filter((message) => message.content.trim()),
    [chatMessages],
  );

  useEffect(() => {
    const panel = chatScrollRef.current;
    if (panel && (displayMessages.length > 0 || isChatLoading)) {
      panel.scrollTo({ top: panel.scrollHeight, behavior: "smooth" });
    }
  }, [displayMessages.length, isChatLoading]);

  const overallScore = useMemo(() => {
    if (!assessment.scoring || !assessment.languageAnalysis) return null;
    const scores = [
      assessment.scoring.taskResponseScore,
      assessment.scoring.coherenceScore,
      assessment.languageAnalysis.lexicalResourceScore,
      assessment.languageAnalysis.grammaticalRangeScore,
    ];
    if (scores.some((score) => score === null)) return null;
    const average = (scores as number[]).reduce((total, score) => total + score, 0) / 4;
    return Math.floor(average * 2) / 2;
  }, [assessment.languageAnalysis, assessment.scoring]);

  const taskResponseLabel =
    submission.taskNumber === "1" ? t.feedback.taskAchievement : t.feedback.taskResponse;
  const chatEnabled = assessment.done && !!conversationId;
  const hasAnyFeedback =
    !!assessment.overview ||
    !!assessment.scoring ||
    !!assessment.languageAnalysis ||
    !!assessment.improvement;
  const failedSections = Object.keys(assessment.failedSections);

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || !chatEnabled || isChatLoading) return;
    setInput("");

    try {
      await fetch(`/api/conversations/${conversationIdRef.current}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: text }),
      });
    } catch {
      // Persistence is best effort; the chat request can still continue.
    }
    sendMessage({ text });
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 py-2.5 sm:px-6">
        <div className="flex justify-start">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <Home className="size-4" />
            <span className="ml-1 hidden sm:inline">{t.common.home}</span>
          </Button>
        </div>

        {taskTabs}

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onViewSubmission}>
            <Eye className="size-4" />
            <span className="ml-1.5 hidden sm:inline">{t.feedback.viewSubmission}</span>
          </Button>
          <UserProfileMenu />
        </div>
      </header>

      {failedSections.length > 0 && !hasAnyFeedback && (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <Alert variant="destructive" className="mx-auto max-w-3xl">
            <AlertCircle />
            <AlertTitle>{t.feedback.assessmentFailed}</AlertTitle>
            <AlertDescription>{assessment.failedSections[failedSections[0]]}</AlertDescription>
            {onRetry && (
              <AlertAction>
                <Button variant="outline" size="sm" onClick={() => onRetry(failedSections)}>
                  <RotateCcw className="size-3.5" />
                  <span className="ml-1">{t.feedback.retry}</span>
                </Button>
              </AlertAction>
            )}
          </Alert>
        </div>
      )}

      {(hasAnyFeedback || failedSections.length === 0) && (
        <>
          {failedSections.length > 0 && (
            <div className="shrink-0 px-3 pt-3 sm:px-5">
              <Alert variant="destructive" className="mx-auto max-w-5xl">
                <AlertCircle />
                <AlertDescription>{t.feedback.assessmentPartialError}</AlertDescription>
                {onRetry && (
                  <AlertAction>
                    <Button variant="outline" size="sm" onClick={() => onRetry(failedSections)}>
                      <RotateCcw className="size-3.5" />
                      <span className="ml-1">{t.feedback.retry}</span>
                    </Button>
                  </AlertAction>
                )}
              </Alert>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden">
            <WritingFeedbackReport
              submission={submission}
              overview={assessment.overview}
              scoring={assessment.scoring}
              languageAnalysis={assessment.languageAnalysis}
              improvement={assessment.improvement}
              overallScore={overallScore}
              taskResponseLabel={taskResponseLabel}
            />
          </div>

          {displayMessages.length > 0 && (
            <div
              ref={chatScrollRef}
              className="max-h-48 shrink-0 overflow-y-auto border-t border-border bg-muted/20 px-4 py-3 [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/30 [&::-webkit-scrollbar]:w-2 sm:px-6"
            >
              <div className="mx-auto max-w-6xl space-y-3">
                {displayMessages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    isStreaming={
                      message.role === "assistant" &&
                      index === displayMessages.length - 1 &&
                      isChatLoading
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <div className="shrink-0 border-t border-border bg-background px-3 py-3 sm:px-5">
            <form onSubmit={handleSendMessage} className="mx-auto max-w-6xl">
              <div
                className={`flex items-center overflow-hidden rounded-[22px] border bg-background transition-all ${
                  chatEnabled
                    ? "focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/40"
                    : "opacity-50"
                }`}
              >
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={chatEnabled ? t.chat.typeMessage : t.feedback.waitingForFeedback}
                  disabled={!chatEnabled}
                  className="min-h-0 max-h-[110px] flex-1 resize-none border-0 bg-transparent px-4 py-2.5 text-sm shadow-none focus-visible:ring-0"
                  rows={1}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage(event);
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 size-8 shrink-0 rounded-full text-muted-foreground hover:text-primary"
                  type="submit"
                  disabled={!input.trim() || !chatEnabled || isChatLoading}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </form>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground/70">{t.common.aiDisclaimer}</p>
          </div>
        </>
      )}
    </div>
  );
}
