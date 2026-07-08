-- =============================================================================
-- 00006_seed_question_bank.sql — 45 canonical questions
-- Ported faithfully from the legacy lib/questions/bank.ts. ON CONFLICT (id)
-- DO NOTHING so re-running this migration never overwrites edited rows.
-- =============================================================================

insert into question_bank
  (id, dimension, category, question_text, question_type, options, weight, order_index, decision_types, scoring_function)
values

-- =========================================================================
-- FINANCIAL REALITY (15 questions)
-- =========================================================================

('fin_income', 'financial', 'income',
 'What is your monthly gross income (before taxes)?',
 'number', null, 1.0, 1, array['home_buying'],
 '{"type":"linear_scale","min":0,"max":25000,"optimal_min":6000,"unit":"usd"}'::jsonb),

('fin_income_stability', 'financial', 'income',
 'How stable has your income been over the past 2 years?',
 'single_choice',
 '[{"value":"very_stable","label":"Very stable - consistent employment, no gaps"},{"value":"mostly_stable","label":"Mostly stable - minor changes but reliable"},{"value":"somewhat_unstable","label":"Somewhat unstable - job changes or variable income"},{"value":"unstable","label":"Unstable - frequent gaps or major fluctuations"}]'::jsonb,
 0.9, 2, array['home_buying'],
 '{"type":"option_map","scores":{"very_stable":100,"mostly_stable":75,"somewhat_unstable":40,"unstable":15}}'::jsonb),

('fin_savings_total', 'financial', 'savings',
 'How much do you currently have in total savings and liquid investments?',
 'number', null, 1.0, 3, array['home_buying'],
 '{"type":"linear_scale","min":0,"max":200000,"optimal_min":40000,"unit":"usd"}'::jsonb),

('fin_down_payment', 'financial', 'savings',
 'What percentage of the home price can you put as a down payment?',
 'single_choice',
 '[{"value":"20_plus","label":"20% or more"},{"value":"15_19","label":"15-19%"},{"value":"10_14","label":"10-14%"},{"value":"5_9","label":"5-9%"},{"value":"3_4","label":"3-4% (FHA minimum)"},{"value":"less_3","label":"Less than 3%"}]'::jsonb,
 1.0, 4, array['home_buying'],
 '{"type":"option_map","scores":{"20_plus":100,"15_19":85,"10_14":70,"5_9":50,"3_4":35,"less_3":15}}'::jsonb),

('fin_emergency_fund', 'financial', 'savings',
 'After the down payment and closing costs, how many months of expenses would you have in your emergency fund?',
 'single_choice',
 '[{"value":"6_plus","label":"6 or more months"},{"value":"4_5","label":"4-5 months"},{"value":"2_3","label":"2-3 months"},{"value":"1","label":"About 1 month"},{"value":"none","label":"Little to none"}]'::jsonb,
 0.95, 5, array['home_buying'],
 '{"type":"option_map","scores":{"6_plus":100,"4_5":75,"2_3":50,"1":25,"none":5}}'::jsonb),

('fin_debt_payments', 'financial', 'debt',
 'What are your total monthly debt payments (student loans, car loans, credit cards, etc.)?',
 'number', null, 0.9, 6, array['home_buying'],
 '{"type":"inverse_scale","min":0,"max":5000,"optimal_max":500,"unit":"usd"}'::jsonb),

('fin_dti_ratio', 'financial', 'debt',
 'What is your current debt-to-income ratio (total monthly debts / gross monthly income)?',
 'single_choice',
 '[{"value":"under_20","label":"Under 20%"},{"value":"20_28","label":"20-28%"},{"value":"29_36","label":"29-36%"},{"value":"37_43","label":"37-43%"},{"value":"over_43","label":"Over 43%"},{"value":"unknown","label":"I am not sure"}]'::jsonb,
 0.95, 7, array['home_buying'],
 '{"type":"option_map","scores":{"under_20":100,"20_28":85,"29_36":65,"37_43":40,"over_43":15,"unknown":30}}'::jsonb),

