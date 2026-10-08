export type CourseTask = 'task1' | 'task2'

export interface PhraseContrast {
  clumsy: string
  natural: string
  why: string
}

export interface LexicalRule {
  /** Case-insensitive regular-expression source. Keep it narrow enough for automatic feedback. */
  find: string
  replacement: string
  why: string
}

export interface TargetPhrase {
  label: string
  /** A target counts once when any of these case-insensitive fragments is present. */
  matches: string[]
}

export interface WritingLesson {
  day: number
  task: CourseTask
  title: string
  focus: string
  principles: string[]
  contrasts: PhraseContrast[]
  prompt: string
  directions: string
  minWords: number
  maxWords: number
  targets: TargetPhrase[]
  rules: LexicalRule[]
  model: string
}

const task1: WritingLesson[] = [
  {
    day: 1,
    task: 'task1',
    title: 'Trend verbs and noun phrases',
    focus: 'Choose a verb–adverb or adjective–noun partnership that describes the movement precisely.',
    principles: [
      'Use one strong trend verb instead of a vague verb plus extra words: rise, climb, decline, dip or remain stable.',
      'Keep the grammar of the collocation consistent: rose sharply, but a sharp rise.',
      'Report the data; do not explain causes or call a change good, bad or successful.',
    ],
    contrasts: [
      { clumsy: 'The figure had an increase strongly.', natural: 'The figure rose sharply.', why: 'Rise + sharply is the natural verb–adverb pairing.' },
      { clumsy: 'There was a big decrease in sales.', natural: 'There was a substantial decline in sales.', why: 'Substantial decline is precise and suitably academic.' },
      { clumsy: 'The number stayed nearly the same.', natural: 'The figure remained relatively stable.', why: 'Remain stable is the conventional reporting collocation.' },
    ],
    prompt: 'A town recorded 25,000 bus journeys in 2010, 42,000 in 2014, 40,000 in 2017 and 61,000 in 2020. Write one 70–100 word detail paragraph describing the changes.',
    directions: 'Use at least three different trend collocations. Include the small fall as well as the overall rise.',
    minWords: 70,
    maxWords: 100,
    targets: [
      { label: 'rise / climb + adverb', matches: ['rose ', 'climbed ', 'increased '] },
      { label: 'a slight dip / decline', matches: ['slight dip', 'slight decline', 'dipped slightly', 'fell slightly'] },
      { label: 'a peak / highest point', matches: ['peak of', 'peaked at', 'highest point'] },
      { label: 'from … to …', matches: ['from 25,000 to', 'from 25,000 bus journeys to'] },
    ],
    rules: [
      { find: '\\b(?:had|experienced) an increase strongly\\b', replacement: 'rose sharply', why: 'An increase needs an adjective; the more concise verb phrase is rose sharply.' },
      { find: '\\ba big (increase|decrease)\\b', replacement: 'a substantial $1', why: 'Big is conversational and imprecise in data reporting.' },
      { find: '\\bstayed (?:almost|nearly) the same\\b', replacement: 'remained relatively stable', why: 'Remain relatively stable is the standard neutral collocation.' },
    ],
    model: 'Bus use rose markedly from 25,000 journeys in 2010 to 42,000 in 2014. This growth was followed by a slight dip to 40,000 in 2017. The figure then climbed sharply, reaching a peak of 61,000 journeys in 2020. Overall, despite the brief decline in the middle of the period, the number of journeys more than doubled.',
  },
  {
    day: 2,
    task: 'task1',
    title: 'Degrees of change',
    focus: 'Match the strength of your modifier to the size of the change.',
    principles: [
      'Use slight or marginal for a small change, steady or gradual for pace, and sharp or dramatic for a large change.',
      'Do not stack near-synonyms such as very dramatically; one accurate modifier is stronger.',
      'Distinguish amount from speed: a figure can rise steadily but only slightly overall.',
    ],
    contrasts: [
      { clumsy: 'Prices increased a little significantly.', natural: 'Prices increased marginally.', why: 'One calibrated adverb is clearer than contradictory modifiers.' },
      { clumsy: 'There was a very dramatic sharp fall.', natural: 'There was a dramatic fall.', why: 'Dramatic already expresses a large change.' },
      { clumsy: 'The figure slowly had a small growth.', natural: 'The figure grew gradually.', why: 'Grow gradually is concise and idiomatic.' },
    ],
    prompt: 'Company A rose from 12% to 14%, Company B climbed from 18% to 35%, and Company C fell from 30% to 29%. Write a 70–100 word comparison paragraph.',
    directions: 'Calibrate your modifiers so the 2-point, 17-point and 1-point changes do not sound equal.',
    minWords: 70,
    maxWords: 100,
    targets: [
      { label: 'marginal / slight change', matches: ['marginally', 'slightly', 'marginal increase', 'slight increase', 'slight fall', 'marginal fall'] },
      { label: 'sharp / substantial rise', matches: ['sharply', 'substantially', 'sharp rise', 'substantial rise', 'dramatic increase'] },
      { label: 'percentage points', matches: ['percentage point'] },
    ],
    rules: [
      { find: '\\bvery dramatically\\b', replacement: 'dramatically', why: 'Dramatically is already an extreme modifier.' },
      { find: '\\ba little significantly\\b', replacement: 'marginally', why: 'The two modifiers conflict; marginally expresses a small change precisely.' },
      { find: '\\bgrew slowly by a small amount\\b', replacement: 'grew gradually', why: 'A conventional adverb avoids a wordy translated phrase.' },
    ],
    model: 'Company A recorded a modest increase of 2 percentage points, rising from 12% to 14%. By contrast, Company B’s share climbed sharply from 18% to 35%, an increase of 17 percentage points. Company C was the only firm to decline, although its proportion fell only marginally, from 30% to 29%.',
  },
  {
    day: 3,
    task: 'task1',
    title: 'Comparisons and data prepositions',
    focus: 'Build compact comparisons with accurate prepositions and reference words.',
    principles: [
      'Use higher than, twice as high as and exceeded … by; do not translate comparisons word for word.',
      'Use at for a reported level, by for the amount of change, and to for the final value.',
      'Use respectively only when two ordered lists correspond clearly.',
    ],
    contrasts: [
      { clumsy: 'X was higher Y with 10%.', natural: 'X was 10 percentage points higher than Y.', why: 'Higher than and percentage points express the comparison accurately.' },
      { clumsy: 'Sales increased 20 to 50.', natural: 'Sales increased by 20 to reach 50.', why: 'By gives the size of change; to gives the endpoint.' },
      { clumsy: 'A was two times more than B.', natural: 'A was twice as high as B.', why: 'Twice as high as avoids an ambiguous multiplier.' },
    ],
    prompt: 'In 2025, rail accounted for 48% of journeys, buses 32% and taxis 16%. In 2015, the figures were 30%, 35% and 20%. Write a 70–100 word comparison paragraph.',
    directions: 'Compare modes and years. Use by, to and at accurately, plus one compact comparative structure.',
    minWords: 70,
    maxWords: 100,
    targets: [
      { label: 'higher / lower than', matches: ['higher than', 'lower than'] },
      { label: 'increased by … to …', matches: ['increased by', 'rose by', 'climbed by'] },
      { label: 'stood at / accounted for', matches: ['stood at', 'accounted for'] },
      { label: 'twice as high as / exceeded by', matches: ['twice as high as', 'exceeded', 'percentage points higher'] },
    ],
    rules: [
      { find: '\\bhigher ([A-Za-z]+) with\\b', replacement: 'higher than $1 by', why: 'The comparative requires than; by introduces the difference.' },
      { find: '\\btwo times more than\\b', replacement: 'twice as high as', why: 'Twice as high as is concise and mathematically unambiguous.' },
      { find: '\\bincreased from ([0-9%]+) by ([0-9%]+)\\b', replacement: 'increased from $1 to $2', why: 'Use from … to … for start and end values.' },
    ],
    model: 'Rail use rose by 18 percentage points, from 30% in 2015 to 48% in 2025. Its final share was therefore considerably higher than that of buses, which slipped from 35% to 32%. Taxi journeys also declined, accounting for 16% in 2025 compared with 20% ten years earlier. At 48%, rail’s share was three times as high as that of taxis.',
  },
  {
    day: 4,
    task: 'task1',
    title: 'Overview language',
    focus: 'Select and group the dominant features without listing every number.',
    principles: [
      'Signal the overview directly with Overall, it is clear that or the most notable feature is that.',
      'Group related features: upward trends, downward trends, leaders and exceptions.',
      'Prefer dominant, remained the largest and overtook to vague phrases such as changed a lot.',
    ],
    contrasts: [
      { clumsy: 'Overall, many changes happened in the chart.', natural: 'Overall, online sales grew across all categories.', why: 'The natural version states the shared pattern instead of announcing change.' },
      { clumsy: 'Food was always the top.', natural: 'Food remained the largest category throughout.', why: 'Remain the largest is precise and formal.' },
      { clumsy: 'Clothing went over electronics.', natural: 'Clothing overtook electronics.', why: 'Overtake is the exact verb for a change in ranking.' },
    ],
    prompt: 'Four sectors all increased between 2000 and 2020. Technology remained the largest; health grew fastest; agriculture stayed the smallest; retail overtook manufacturing in 2015. Write a 55–80 word overview.',
    directions: 'Do not include detailed figures. State two or three grouped, high-level features.',
    minWords: 55,
    maxWords: 80,
    targets: [
      { label: 'clear overview signal', matches: ['overall,', 'overall ', 'it is clear that', 'most notable feature'] },
      { label: 'remained the largest / smallest', matches: ['remained the largest', 'remained the smallest', 'largest throughout', 'smallest throughout'] },
      { label: 'grew fastest / strongest growth', matches: ['grew fastest', 'fastest growth', 'strongest growth'] },
      { label: 'overtook', matches: ['overtook'] },
    ],
    rules: [
      { find: '\\bmany changes happened\\b', replacement: 'all four sectors grew', why: 'Name the dominant pattern rather than referring vaguely to changes.' },
      { find: '\\bwas always the top\\b', replacement: 'remained the largest throughout', why: 'This is the conventional formal phrase for an unchanged leader.' },
      { find: '\\bwent over\\b', replacement: 'overtook', why: 'Overtake precisely describes one category moving ahead of another.' },
    ],
    model: 'Overall, all four sectors expanded over the period, although the pace of growth varied considerably. Technology remained the largest sector throughout, whereas agriculture was consistently the smallest. Health experienced the fastest growth, while retail overtook manufacturing towards the end of the period.',
  },
  {
    day: 5,
    task: 'task1',
    title: 'Approximation without vagueness',
    focus: 'Use controlled approximation when the graphic does not support an exact figure.',
    principles: [
      'Use approximately, roughly, just over and just under according to what the graphic shows.',
      'Avoid about plus another approximator, such as about roughly.',
      'Use close to for proximity, not more or less when you can be more precise.',
    ],
    contrasts: [
      { clumsy: 'It was about roughly 50.', natural: 'It stood at approximately 50.', why: 'Only one approximator is needed.' },
      { clumsy: 'The figure was more or less 100.', natural: 'The figure was just under 100.', why: 'Just under reports direction as well as proximity.' },
      { clumsy: 'Nearly around one third.', natural: 'Approximately one third.', why: 'Stacked approximators sound careless.' },
    ],
    prompt: 'A bar chart appears to show 49% for housing, 31% for food, 21% for transport and 9% for leisure. Write a 65–90 word paragraph without presenting uncertain values as exact.',
    directions: 'Use at least three different approximation phrases and make one comparison.',
    minWords: 65,
    maxWords: 90,
    targets: [
      { label: 'just under / just over', matches: ['just under', 'just over'] },
      { label: 'approximately / roughly', matches: ['approximately', 'roughly'] },
      { label: 'close to / almost', matches: ['close to', 'almost'] },
      { label: 'proportion / share', matches: ['proportion', 'share'] },
    ],
    rules: [
      { find: '\\babout roughly\\b', replacement: 'approximately', why: 'Do not combine two words that perform the same approximating function.' },
      { find: '\\bnearly around\\b', replacement: 'approximately', why: 'One controlled approximator is more precise.' },
      { find: '\\bmore or less 100\\b', replacement: 'just under 100', why: 'Just under shows both proximity and direction.' },
    ],
    model: 'Housing represented just under half of total expenditure, at approximately 49%. Food accounted for close to one third, while the share spent on transport stood at just over one fifth. By contrast, leisure made up only about 9%, meaning that the proportion for housing was roughly five times as high.',
  },
  {
    day: 6,
    task: 'task1',
    title: 'Maps and processes: formal verbs',
    focus: 'Replace vague all-purpose verbs with precise transformation and process verbs.',
    principles: [
      'For maps, use was converted into, was replaced by, was constructed and remained unchanged.',
      'For processes, use is transported, undergoes, is separated and is then transferred.',
      'Use the passive when the action matters more than the actor, but do not force it into every clause.',
    ],
    contrasts: [
      { clumsy: 'They made the field into houses.', natural: 'The field was converted into a residential area.', why: 'The passive transformation phrase is formal and precise.' },
      { clumsy: 'A road was put in the north.', natural: 'A road was constructed in the northern part of the site.', why: 'Constructed and northern part suit map reporting.' },
      { clumsy: 'The water goes to the tank.', natural: 'The water is then transferred to a storage tank.', why: 'Transferred identifies the process more exactly than goes.' },
    ],
    prompt: 'A 1990 map had farmland in the west, a small shop in the centre and a footpath in the east. By 2025, houses replaced the farmland, a supermarket replaced the shop, and the footpath was unchanged. Write 70–100 words.',
    directions: 'Use precise map verbs and at least two passive constructions.',
    minWords: 70,
    maxWords: 100,
    targets: [
      { label: 'was converted into / replaced by', matches: ['was converted into', 'was replaced by', 'were converted into', 'were replaced by'] },
      { label: 'was constructed / developed', matches: ['was constructed', 'were constructed', 'was developed', 'were developed'] },
      { label: 'remained unchanged / was retained', matches: ['remained unchanged', 'was retained'] },
      { label: 'location phrase', matches: ['western part', 'eastern part', 'centre of the', 'center of the'] },
    ],
    rules: [
      { find: '\\bmade the (.+?) into\\b', replacement: 'converted the $1 into', why: 'Convert into is the precise verb for a change of use.' },
      { find: '\\bwas put in\\b', replacement: 'was constructed in', why: 'Put is too general for a formal map description.' },
      { find: '\\bstayed the same\\b', replacement: 'remained unchanged', why: 'Remain unchanged is concise and appropriately formal.' },
    ],
    model: 'The site underwent substantial redevelopment between 1990 and 2025. The farmland in the western part of the area was converted into housing, while the small central shop was replaced by a supermarket. In contrast to these major changes, the footpath along the eastern side of the site remained unchanged. No new development took place in that part of the area.',
  },
  {
    day: 7,
    task: 'task1',
    title: 'Task 1 lexical synthesis',
    focus: 'Combine precise trend, comparison and overview language under time pressure.',
    principles: [
      'Select language from the data rather than trying to display memorised synonyms.',
      'Avoid repeating figure and increase by switching grammar, not by using unnatural substitutes.',
      'Reserve your clearest collocations for the overview and the largest contrasts.',
    ],
    contrasts: [
      { clumsy: 'The amount of people had an upward trend.', natural: 'The number of visitors rose steadily.', why: 'People are countable, and rose steadily is more direct.' },
      { clumsy: 'In comparison with X, Y was more high.', natural: 'Y was considerably higher than X.', why: 'The comparative adjective is higher, not more high.' },
      { clumsy: 'It can be seen that there were many fluctuations.', natural: 'The figure fluctuated considerably.', why: 'A direct reporting clause is more concise.' },
    ],
    prompt: 'Museum visitors: 2010—40,000; 2015—65,000; 2020—52,000; 2025—80,000. Gallery visitors: 2010—70,000; 2015—60,000; 2020—55,000; 2025—45,000. Write a 110–140 word overview and detail paragraph.',
    directions: 'Spend no more than 25 minutes. Include an overview, comparisons and calibrated trend language.',
    minWords: 110,
    maxWords: 140,
    targets: [
      { label: 'overview statement', matches: ['overall,', 'overall '] },
      { label: 'precise upward trend', matches: ['rose steadily', 'rose sharply', 'climbed', 'upward trend'] },
      { label: 'precise downward trend', matches: ['declined steadily', 'fell steadily', 'downward trend', 'decline'] },
      { label: 'ranking change', matches: ['overtook', 'surpassed', 'higher than'] },
    ],
    rules: [
      { find: '\\bamount of people\\b', replacement: 'number of people', why: 'Use number with countable nouns such as people or visitors.' },
      { find: '\\bmore high than\\b', replacement: 'higher than', why: 'Higher is the correct comparative form.' },
      { find: '\\bit can be seen that there (?:was|were)\\b', replacement: 'the data show', why: 'A direct reporting clause is more concise and confident.' },
    ],
    model: 'Overall, the museum experienced substantial growth despite a temporary decline, whereas gallery attendance fell steadily. The museum consequently overtook the gallery by the end of the period. Museum visits climbed from 40,000 in 2010 to 65,000 in 2015 before dipping to 52,000 five years later. The figure then recovered sharply, reaching a peak of 80,000 in 2025. By contrast, gallery attendance declined throughout the period, falling from 70,000 to 60,000 between 2010 and 2015. It then decreased more gradually to 55,000 in 2020 and 45,000 in 2025, which was 35,000 lower than the corresponding museum figure.',
  },
]

