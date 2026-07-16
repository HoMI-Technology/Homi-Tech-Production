// =============================================================================
// lib/questions/bank.ts — HōMI Question Bank (TypeScript mirror of SQL seed)
// =============================================================================
// 45 questions total: 15 per dimension (Financial, Emotional, Timing)
// All questions tagged for the 'home_buying' decision type.
// This is the offline / client-side source of truth. When Supabase is
// available, the app should prefer the DB version (question_bank table,
// seeded faithfully from this same data in
// supabase/migrations/00006_seed_question_bank.sql).
// =============================================================================

// ---------------------------------------------------------------------------
// Question Types
// ---------------------------------------------------------------------------

export type QuestionType = 'slider' | 'single_choice' | 'number';

export type Dimension = 'financial' | 'emotional' | 'timing';

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface SliderConfig {
  min: number;
  max: number;
  min_label: string;
  max_label: string;
}

// --- Scoring function shapes ---

export interface LinearScaleScoring {
  type: 'linear_scale';
  min: number;
  max: number;
  optimal_min: number;
  unit?: string;
}

export interface InverseScaleScoring {
  type: 'inverse_scale';
  min: number;
  max: number;
  optimal_max: number;
  unit?: string;
}

export interface OptionMapScoring {
  type: 'option_map';
  scores: Record<string, number>;
}

export interface SliderDirectScoring {
  type: 'slider_direct';
  min: number;
  max: number;
  output_min: number;
  output_max: number;
}

export interface ThresholdEntry {
  max: number;
  score: number;
}

export interface ThresholdScoring {
  type: 'threshold';
  thresholds: ThresholdEntry[];
}

export type ScoringFunction =
  | LinearScaleScoring
  | InverseScaleScoring
  | OptionMapScoring
  | SliderDirectScoring
  | ThresholdScoring;

// --- Question definition ---

export interface Question {
  id: string;
  dimension: Dimension;
  category: string;
  question_text: string;
  question_type: QuestionType;
  options: ChoiceOption[] | SliderConfig | null;
  weight: number;
  order_index: number;
  decision_types: string[];
  scoring_function: ScoringFunction;
}

/** A response value can be a number (slider/number) or a string (choice). */
export type ResponseValue = number | string;

// ---------------------------------------------------------------------------
// Question Bank — 45 Questions
// ---------------------------------------------------------------------------