('fin_credit_score', 'financial', 'credit',
 'What is your current credit score?',
 'single_choice',
 '[{"value":"excellent","label":"Excellent (760+)"},{"value":"good","label":"Good (700-759)"},{"value":"fair","label":"Fair (640-699)"},{"value":"poor","label":"Poor (580-639)"},{"value":"very_poor","label":"Very poor (below 580)"},{"value":"unknown","label":"I do not know my credit score"}]'::jsonb,
 1.0, 8, array['home_buying'],
 '{"type":"option_map","scores":{"excellent":100,"good":80,"fair":55,"poor":30,"very_poor":10,"unknown":25}}'::jsonb),

('fin_preapproval', 'financial', 'affordability',
 'Have you been pre-approved for a mortgage?',
 'single_choice',
 '[{"value":"yes_strong","label":"Yes, fully pre-approved with a competitive rate"},{"value":"yes_basic","label":"Yes, pre-approved but still comparing lenders"},{"value":"prequalified","label":"Pre-qualified but not formally pre-approved"},{"value":"started","label":"Started the process but not completed"},{"value":"no","label":"No, have not started"}]'::jsonb,
 0.85, 9, array['home_buying'],
 '{"type":"option_map","scores":{"yes_strong":100,"yes_basic":80,"prequalified":55,"started":35,"no":10}}'::jsonb),

('fin_housing_budget', 'financial', 'affordability',
 'What percentage of your gross monthly income would go to total housing costs (mortgage, insurance, taxes, HOA)?',
 'single_choice',
 '[{"value":"under_25","label":"Under 25%"},{"value":"25_28","label":"25-28%"},{"value":"29_33","label":"29-33%"},{"value":"34_40","label":"34-40%"},{"value":"over_40","label":"Over 40%"}]'::jsonb,
 0.95, 10, array['home_buying'],
 '{"type":"option_map","scores":{"under_25":100,"25_28":85,"29_33":65,"34_40":40,"over_40":15}}'::jsonb),

('fin_additional_income', 'financial', 'income',
 'Do you have additional income sources beyond your primary job?',
 'single_choice',
 '[{"value":"significant","label":"Yes, significant and reliable (rental income, investments, side business)"},{"value":"moderate","label":"Yes, moderate and somewhat reliable"},{"value":"small","label":"Yes, but small or inconsistent"},{"value":"none","label":"No additional income sources"}]'::jsonb,
 0.6, 11, array['home_buying'],
 '{"type":"option_map","scores":{"significant":100,"moderate":70,"small":45,"none":30}}'::jsonb),

('fin_closing_costs', 'financial', 'affordability',
 'Have you budgeted for closing costs (typically 2-5% of home price)?',
 'single_choice',
 '[{"value":"fully_saved","label":"Yes, fully saved and set aside"},{"value":"partially","label":"Partially saved, plan to cover the rest"},{"value":"aware","label":"Aware of them but have not saved specifically"},{"value":"unaware","label":"Was not aware of closing costs"}]'::jsonb,
 0.75, 12, array['home_buying'],
 '{"type":"option_map","scores":{"fully_saved":100,"partially":65,"aware":35,"unaware":10}}'::jsonb),

('fin_maintenance_buffer', 'financial', 'savings',
 'Have you budgeted for ongoing home maintenance costs (typically 1-2% of home value per year)?',
 'single_choice',
 '[{"value":"yes_budgeted","label":"Yes, included in my monthly budget planning"},{"value":"aware_planning","label":"Aware of it, working it into my budget"},{"value":"somewhat","label":"Somewhat aware but have not planned for it"},{"value":"no","label":"Have not considered this"}]'::jsonb,
 0.7, 13, array['home_buying'],
 '{"type":"option_map","scores":{"yes_budgeted":100,"aware_planning":70,"somewhat":40,"no":15}}'::jsonb),