const task2: WritingLesson[] = [
  {
    day: 8,
    task: 'task2',
    title: 'Precise claims and stance',
    focus: 'State a measured position with verbs that match the strength of your evidence.',
    principles: [
      'Use argue, contend and maintain for positions; demonstrate and establish imply stronger evidence.',
      'Hedge broad claims with tends to, can or is likely to when certainty is not justified.',
      'Avoid I strongly believe that in every paragraph; let precise reasoning carry the stance.',
    ],
    contrasts: [
      { clumsy: 'This proves that online learning is best.', natural: 'This suggests that online learning can be highly effective.', why: 'Suggests and can avoid an absolute claim the evidence may not support.' },
      { clumsy: 'I think it has many good sides.', natural: 'I would argue that it offers several substantial benefits.', why: 'The natural version is specific and appropriately formal.' },
      { clumsy: 'People say university is important.', natural: 'It is widely argued that higher education remains valuable.', why: 'The claim has an academic register and a precise subject.' },
    ],
    prompt: 'Some people believe university education should be free for everyone. Write an 90–120 word introduction and thesis that takes a clear but measured position.',
    directions: 'Use one stance verb, one hedge and one precise noun phrase.',
    minWords: 90,
    maxWords: 120,
    targets: [
      { label: 'stance verb', matches: ['argue that', 'contend that', 'maintain that'] },
      { label: 'measured hedge', matches: ['can ', 'tends to', 'is likely to', 'may '] },
      { label: 'precise benefit or cost', matches: ['access to higher education', 'financial burden', 'public expenditure', 'educational opportunity'] },
    ],
    rules: [
      { find: '\\bthis proves that\\b', replacement: 'this suggests that', why: 'Proves is usually too absolute for an IELTS argument.' },
      { find: '\\bmany good sides\\b', replacement: 'several substantial benefits', why: 'Benefits is formal and substantial gives a clearer evaluation.' },
      { find: '\\bpeople say\\b', replacement: 'it is widely argued', why: 'Avoid a vague, conversational source for an academic claim.' },
    ],
    model: 'It is widely argued that access to higher education should not depend on a student’s ability to pay. Although fully funded tuition would place a considerable burden on public expenditure, I would argue that governments should cover most costs because doing so can widen educational opportunity and produce long-term social benefits. A carefully targeted system is therefore preferable to either universal fees or completely unrestricted funding.',
  },
  {
    day: 9,
    task: 'task2',
    title: 'Cause and effect collocations',
    focus: 'Make causal relationships precise without overstating them.',
    principles: [
      'Use contribute to when several causes are involved and lead to when the relationship is more direct.',
      'Pair verbs with natural nouns: pose a threat, place pressure on, have an adverse effect on.',
      'Avoid cause + person + to have a bad result when a compact collocation exists.',
    ],
    contrasts: [
      { clumsy: 'Cars make air pollution.', natural: 'Private vehicles contribute to air pollution.', why: 'Contribute to accurately expresses one cause among several.' },
      { clumsy: 'This gives pressure for hospitals.', natural: 'This places pressure on hospitals.', why: 'Place pressure on is the fixed collocation.' },
      { clumsy: 'It brings a bad effect to health.', natural: 'It has an adverse effect on public health.', why: 'Adverse effect on is formal, precise and correctly prepositioned.' },
    ],
    prompt: 'Write a 100–130 word body paragraph explaining how heavy reliance on private cars affects cities.',
    directions: 'Develop one causal chain. Use at least three cause–effect collocations without making absolute claims.',
    minWords: 100,
    maxWords: 130,
    targets: [
      { label: 'contribute to / lead to', matches: ['contribute to', 'contributes to', 'lead to', 'leads to'] },
      { label: 'place pressure on', matches: ['place pressure on', 'places pressure on', 'put pressure on', 'puts pressure on'] },
      { label: 'adverse effect / pose a threat', matches: ['adverse effect on', 'pose a threat to', 'poses a threat to'] },
      { label: 'causal hedge', matches: ['can ', 'may ', 'is likely to'] },
    ],
    rules: [
      { find: '\\bmake(?:s)? air pollution\\b', replacement: 'contributes to air pollution', why: 'Contribute to is the natural causal collocation.' },
      { find: '\\b(?:give|gives) pressure (?:for|to)\\b', replacement: 'places pressure on', why: 'English uses place pressure on, not give pressure to.' },
      { find: '\\b(?:bring|brings) a bad effect to\\b', replacement: 'has an adverse effect on', why: 'Have an adverse effect on is formal and idiomatic.' },
    ],
    model: 'Heavy reliance on private cars can have an adverse effect on urban life. A high volume of traffic contributes to poor air quality, which in turn poses a threat to public health. Congestion also places pressure on road networks and may lengthen commuting times, reducing workers’ productivity and leisure time. If reliable public transport is unavailable, these problems can reinforce car dependence and lead to further increases in traffic.',
  },
  {
    day: 10,
    task: 'task2',
    title: 'Problem–solution language',
    focus: 'Name the mechanism of a solution instead of promising that it will solve everything.',
    principles: [
      'Use address, tackle, alleviate and mitigate according to whether a measure removes or reduces a problem.',
      'Use implement a policy, enforce regulations, provide incentives and allocate funding.',
      'Explain how a measure works; do not stop at governments should do something.',
    ],
    contrasts: [
      { clumsy: 'The government should solve this problem.', natural: 'The government should implement measures to curb excessive car use.', why: 'The natural version names both an action and its purpose.' },
      { clumsy: 'They can make a new policy.', natural: 'They can introduce a targeted policy.', why: 'Introduce or implement a policy is the natural collocation.' },
      { clumsy: 'This will delete traffic jams.', natural: 'This could alleviate traffic congestion.', why: 'Alleviate means reduce the severity; delete is not used for social problems.' },
    ],
    prompt: 'Write a 100–130 word solution paragraph for traffic congestion in city centres.',
    directions: 'Propose one main measure, explain its mechanism and acknowledge a practical condition.',
    minWords: 100,
    maxWords: 130,
    targets: [
      { label: 'implement / introduce a policy', matches: ['implement a', 'introduce a', 'adopt a'] },
      { label: 'alleviate / mitigate / curb', matches: ['alleviate', 'mitigate', 'curb'] },
      { label: 'provide incentives / allocate funding', matches: ['provide incentives', 'offer incentives', 'allocate funding', 'invest in'] },
      { label: 'condition language', matches: ['provided that', 'as long as', 'would require', 'only if'] },
    ],
    rules: [
      { find: '\\bsolve this problem\\b', replacement: 'address this issue', why: 'Address is measured; solve can imply complete removal without evidence.' },
      { find: '\\bmake a new policy\\b', replacement: 'introduce a targeted policy', why: 'Introduce a policy is the standard collocation.' },
      { find: '\\bdelete traffic jams\\b', replacement: 'alleviate traffic congestion', why: 'Alleviate collocates with congestion and avoids an unrealistic absolute claim.' },
    ],
    model: 'Municipal authorities could alleviate congestion by introducing a charge for vehicles entering the city centre. Such a policy would provide an incentive for commuters to use public transport and could curb unnecessary car journeys. However, the measure would be equitable only if the revenue were invested in frequent, affordable bus and rail services. Its success would therefore require both effective enforcement and a credible alternative to driving.',
  },
  {
    day: 11,
    task: 'task2',
    title: 'Concession and balance',
    focus: 'Acknowledge a valid opposing point without weakening your position.',
    principles: [
      'Use although or while inside a sentence; use nevertheless or even so to pivot between sentences.',
      'Concede a specific limitation, then explain why your main claim still carries more weight.',
      'Avoid on the other hand when you are not presenting a genuinely contrasting side.',
    ],
    contrasts: [
      { clumsy: 'Although it is expensive, but it is useful.', natural: 'Although it is expensive, it offers substantial long-term benefits.', why: 'Although already marks contrast, so but is redundant.' },
      { clumsy: 'Every coin has two sides.', natural: 'Admittedly, the policy would involve significant initial costs.', why: 'A specific concession advances the argument; a proverb does not.' },
      { clumsy: 'This argument is true, however I disagree.', natural: 'This concern is valid; nevertheless, the benefits are likely to outweigh the costs.', why: 'The pivot is explicit, measured and grammatically complete.' },
    ],
    prompt: 'Write a 100–130 word paragraph arguing for remote work while conceding one drawback.',
    directions: 'Use a specific concession, a clear pivot and a measured final judgment.',
    minWords: 100,
    maxWords: 130,
    targets: [
      { label: 'specific concession', matches: ['admittedly,', 'although ', 'while it is true', 'while remote'] },
      { label: 'pivot', matches: ['nevertheless,', 'even so,', 'however,'] },
      { label: 'outweigh', matches: ['outweigh'] },
      { label: 'measured judgment', matches: ['is likely to', 'tends to', 'can still'] },
    ],
    rules: [
      { find: '\\balthough ([^.!?]+), but\\b', replacement: 'although $1,', why: 'Do not use but in the same clause structure as although.' },
      { find: '\\bevery coin has two sides\\b', replacement: 'admittedly, this approach has limitations', why: 'Replace a memorised proverb with a specific academic concession.' },
      { find: '\\bthis argument is true\\b', replacement: 'this concern is valid', why: 'Concern is more precise when acknowledging a drawback.' },
    ],
    model: 'Admittedly, remote work can reduce spontaneous collaboration and may leave some employees feeling isolated. Nevertheless, these drawbacks can be mitigated through regular team meetings and a hybrid schedule. Working from home also removes lengthy commutes and gives many employees greater control over their working environment. The resulting gains in well-being and productivity are therefore likely to outweigh the limitations, provided that organisations maintain clear communication.',
  },
  {
    day: 12,
    task: 'task2',
    title: 'Examples and careful generalisation',
    focus: 'Use examples to support a claim without inventing evidence or generalising about everyone.',
    principles: [
      'Introduce realistic illustrations with for example, for instance or a clear case is.',
      'Use many, some, a growing proportion of or people in … rather than all people.',
      'Explain the relevance of the example; do not attach it as an isolated sentence.',
    ],
    contrasts: [
      { clumsy: 'All young people are addicted to phones.', natural: 'Many young people spend a substantial amount of time on smartphones.', why: 'The natural version avoids an unsupported absolute and loaded wording.' },
      { clumsy: 'For example, Japan is a developed country.', natural: 'For instance, Japan’s extensive rail network gives commuters a practical alternative to driving.', why: 'The example now directly supports a transport claim.' },
      { clumsy: 'There are many examples in real life.', natural: 'A clear example can be seen in cities with integrated transport networks.', why: 'The revised phrase leads into relevant evidence.' },
    ],
    prompt: 'Write a 100–130 word paragraph arguing that public transport investment benefits urban residents. Include one developed example.',
    directions: 'Make a qualified claim, give a plausible example and explain exactly how it supports the claim.',
    minWords: 100,
    maxWords: 130,
    targets: [
      { label: 'qualified group', matches: ['many ', 'some ', 'a growing proportion', 'urban residents'] },
      { label: 'example signal', matches: ['for example,', 'for instance,', 'a clear example'] },
      { label: 'relevance link', matches: ['this means that', 'as a result,', 'thereby ', 'which allows'] },
    ],
    rules: [
      { find: '\\ball (young )?people\\b', replacement: 'many $1people', why: 'All is an unsupported generalisation in most social arguments.' },
      { find: '\\bthere are many examples in real life\\b', replacement: 'a clear example can be seen', why: 'Move directly to a relevant illustration.' },
      { find: '\\beveryone knows that\\b', replacement: 'it is widely recognised that', why: 'Everyone knows is conversational and impossible to substantiate.' },
    ],
    model: 'Investment in public transport can improve daily life for many urban residents. For instance, a frequent suburban rail service gives commuters a reliable alternative to driving during peak hours. This reduces the time they spend in traffic and allows households to avoid some of the costs associated with car ownership. As a result, an integrated network can make employment and essential services more accessible, particularly for lower-income residents who may not own a vehicle.',
  },
  {
    day: 13,
    task: 'task2',
    title: 'Academic register without inflation',
    focus: 'Sound formal through precision, not through rare or oversized words.',
    principles: [
      'Prefer common academic verbs used accurately: reduce, enable, require, restrict and undermine.',
      'Avoid conversational language, clichés and inflated synonyms that do not fit the context.',
      'Choose the noun that names the issue: children, employees, expenditure or access—not things and stuff.',
    ],
    contrasts: [
      { clumsy: 'The government should do lots of things.', natural: 'The government should adopt a combination of targeted measures.', why: 'The revised noun phrase states the type and scope of action.' },
      { clumsy: 'This gigantic issue deteriorates people’s life.', natural: 'This serious issue can undermine people’s quality of life.', why: 'Serious issue and undermine quality of life are natural combinations.' },
      { clumsy: 'Kids get bad things from ads.', natural: 'Children can be adversely influenced by advertising.', why: 'The vocabulary is formal without being needlessly obscure.' },
    ],
    prompt: 'Write a 100–130 word paragraph on whether advertising aimed at children should be restricted.',
    directions: 'Use precise, restrained academic language. Avoid clichés, conversational words and exaggerated claims.',
    minWords: 100,
    maxWords: 130,
    targets: [
      { label: 'restrict / regulate advertising', matches: ['restrict advertising', 'regulate advertising', 'advertising restrictions', 'stricter regulation'] },
      { label: 'influence / undermine', matches: ['influence', 'undermine'] },
      { label: 'targeted measure', matches: ['targeted measure', 'specific measure', 'clear regulation'] },
      { label: 'precise affected group', matches: ['children', 'young consumers', 'parents'] },
    ],
    rules: [
      { find: '\\bdo lots of things\\b', replacement: 'adopt a combination of targeted measures', why: 'Name the action instead of using vague conversational wording.' },
      { find: '\\bgigantic issue\\b', replacement: 'serious issue', why: 'Gigantic sounds inflated when describing an abstract problem.' },
      { find: '\\bkids\\b', replacement: 'children', why: 'Children is the more appropriate word in a formal essay.' },
      { find: '\\bbad things\\b', replacement: 'harmful messages', why: 'A precise noun phrase improves both clarity and register.' },
    ],
    model: 'Advertising aimed at children should be subject to stricter regulation because young consumers may not recognise persuasive intent. Repeated exposure to promotions for unhealthy food can influence their preferences and undermine parents’ efforts to encourage balanced diets. Governments should therefore adopt targeted measures, such as restricting such advertisements during children’s programmes and requiring clear labels on sponsored content. These rules would protect children without imposing an unnecessary ban on all commercial communication.',
  },
  {
    day: 14,
    task: 'task2',
    title: 'Task 2 lexical synthesis',
    focus: 'Write a developed body paragraph with precise claims, collocations and a consistent academic register.',
    principles: [
      'Build a lexical chain: claim → cause → effect → example → qualification.',
      'Repeat a key noun when clarity requires it; forced synonyms often create awkward wording.',
      'Use sophisticated language only when it is the most natural language for the idea.',
    ],
    contrasts: [
      { clumsy: 'Technology brings many conveniences for people.', natural: 'Digital technology gives employees greater flexibility.', why: 'The benefit and affected group are named precisely.' },
      { clumsy: 'It causes society to become worse.', natural: 'It can weaken social interaction in some settings.', why: 'The natural version is specific and appropriately qualified.' },
      { clumsy: 'We should find a solution for this phenomenon.', natural: 'Employers should establish clear boundaries around after-hours communication.', why: 'A concrete actor and measure replace empty abstract language.' },
    ],
    prompt: 'Some people think digital technology improves work–life balance, while others believe it makes employees constantly available. Write a 120–150 word body paragraph supporting one side while acknowledging the other.',
    directions: 'Spend no more than 25 minutes. Use a precise claim, a causal chain, one concession and one concrete measure or example.',
    minWords: 120,
    maxWords: 150,
    targets: [
      { label: 'precise benefit / drawback', matches: ['greater flexibility', 'work–life balance', 'work-life balance', 'constant availability', 'after-hours communication'] },
      { label: 'cause–effect collocation', matches: ['contribute to', 'lead to', 'place pressure on', 'adverse effect on'] },
      { label: 'concession and pivot', matches: ['admittedly,', 'although ', 'nevertheless,', 'even so,'] },
      { label: 'concrete response', matches: ['establish clear boundaries', 'introduce a policy', 'set clear expectations', 'right to disconnect'] },
    ],
    rules: [
      { find: '\\bbring(?:s)? many conveniences (?:for|to) people\\b', replacement: 'offers employees greater flexibility', why: 'Offer flexibility is a natural collocation and names the affected group.' },
      { find: '\\bcauses society to become worse\\b', replacement: 'can weaken social interaction', why: 'The revised phrase identifies a specific effect and avoids overclaiming.' },
      { find: '\\bfind a solution for this phenomenon\\b', replacement: 'address this problem directly', why: 'Phenomenon is inflated here; address a problem is natural and concise.' },
    ],
    model: 'Digital technology can improve work–life balance by giving employees greater flexibility over when and where they work. This autonomy may reduce commuting time and allow workers to organise professional responsibilities around family commitments. Admittedly, constant connectivity can also place pressure on employees to respond outside working hours. Nevertheless, this drawback is not inevitable. For example, employers can establish clear boundaries around after-hours communication or introduce a formal right-to-disconnect policy. Such measures preserve the flexibility of digital work while reducing the risk that it will lead to constant availability and eventual burnout.',
  },
]

export const WRITING_CURRICULUM: readonly WritingLesson[] = [...task1, ...task2]

export function lessonForDay(day: number): WritingLesson {
  return WRITING_CURRICULUM[Math.max(0, Math.min(WRITING_CURRICULUM.length - 1, day - 1))]
}

export function taskLabel(task: CourseTask): string {
  return task === 'task1' ? 'Academic Task 1' : 'Task 2'
}
