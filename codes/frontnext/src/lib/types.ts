/**
 * Shapes returned by the CITRA Viva API.
 *
 * These mirror the Pydantic models in `codes/backpy/app/models`. They are hand
 * written rather than generated, so when the backend changes, change both.
 */

export type Severity = 'low' | 'medium' | 'high';

export type WeaknessCategory =
  | 'unsupported_claim'
  | 'causal_language_non_experimental'
  | 'overgeneralization'
  | 'unaddressed_limitation'
  | 'other';

export type AnswerStrength = 'strong' | 'partial' | 'weak' | 'evasive';

export type ExaminerDecision =
  | 'press_deeper'
  | 'ask_clarification'
  | 'move_on'
  | 'record_gap';

export type QuestionType = 'opening' | 'probe' | 'methodological' | 'closing';

export interface WeaknessFinding {
  id: string;
  category: WeaknessCategory;
  severity: Severity;
  section: string;
  quote: string;
  why_weak: string;
  examiner_angle: string;
  quote_verified: boolean;
}

export interface DraftSummary {
  research_question: string;
  methodology: string;
  design_type: string;
  key_findings: string[];
  stated_limitations: string[];
}

export interface WeaknessMap {
  language: string;
  summary: DraftSummary;
  findings: WeaknessFinding[];
  coverage_note: string;
}

export interface AnalysisResult {
  weakness_map: WeaknessMap;
  dropped: string[];
  model: string;
}

export interface PlannedQuestion {
  id: string;
  finding_id: string;
  question_type: QuestionType;
  question: string;
  intent: string;
  evaluation_criteria: string;
  follow_up_if_weak: string;
  targets_recurring_gap: boolean;
}

export interface QuestionStrategy {
  language: string;
  opening_remark: string;
  questions: PlannedQuestion[];
  strategy_note: string;
}

export interface StrategyResult {
  strategy: QuestionStrategy;
  dropped: string[];
  model: string;
}

export interface AnswerEvaluation {
  strength: AnswerStrength;
  decision: ExaminerDecision;
  reasoning: string;
  criteria_met: string[];
  criteria_missed: string[];
  next_utterance: string;
  gap_note: string;
}

export interface TranscriptTurn {
  role: 'examiner' | 'student';
  text: string;
  question_id: string;
  timestamp: string | null;
  evaluated_strength: string;
  decision: string;
}

export interface QuestionProgress {
  question_id: string;
  follow_ups_asked: number;
  clarifications_offered: number;
  final_strength: string;
  gap_recorded: string;
  defended_points: string[];
  closed: boolean;
}

export interface SessionSummary {
  strong_points: string[];
  remaining_gaps: string[];
  recurring_gap_patterns: string[];
  closing_remark: string;
}

export interface SessionState {
  session_id: string;
  user_id: string;
  draft_id: string;
  status: 'in_progress' | 'completed';
  language: string;
  opening_remark: string;
  questions: PlannedQuestion[];
  findings: WeaknessFinding[];
  progress: QuestionProgress[];
  current_index: number;
  transcript: TranscriptTurn[];
  summary: SessionSummary | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SessionTurnResult {
  session_id: string;
  examiner_says: string;
  evaluation: AnswerEvaluation;
  question_id: string;
  next_question_id: string;
  finished: boolean;
  /** Decisions the backend overrode, and why. Shown, never hidden. */
  adjustments: string[];
}

export interface StartSessionResponse {
  session_id: string;
  opening_remark: string;
  first_question: string;
  question_id: string;
  analysis: AnalysisResult;
  strategy: StrategyResult;
}

export interface CloseSessionResponse {
  session_id: string;
  summary: SessionSummary;
  adjustments: string[];
}