('fin_employment_type', 'financial', 'income',
 'What is your employment situation?',
 'single_choice',
 '[{"value":"w2_2plus","label":"W-2 employee, 2+ years at current employer"},{"value":"w2_under2","label":"W-2 employee, less than 2 years at current employer"},{"value":"self_employed_2plus","label":"Self-employed, 2+ years with documented income"},{"value":"self_employed_under2","label":"Self-employed, less than 2 years"},{"value":"contract_gig","label":"Contract or gig worker"},{"value":"between_jobs","label":"Currently between jobs"}]'::jsonb,
 0.85, 14, array['home_buying'],
 '{"type":"option_map","scores":{"w2_2plus":100,"w2_under2":70,"self_employed_2plus":75,"self_employed_under2":40,"contract_gig":35,"between_jobs":5}}'::jsonb),

('fin_literacy', 'financial', 'affordability',
 'How well do you understand mortgage terms (APR, points, escrow, amortization)?',
 'slider',
 '{"min":1,"max":10,"min_label":"Not at all","max_label":"Expert level"}'::jsonb,
 0.5, 15, array['home_buying'],
 '{"type":"slider_direct","min":1,"max":10,"output_min":10,"output_max":100}'::jsonb),

-- =========================================================================
-- EMOTIONAL TRUTH (15 questions)
-- =========================================================================

('emo_confidence', 'emotional', 'confidence',
 'How confident do you feel about buying a home right now?',
 'slider',
 '{"min":1,"max":10,"min_label":"Not at all confident","max_label":"Completely confident"}'::jsonb,
 0.8, 1, array['home_buying'],
 '{"type":"slider_direct","min":1,"max":10,"output_min":10,"output_max":100}'::jsonb),

('emo_clarity', 'emotional', 'confidence',
 'How clear are you on what you want in a home (location, size, features)?',
 'slider',
 '{"min":1,"max":10,"min_label":"Very unclear","max_label":"Crystal clear"}'::jsonb,
 0.75, 2, array['home_buying'],
 '{"type":"slider_direct","min":1,"max":10,"output_min":10,"output_max":100}'::jsonb),

('emo_stress', 'emotional', 'stress',
 'How stressed do you feel about the home buying process?',
 'slider',
 '{"min":1,"max":10,"min_label":"Extremely stressed","max_label":"Completely calm"}'::jsonb,
 0.8, 3, array['home_buying'],
 '{"type":"slider_direct","min":1,"max":10,"output_min":10,"output_max":100}'::jsonb),

('emo_commitment_fear', 'emotional', 'readiness',
 'How comfortable are you with the long-term commitment of homeownership (mortgage, maintenance, roots)?',
 'slider',
 '{"min":1,"max":10,"min_label":"Very uncomfortable","max_label":"Completely comfortable"}'::jsonb,
 0.85, 4, array['home_buying'],
 '{"type":"slider_direct","min":1,"max":10,"output_min":10,"output_max":100}'::jsonb),

('emo_partner_alignment', 'emotional', 'alignment',
 'If purchasing with a partner or family, how aligned are you on the decision?',
 'single_choice',
 '[{"value":"fully_aligned","label":"Fully aligned - we agree on timing, budget, and priorities"},{"value":"mostly_aligned","label":"Mostly aligned - minor disagreements on details"},{"value":"partially","label":"Partially aligned - some significant disagreements"},{"value":"not_aligned","label":"Not aligned - major disagreements"},{"value":"solo","label":"Purchasing alone - not applicable"}]'::jsonb,
 0.85, 5, array['home_buying'],
 '{"type":"option_map","scores":{"fully_aligned":100,"mostly_aligned":80,"partially":45,"not_aligned":15,"solo":75}}'::jsonb),

