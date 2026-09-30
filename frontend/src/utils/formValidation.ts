/** Shared client-side validation helpers for project forms. */

const isBlank = (value?: string | null): boolean => !value || !value.trim();

const parseNumber = (value?: string): number | null => {
  if (value == null || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const isOnlyZeros = (value: string): boolean => /^0+$/.test(value.trim());

const isOnlyDigits = (value: string): boolean => /^\d+$/.test(value.trim());

/** Person / display names — letters only; full name needs first + last. */
export const validatePersonNameField = (
  name: string,
  options?: {
    blankMessage?: string;
    max?: number;
    fieldLabel?: string;
    /** When true (default), require at least first and last name. */
    requireFullName?: boolean;
  },
): string | null => {
  const label = options?.fieldLabel ?? "Full name";
  const max = options?.max ?? 150;
  const requireFullName = options?.requireFullName !== false;

  if (isBlank(name)) {
    return options?.blankMessage ?? `${label} is required.`;
  }

  const trimmed = name.trim().replace(/\s+/g, " ");

  if (trimmed.length > max) {
    return `${label} cannot exceed ${max} characters.`;
  }

  if (isOnlyZeros(trimmed) || isOnlyDigits(trimmed)) {
    return `${label} cannot be only numbers.`;
  }

  if (!/^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/.test(trimmed)) {
    return `${label} can only contain letters, spaces, hyphens, and apostrophes.`;
  }

  const words = trimmed.split(" ").filter(Boolean);
  if (requireFullName && words.length < 2) {
    return "Enter a valid full name (first and last name).";
  }

  for (const word of words) {
    const lettersOnly = word.replace(/['\-]/g, "");
    if (lettersOnly.length < 2) {
      return "Each name part must be at least 2 letters.";
    }
  }

  return null;
};

/** Titles / labels on create forms (project, milestone, task, document). */
export const validateRequiredTitleField = (
  title: string,
  fieldLabel: string,
  max = 200,
): string | null => {
  if (isBlank(title)) {
    return `${fieldLabel} is required.`;
  }
  const trimmed = title.trim();
  if (trimmed.length > max) {
    return `${fieldLabel} cannot exceed ${max} characters.`;
  }
  if (isOnlyZeros(trimmed) || isOnlyDigits(trimmed)) {
    return `${fieldLabel} cannot be only numbers.`;
  }
  if (!/[A-Za-z]/.test(trimmed)) {
    return `Enter a valid ${fieldLabel.toLowerCase()} with letters.`;
  }
  return null;
};

export const validatePhoneNumberField = (phone: string): string | null => {
  if (isBlank(phone)) {
    return "Phone number is required.";
  }
  const trimmed = phone.trim();
  if (!/^\d{10}$/.test(trimmed)) {
    return "Phone number must contain exactly 10 digits.";
  }
  if (new Set(trimmed).size === 1) {
    return "Enter a valid phone number.";
  }
  return null;
};

/** Meaningful text fields — reject blank, all zeros, or digits-only placeholders. */
export const validateRequiredTextField = (
  value: string,
  fieldLabel: string,
): string | null => {
  if (isBlank(value)) {
    return `${fieldLabel} is required.`;
  }
  const trimmed = value.trim();
  if (isOnlyZeros(trimmed) || isOnlyDigits(trimmed)) {
    return `${fieldLabel} cannot be only numbers.`;
  }
  return null;
};

export type TaskFormValidationInput = {
  title: string;
  expectedWork?: string;
  completionRequirement?: string;
  requireWorkDefinition?: boolean;
  plannedStartDate?: string;
  plannedEndDate?: string;
  requiredWorkerCount?: string;
  plannedDurationDays?: string;
  plannedHoursPerDay?: string;
  dailyTargetPercentage?: string;
  sortOrder?: string;
  milestoneStartDate?: string | null;
  milestoneEndDate?: string | null;
};

export const validateTaskFormFields = (
  input: TaskFormValidationInput,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const requireWork = input.requireWorkDefinition !== false;

  const titleError = validateRequiredTitleField(input.title, "Task title");
  if (titleError) {
    errors.title = titleError;
  }

  if (requireWork) {
    const expectedError = validateRequiredTextField(
      input.expectedWork ?? "",
      "Expected work",
    );
    if (expectedError) {
      errors.expected_work = expectedError;
    }
    const completionError = validateRequiredTextField(
      input.completionRequirement ?? "",
      "Completion requirement",
    );
    if (completionError) {
      errors.completion_requirement = completionError;
    }
  }

  const start = input.plannedStartDate || "";
  const end = input.plannedEndDate || "";

  if (start && end && new Date(end).getTime() < new Date(start).getTime()) {
    errors.planned_end_date = "End date must be on or after the start date.";
  }

  if (
    start &&
    input.milestoneStartDate &&
    new Date(start).getTime() < new Date(input.milestoneStartDate).getTime()
  ) {
    errors.planned_start_date =
      "Task start date cannot be earlier than the milestone start date.";
  }

  if (
    end &&
    input.milestoneEndDate &&
    new Date(end).getTime() > new Date(input.milestoneEndDate).getTime()
  ) {
    errors.planned_end_date =
      "Task end date cannot be later than the milestone end date.";
  }

  if (input.requiredWorkerCount != null && input.requiredWorkerCount.trim() !== "") {
    const workers = parseNumber(input.requiredWorkerCount);
    if (workers === null || Number.isNaN(workers) || !Number.isInteger(workers) || workers < 1) {
      errors.required_worker_count = "Workers needed must be a whole number of at least 1.";
    }
  } else if (input.requiredWorkerCount != null) {
    errors.required_worker_count = "Workers needed must be a whole number of at least 1.";
  }

  if (input.plannedDurationDays != null && input.plannedDurationDays.trim() !== "") {
    const days = parseNumber(input.plannedDurationDays);
    if (days === null || Number.isNaN(days) || !Number.isInteger(days) || days < 1) {
      errors.planned_duration_days = "Planned duration must be a whole number of at least 1 day.";
    }
  }

  if (input.plannedHoursPerDay != null && input.plannedHoursPerDay.trim() !== "") {
    const hours = parseNumber(input.plannedHoursPerDay);
    if (hours === null || Number.isNaN(hours) || hours < 0.01 || hours > 24) {
      errors.planned_hours_per_day = "Hours per day must be between 0.01 and 24.";
    }
  }

  if (input.dailyTargetPercentage != null && input.dailyTargetPercentage.trim() !== "") {
    const target = parseNumber(input.dailyTargetPercentage);
    if (target === null || Number.isNaN(target) || target < 0 || target > 100) {
      errors.daily_target_percentage = "Daily target must be between 0 and 100.";
    }
  }

  if (input.sortOrder != null && input.sortOrder.trim() !== "") {
    const order = parseNumber(input.sortOrder);
    if (order === null || Number.isNaN(order) || !Number.isInteger(order) || order < 1) {
      errors.sort_order = "Sort order must be a whole number of at least 1.";
    }
  }

  return errors;
};

export type MilestoneFormValidationInput = {
  title: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  sortOrder?: string;
};

export const validateMilestoneFormFields = (
  input: MilestoneFormValidationInput,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  const titleError = validateRequiredTitleField(input.title, "Milestone title");
  if (titleError) {
    errors.title = titleError;
  }

  const start = input.plannedStartDate || "";
  const end = input.plannedEndDate || "";
  if (start && end && new Date(end).getTime() < new Date(start).getTime()) {
    errors.planned_end_date = "End date must be on or after the start date.";
  }

  if (input.sortOrder != null && input.sortOrder.trim() !== "") {
    const order = parseNumber(input.sortOrder);
    if (order === null || Number.isNaN(order) || !Number.isInteger(order) || order < 1) {
      errors.sort_order = "Sort order must be a whole number of at least 1.";
    }
  }

  return errors;
};

export type ProjectFormValidationInput = {
  projectName: string;
  startDate?: string;
  endDate?: string;
  initialBudget?: string;
};

export const validateProjectFormFields = (
  input: ProjectFormValidationInput,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  const nameError = validateRequiredTitleField(input.projectName, "Project name");
  if (nameError) {
    errors.project_name = nameError;
  }

  const start = input.startDate || "";
  const end = input.endDate || "";
  if (start && end && new Date(end).getTime() < new Date(start).getTime()) {
    errors.end_date = "End date cannot be earlier than the start date.";
  }

  if (input.initialBudget != null && input.initialBudget.trim() !== "") {
    const budget = Number(input.initialBudget.trim());
    if (!Number.isFinite(budget) || budget < 0) {
      errors.initial_budget = "Initial budget must be a number of 0 or greater.";
    }
  }

  return errors;
};

export type ExtensionFormValidationInput = {
  newEndDate: string;
  /** Current milestone end (create) or previous_end_date (edit). */
  minEndDate?: string | null;
  minEndDateMessage?: string;
};

export const validateExtensionFormFields = (
  input: ExtensionFormValidationInput,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (isBlank(input.newEndDate)) {
    errors.new_end_date = "Choose the revised completion date.";
  } else if (
    input.minEndDate &&
    new Date(input.newEndDate).getTime() <= new Date(input.minEndDate).getTime()
  ) {
    errors.new_end_date =
      input.minEndDateMessage ?? "New end date must be after the current end date.";
  }

  return errors;
};

export type DocumentFormValidationInput = {
  title: string;
  fileRequired?: boolean;
  hasFile?: boolean;
};

export const validateDocumentFormFields = (
  input: DocumentFormValidationInput,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  const titleError = validateRequiredTitleField(input.title, "Document title");
  if (titleError) {
    errors.title = titleError;
  }

  if (input.fileRequired && !input.hasFile) {
    errors.file = "Please select a file.";
  }

  return errors;
};

export type WorkerUpdateValidationInput = {
  assignmentSelected: boolean;
  completionPercentage: string;
  status: string;
  incompleteReason?: string;
  incompleteReasonDetail?: string;
  concernText?: string;
};

export const validateWorkerUpdateFields = (
  input: WorkerUpdateValidationInput,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!input.assignmentSelected) {
    errors.assignment_id = "Select an assigned task before submitting a work update.";
  }

  const completion = Number(input.completionPercentage);
  if (
    isBlank(input.completionPercentage) ||
    Number.isNaN(completion) ||
    completion < 0 ||
    completion > 100
  ) {
    errors.completion_percentage = "Completion percentage must be between 0 and 100.";
  }

  const incomplete = input.status !== "completed" || completion < 100;
  if (incomplete && isBlank(input.incompleteReason)) {
    errors.incomplete_reason = "Select a reason when work is incomplete.";
  }
  if (input.incompleteReason === "other" && isBlank(input.incompleteReasonDetail)) {
    errors.incomplete_reason_detail = "Please explain the incomplete work reason.";
  }

  if (input.status === "blocked") {
    const hasBlockedDetail =
      Boolean(input.concernText?.trim()) || Boolean(input.incompleteReasonDetail?.trim());
    if (!hasBlockedDetail) {
      errors.concern_text =
        "When work is blocked, add a concern or incomplete-work details explaining the blocker.";
    }
  }

  if (input.status === "completed" && !Number.isNaN(completion) && completion < 100) {
    errors.completion_percentage = "Completed status requires 100% completion.";
  }

  return errors;
};

export type AssignmentFormValidationInput = {
  taskSelected: boolean;
  workerId: string;
  dutyInstructions: string;
};

export const validateAssignmentFormFields = (
  input: AssignmentFormValidationInput,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!input.taskSelected) {
    errors.task_id = "Select a task before assigning workers.";
  }
  if (isBlank(input.workerId)) {
    errors.worker_id = "Choose the worker who should receive this duty.";
  }
  const dutyError = validateRequiredTextField(
    input.dutyInstructions,
    "Duty instructions",
  );
  if (dutyError) {
    errors.duty_instructions = dutyError;
  }

  return errors;
};

export type WorkplaceNeedFormValidationInput = {
  hasProjects: boolean;
  projectId: string;
  description: string;
};

export const validateWorkplaceNeedFormFields = (
  input: WorkplaceNeedFormValidationInput,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!input.hasProjects) {
    errors.project_id =
      "No assigned projects found. Ask your supervisor to assign you to a task first.";
  } else if (isBlank(input.projectId)) {
    errors.project_id = "Select a project before submitting.";
  }

  const descriptionError = validateRequiredTextField(
    input.description,
    "Description",
  );
  if (descriptionError) {
    errors.description = descriptionError;
  }

  return errors;
};

export const isValidEmailFormat = (email: string): boolean =>
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim());

