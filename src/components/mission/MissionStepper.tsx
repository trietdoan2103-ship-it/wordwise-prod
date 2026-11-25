import type { MissionStage } from "@/types/game";

interface MissionStepperProps {
  stages: MissionStage[];
  /** Index of the stage currently being played (0-based) */
  activeIndex: number;
  /** IDs of stages that have been fully completed */
  completedStageIds: string[];
}

/**
 * MissionStepper — horizontal progress indicator for the three mission stages.
 *
 * States per step:
 * - completed  : stage is in completedStageIds
 * - active     : currently playing (activeIndex)
 * - upcoming   : not yet reached
 */
export default function MissionStepper({
  stages,
  activeIndex,
  completedStageIds,
}: MissionStepperProps) {
  return (
    <nav className="mission-stepper" aria-label="Mission progress">
      {stages.map((stage, index) => {
        const isCompleted = completedStageIds.includes(stage.id);
        const isActive = index === activeIndex;
        const isUpcoming = !isCompleted && !isActive;

        let stepState: "completed" | "active" | "upcoming";
        if (isCompleted) stepState = "completed";
        else if (isActive) stepState = "active";
        else stepState = "upcoming";

        const stepIcons: Record<MissionStage["type"], string> = {
          vocabulary: "📖",
          listening: "🎧",
          sentence: "✏️",
        };

        return (
          <div key={stage.id} className="stepper-item-group">
            {/* Connector line (not before first item) */}
            {index > 0 && (
              <div
                className={`stepper-connector stepper-connector--${completedStageIds.includes(stages[index - 1].id) ? "done" : "pending"}`}
                aria-hidden="true"
              />
            )}

            {/* Step bubble + label */}
            <div
              className={`stepper-item stepper-item--${stepState}`}
              aria-current={isActive ? "step" : undefined}
              aria-label={`Step ${index + 1}: ${stage.title} — ${stepState}`}
            >
              <div className="stepper-bubble">
                {isCompleted ? (
                  <span className="stepper-check" aria-hidden="true">
                    ✓
                  </span>
                ) : (
                  <span className="stepper-icon" aria-hidden="true">
                    {stepIcons[stage.type]}
                  </span>
                )}
              </div>
              <span className="stepper-label">{stage.title}</span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