('emo_fomo', 'emotional', 'readiness',
 'Is your desire to buy driven more by genuine readiness or by fear of missing out (rising prices, peer pressure)?',
 'single_choice',
 '[{"value":"genuine","label":"Entirely genuine readiness and life planning"},{"value":"mostly_genuine","label":"Mostly genuine with some external pressure"},{"value":"mixed","label":"About equal - genuine desire mixed with external pressure"},{"value":"mostly_fomo","label":"Mostly driven by fear of missing out"},{"value":"fomo","label":"Primarily driven by external pressure or FOMO"}]'::jsonb,
 0.9, 6, array['home_buying'],
 '{"type":"option_map","scores":{"genuine":100,"mostly_genuine":80,"mixed":50,"mostly_fomo":25,"fomo":10}}'::jsonb),

('emo_preparedness', 'emotional', 'confidence',
 'How well do you understand the home buying process (from searching to closing)?',
 'slider',
 '{"min":1,"max":10,"min_label":"Know nothing","max_label":"Know every step"}'::jsonb,
 0.65, 7, array['home_buying'],
 '{"type":"slider_direct","min":1,"max":10,"output_min":10,"output_max":100}'::jsonb),

('emo_support_network', 'emotional', 'support',
 'Do you have trusted people to guide you through this process?',
 'single_choice',
 '[{"value":"strong","label":"Yes - real estate agent, financial advisor, and experienced friends/family"},{"value":"moderate","label":"Some support - a few knowledgeable people to consult"},{"value":"minimal","label":"Minimal - mostly figuring it out alone"},{"value":"none","label":"No support network for this decision"}]'::jsonb,
 0.7, 8, array['home_buying'],
 '{"type":"option_map","scores":{"strong":100,"moderate":70,"minimal":40,"none":15}}'::jsonb),

('emo_lifestyle_ready', 'emotional', 'readiness',
 'How ready is your current lifestyle for homeownership (maintenance, staying in one place, responsibility)?',
 'slider',
 '{"min":1,"max":10,"min_label":"Not ready at all","max_label":"Completely ready"}'::jsonb,
 0.8, 9, array['home_buying'],
 '{"type":"slider_direct","min":1,"max":10,"output_min":10,"output_max":100}'::jsonb),

('emo_regret_tolerance', 'emotional', 'stress',
 'How would you feel if you bought a home and the market dropped 10% in the first year?',
 'single_choice',
 '[{"value":"fine","label":"Fine - I am buying for the long term, not to flip"},{"value":"slightly_anxious","label":"Slightly anxious but would not regret the decision"},{"value":"worried","label":"Worried - I would question if I made the right choice"},{"value":"devastated","label":"Devastated - it would cause significant stress"}]'::jsonb,
 0.75, 10, array['home_buying'],
 '{"type":"option_map","scores":{"fine":100,"slightly_anxious":75,"worried":40,"devastated":10}}'::jsonb),

('emo_compromise', 'emotional', 'alignment',
 'How willing are you to compromise on your ideal home to fit your budget?',
 'slider',
 '{"min":1,"max":10,"min_label":"Will not compromise at all","max_label":"Very flexible and practical"}'::jsonb,
 0.65, 11, array['home_buying'],
 '{"type":"slider_direct","min":1,"max":10,"output_min":10,"output_max":100}'::jsonb),

('emo_rational_balance', 'emotional', 'readiness',
 'When you think about buying a home, is your motivation more emotional or rational?',
 'single_choice',
 '[{"value":"balanced","label":"Well balanced - excited but grounded in financial reality"},{"value":"slightly_emotional","label":"Slightly more emotional but considering the numbers"},{"value":"mostly_rational","label":"Mostly rational - focused on investment and numbers"},{"value":"very_emotional","label":"Very emotional - driven by desire for the lifestyle"},{"value":"very_rational","label":"Very rational - purely an investment decision"}]'::jsonb,
 0.7, 12, array['home_buying'],
 '{"type":"option_map","scores":{"balanced":100,"slightly_emotional":70,"mostly_rational":80,"very_emotional":35,"very_rational":75}}'::jsonb),