export const QUESTION_BANK: Question[] = [
  // =========================================================================
  // FINANCIAL REALITY (15 questions)
  // Categories: income, savings, debt, credit, affordability
  // =========================================================================

  // F1: Monthly gross income
  {
    id: 'fin_income',
    dimension: 'financial',
    category: 'income',
    question_text: 'What is your monthly gross income (before taxes)?',
    question_type: 'number',
    options: null,
    weight: 1.0,
    order_index: 1,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'linear_scale',
      min: 0,
      max: 25000,
      optimal_min: 6000,
      unit: 'usd',
    },
  },

  // F2: Income stability
  {
    id: 'fin_income_stability',
    dimension: 'financial',
    category: 'income',
    question_text: 'How stable has your income been over the past 2 years?',
    question_type: 'single_choice',
    options: [
      { value: 'very_stable', label: 'Very stable - consistent employment, no gaps' },
      { value: 'mostly_stable', label: 'Mostly stable - minor changes but reliable' },
      { value: 'somewhat_unstable', label: 'Somewhat unstable - job changes or variable income' },
      { value: 'unstable', label: 'Unstable - frequent gaps or major fluctuations' },
    ],
    weight: 0.9,
    order_index: 2,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { very_stable: 100, mostly_stable: 75, somewhat_unstable: 40, unstable: 15 },
    },
  },

  // F3: Total savings
  {
    id: 'fin_savings_total',
    dimension: 'financial',
    category: 'savings',
    question_text: 'How much do you currently have in total savings and liquid investments?',
    question_type: 'number',
    options: null,
    weight: 1.0,
    order_index: 3,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'linear_scale',
      min: 0,
      max: 200000,
      optimal_min: 40000,
      unit: 'usd',
    },
  },

  // F4: Down payment percentage
  {
    id: 'fin_down_payment',
    dimension: 'financial',
    category: 'savings',
    question_text: 'What percentage of the home price can you put as a down payment?',
    question_type: 'single_choice',
    options: [
      { value: '20_plus', label: '20% or more' },
      { value: '15_19', label: '15-19%' },
      { value: '10_14', label: '10-14%' },
      { value: '5_9', label: '5-9%' },
      { value: '3_4', label: '3-4% (FHA minimum)' },
      { value: 'less_3', label: 'Less than 3%' },
    ],
    weight: 1.0,
    order_index: 4,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { '20_plus': 100, '15_19': 85, '10_14': 70, '5_9': 50, '3_4': 35, less_3: 15 },
    },
  },

  // F5: Emergency fund
  {
    id: 'fin_emergency_fund',
    dimension: 'financial',
    category: 'savings',
    question_text:
      'After the down payment and closing costs, how many months of expenses would you have in your emergency fund?',
    question_type: 'single_choice',
    options: [
      { value: '6_plus', label: '6 or more months' },
      { value: '4_5', label: '4-5 months' },
      { value: '2_3', label: '2-3 months' },
      { value: '1', label: 'About 1 month' },
      { value: 'none', label: 'Little to none' },
    ],
    weight: 0.95,
    order_index: 5,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { '6_plus': 100, '4_5': 75, '2_3': 50, '1': 25, none: 5 },
    },
  },

  // F6: Total monthly debt payments
  {
    id: 'fin_debt_payments',
    dimension: 'financial',
    category: 'debt',
    question_text:
      'What are your total monthly debt payments (student loans, car loans, credit cards, etc.)?',
    question_type: 'number',
    options: null,
    weight: 0.9,
    order_index: 6,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'inverse_scale',
      min: 0,
      max: 5000,
      optimal_max: 500,
      unit: 'usd',
    },
  },

  // F7: Debt-to-income ratio awareness
  {
    id: 'fin_dti_ratio',
    dimension: 'financial',
    category: 'debt',
    question_text:
      'What is your current debt-to-income ratio (total monthly debts / gross monthly income)?',
    question_type: 'single_choice',
    options: [
      { value: 'under_20', label: 'Under 20%' },
      { value: '20_28', label: '20-28%' },
      { value: '29_36', label: '29-36%' },
      { value: '37_43', label: '37-43%' },
      { value: 'over_43', label: 'Over 43%' },
      { value: 'unknown', label: 'I am not sure' },
    ],
    weight: 0.95,
    order_index: 7,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { under_20: 100, '20_28': 85, '29_36': 65, '37_43': 40, over_43: 15, unknown: 30 },
    },
  },

  // F8: Credit score
  {
    id: 'fin_credit_score',
    dimension: 'financial',
    category: 'credit',
    question_text: 'What is your current credit score?',
    question_type: 'single_choice',
    options: [
      { value: 'excellent', label: 'Excellent (760+)' },
      { value: 'good', label: 'Good (700-759)' },
      { value: 'fair', label: 'Fair (640-699)' },
      { value: 'poor', label: 'Poor (580-639)' },
      { value: 'very_poor', label: 'Very poor (below 580)' },
      { value: 'unknown', label: 'I do not know my credit score' },
    ],
    weight: 1.0,
    order_index: 8,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { excellent: 100, good: 80, fair: 55, poor: 30, very_poor: 10, unknown: 25 },
    },
  },

  // F9: Pre-approval status /* brand-ok */
  {
    id: 'fin_preapproval',
    dimension: 'financial',
    category: 'affordability',
    question_text: 'Have you been pre-approved for a mortgage?',
    question_type: 'single_choice',
    options: [
      { value: 'yes_strong', label: 'Yes, fully pre-approved with a competitive rate' },
      { value: 'yes_basic', label: 'Yes, pre-approved but still comparing lenders' },
      { value: 'prequalified', label: 'Pre-qualified but not formally pre-approved' },
      { value: 'started', label: 'Started the process but not completed' },
      { value: 'no', label: 'No, have not started' },
    ],
    weight: 0.85,
    order_index: 9,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { yes_strong: 100, yes_basic: 80, prequalified: 55, started: 35, no: 10 },
    },
  },

  // F10: Monthly housing budget
  {
    id: 'fin_housing_budget',
    dimension: 'financial',
    category: 'affordability',
    question_text:
      'What percentage of your gross monthly income would go to total housing costs (mortgage, insurance, taxes, HOA)?',
    question_type: 'single_choice',
    options: [
      { value: 'under_25', label: 'Under 25%' },
      { value: '25_28', label: '25-28%' },
      { value: '29_33', label: '29-33%' },
      { value: '34_40', label: '34-40%' },
      { value: 'over_40', label: 'Over 40%' },
    ],
    weight: 0.95,
    order_index: 10,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { under_25: 100, '25_28': 85, '29_33': 65, '34_40': 40, over_40: 15 },
    },
  },

  // F11: Additional income sources
  {
    id: 'fin_additional_income',
    dimension: 'financial',
    category: 'income',
    question_text: 'Do you have additional income sources beyond your primary job?',
    question_type: 'single_choice',
    options: [
      {
        value: 'significant',
        label: 'Yes, significant and reliable (rental income, investments, side business)',
      },
      { value: 'moderate', label: 'Yes, moderate and somewhat reliable' },
      { value: 'small', label: 'Yes, but small or inconsistent' },
      { value: 'none', label: 'No additional income sources' },
    ],
    weight: 0.6,
    order_index: 11,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { significant: 100, moderate: 70, small: 45, none: 30 },
    },
  },

  // F12: Closing costs preparedness
  {
    id: 'fin_closing_costs',
    dimension: 'financial',
    category: 'affordability',
    question_text: 'Have you budgeted for closing costs (typically 2-5% of home price)?',
    question_type: 'single_choice',
    options: [
      { value: 'fully_saved', label: 'Yes, fully saved and set aside' },
      { value: 'partially', label: 'Partially saved, plan to cover the rest' },
      { value: 'aware', label: 'Aware of them but have not saved specifically' },
      { value: 'unaware', label: 'Was not aware of closing costs' },
    ],
    weight: 0.75,
    order_index: 12,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { fully_saved: 100, partially: 65, aware: 35, unaware: 10 },
    },
  },

  // F13: Financial buffer for home maintenance
  {
    id: 'fin_maintenance_buffer',
    dimension: 'financial',
    category: 'savings',
    question_text:
      'Have you budgeted for ongoing home maintenance costs (typically 1-2% of home value per year)?',
    question_type: 'single_choice',
    options: [
      { value: 'yes_budgeted', label: 'Yes, included in my monthly budget planning' },
      { value: 'aware_planning', label: 'Aware of it, working it into my budget' },
      { value: 'somewhat', label: 'Somewhat aware but have not planned for it' },
      { value: 'no', label: 'Have not considered this' },
    ],
    weight: 0.7,
    order_index: 13,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { yes_budgeted: 100, aware_planning: 70, somewhat: 40, no: 15 },
    },
  },

  // F14: Employment type and mortgage qualification
  {
    id: 'fin_employment_type',
    dimension: 'financial',
    category: 'income',
    question_text: 'What is your employment situation?',
    question_type: 'single_choice',
    options: [
      { value: 'w2_2plus', label: 'W-2 employee, 2+ years at current employer' },
      { value: 'w2_under2', label: 'W-2 employee, less than 2 years at current employer' },
      {
        value: 'self_employed_2plus',
        label: 'Self-employed, 2+ years with documented income',
      },
      { value: 'self_employed_under2', label: 'Self-employed, less than 2 years' },
      { value: 'contract_gig', label: 'Contract or gig worker' },
      { value: 'between_jobs', label: 'Currently between jobs' },
    ],
    weight: 0.85,
    order_index: 14,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: {
        w2_2plus: 100,
        w2_under2: 70,
        self_employed_2plus: 75,
        self_employed_under2: 40,
        contract_gig: 35,
        between_jobs: 5,
      },
    },
  },

  // F15: Financial literacy confidence
  {
    id: 'fin_literacy',
    dimension: 'financial',
    category: 'affordability',
    question_text:
      'How well do you understand mortgage terms (APR, points, escrow, amortization)?',
    question_type: 'slider',
    options: { min: 1, max: 10, min_label: 'Not at all', max_label: 'Expert level' },
    weight: 0.5,
    order_index: 15,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'slider_direct',
      min: 1,
      max: 10,
      output_min: 10,
      output_max: 100,
    },
  },

  // =========================================================================
  // EMOTIONAL TRUTH (15 questions)
  // Categories: confidence, stress, alignment, support, readiness
  // =========================================================================

  // E1: Overall confidence
  {
    id: 'emo_confidence',
    dimension: 'emotional',
    category: 'confidence',
    question_text: 'How confident do you feel about buying a home right now?',
    question_type: 'slider',
    options: {
      min: 1,
      max: 10,
      min_label: 'Not at all confident',
      max_label: 'Completely confident',
    },
    weight: 0.8,
    order_index: 1,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'slider_direct',
      min: 1,
      max: 10,
      output_min: 10,
      output_max: 100,
    },
  },

  // E2: Decision clarity
  {
    id: 'emo_clarity',
    dimension: 'emotional',
    category: 'confidence',
    question_text:
      'How clear are you on what you want in a home (location, size, features)?',
    question_type: 'slider',
    options: { min: 1, max: 10, min_label: 'Very unclear', max_label: 'Crystal clear' },
    weight: 0.75,
    order_index: 2,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'slider_direct',
      min: 1,
      max: 10,
      output_min: 10,
      output_max: 100,
    },
  },

  // E3: Stress level about the process
  {
    id: 'emo_stress',
    dimension: 'emotional',
    category: 'stress',
    question_text: 'How stressed do you feel about the home buying process?',
    question_type: 'slider',
    options: {
      min: 1,
      max: 10,
      min_label: 'Extremely stressed',
      max_label: 'Completely calm',
    },
    weight: 0.8,
    order_index: 3,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'slider_direct',
      min: 1,
      max: 10,
      output_min: 10,
      output_max: 100,
    },
  },

  // E4: Fear of commitment
  {
    id: 'emo_commitment_fear',
    dimension: 'emotional',
    category: 'readiness',
    question_text:
      'How comfortable are you with the long-term commitment of homeownership (mortgage, maintenance, roots)?',
    question_type: 'slider',
    options: {
      min: 1,
      max: 10,
      min_label: 'Very uncomfortable',
      max_label: 'Completely comfortable',
    },
    weight: 0.85,
    order_index: 4,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'slider_direct',
      min: 1,
      max: 10,
      output_min: 10,
      output_max: 100,
    },
  },

  // E5: Partner/family alignment
  {
    id: 'emo_partner_alignment',
    dimension: 'emotional',
    category: 'alignment',
    question_text:
      'If purchasing with a partner or family, how aligned are you on the decision?',
    question_type: 'single_choice',
    options: [
      {
        value: 'fully_aligned',
        label: 'Fully aligned - we agree on timing, budget, and priorities',
      },
      { value: 'mostly_aligned', label: 'Mostly aligned - minor disagreements on details' },
      { value: 'partially', label: 'Partially aligned - some significant disagreements' },
      { value: 'not_aligned', label: 'Not aligned - major disagreements' },
      { value: 'solo', label: 'Purchasing alone - not applicable' },
    ],
    weight: 0.85,
    order_index: 5,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { fully_aligned: 100, mostly_aligned: 80, partially: 45, not_aligned: 15, solo: 75 },
    },
  },

  // E6: FOMO vs. genuine readiness
  {
    id: 'emo_fomo',
    dimension: 'emotional',
    category: 'readiness',
    question_text:
      'Is your desire to buy driven more by genuine readiness or by fear of missing out (rising prices, peer pressure)?',
    question_type: 'single_choice',
    options: [
      { value: 'genuine', label: 'Entirely genuine readiness and life planning' },
      { value: 'mostly_genuine', label: 'Mostly genuine with some external pressure' },
      {
        value: 'mixed',
        label: 'About equal - genuine desire mixed with external pressure',
      },
      { value: 'mostly_fomo', label: 'Mostly driven by fear of missing out' },
      { value: 'fomo', label: 'Primarily driven by external pressure or FOMO' },
    ],
    weight: 0.9,
    order_index: 6,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { genuine: 100, mostly_genuine: 80, mixed: 50, mostly_fomo: 25, fomo: 10 },
    },
  },

  // E7: Knowledge and preparedness
  {
    id: 'emo_preparedness',
    dimension: 'emotional',
    category: 'confidence',
    question_text:
      'How well do you understand the home buying process (from searching to closing)?',
    question_type: 'slider',
    options: {
      min: 1,
      max: 10,
      min_label: 'Know nothing',
      max_label: 'Know every step',
    },
    weight: 0.65,
    order_index: 7,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'slider_direct',
      min: 1,
      max: 10,
      output_min: 10,
      output_max: 100,
    },
  },

  // E8: Support network
  {
    id: 'emo_support_network',
    dimension: 'emotional',
    category: 'support',
    question_text: 'Do you have trusted people to guide you through this process?',
    question_type: 'single_choice',
    options: [
      {
        value: 'strong',
        label: 'Yes - real estate agent, financial advisor, and experienced friends/family',
      },
      {
        value: 'moderate',
        label: 'Some support - a few knowledgeable people to consult',
      },
      { value: 'minimal', label: 'Minimal - mostly figuring it out alone' },
      { value: 'none', label: 'No support network for this decision' },
    ],
    weight: 0.7,
    order_index: 8,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { strong: 100, moderate: 70, minimal: 40, none: 15 },
    },
  },

  // E9: Lifestyle readiness
  {
    id: 'emo_lifestyle_ready',
    dimension: 'emotional',
    category: 'readiness',
    question_text:
      'How ready is your current lifestyle for homeownership (maintenance, staying in one place, responsibility)?',
    question_type: 'slider',
    options: {
      min: 1,
      max: 10,
      min_label: 'Not ready at all',
      max_label: 'Completely ready',
    },
    weight: 0.8,
    order_index: 9,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'slider_direct',
      min: 1,
      max: 10,
      output_min: 10,
      output_max: 100,
    },
  },

  // E10: Regret tolerance
  {
    id: 'emo_regret_tolerance',
    dimension: 'emotional',
    category: 'stress',
    question_text:
      'How would you feel if you bought a home and the market dropped 10% in the first year?',
    question_type: 'single_choice',
    options: [
      { value: 'fine', label: 'Fine - I am buying for the long term, not to flip' },
      {
        value: 'slightly_anxious',
        label: 'Slightly anxious but would not regret the decision',
      },
      {
        value: 'worried',
        label: 'Worried - I would question if I made the right choice',
      },
      { value: 'devastated', label: 'Devastated - it would cause significant stress' },
    ],
    weight: 0.75,
    order_index: 10,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { fine: 100, slightly_anxious: 75, worried: 40, devastated: 10 },
    },
  },

  // E11: Compromise readiness
  {
    id: 'emo_compromise',
    dimension: 'emotional',
    category: 'alignment',
    question_text:
      'How willing are you to compromise on your ideal home to fit your budget?',
    question_type: 'slider',
    options: {
      min: 1,
      max: 10,
      min_label: 'Will not compromise at all',
      max_label: 'Very flexible and practical',
    },
    weight: 0.65,
    order_index: 11,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'slider_direct',
      min: 1,
      max: 10,
      output_min: 10,
      output_max: 100,
    },
  },

  // E12: Emotional vs. rational balance
  {
    id: 'emo_rational_balance',
    dimension: 'emotional',
    category: 'readiness',
    question_text:
      'When you think about buying a home, is your motivation more emotional or rational?',
    question_type: 'single_choice',
    options: [
      {
        value: 'balanced',
        label: 'Well balanced - excited but grounded in financial reality',
      },
      {
        value: 'slightly_emotional',
        label: 'Slightly more emotional but considering the numbers',
      },
      {
        value: 'mostly_rational',
        label: 'Mostly rational - focused on investment and numbers',
      },
      {
        value: 'very_emotional',
        label: 'Very emotional - driven by desire for the lifestyle',
      },
      { value: 'very_rational', label: 'Very rational - purely an investment decision' },
    ],
    weight: 0.7,
    order_index: 12,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: {
        balanced: 100,
        slightly_emotional: 70,
        mostly_rational: 80,
        very_emotional: 35,
        very_rational: 75,
      },
    },
  },

  // E13: Sleep test
  {
    id: 'emo_sleep_test',
    dimension: 'emotional',
    category: 'stress',
    question_text: 'Does thinking about this home purchase keep you up at night?',
    question_type: 'single_choice',
    options: [
      { value: 'never', label: 'Never - I sleep well when thinking about it' },
      { value: 'rarely', label: 'Rarely - occasional thoughts but not anxious' },
      { value: 'sometimes', label: 'Sometimes - it causes noticeable anxiety' },
      { value: 'often', label: 'Often - frequently losing sleep over it' },
    ],
    weight: 0.75,
    order_index: 13,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { never: 100, rarely: 75, sometimes: 40, often: 10 },
    },
  },

  // E14: Sense of excitement vs. obligation
  {
    id: 'emo_excitement',
    dimension: 'emotional',
    category: 'readiness',
    question_text: 'How excited are you about becoming a homeowner?',
    question_type: 'slider',
    options: {
      min: 1,
      max: 10,
      min_label: 'Not excited, feels like an obligation',
      max_label: 'Thrilled and genuinely excited',
    },
    weight: 0.6,
    order_index: 14,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'slider_direct',
      min: 1,
      max: 10,
      output_min: 10,
      output_max: 100,
    },
  },

  // E15: Past experience with major decisions
  {
    id: 'emo_past_decisions',
    dimension: 'emotional',
    category: 'confidence',
    question_text: 'How do you generally feel after making major life decisions?',
    question_type: 'single_choice',
    options: [
      { value: 'confident', label: 'Confident and at peace - I trust my judgment' },
      { value: 'mostly_good', label: 'Mostly good but with some second-guessing' },
      {
        value: 'anxious',
        label: 'Anxious - I tend to worry about whether I chose right',
      },
      { value: 'avoidant', label: 'I tend to avoid or delay major decisions' },
    ],
    weight: 0.6,
    order_index: 15,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { confident: 100, mostly_good: 75, anxious: 40, avoidant: 15 },
    },
  },

  // =========================================================================
  // PERFECT TIMING (15 questions)
  // Categories: timeline, market, life_stage, readiness, external
  // =========================================================================

  // T1: Decision timeline
  {
    id: 'tim_timeline',
    dimension: 'timing',
    category: 'timeline',
    question_text: 'How many months until you want to make this purchase?',
    question_type: 'single_choice',
    options: [
      { value: '0_3', label: '0-3 months (very soon)' },
      { value: '3_6', label: '3-6 months' },
      { value: '6_12', label: '6-12 months' },
      { value: '12_24', label: '1-2 years' },
      { value: '24_plus', label: '2+ years (exploring)' },
    ],
    weight: 0.9,
    order_index: 1,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { '0_3': 90, '3_6': 100, '6_12': 80, '12_24': 50, '24_plus': 30 },
    },
  },

  // T2: Market perception
  {
    id: 'tim_market_perception',
    dimension: 'timing',
    category: 'market',
    question_text: 'How do you perceive the current housing market in your target area?',
    question_type: 'single_choice',
    options: [
      {
        value: 'buyers',
        label: 'Buyer-friendly - lots of inventory, prices stable or falling',
      },
      { value: 'balanced', label: 'Balanced - reasonable inventory, fair prices' },
      {
        value: 'competitive',
        label: 'Competitive - low inventory, prices rising steadily',
      },
      { value: 'very_hot', label: 'Very hot - bidding wars, prices well above asking' },
      { value: 'unsure', label: 'I am not sure about current market conditions' },
    ],
    weight: 0.8,
    order_index: 2,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { buyers: 100, balanced: 85, competitive: 55, very_hot: 30, unsure: 40 },
    },
  },

  // T3: Interest rate environment
  {
    id: 'tim_interest_rates',
    dimension: 'timing',
    category: 'market',
    question_text: 'How do current mortgage interest rates affect your decision?',
    question_type: 'single_choice',
    options: [
      { value: 'favorable', label: 'Rates are favorable - locked in or ready to lock' },
      { value: 'acceptable', label: 'Rates are acceptable for my budget' },
      { value: 'high_but_ok', label: 'Rates are high but I can refinance later' },
      { value: 'prohibitive', label: 'Rates are making it unaffordable' },
      { value: 'waiting', label: 'Waiting for rates to drop before buying' },
    ],
    weight: 0.85,
    order_index: 3,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { favorable: 100, acceptable: 80, high_but_ok: 60, prohibitive: 20, waiting: 35 },
    },
  },

  // T4: Life stage stability
  {
    id: 'tim_life_stage',
    dimension: 'timing',
    category: 'life_stage',
    question_text: 'How settled is your life situation right now?',
    question_type: 'single_choice',
    options: [
      {
        value: 'very_settled',
        label: 'Very settled - stable job, relationships, and community',
      },
      {
        value: 'mostly_settled',
        label: 'Mostly settled - one or two things still in flux',
      },
      {
        value: 'transitioning',
        label: 'In transition - career change, new relationship, or relocation',
      },
      {
        value: 'very_uncertain',
        label: 'Very uncertain - multiple major life changes happening',
      },
    ],
    weight: 0.9,
    order_index: 4,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { very_settled: 100, mostly_settled: 75, transitioning: 35, very_uncertain: 10 },
    },
  },

  // T5: Career trajectory
  {
    id: 'tim_career',
    dimension: 'timing',
    category: 'life_stage',
    question_text:
      'How does your career trajectory affect your location flexibility in the next 3-5 years?',
    question_type: 'single_choice',
    options: [
      {
        value: 'rooted',
        label: 'Rooted - committed to this area for the foreseeable future',
      },
      {
        value: 'likely_stay',
        label: 'Likely staying - no plans to move but not 100% certain',
      },
      {
        value: 'might_relocate',
        label: 'Might relocate - career could take me elsewhere',
      },
      {
        value: 'likely_move',
        label: 'Likely moving - transfer or new opportunity probable',
      },
      { value: 'remote_flexible', label: 'Fully remote - can work from anywhere' },
    ],
    weight: 0.85,
    order_index: 5,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: {
        rooted: 100,
        likely_stay: 80,
        might_relocate: 40,
        likely_move: 15,
        remote_flexible: 85,
      },
    },
  },

  // T6: Rental vs. ownership economics
  {
    id: 'tim_rent_vs_buy',
    dimension: 'timing',
    category: 'readiness',
    question_text:
      'How does your current rent compare to what your mortgage payment would be?',
    question_type: 'single_choice',
    options: [
      { value: 'mortgage_lower', label: 'Mortgage would be lower than my current rent' },
      { value: 'about_same', label: 'About the same as my current rent' },
      {
        value: 'mortgage_slightly_more',
        label: 'Mortgage would be slightly more (10-20% higher)',
      },
      {
        value: 'mortgage_much_more',
        label: 'Mortgage would be significantly more (20%+ higher)',
      },
      { value: 'not_renting', label: 'Not currently renting (living with family, etc.)' },
    ],
    weight: 0.75,
    order_index: 6,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: {
        mortgage_lower: 100,
        about_same: 85,
        mortgage_slightly_more: 60,
        mortgage_much_more: 30,
        not_renting: 70,
      },
    },
  },

  // T7: Lease situation
  {
    id: 'tim_lease',
    dimension: 'timing',
    category: 'timeline',
    question_text: 'When does your current lease expire?',
    question_type: 'single_choice',
    options: [
      { value: 'month_to_month', label: 'Month-to-month - can leave anytime' },
      { value: 'ending_soon', label: 'Ending in 1-3 months' },
      { value: 'mid_term', label: '4-8 months remaining' },
      { value: 'long_term', label: '9+ months remaining' },
      { value: 'no_lease', label: 'Not currently on a lease' },
    ],
    weight: 0.7,
    order_index: 7,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { month_to_month: 90, ending_soon: 100, mid_term: 70, long_term: 40, no_lease: 80 },
    },
  },

  // T8: Family planning impact
  {
    id: 'tim_family_planning',
    dimension: 'timing',
    category: 'life_stage',
    question_text:
      'How does your family situation affect the timing of this purchase?',
    question_type: 'single_choice',
    options: [
      {
        value: 'perfect_timing',
        label: 'Perfect timing - family needs align with buying now',
      },
      { value: 'good_timing', label: 'Good timing - no family changes expected soon' },
      { value: 'growing_family', label: 'Growing family - need more space soon' },
      {
        value: 'uncertain',
        label: 'Uncertain - family plans could change the equation',
      },
      { value: 'not_factor', label: 'Not a factor in my timing decision' },
    ],
    weight: 0.7,
    order_index: 8,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: {
        perfect_timing: 100,
        good_timing: 85,
        growing_family: 75,
        uncertain: 40,
        not_factor: 70,
      },
    },
  },

  // T9: Seasonal considerations
  {
    id: 'tim_seasonal',
    dimension: 'timing',
    category: 'market',
    question_text:
      'Have you considered how seasonality affects home buying in your area?',
    question_type: 'single_choice',
    options: [
      {
        value: 'optimal_season',
        label: 'Yes, and I am targeting the optimal season for buyers',
      },
      { value: 'aware', label: 'Yes, I am aware but flexible on timing' },
      { value: 'not_considered', label: 'Have not thought about seasonal factors' },
      { value: 'not_relevant', label: 'Seasonal patterns do not apply to my market' },
    ],
    weight: 0.5,
    order_index: 9,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { optimal_season: 100, aware: 75, not_considered: 40, not_relevant: 70 },
    },
  },

  // T10: Urgency level
  {
    id: 'tim_urgency',
    dimension: 'timing',
    category: 'timeline',
    question_text: 'How urgent is your need to buy a home?',
    question_type: 'slider',
    options: {
      min: 1,
      max: 10,
      min_label: 'No urgency at all',
      max_label: 'Extremely urgent',
    },
    weight: 0.7,
    order_index: 10,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'threshold',
      thresholds: [
        { max: 2, score: 40 },
        { max: 4, score: 60 },
        { max: 6, score: 85 },
        { max: 8, score: 100 },
        { max: 10, score: 70 },
      ],
    },
  },

  // T11: Economic outlook
  {
    id: 'tim_economic_outlook',
    dimension: 'timing',
    category: 'external',
    question_text:
      'How do you view the broader economic outlook for the next 1-2 years?',
    question_type: 'single_choice',
    options: [
      { value: 'optimistic', label: 'Optimistic - economy growing, job market strong' },
      { value: 'cautious', label: 'Cautiously optimistic - stable but watchful' },
      { value: 'uncertain', label: 'Uncertain - mixed signals, hard to predict' },
      { value: 'pessimistic', label: 'Pessimistic - expecting slowdown or recession' },
    ],
    weight: 0.65,
    order_index: 11,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { optimistic: 100, cautious: 75, uncertain: 45, pessimistic: 25 },
    },
  },

  // T12: Area development
  {
    id: 'tim_area_development',
    dimension: 'timing',
    category: 'market',
    question_text:
      'Is the area you are looking at experiencing growth or development?',
    question_type: 'single_choice',
    options: [
      {
        value: 'strong_growth',
        label: 'Strong growth - new businesses, infrastructure, rising values',
      },
      {
        value: 'steady',
        label: 'Steady - stable neighborhood with gradual appreciation',
      },
      {
        value: 'declining',
        label: 'Declining - businesses leaving, values stagnant or falling',
      },
      { value: 'unknown', label: 'I have not researched the area trends' },
    ],
    weight: 0.65,
    order_index: 12,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { strong_growth: 95, steady: 80, declining: 30, unknown: 35 },
    },
  },

  // T13: Other financial goals timing
  {
    id: 'tim_competing_goals',
    dimension: 'timing',
    category: 'readiness',
    question_text:
      'Do you have other major financial goals competing for your savings?',
    question_type: 'single_choice',
    options: [
      { value: 'none', label: 'No - home buying is my primary financial goal' },
      { value: 'minor', label: 'Minor goals that will not be affected' },
      { value: 'moderate', label: 'Some competing goals I need to balance' },
      {
        value: 'major',
        label: 'Major competing goals (wedding, education, business)',
      },
    ],
    weight: 0.75,
    order_index: 13,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { none: 100, minor: 80, moderate: 50, major: 25 },
    },
  },

  // T14: Decision readiness window
  {
    id: 'tim_readiness_window',
    dimension: 'timing',
    category: 'readiness',
    question_text:
      'If the perfect home appeared today at the right price, could you act on it?',
    question_type: 'single_choice',
    options: [
      { value: 'immediately', label: 'Yes, I could make an offer today' },
      {
        value: 'within_weeks',
        label: 'Within a few weeks - need to finalize financing',
      },
      { value: 'within_months', label: 'Within a few months - still preparing' },
      { value: 'not_yet', label: 'No - I am not ready to act yet' },
    ],
    weight: 0.9,
    order_index: 14,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { immediately: 100, within_weeks: 80, within_months: 45, not_yet: 15 },
    },
  },

  // T15: Waiting cost awareness
  {
    id: 'tim_waiting_cost',
    dimension: 'timing',
    category: 'external',
    question_text:
      'Have you considered what waiting costs you (continued rent, potential price increases, life on hold)?',
    question_type: 'single_choice',
    options: [
      {
        value: 'calculated',
        label: 'Yes, I have calculated the cost of waiting vs. buying now',
      },
      { value: 'aware', label: 'Generally aware that waiting has costs' },
      { value: 'not_considered', label: 'Have not thought about it that way' },
      { value: 'waiting_is_better', label: 'I believe waiting will save me money' },
    ],
    weight: 0.6,
    order_index: 15,
    decision_types: ['home_buying'],
    scoring_function: {
      type: 'option_map',
      scores: { calculated: 100, aware: 70, not_considered: 35, waiting_is_better: 50 },
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all questions for a given decision type. */
export function getQuestionsForDecisionType(decisionType: string): Question[] {
  return QUESTION_BANK.filter((q) => q.decision_types.includes(decisionType));
}

/** Get questions filtered by dimension and decision type. */
export function getQuestionsByDimension(
  dimension: Dimension,
  decisionType: string
): Question[] {
  return QUESTION_BANK.filter(
    (q) => q.dimension === dimension && q.decision_types.includes(decisionType)
  ).sort((a, b) => a.order_index - b.order_index);
}

/** Dimension ordering for flow sequencing: financial -> emotional -> timing. */
export const DIMENSION_ORDER: Dimension[] = ['financial', 'emotional', 'timing'];
