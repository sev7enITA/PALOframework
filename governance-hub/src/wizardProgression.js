export function buildWizardAccess({ current, confirmedThrough, validities, stepCount }) {
  const safeCurrent = Math.max(0, Math.min(stepCount - 1, current));
  const safeConfirmed = Math.max(-1, Math.min(stepCount - 2, confirmedThrough));
  const unlockedThrough = Math.min(stepCount - 1, safeConfirmed + 1);
  return Array.from({ length: stepCount }, (_, index) => ({
    index,
    current: index === safeCurrent,
    completed: index <= safeConfirmed,
    unlocked: index <= unlockedThrough,
    valid: Boolean(validities[index]),
  }));
}

export function continueWizard({ current, confirmedThrough, validities, labels }) {
  if (!validities[current]) {
    return {
      allowed: false,
      current,
      confirmedThrough,
      reason: `Step ${current + 1}, ${labels[current]}, still has an unmet prerequisite.`,
      action: "Complete the required input or evidence shown in this step.",
    };
  }
  const next = Math.min(labels.length - 1, current + 1);
  return {
    allowed: true,
    current: next,
    confirmedThrough: Math.max(confirmedThrough, Math.min(current, labels.length - 2)),
    reason: "",
    action: "",
  };
}

export function blockedStepGuidance({ target, confirmedThrough, labels }) {
  const required = Math.min(labels.length - 1, confirmedThrough + 1);
  if (target <= required) return null;
  return {
    required,
    reason: `Step ${target + 1}, ${labels[target]}, is locked because an earlier step is not confirmed.`,
    action: `Complete step ${required + 1}, ${labels[required]}, next.`,
  };
}