('emo_sleep_test', 'emotional', 'stress',
 'Does thinking about this home purchase keep you up at night?',
 'single_choice',
 '[{"value":"never","label":"Never - I sleep well when thinking about it"},{"value":"rarely","label":"Rarely - occasional thoughts but not anxious"},{"value":"sometimes","label":"Sometimes - it causes noticeable anxiety"},{"value":"often","label":"Often - frequently losing sleep over it"}]'::jsonb,
 0.75, 13, array['home_buying'],
 '{"type":"option_map","scores":{"never":100,"rarely":75,"sometimes":40,"often":10}}'::jsonb),

('emo_excitement', 'emotional', 'readiness',
 'How excited are you about becoming a homeowner?',
 'slider',
 '{"min":1,"max":10,"min_label":"Not excited, feels like an obligation","max_label":"Thrilled and genuinely excited"}'::jsonb,
 0.6, 14, array['home_buying'],
 '{"type":"slider_direct","min":1,"max":10,"output_min":10,"output_max":100}'::jsonb),

('emo_past_decisions', 'emotional', 'confidence',
 'How do you generally feel after making major life decisions?',
 'single_choice',
 '[{"value":"confident","label":"Confident and at peace - I trust my judgment"},{"value":"mostly_good","label":"Mostly good but with some second-guessing"},{"value":"anxious","label":"Anxious - I tend to worry about whether I chose right"},{"value":"avoidant","label":"I tend to avoid or delay major decisions"}]'::jsonb,
 0.6, 15, array['home_buying'],
 '{"type":"option_map","scores":{"confident":100,"mostly_good":75,"anxious":40,"avoidant":15}}'::jsonb),

-- =========================================================================
-- PERFECT TIMING (15 questions)
-- =========================================================================

('tim_timeline', 'timing', 'timeline',
 'How many months until you want to make this purchase?',
 'single_choice',
 '[{"value":"0_3","label":"0-3 months (very soon)"},{"value":"3_6","label":"3-6 months"},{"value":"6_12","label":"6-12 months"},{"value":"12_24","label":"1-2 years"},{"value":"24_plus","label":"2+ years (exploring)"}]'::jsonb,
 0.9, 1, array['home_buying'],
 '{"type":"option_map","scores":{"0_3":90,"3_6":100,"6_12":80,"12_24":50,"24_plus":30}}'::jsonb),

('tim_market_perception', 'timing', 'market',
 'How do you perceive the current housing market in your target area?',
 'single_choice',
 '[{"value":"buyers","label":"Buyer-friendly - lots of inventory, prices stable or falling"},{"value":"balanced","label":"Balanced - reasonable inventory, fair prices"},{"value":"competitive","label":"Competitive - low inventory, prices rising steadily"},{"value":"very_hot","label":"Very hot - bidding wars, prices well above asking"},{"value":"unsure","label":"I am not sure about current market conditions"}]'::jsonb,
 0.8, 2, array['home_buying'],
 '{"type":"option_map","scores":{"buyers":100,"balanced":85,"competitive":55,"very_hot":30,"unsure":40}}'::jsonb),

('tim_interest_rates', 'timing', 'market',
 'How do current mortgage interest rates affect your decision?',
 'single_choice',
 '[{"value":"favorable","label":"Rates are favorable - locked in or ready to lock"},{"value":"acceptable","label":"Rates are acceptable for my budget"},{"value":"high_but_ok","label":"Rates are high but I can refinance later"},{"value":"prohibitive","label":"Rates are making it unaffordable"},{"value":"waiting","label":"Waiting for rates to drop before buying"}]'::jsonb,
 0.85, 3, array['home_buying'],
 '{"type":"option_map","scores":{"favorable":100,"acceptable":80,"high_but_ok":60,"prohibitive":20,"waiting":35}}'::jsonb),

