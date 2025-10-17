"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight, Settings, Layers } from "lucide-react"
import { useAgent } from "@/lib/agent-context"
import { StepCard } from "./step-card"
import { Spinner } from "@/components/ui/spinner"
import { ConversationInput } from "./conversation-input"

export function AgentConversation({
  usePiJudge,
  rubrics,
  isConfigCollapsed,
  onToggleConfig,
  pendingInput,
  onInputLoaded,
}: {
  usePiJudge: boolean
  rubrics: any[]
  isConfigCollapsed: boolean
  onToggleConfig: () => void
  pendingInput?: string | null
  onInputLoaded?: () => void
}) {
  const {
    currentConfig,
    currentTrace,
    isStreaming,
    streamingSteps,
    finalizedStepIds,
    startStreaming,
    stopStreaming,
  } = useAgent()
  const [pendingInputValue, setPendingInputValue] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  // Ref for the sentinel element (the target)
  const sentinelRef = useRef(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false)

  useEffect(() => {
    if (pendingInput) {
      setPendingInputValue(pendingInput)
      onInputLoaded?.()
    }
  }, [pendingInput, onInputLoaded])



  const scrollOffset = 500;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollRef.current;

    if (!sentinel || !container) return; // Exit if refs aren't set

    // Options for the Intersection Observer
    const options = {
      // The element whose bounds are used as the viewport.
      // Here, it's our scrollable container.
      root: container,

      // Margin around the root. '0px' means no extra margin.
      rootMargin: `${scrollOffset}px`, // Shrinks the bottom margin by 50px

      // The percentage of the target's visibility needed to trigger the callback.
      // 1.0 means 100% of the target must be visible.
      threshold: 1.0,

    };
    const callback = (entries: { isIntersecting: any }[]) => {
      // The callback is called when the target's visibility changes.
      // entries[0].isIntersecting is true when the sentinel is visible.

      const isIntersecting = entries[0].isIntersecting;

      setScrolledToBottom(isIntersecting);

    };

    const observer = new IntersectionObserver(callback, options);
    // Start observing the sentinel element
    observer.observe(sentinel);

    // Cleanup function: disconnect the observer when the component unmounts
    return () => observer.disconnect();

    // Re-run effect if container/sentinel changes, though they shouldn't in this case
  }, [scrollOffset]);

  useEffect(() => {
    if (scrollRef.current) {
      if (scrolledToBottom) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
        })
      }
    }
  }, [currentTrace?.steps, streamingSteps])


  const handleStart = async (inputValue: string) => {
    if (!inputValue.trim() || !currentConfig) return
    await startStreaming(inputValue, usePiJudge, rubrics)
  }

  const handleStop = () => {
    stopStreaming()
  }


  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b flex-shrink-0">
        {isConfigCollapsed && (
          <Button variant="ghost" onClick={onToggleConfig} className="h-8 px-2 gap-1">
            <Settings className="w-4 h-4" />
            <ChevronRight className="w-3 h-3" />
          </Button>
        )}
        <h2 className="text-lg font-semibold">Agent Conversation</h2>
      </div>

      <div className="flex flex-col overflow-hidden flex-1">
        <div className="p-6 pb-4 flex-shrink-0">
          <h3 className="text-sm font-medium">Execution Trace</h3>
        </div>
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-6 pb-6">
          <div className="w-full space-y-3 pr-4">
            {!currentTrace && !isStreaming && (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">Enter a user prompt and run your agent to start rating traces</p>
                </div>
              </div>
            )}
            {currentTrace?.steps.map((step) => (
              <StepCard key={step.id} step={step} traceId={currentTrace.id} />
            ))}
            {Array.from(streamingSteps.entries())
              .filter(([stepId]) => !finalizedStepIds.has(stepId))
              .map(([stepId, step]) => (
                <StepCard
                  key={stepId}
                  step={{
                    id: stepId,
                    type: step.type as any,
                    content: step.content,
                    toolName: step.toolName,
                    toolInput: step.toolInput,
                    toolOutput: step.toolOutput,
                    toolCallId: step.toolCallId,
                    timestamp: Date.now(),
                  }}
                  traceId={currentTrace?.id || ""}
                  isStreaming={true}
                />
              ))}
            {isStreaming && streamingSteps.size === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg border border-dashed">
                <Spinner className="w-4 h-4" />
                <span>Agent is thinking...</span>
              </div>
            )}
          </div>
          <div ref={sentinelRef} className={'h-1 w-full '} />

        </div>
      </div>

      <div className="p-6 border-t bg-muted/30 flex-shrink-0">
        <ConversationInput
          onConfirm={handleStart}
          isRunning={isStreaming}
          onStop={handleStop}
          initialValue={pendingInputValue}
          disabled={!currentConfig}
        />
      </div>
    </div>
  )
}