export const validateEmailField = (
  email: string,
  options?: { blankMessage?: string },
): string | null => {
  if (isBlank(email)) {
    return options?.blankMessage ?? "Email address is required.";
  }
  const trimmed = email.trim();
  if (!trimmed.includes("@")) {
    return "Email must include an @ symbol.";
  }
  const [localPart, domainPart] = trimmed.split("@");
  if (!localPart || !domainPart) {
    return "Enter a valid email address (name@company.com).";
  }
  if (!domainPart.includes(".")) {
    return "Email domain must include a dot (for example .com).";
  }
  if (!isValidEmailFormat(trimmed)) {
    return "Enter a valid email address (name@company.com).";
  }
  return null;
};

export const validateStrongPassword = (password: string): string | null => {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one digit.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character.";
  }
  return null;
};

export const validatePasswordConfirmFields = (
  password: string,
  confirmPassword: string,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const strengthError = validateStrongPassword(password);
  if (strengthError) {
    errors.password = strengthError;
  }
  if (!confirmPassword) {
    errors.confirm_password = "Confirm your new password.";
  } else if (password !== confirmPassword) {
    errors.confirm_password = "Passwords do not match.";
  }
  return errors;
};

/** First error message from a field-error map (for banner-style UIs). */
export const firstFieldError = (errors: Record<string, string>): string | null =>
  Object.values(errors)[0] ?? null;