('tim_life_stage', 'timing', 'life_stage',
 'How settled is your life situation right now?',
 'single_choice',
 '[{"value":"very_settled","label":"Very settled - stable job, relationships, and community"},{"value":"mostly_settled","label":"Mostly settled - one or two things still in flux"},{"value":"transitioning","label":"In transition - career change, new relationship, or relocation"},{"value":"very_uncertain","label":"Very uncertain - multiple major life changes happening"}]'::jsonb,
 0.9, 4, array['home_buying'],
 '{"type":"option_map","scores":{"very_settled":100,"mostly_settled":75,"transitioning":35,"very_uncertain":10}}'::jsonb),

('tim_career', 'timing', 'life_stage',
 'How does your career trajectory affect your location flexibility in the next 3-5 years?',
 'single_choice',
 '[{"value":"rooted","label":"Rooted - committed to this area for the foreseeable future"},{"value":"likely_stay","label":"Likely staying - no plans to move but not 100% certain"},{"value":"might_relocate","label":"Might relocate - career could take me elsewhere"},{"value":"likely_move","label":"Likely moving - transfer or new opportunity probable"},{"value":"remote_flexible","label":"Fully remote - can work from anywhere"}]'::jsonb,
 0.85, 5, array['home_buying'],
 '{"type":"option_map","scores":{"rooted":100,"likely_stay":80,"might_relocate":40,"likely_move":15,"remote_flexible":85}}'::jsonb),

('tim_rent_vs_buy', 'timing', 'readiness',
 'How does your current rent compare to what your mortgage payment would be?',
 'single_choice',
 '[{"value":"mortgage_lower","label":"Mortgage would be lower than my current rent"},{"value":"about_same","label":"About the same as my current rent"},{"value":"mortgage_slightly_more","label":"Mortgage would be slightly more (10-20% higher)"},{"value":"mortgage_much_more","label":"Mortgage would be significantly more (20%+ higher)"},{"value":"not_renting","label":"Not currently renting (living with family, etc.)"}]'::jsonb,
 0.75, 6, array['home_buying'],
 '{"type":"option_map","scores":{"mortgage_lower":100,"about_same":85,"mortgage_slightly_more":60,"mortgage_much_more":30,"not_renting":70}}'::jsonb),

('tim_lease', 'timing', 'timeline',
 'When does your current lease expire?',
 'single_choice',
 '[{"value":"month_to_month","label":"Month-to-month - can leave anytime"},{"value":"ending_soon","label":"Ending in 1-3 months"},{"value":"mid_term","label":"4-8 months remaining"},{"value":"long_term","label":"9+ months remaining"},{"value":"no_lease","label":"Not currently on a lease"}]'::jsonb,
 0.7, 7, array['home_buying'],
 '{"type":"option_map","scores":{"month_to_month":90,"ending_soon":100,"mid_term":70,"long_term":40,"no_lease":80}}'::jsonb),

('tim_family_planning', 'timing', 'life_stage',
 'How does your family situation affect the timing of this purchase?',
 'single_choice',
 '[{"value":"perfect_timing","label":"Perfect timing - family needs align with buying now"},{"value":"good_timing","label":"Good timing - no family changes expected soon"},{"value":"growing_family","label":"Growing family - need more space soon"},{"value":"uncertain","label":"Uncertain - family plans could change the equation"},{"value":"not_factor","label":"Not a factor in my timing decision"}]'::jsonb,
 0.7, 8, array['home_buying'],
 '{"type":"option_map","scores":{"perfect_timing":100,"good_timing":85,"growing_family":75,"uncertain":40,"not_factor":70}}'::jsonb),

('tim_seasonal', 'timing', 'market',
 'Have you considered how seasonality affects home buying in your area?',
 'single_choice',
 '[{"value":"optimal_season","label":"Yes, and I am targeting the optimal season for buyers"},{"value":"aware","label":"Yes, I am aware but flexible on timing"},{"value":"not_considered","label":"Have not thought about seasonal factors"},{"value":"not_relevant","label":"Seasonal patterns do not apply to my market"}]'::jsonb,
 0.5, 9, array['home_buying'],
 '{"type":"option_map","scores":{"optimal_season":100,"aware":75,"not_considered":40,"not_relevant":70}}'::jsonb),

('tim_urgency', 'timing', 'timeline',
 'How urgent is your need to buy a home?',
 'slider',
 '{"min":1,"max":10,"min_label":"No urgency at all","max_label":"Extremely urgent"}'::jsonb,
 0.7, 10, array['home_buying'],
 '{"type":"threshold","thresholds":[{"max":2,"score":40},{"max":4,"score":60},{"max":6,"score":85},{"max":8,"score":100},{"max":10,"score":70}]}'::jsonb),

('tim_economic_outlook', 'timing', 'external',
 'How do you view the broader economic outlook for the next 1-2 years?',
 'single_choice',
 '[{"value":"optimistic","label":"Optimistic - economy growing, job market strong"},{"value":"cautious","label":"Cautiously optimistic - stable but watchful"},{"value":"uncertain","label":"Uncertain - mixed signals, hard to predict"},{"value":"pessimistic","label":"Pessimistic - expecting slowdown or recession"}]'::jsonb,
 0.65, 11, array['home_buying'],
 '{"type":"option_map","scores":{"optimistic":100,"cautious":75,"uncertain":45,"pessimistic":25}}'::jsonb),

('tim_area_development', 'timing', 'market',
 'Is the area you are looking at experiencing growth or development?',
 'single_choice',
 '[{"value":"strong_growth","label":"Strong growth - new businesses, infrastructure, rising values"},{"value":"steady","label":"Steady - stable neighborhood with gradual appreciation"},{"value":"declining","label":"Declining - businesses leaving, values stagnant or falling"},{"value":"unknown","label":"I have not researched the area trends"}]'::jsonb,
 0.65, 12, array['home_buying'],
 '{"type":"option_map","scores":{"strong_growth":95,"steady":80,"declining":30,"unknown":35}}'::jsonb),

('tim_competing_goals', 'timing', 'readiness',
 'Do you have other major financial goals competing for your savings?',
 'single_choice',
 '[{"value":"none","label":"No - home buying is my primary financial goal"},{"value":"minor","label":"Minor goals that will not be affected"},{"value":"moderate","label":"Some competing goals I need to balance"},{"value":"major","label":"Major competing goals (wedding, education, business)"}]'::jsonb,
 0.75, 13, array['home_buying'],
 '{"type":"option_map","scores":{"none":100,"minor":80,"moderate":50,"major":25}}'::jsonb),

('tim_readiness_window', 'timing', 'readiness',
 'If the perfect home appeared today at the right price, could you act on it?',
 'single_choice',
 '[{"value":"immediately","label":"Yes, I could make an offer today"},{"value":"within_weeks","label":"Within a few weeks - need to finalize financing"},{"value":"within_months","label":"Within a few months - still preparing"},{"value":"not_yet","label":"No - I am not ready to act yet"}]'::jsonb,
 0.9, 14, array['home_buying'],
 '{"type":"option_map","scores":{"immediately":100,"within_weeks":80,"within_months":45,"not_yet":15}}'::jsonb),

('tim_waiting_cost', 'timing', 'external',
 'Have you considered what waiting costs you (continued rent, potential price increases, life on hold)?',
 'single_choice',
 '[{"value":"calculated","label":"Yes, I have calculated the cost of waiting vs. buying now"},{"value":"aware","label":"Generally aware that waiting has costs"},{"value":"not_considered","label":"Have not thought about it that way"},{"value":"waiting_is_better","label":"I believe waiting will save me money"}]'::jsonb,
 0.6, 15, array['home_buying'],
 '{"type":"option_map","scores":{"calculated":100,"aware":70,"not_considered":35,"waiting_is_better":50}}'::jsonb)

on conflict (id) do nothing;
