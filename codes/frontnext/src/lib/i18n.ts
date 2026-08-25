/**
 * Interface copy, in one place.
 *
 * English is the default. The product serves Indonesian students, but a draft
 * written in Indonesian already comes back with Indonesian findings and
 * Indonesian questions: the agents follow the language of the manuscript. What
 * the locale controls is the shell around that, so an English speaker can drive
 * a defense conducted entirely in Indonesian and still know which button sends
 * an answer.
 *
 * `Dictionary` is derived from the English copy, so a missing Indonesian string
 * is a type error rather than a blank label discovered by a user.
 */

export const LOCALES = ['en', 'id'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'citra_locale';

const en = {
  localeName: 'English',
  otherLocaleName: 'Bahasa Indonesia',

  app: {
    name: 'CITRA Viva',
    tagline:
      'An agentic thesis defense simulator. Specialised AI agents read your research draft, plan an examination from its weakest points, question you on them, and report what held.',
  },

  nav: {
    label: 'Sections',
    defense: 'Practice defense',
    claims: 'Citation check',
  },

  landing: {
    eyebrow: 'Agentic adversarial practice, before the committee does it for real',
    steps: [
      {
        title: 'It reads the whole draft',
        body: 'Every finding is tied to a sentence you actually wrote, quoted word for word and checked back against your text. A finding whose quote cannot be found is discarded rather than shown.',
      },
      {
        title: 'It plans the examination',
        body: 'Questions are ordered by how hard a committee is likely to press. Weaknesses you left unresolved in an earlier session are asked about first.',
      },
      {
        title: 'It judges, then reports',
        body: 'Each answer is weighed against what the question was asking for. The report separates what you held from what is still open, in the examiner’s own words.',
      },
    ],
    familyTitle: 'A companion to CITRA',
    family:
      'CITRA is the research writing workspace where an argument gets built and every claim stays traceable to the source it came from. Viva does the opposite job on the same manuscript: it hunts for the place that argument gives way, then presses there until the point either holds or breaks. The same discipline, turned against you on purpose, so that the first person to find the weak spot is you rather than your committee.',
    familyLink: 'Open CITRA',
    signInTitle: 'Sign in to begin',
    signInBody:
      'Your manuscript and your sessions are yours. Signing in is what keeps them apart from everyone else’s, and it is what lets a defense you had to leave halfway be picked up later, from any machine.',
    signInPrivacy:
      'Your draft is read to plan the examination and is not shown to anyone else. Nothing leaves Google Cloud.',
    signInUnavailable: 'Sign-in is not configured on this deployment.',
    footer: 'An adversarial practice viva. It questions your argument. It does not write it.',
    agentsTitle: 'Four agents run the defense. A fifth checks citations.',
    agentsLede:
      'Each hands the next something narrower than it received, and none can reach past its own job: the framework itself refuses the transfer, so the separation does not depend on anyone remembering it.',
    agents: [
      {
        name: 'Draft Analyzer',
        role: 'Reads the manuscript in full and maps where the argument gives way. Every finding is tied to a sentence quoted from your text and checked back against it.',
      },
      {
        name: 'Question Strategy',
        role: 'Turns that map into an examination, ordered by how hard a committee is likely to press rather than by where the weaknesses appear in your draft.',
      },
      {
        name: 'Examiner',
        role: 'Judges each answer and decides in the same breath what to say next: press harder, allow a clarification, or move on. Asking and judging are one agent because a follow-up that does not follow from the judgment is just another question.',
      },
      {
        name: 'Session Reflection',
        role: 'Writes the closing report from the transcript rather than from an impression of it, in the examiner’s own words.',
      },
      {
        name: 'Claim-Support Checker',
        role: 'Runs beside the defense rather than inside it, on one citation at a time: does this source actually carry the claim you cited it for?',
      },
    ],
    promiseTitle: 'What it will not do',
    promise:
      'It will not write your answers, and it will not record a weakness as unanswered before giving you a chance to clarify. Where a session rule overrides the model, the override is shown to you rather than applied quietly.',
  },

  intake: {
    heading: 'Test your draft before an examiner does',
    lede: 'Paste your manuscript. The agent reads it in full, maps where your argument gives way under pressure, then examines you the way a real committee would. It will not write your answers for you.',
    draftLabel: 'Research manuscript',
    sampleIndonesian: 'Use Indonesian sample',
    sampleEnglish: 'Use English sample',
    upload: 'Upload PDF or DOCX',
    uploading: 'Reading the document',
    uploadFailed: 'The document could not be read.',
    uploadedFrom: 'Read from {name}',
    uploadedPages: '{count} pages',
    reviewExtracted:
      'Check the text below before starting. Every quote the examiner uses is verified against exactly what you submit here, so anything extraction got wrong is worth fixing now.',
    draftPlaceholder: 'Paste your introduction, methodology, and findings here.',
    characters: 'characters',
    tooShort: 'at least {min} characters are needed for analysis',
    gapsLabel: 'Weaknesses left unresolved in an earlier session',
    optional: 'optional',
    gapsHelp:
      'One per line. Questions attacking these are asked first, even when other findings carry higher severity.',
    start: 'Begin defense',
    starting: 'Preparing the defense',
    failed: 'The defense could not be started.',
    stages: [
      'Reading the draft and marking key claims',
      'Checking every quote against your manuscript',
      'Planning the order of questions',
    ],
    signInPrompt: 'Sign in to keep your sessions and let the examiner remember them.',
    hints: {
      heading:
        'A practice viva. The agent reads your manuscript, finds where the argument gives way, then questions you about it the way a committee would.',
      draft: 'Paste or upload the chapters you want tested. Introduction, methodology, and findings give the examiner the most to work with.',
      upload: 'PDF, DOCX, TXT, or Markdown, up to 10 MB. The text is extracted into the box below for you to check, and the file itself is never stored.',
      samples: 'A short worked manuscript, already carrying the kinds of weakness a committee looks for. Useful for seeing how a session runs before submitting your own work.',
      gaps: 'Anything a previous session left unanswered. Questions attacking these are asked first, even when other findings look more severe.',
      start: 'Analysis takes about half a minute. The session is saved as it goes, so you can close the tab and come back to it.',
    },
  },

  room: {
    breadcrumb: 'Practice defense',
    questionProgress: 'Question {current} of {total}',
    answersSaved: '{count} answers saved',
    transcriptLabel: 'Defense transcript',
    examiner: 'Examiner',
    you: 'You',
    thinking: 'The examiner is weighing your answer',
    answerLabel: 'Your answer',
    answerPlaceholder: 'Defend your point. Press Ctrl and Enter to send.',
    send: 'Answer',
    allAnswered: 'Every question has been answered.',
    viewReport: 'View session report',
    buildingReport: 'Writing the report',
    answerFailed: 'The answer could not be sent.',
    reportFailed: 'The report could not be written.',
    adjustmentsTitle: 'Session rules applied over the model decision',
    hints: {
      progress: 'How far the examination plan has been worked through. A question can take several turns before it closes.',
      saved: 'Every answer is written to storage as soon as it is judged. Refreshing, or coming back tomorrow on another machine, loses nothing.',
      answer: 'Answer in your own words. The examiner is judging whether you can defend the point, so a short precise answer beats a long one.',
      transcript: 'The full exchange, in order. This is what the closing report is built from, which is why nothing is deleted from it.',
      report: 'Written from the transcript, not from a fresh impression. Points recorded as defended and gaps recorded as open are both carried through in the examiner’s own words.',
    },
  },

  sidebar: {
    plan: 'Examination plan',
    planHint:
      'Ordered before the defense begins, by how hard a committee is likely to press on each finding. Questions ahead of you stay closed: a defense you can read in advance is not a defense.',
    recurringGap: 'Recurring gap',
    done: 'Done',
    doneWithGap: 'Done, recorded as a gap',
    active: 'Being examined',
    locked: 'Not yet opened',
    types: {
      opening: 'Opening',
      probe: 'Probe',
      methodological: 'Methodology',
      closing: 'Closing',
    },
  },

  slideover: {
    label: 'Contextual panel',
    hints: {
      weakness: 'Where the argument gives way, each one tied to a sentence quoted from your own manuscript.',
      evaluation: 'How the examiner read your last answer, and why it decided to press further, offer a clarification, or move on.',
      report: 'The closing account of the session: what held, what is still open, and the patterns worth carrying into the next one.',
      quote: 'The quoted sentence was matched back against the manuscript you submitted. A finding whose quote could not be found there is discarded before it reaches this panel.',
      adjustments: 'Rules enforced in code rather than in the prompt. A gap cannot be recorded before you have been offered a chance to clarify, and follow-ups on one question are capped, so the model cannot decide otherwise.',
      patterns: 'Carry these into your next session in the field for unresolved weaknesses, and they will be tested first.',
      severity: 'How hard an examiner is likely to press on this, not a mark against the quality of your research. It is what sets the order of questions.',
    },
    tabs: {
      weakness: 'Weakness map',
      evaluation: 'Judgment',
      report: 'Report',
    },
    weaknessIntro: 'Weakness map from the draft analysis',
    evaluationIntro: 'Judged by the examiner agent',
    reportIntro: 'Report written by the reflection agent',
    quoteVerified: 'Quote verified against your manuscript',
    noEvaluation:
      'The judgment of each answer appears here once you have answered the first question.',
    reportPending:
      'The defense is over. Write the report to see what held, what is still open, and the patterns carried into your next session.',
    reportLocked: 'The report becomes available once every question has been answered.',
    writeReport: 'Write session report',
    criteriaMet: 'What you satisfied',
    criteriaMissed: 'What went untouched',
    defended: 'Successfully defended',
    nothingDefended: 'Nothing held up in this session.',
    stillOpen: 'Still undefended',
    patterns: 'Patterns carried into your next session',
    patternsHelp: 'Paste these when starting your next session so they are tested first.',
    closingRemark: 'Examiner closing',
    score: {
      heading: 'Practice indicator',
      outOf: '{score} out of {maximum}',
      hint:
        'Worked out from what the examiner recorded during the session, not asked of a model. The same transcript always gives the same number, and every part of it is shown below. It is a practice indicator, not a mark for your research and not a prediction of your real result.',
      scored: '{count} question(s) scored',
      unanswered: '{count} not reached, left out rather than counted as zero',
      breakdown: 'How it was worked out',
      weight: 'weight {weight}',
      base: 'judged {strength}, worth {base}',
      advice: 'What to work on',
      adviceHint:
        'Each line counts something the examiner wrote down during the session, so you can find every one of them in the transcript.',
      advices: {
        close_the_gaps:
          '{count} point(s) ended undefended. Those are listed above, and they are the most concrete thing to prepare before the next session.',
        answer_or_concede:
          '{count} answer(s) were judged evasive. Saying plainly that you do not know scores higher here than talking around the point, and it reads better in a real viva too.',
        answer_the_question_asked:
          'You were offered a clarification {count} time(s), which happens when an answer addresses something other than what was asked. Read the question back to yourself before answering.',
        try_without_the_rubric:
          'You revealed the marking scheme on {count} question(s). Try the next session without it and see which of those still hold.',
        lead_with_the_limitation:
          'You held {count} point(s), but only after being pressed. Naming the limitation yourself, before you are asked, is what an examiner is listening for.',
        answered_from_elsewhere:
          '{count} answer(s) contained text you pasted in. That is not counted against your score, and quoting your own manuscript is a good way to defend a point. It is worth knowing all the same: in the room there will be nothing to paste from.',
        weakest_question: 'Start with this one. It cost the most.',
        held_throughout:
          'All {count} question(s) held. Carry the patterns below into a harder draft rather than repeating this one.',
      },
    },
    judgments: {
      heading: 'Every question, as it was judged',
      current: 'Being examined now',
      pending: 'Not yet judged',
      empty: 'Judgments appear here as each question closes.',
      noDetail:
        'What this answer satisfied and left untouched was not recorded for this question. Absence here is not a pass: read the judgement above it.',
    },
    print: 'Save as PDF',
    severity: { high: 'High', medium: 'Medium', low: 'Low' },
    strength: {
      strong: 'Held',
      partial: 'Partly held',
      weak: 'Weak',
      evasive: 'Evasive',
    },
    decision: {
      press_deeper: 'Pressed harder',
      ask_clarification: 'Given a chance to clarify',
      move_on: 'Moved to the next topic',
      record_gap: 'Recorded as a gap',
    },
    category: {
      unsupported_claim: 'Unsupported claim',
      causal_language_non_experimental: 'Causal language, non-experimental design',
      overgeneralization: 'Overgeneralization',
      unaddressed_limitation: 'Unaddressed limitation',
      other: 'Other',
    },
  },

  claims: {
    nav: 'Check a citation',
    hints: {
      claim: 'One sentence, copied exactly as it stands in your manuscript. The verdict is about this sentence and this source, not about the topic they share.',
      source: 'Bibliographic details are for the record. The judgment itself rests only on the text you paste below.',
      abstract: 'Paste the abstract, or the specific passage you cited. What is not in this text cannot be used, and that is what keeps the verdict checkable.',
      verdict: 'A statement about the fit between one claim and one source. A claim of support has to point at the passage carrying it, or it is downgraded to undecided.',
      passage: 'The sentence the verdict rests on, matched back against the source text you supplied.',
      question: 'Marking a citation wrong without a way to answer is an accusation. A negative verdict has to come with a question, or it is downgraded to undecided.',
    },
    heading: 'Does this source actually support this claim?',
    lede: 'A resolving DOI proves the paper exists. It does not prove the paper carries the sentence you cited it for, and topical relevance passes every mechanical check ever written. Paste a claim and the source text, and the agent judges the specific fit.',
    claimLabel: 'The claim, as written in your manuscript',
    claimPlaceholder: 'One sentence, copied from your draft.',
    sourceLabel: 'The source you cited it for',
    titleLabel: 'Title',
    authorsLabel: 'Authors',
    yearLabel: 'Year',
    doiLabel: 'DOI',
    abstractLabel: 'Abstract or excerpt',
    abstractHelp:
      'The judgment may rest on nothing else. What is not in this text cannot be used, which is what keeps the verdict checkable.',
    useSample: 'Use a worked example',
    check: 'Check the support',
    checking: 'Reading the source against your claim',
    failed: 'The check could not be completed.',
    verdictLabel: 'Verdict',
    reasoning: 'Reasoning',
    passage: 'The passage this rests on',
    quoteVerified: 'Passage verified in the source you supplied',
    scopeMismatch: 'Where the scope differs',
    question: 'A question for you, rather than a verdict against you',
    adjustments: 'Rules applied over the model judgment',
    verdicts: {
      supports: 'The source supports the claim',
      partially_supports: 'The source carries part of it',
      does_not_support: 'The source does not carry the claim',
      unrelated: 'The source is about something else',
      cannot_tell: 'This cannot be settled from the text supplied',
    },
    disclosure:
      'Mechanical citation verification, matching a DOI against Crossref or OpenAlex, belongs to a separate project and is deliberately outside this submission. What runs here is the reasoning layer built on top of it.',
  },





  guide: {
    nav: 'Guide',
    heading: 'How CITRA Viva works',
    lede: 'What the agent does with your manuscript, what it refuses to do, and how to get a useful session out of it. Nothing here needs an account.',
    contents: 'Contents',
    repoLink: 'Read the source on GitHub',
    termsLink: 'Google Cloud terms',
    sections: [
      {
        id: 'what',
        title: 'What this is',
        lead: 'An agentic practice viva. You give it the draft you are going to defend, four agents divide the work of examining it between them, and you are questioned on the parts a committee would go after.',
        points: [
          {
            title: 'It is adversarial on purpose',
            body: 'Most writing tools are built to agree with you. This one is built to find the sentence your argument cannot support and to keep asking about it. That is uncomfortable, and it is the point: the discomfort is cheaper here than in the room.',
          },
          {
            title: 'It examines, it does not ghostwrite',
            body: 'It will not compose an answer for you, and it will not suggest wording you could repeat back. What it produces is questions, judgments, and a record. The defending is yours.',
          },
          {
            title: 'A companion to CITRA',
            body: 'CITRA is the research writing workspace where an argument gets built and every claim stays traceable to its source. Viva does the opposite job on the same manuscript: it looks for where that argument gives way, then presses there until the point holds or breaks.',
          },
        ],
      },
      {
        id: 'start',
        title: 'Your first session',
        lead: 'What actually happens, in order. It is free to use, and the only things you need are a Google account and the draft you are going to defend.',
        points: [
          {
            title: 'Sign in with Google',
            body: 'A session holds your unpublished manuscript and a map of where your argument gives way. Signing in is what keeps that yours: a session can only ever be opened by the account that created it. Nothing is charged, and nothing else is asked of you.',
          },
          {
            title: 'Give it your draft',
            body: 'Paste the text, or upload a PDF or DOCX. If you would rather see how a session runs before handing over your own writing, there is a sample manuscript behind a button, already carrying the kinds of weakness a committee looks for.',
          },
          {
            title: 'Wait about half a minute',
            body: 'Two agents run before the first question arrives: one reads the manuscript in full and maps its weak points, the other turns that map into an ordered examination. You can see which stage is running while you wait.',
          },
          {
            title: 'Answer five to eight questions',
            body: 'A question can take more than one turn, because a strong answer earns a harder follow-up and a weak one earns a chance to clarify. Type or speak, whichever you would rather practise.',
          },
          {
            title: 'Read the report, and keep it',
            body: 'At the end you get what held, what is still open, and the habits behind the gaps. It downloads as a file, so it survives the browser it was made in.',
          },
          {
            title: 'It follows the language of your draft',
            body: 'A manuscript in Indonesian is analysed and examined in Indonesian. The interface language is a separate choice, so you can sit a defense conducted entirely in Indonesian with the buttons in English, or the other way round.',
          },
        ],
      },
      {
        id: 'how',
        title: 'How a session runs',
        lead: 'Four agents run a defense, in order, each handing the next something narrower than what it received. A fifth, the citation checker, runs beside them rather than inside them.',
        points: [
          {
            title: '1. The draft is read and mapped',
            body: 'The manuscript is read once, in full, and the sentences an examiner would stop at are marked where they stand. Each becomes a finding: the quote, why it is weak, and how hard a committee is likely to press.',
          },
          {
            title: '2. The examination is planned',
            body: 'Findings become questions, ordered by pressure rather than by where they appear in your text. A weakness you carried in from an earlier session is asked about first, whatever its severity.',
          },
          {
            title: '3. Each answer is judged',
            body: 'Your answer is weighed against what the question was asking for, and the examiner decides what happens next: press harder, offer you a chance to clarify, move on, or record the point as undefended.',
          },
          {
            title: '4. The session is reported',
            body: 'At the end, what you defended and what is still open are both taken from the transcript, in the examiner’s own words, so the report cannot contradict the session it describes.',
          },
        ],
      },
      {
        id: 'draft',
        title: 'Preparing your draft',
        lead: 'The examination is only as good as what it is given. A few minutes here changes the whole session.',
        points: [
          {
            title: 'Paste or upload',
            body: 'PDF, DOCX, TXT, and Markdown are read, up to 10 MB. A scanned document has no selectable text and cannot be used: export a text PDF instead. The file itself is never stored.',
          },
          {
            title: 'Check the extracted text before you start',
            body: 'Extracted text lands in the editable box rather than going straight into a session. Every quote the examiner uses is checked against exactly what you submit here, so anything extraction mangled is worth fixing now.',
          },
          {
            title: 'Give it the argument, not the front matter',
            body: 'Introduction, methodology, and findings give an examiner the most to work with. An abstract alone gives it almost nothing to press on.',
          },
          {
            title: 'Carry your unresolved weaknesses forward',
            body: 'The optional field takes one weakness per line, usually pasted from a previous session report. Questions attacking those are asked first. A weakness you already failed to fix once is the most valuable thing to test again.',
          },
        ],
      },
      {
        id: 'defense',
        title: 'In the defense room',
        lead: 'Three panels, each scrolling on its own: the plan on the left, the exchange in the middle, the evidence on the right.',
        points: [
          {
            title: 'The plan stays closed ahead of you',
            body: 'You can see which question is being examined and which are done. What is still ahead stays shut, because a defense you can read in advance is not a defense.',
          },
          {
            title: 'Every question shows where it came from',
            body: 'Each one carries the sentence of your manuscript that produced it, quoted and checked back against your text. You can always see why you are being asked something.',
          },
          {
            title: 'Your manuscript is one click away',
            body: 'The draft you submitted can be opened beside the examination, so a question about a passage does not send you hunting through another window for it.',
          },
          {
            title: 'Answer in your own words',
            body: 'Short and precise beats long. The examiner is judging whether you can defend the point, not whether you can restate the chapter.',
          },
          {
            title: 'A question ends, it does not loop',
            body: 'One question allows at most two follow-ups and one clarification. That limit is enforced in code, not asked of the model, so an examination cannot circle a single point until you give up.',
          },
          {
            title: 'Nothing depends on this tab',
            body: 'Every turn is written to storage as it is judged. Close the tab mid-defense, come back tomorrow on another machine, and it resumes at the question it stopped on.',
          },
        ],
      },
      {
        id: 'voice',
        title: 'Speaking and listening',
        lead: 'You can answer out loud, and the examiner speaks its questions to you. A real viva is spoken, and practising it silently trains the wrong thing.',
        points: [
          {
            title: 'The examiner speaks as the question appears',
            body: 'The audio is made while the question is being decided rather than afterwards, so there is nothing to press and nothing extra to wait for. The switch in the header turns it off if you would rather read.',
          },
          {
            title: 'Speaking an answer',
            body: 'Press the microphone and talk. The audio is sent as you speak, so the transcript is ready under a second after you stop rather than several seconds later.',
          },
          {
            title: 'You decide when you have finished',
            body: 'The recording ends when you stop it, never when the system decides you have paused for long enough. Someone thinking in the middle of an answer has not finished, and only you know the difference.',
          },
          {
            title: 'Watch the level meter',
            body: 'Bars move beside the timer while you speak. If they stay still, no audio is reaching the page, which is almost always the wrong microphone being selected somewhere. A recording that arrives silent is refused rather than sent.',
          },
          {
            title: 'The transcript is yours to correct first',
            body: 'Speech lands in the answer box, not in the session. Read it, fix anything misheard, then send it. A defense transcript is a permanent record, and a word the recognition got wrong has to be correctable before it becomes part of one.',
          },
          {
            title: 'Voice changes nothing underneath',
            body: 'A spoken answer travels the same path as a typed one and meets exactly the same rules. Speech is a way in and a way out, not a separate mode with its own behaviour.',
          },
        ],
      },
      {
        id: 'rubric',
        title: 'Asking for the marking scheme',
        lead: 'There is help available during a question, and it is deliberately the kind of help that cannot answer for you.',
        points: [
          {
            title: 'What it gives you',
            body: 'The marking scheme for the question in front of you: what a good answer would need to contain. Not the answer, not a sentence you could repeat back, and not an example you could adapt.',
          },
          {
            title: 'Why there are no suggested answers',
            body: 'That feature was considered and refused. Someone who reads a suggested answer before replying is no longer defending anything, and the entire value of this tool is that the answer has to come from you.',
          },
          {
            title: 'Asking is recorded',
            body: 'Every reveal is written into the transcript and appears in the closing report. Help that hides itself from the record is not help: it is a way to arrive at a real defense believing you were readier than you were.',
          },
        ],
      },
      {
        id: 'report',
        title: 'The session report',
        lead: 'Written from the transcript rather than from a fresh impression of it.',
        points: [
          {
            title: 'What held',
            body: 'Points the examiner recorded as defended during the session, restored into the report if the summary tries to leave them out. A report that tells you nothing survived is a report you will not believe about your weaknesses either.',
          },
          {
            title: 'What is still open',
            body: 'Every point recorded as a gap, described as a gap and never as a fix. Being told what to say would defeat the exercise.',
          },
          {
            title: 'Patterns for next time',
            body: 'The habits behind the individual gaps. Paste them into the unresolved weaknesses field when you start your next session and they will be tested first.',
          },
          {
            title: 'Take it with you',
            body: 'The report downloads as a plain Markdown file that opens in any editor. Nothing about reading it later depends on this service still being here.',
          },
        ],
      },
      {
        id: 'memory',
        title: 'What carries into the next session',
        lead: 'The second defense is not the first one repeated. A weakness you already failed to fix once is the most valuable thing to test again.',
        points: [
          {
            title: 'Patterns, not transcripts',
            body: 'What carries forward is the habit behind the gaps, written so that it is still recognisable in a different manuscript months later. Something like treating a correlation as a cause when writing conclusions, rather than question three was weak.',
          },
          {
            title: 'How to use it',
            body: 'Copy the patterns out of your report and into the unresolved weaknesses field when you start the next session. Questions attacking them are then asked first, even when other findings look more severe.',
          },
          {
            title: 'Nothing is remembered about you personally',
            body: 'There is no free-form memory of who you are or how you did. What is kept is a structured list of weaknesses, each one traceable to a specific finding in a specific manuscript, so you can read it, check it, and disagree with it.',
          },
        ],
      },
      {
        id: 'citation',
        title: 'Checking a citation',
        lead: 'A separate tool, for a different question: does this source actually carry the sentence you cited it for?',
        points: [
          {
            title: 'Why a resolving DOI is not enough',
            body: 'A DOI proves the paper exists. It does not prove the paper says what you attributed to it, and topical similarity passes every mechanical check ever written.',
          },
          {
            title: 'What it needs',
            body: 'The claim exactly as it stands in your manuscript, and the source text, usually the abstract or the passage you cited. The judgment may rest on nothing else, which is what keeps it checkable.',
          },
          {
            title: 'It asks rather than accuses',
            body: 'A negative verdict has to come with a question for you, or it is downgraded to undecided. Marking someone’s citation wrong with no way to answer is an accusation, not a review.',
          },
        ],
      },
      {
        id: 'privacy',
        title: 'Your manuscript, and who can see it',
        lead: 'You are being asked to hand an unpublished thesis to a service you did not write. That deserves a straight answer rather than a policy page.',
        points: [
          {
            title: 'Only your account can open your sessions',
            body: 'Ownership is checked on the record itself rather than guessed from the address. A session belonging to somebody else is reported as not existing at all, because telling a stranger that a session exists but is not theirs already tells them something worth knowing.',
          },
          {
            title: 'The file you upload is never stored',
            body: 'A PDF or DOCX is read into memory, turned into text, and discarded. What is kept is the text you reviewed and chose to submit, so that you can open your manuscript beside the questions during the defense and so that every quote can be checked against exactly what you sent.',
          },
          {
            title: 'Nothing leaves Google Cloud',
            body: 'Your draft is sent to Google’s Gemini models to be analysed, and nowhere else. There is no third party in this system: no analytics service reading your text, no other vendor, nothing sold to anyone. What Google itself does with data sent to its enterprise AI platform is governed by Google’s own terms, linked below rather than paraphrased here.',
          },
          {
            title: 'Your work is never shown to another user',
            body: 'No session, finding, question, or report is visible to anyone else, and none of it is published anywhere.',
          },
          {
            title: 'You can delete a session, and it is gone',
            body: 'Deleting a session removes the session and the manuscript stored with it, permanently. Not hidden, not archived, and not recoverable by us afterwards. A product that tells you your unpublished thesis is yours has to let you take it back.',
          },
          {
            title: 'The sign-in gives us almost nothing',
            body: 'Sessions are keyed to the account identifier Google returns, not to your email address, because an email can change hands and an identifier cannot. There is no password here to lose, because there is no password here at all.',
          },
        ],
      },
      {
        id: 'integrity',
        title: 'What it will not do',
        lead: 'These are enforced in code rather than requested in a prompt, which means the model cannot decide otherwise on a bad day.',
        points: [
          {
            title: 'It will not quote a sentence you did not write',
            body: 'Every finding must quote your manuscript word for word, and every quote is matched back against your text. A finding whose quote cannot be found there is discarded rather than shown, because a finding about a sentence you never wrote is an accusation.',
          },
          {
            title: 'It will not record a gap without warning you first',
            body: 'A point cannot be written down as undefended until you have been offered at least one chance to clarify it.',
          },
          {
            title: 'It will not grade your research',
            body: 'There is no score and no pass mark. Severity describes how hard an examiner is likely to press, which is a claim about examiners, not about the quality of your work.',
          },
          {
            title: 'It will not override the model quietly',
            body: 'Where a session rule replaces the model’s decision, the substitution is shown to you in the transcript rather than applied out of sight.',
          },
        ],
      },
      {
        id: 'trouble',
        title: 'When something goes wrong',
        lead: 'The failures people actually hit, and what each one means.',
        points: [
          {
            title: 'Your spoken answer came back empty',
            body: 'Almost always the wrong microphone is selected, in the browser or in the operating system. The level meter is the test: if it does not move while you are speaking, no audio is reaching the page. Silence is refused rather than sent, because a model given silence answers anyway and hands you words you never said.',
          },
          {
            title: 'Your PDF was refused',
            body: 'A scanned document is a picture of text and has no text to extract. Export a text PDF from the software you wrote in, or paste the text directly.',
          },
          {
            title: 'The extracted text looks wrong',
            body: 'Fix it in the box before starting. Two column layouts, running headers, and unusual characters all survive extraction imperfectly, and every quote the examiner uses is checked against exactly what you submit.',
          },
          {
            title: 'You closed the tab in the middle',
            body: 'Nothing is lost. Every turn is written to storage as it is judged, so the session resumes at the question it stopped on, from any machine you sign in on.',
          },
          {
            title: 'The examiner seems to be taking a long time',
            body: 'Judging an answer is a real piece of reasoning and takes as long as it takes. A busy model is retried automatically. If a turn fails outright, your place is not lost: the session is still at that question and you can answer it again.',
          },
        ],
      },
      {
        id: 'tech',
        title: 'What it is built on',
        lead: 'The whole thing is open source, so none of this has to be taken on trust.',
        points: [
          {
            title: 'Five agents, none of which can call another',
            body: 'One maps the weaknesses, one plans the examination, one judges each answer and decides what to say next, one writes the report, and one checks citations beside them. Every exchange goes through a single orchestrator. The isolation is enforced by the framework rather than requested in a prompt, so an agent could not hand work to another even if it tried.',
          },
          {
            title: 'The models',
            body: 'Gemini 3.7 Flash does the reasoning. Two further Gemini models handle voice: one speaks the examiner’s questions, one transcribes your answer while you are still speaking.',
          },
          {
            title: 'Where it runs',
            body: 'Google Cloud, entirely. Cloud Run serves the application, Firestore holds every piece of state, Firebase Authentication decides who may open it, and Cloud Trace records one span per agent call, so the chain of decisions behind a single turn can be read afterwards.',
          },
          {
            title: 'Nothing is kept inside the model',
            body: 'A session lives in the database, not in an agent’s memory. That is why closing the tab costs nothing, and why two answers sent at the same moment cannot overwrite each other.',
          },
          {
            title: 'Read it yourself',
            body: 'The repository carries the architecture, the prompts, the rules enforced in code, and the instructions for running your own copy. It is MIT licensed.',
          },
        ],
      },
    ],
  },

  workspace: {
    newSession: 'New defense',
    history: 'Your sessions',
    historyHint:
      'Every defense you have started, newest first. An unfinished one resumes exactly where it stopped, including from a different machine, because nothing about a session lives in this tab.',
    empty: 'Sessions you start appear here.',
    loading: 'Loading your sessions',
    failed: 'Your sessions could not be loaded.',
    retry: 'Try again',
    inProgress: 'In progress',
    completed: 'Completed',
    answeredOf: '{answered} of {total} answered',
    openGaps: '{count} recorded as gaps',
    untitled: 'Untitled session',
    today: 'Today',
    yesterday: 'Yesterday',
    deleteLabel: 'Delete the session "{name}"',
    deleteConfirm: 'Delete',
    deleteCancel: 'Keep',
    deleting: 'Deleting',
    deleteFailed: 'The session could not be deleted.',
    signedInAs: 'Signed in',
  },





  report: {
    download: 'Download as Markdown',
    downloadPdf: 'Download the report as PDF',
    preparing: 'Preparing the PDF',
    pdfFailed: 'The PDF could not be built. The Markdown download below still works.',
    footer:
      'Generated by {name}. Every quoted passage was verified against the manuscript submitted for this session. This is a practice examination and carries no assessment of the research itself.',
  },


  limits: {
    tooLong:
      'This draft is {count} characters, and the limit is {max}. Submit the chapters you want examined, usually the introduction, methodology, and findings. A whole thesis at once produces a thinner examination, not a deeper one.',
    fileTooLarge:
      'That file is {size} MB. The limit is {max} MB, and a text PDF of a thesis is normally far below it.',
  },

  carry: {
    title: 'From your last session',
    lede: 'These are the patterns that session concluded should be tested first. Carrying them in puts the questions attacking them at the front of this examination, ahead of anything the analysis finds today.',
    action: 'Carry these forward',
    added: 'Carried forward',
    dismiss: 'Not this time',
  },

  link: {
    attacks: 'From {id}',
    attacksHint:
      'The finding this question came from. Every question in a defense is generated from one marked passage in your manuscript, and this opens the passage it was built on, so you can read the sentence being pressed rather than take the question on trust.',
    underExamination: 'Being examined now',
    opening: 'Opening question, not tied to a single finding',
  },


  document: {
    open: 'Your thesis',
    title: 'Your thesis, as submitted for this session',
    search: 'Search the document',
    matchOf: '{current} of {total}',
    noMatches: 'No matches',
    previous: 'Previous match',
    next: 'Next match',
    loading: 'Opening the document',
    failed: 'The document could not be opened.',
    note: 'This is the text this examination was built from, exactly as you submitted it. Every quote the examiner uses was verified against it.',
  },

  rubric: {
    open: 'What is being tested?',
    opened: 'Criteria opened',
    opening: 'Opening the criteria',
    title: 'What this question is testing',
    close: 'Close',
    intent: 'What the examiner is probing',
    criteria: 'What a sufficient answer has to cover',
    recorded:
      'This is the marking scheme, not an answer. Opening it is recorded against this question and appears in your session report, because a report that hid the help you took would not be a report of this session.',
    failed: 'The criteria could not be opened.',
    revealed: 'Criteria opened',
    reportTitle: 'Questions where you opened the criteria',
    reportHelp:
      'Shown so the record is complete. Asking what a question is testing is a legitimate way to learn; it is only worth recording so the rest of the report can be trusted.',
  },

  voice: {
    speak: 'Speak your answer',
    stop: 'Stop and transcribe',
    transcribing: 'Turning your answer into text',
    play: 'Hear this',
    stopPlaying: 'Stop',
    loading: 'Preparing the voice',
    readAloud: 'Read questions aloud',
    denied:
      'The microphone was not available. Allow it for this site in your browser, or type your answer instead.',
    unsupported: 'This browser cannot record audio. Type your answer instead.',
    empty: 'Nothing was recorded. Check the microphone and try again.',
    silent:
      'The microphone was open but no sound reached the page. Check that the right input device is selected and that the browser is not muted, then record again.',
    level: 'Input level',
    cancel: 'Discard',
    cancelHint:
      'Throw the recording away without transcribing it. Nothing is sent and nothing is judged, so a microphone left open by mistake costs nothing.',
    failed: 'The recording could not be transcribed.',
    playFailed: 'That could not be read aloud.',
    transcriptAdded:
      'Your spoken answer is in the box below. Read it before you send it: the examiner judges what you send, not what was heard.',
    hint: 'Speech becomes text in the answer box for you to correct, and is sent only when you send it. The examiner judges the words you submit, and a spoken answer is held to exactly the same session rules as a typed one.',
  },

  agent: {
    working: 'Agent at work',
    dismiss: 'Hide this',
    stages: {
      extracting: {
        title: 'Lifting the text out of your document',
        body: 'Page furniture such as running headers is dropped, words broken across a line break are rejoined, and the result is handed back to you to check. The file itself is not kept.',
      },
      reading: {
        title: 'Reading the draft and marking key claims',
        body: 'The whole manuscript is read once, and the sentences an examiner would stop at are marked where they stand.',
      },
      verifying: {
        title: 'Checking every quote against your manuscript',
        body: 'Each marked sentence is matched back to your text. Anything that cannot be found there is discarded rather than shown to you, because a finding about a sentence you never wrote is an accusation.',
      },
      planning: {
        title: 'Putting the questions in order',
        body: 'Questions are ordered by how hard a committee is likely to press. Anything you carried in from an earlier session is moved to the front.',
      },
      judging: {
        title: 'Weighing your answer',
        body: 'Your answer is read against what the question was actually asking for, and the examiner decides whether to press further, offer you a chance to clarify, or move on.',
      },
      reporting: {
        title: 'Writing the session report',
        body: 'What you defended and what is still open are both taken from the transcript in the examiner’s own words, so the report cannot contradict the session it describes.',
      },
      citation: {
        title: 'Reading the source against your claim',
        body: 'The source text is searched for the passage that would actually carry your claim. Sharing a topic is not the same as supporting a sentence.',
      },
    },
  },

  ai: {
    working: 'The agent is working',
    elapsed: '{seconds}s',
    doNotClose: 'You can keep this tab open. The session is saved after every turn.',
  },

  auth: {
    signIn: 'Sign in with Google',
    signOut: 'Sign out',
    signingIn: 'Signing in',
    required: 'Sign in to begin a defense',
    requiredHelp:
      'Your manuscript and your session belong to you. Signing in is what lets the service keep them apart from everyone else’s.',
    restoring: 'Restoring your session',
    signedOutTitle: 'You have signed out',
    signedOutBody:
      'This defense is no longer shown on this screen. Nothing has been lost: sign in again with the same account and it resumes at the question it stopped on.',
    lockedTitle: 'Sign in to open this defense',
    lockedBody:
      'A defense belongs to the account that started it. Sign in with that account and it opens where it stopped.',
    failed: 'Sign in failed.',
    notYours: 'This session belongs to a different account.',
  },

  errors: {
    notFoundTitle: 'Session not found',
    notFoundBody:
      'This session does not exist, or the link is wrong. A session that has started is never lost, so check the address before starting over.',
    startNew: 'Start a new defense',
    unavailableTitle: 'The service cannot be reached',
    unavailableBody:
      'This is usually model quota rather than a problem with your draft. A session already in progress is saved and can be resumed once the service recovers.',
    retry: 'Try again',
  },
} as const;

/**
 * Widen every literal to `string` while keeping the shape.
 *
 * `as const` on the English copy is what makes the shape exact, but it also
 * types each value as the specific sentence it holds, which no translation
 * could ever satisfy. Widening the leaves keeps the part that matters: a
 * missing or misspelled key is still a compile error, so a translation gap
 * shows up in the build rather than as a blank label in front of a user.
 */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : { readonly [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof en>;

const id: Dictionary = {
  localeName: 'Bahasa Indonesia',
  otherLocaleName: 'English',

  app: {
    name: 'CITRA Viva',
    tagline:
      'Simulator sidang skripsi berbasis agent. Sejumlah agent AI khusus membaca draf riset Anda, menyusun pengujian dari titik terlemahnya, menanyakannya kepada Anda, lalu melaporkan apa yang bertahan.',
  },

  nav: {
    label: 'Bagian',
    defense: 'Sidang latihan',
    claims: 'Periksa sitasi',
  },

  landing: {
    eyebrow: 'Latihan menekan berbasis agent, sebelum penguji sungguhan melakukannya',
    steps: [
      {
        title: 'Membaca draf secara utuh',
        body: 'Setiap temuan terikat pada kalimat yang benar-benar Anda tulis, dikutip apa adanya dan dicocokkan kembali ke naskah. Temuan yang kutipannya tidak ditemukan dibuang, bukan ditampilkan.',
      },
      {
        title: 'Menyusun rencana pengujian',
        body: 'Pertanyaan diurutkan menurut seberapa keras penguji biasanya menekan. Kelemahan yang belum Anda selesaikan di sesi sebelumnya ditanyakan lebih dulu.',
      },
      {
        title: 'Menilai, lalu menyusun laporan',
        body: 'Tiap jawaban ditimbang terhadap apa yang sebenarnya diminta pertanyaan. Laporan memisahkan yang berhasil Anda pertahankan dari yang masih terbuka, dengan kata-kata penguji sendiri.',
      },
    ],
    familyTitle: 'Pendamping CITRA',
    family:
      'CITRA adalah ruang kerja penulisan riset, tempat argumen dibangun dan setiap klaim tetap dapat ditelusuri ke sumber asalnya. Viva melakukan pekerjaan sebaliknya pada naskah yang sama: mencari tempat argumen itu melemah, lalu menekannya sampai poin itu bertahan atau patah. Disiplin yang sama, sengaja diarahkan kepada Anda, supaya orang pertama yang menemukan titik lemahnya adalah Anda, bukan penguji Anda.',
    familyLink: 'Buka CITRA',
    signInTitle: 'Masuk untuk memulai',
    signInBody:
      'Naskah dan sesi Anda adalah milik Anda. Masuk adalah yang menjaganya terpisah dari milik orang lain, dan yang membuat sidang yang terpaksa Anda tinggalkan di tengah dapat dilanjutkan nanti, dari perangkat mana pun.',
    signInPrivacy:
      'Draf Anda dibaca untuk menyusun rencana pengujian dan tidak diperlihatkan kepada siapa pun. Tidak ada yang keluar dari Google Cloud.',
    signInUnavailable: 'Fitur masuk belum dikonfigurasi pada deployment ini.',
    footer: 'Sidang latihan yang menekan. Ia menguji argumen Anda, bukan menuliskannya.',
    agentsTitle: 'Empat agent menjalankan sidang. Yang kelima memeriksa sitasi.',
    agentsLede:
      'Masing-masing menyerahkan kepada berikutnya sesuatu yang lebih sempit daripada yang diterimanya, dan tidak satu pun dapat menjangkau di luar tugasnya: kerangka kerjanya sendiri yang menolak perpindahan itu, jadi pemisahannya tidak bergantung pada ingatan siapa pun.',
    agents: [
      {
        name: 'Draft Analyzer',
        role: 'Membaca naskah secara utuh dan memetakan tempat argumen melemah. Setiap temuan terikat pada kalimat yang dikutip dari teks Anda dan dicocokkan kembali kepadanya.',
      },
      {
        name: 'Question Strategy',
        role: 'Mengubah peta itu menjadi pengujian, diurutkan menurut seberapa keras penguji biasanya menekan, bukan menurut letak kelemahannya di naskah.',
      },
      {
        name: 'Examiner',
        role: 'Menilai tiap jawaban dan sekaligus memutuskan apa yang dikatakan berikutnya: menekan lebih dalam, memberi kesempatan klarifikasi, atau berpindah. Bertanya dan menilai adalah satu agent karena pendalaman yang tidak lahir dari penilaiannya hanyalah pertanyaan lain.',
      },
      {
        name: 'Session Reflection',
        role: 'Menyusun laporan penutup dari transkrip, bukan dari kesan atasnya, dengan kata-kata penguji sendiri.',
      },
      {
        name: 'Claim-Support Checker',
        role: 'Berjalan di samping sidang, bukan di dalamnya, satu sitasi setiap kali: apakah sumber ini benar-benar memuat klaim yang Anda sitasikan padanya?',
      },
    ],
    promiseTitle: 'Yang tidak akan dilakukannya',
    promise:
      'Ia tidak akan menuliskan jawaban Anda, dan tidak akan mencatat sebuah kelemahan sebagai tak terjawab sebelum Anda diberi kesempatan menjelaskan. Ketika aturan sesi menimpa keputusan model, penimpaan itu ditampilkan, bukan dijalankan diam-diam.',
  },

  intake: {
    heading: 'Uji draf Anda sebelum penguji yang melakukannya',
    lede: 'Tempel naskah riset Anda. Agent membacanya utuh, menyusun peta titik terlemah argumen, lalu menguji Anda seperti penguji sungguhan. Ia tidak akan menuliskan jawaban untuk Anda.',
    draftLabel: 'Naskah riset',
    sampleIndonesian: 'Gunakan contoh Bahasa Indonesia',
    sampleEnglish: 'Gunakan contoh Bahasa Inggris',
    upload: 'Unggah PDF atau DOCX',
    uploading: 'Membaca dokumen',
    uploadFailed: 'Dokumen tidak dapat dibaca.',
    uploadedFrom: 'Dibaca dari {name}',
    uploadedPages: '{count} halaman',
    reviewExtracted:
      'Periksa teks di bawah sebelum memulai. Setiap kutipan yang dipakai penguji diverifikasi terhadap persis apa yang Anda kirim di sini, jadi kesalahan hasil ekstraksi sebaiknya diperbaiki sekarang.',
    draftPlaceholder: 'Tempel bab pendahuluan, metodologi, dan hasil di sini.',
    characters: 'karakter',
    tooShort: 'minimal {min} karakter untuk dapat dianalisis',
    gapsLabel: 'Kelemahan yang belum diperbaiki dari sesi sebelumnya',
    optional: 'opsional',
    gapsHelp:
      'Satu per baris. Pertanyaan yang menyasar poin ini diajukan lebih dulu, meskipun temuan lain berbobot lebih tinggi.',
    start: 'Mulai sidang',
    starting: 'Menyiapkan sidang',
    failed: 'Sesi gagal dimulai.',
    stages: [
      'Membaca draf dan menandai klaim kunci',
      'Memeriksa setiap kutipan terhadap naskah',
      'Menyusun urutan pertanyaan penguji',
    ],
    signInPrompt: 'Masuk agar sesi Anda tersimpan dan dapat diingat penguji.',
    hints: {
      heading:
        'Sidang latihan. Agent membaca naskah Anda, mencari tempat argumennya melemah, lalu menanyakannya kepada Anda seperti penguji sungguhan.',
      draft: 'Tempel atau unggah bab yang ingin diuji. Pendahuluan, metodologi, dan hasil memberi penguji bahan paling banyak.',
      upload: 'PDF, DOCX, TXT, atau Markdown, maksimal 10 MB. Teksnya diekstrak ke kotak di bawah untuk Anda periksa, dan berkasnya sendiri tidak pernah disimpan.',
      samples: 'Naskah contoh singkat yang memang memuat jenis kelemahan yang dicari penguji. Berguna untuk melihat jalannya sesi sebelum mengirim naskah Anda sendiri.',
      gaps: 'Apa pun yang belum terjawab di sesi sebelumnya. Pertanyaan yang menyasar poin ini diajukan lebih dulu, meski temuan lain tampak lebih berat.',
      start: 'Analisis memakan waktu sekitar setengah menit. Sesi tersimpan sambil berjalan, jadi tab boleh ditutup dan dibuka lagi nanti.',
    },
  },

  room: {
    breadcrumb: 'Sidang latihan',
    questionProgress: 'Pertanyaan {current} dari {total}',
    answersSaved: '{count} jawaban tersimpan',
    transcriptLabel: 'Transkrip sidang',
    examiner: 'Penguji',
    you: 'Anda',
    thinking: 'Penguji menimbang jawaban Anda',
    answerLabel: 'Jawaban Anda',
    answerPlaceholder: 'Pertahankan poin Anda. Tekan Ctrl dan Enter untuk mengirim.',
    send: 'Jawab',
    allAnswered: 'Seluruh pertanyaan telah dijawab.',
    viewReport: 'Lihat laporan sesi',
    buildingReport: 'Menyusun laporan',
    answerFailed: 'Jawaban gagal dikirim.',
    reportFailed: 'Laporan gagal disusun.',
    adjustmentsTitle: 'Aturan sesi yang diterapkan atas keputusan model',
    hints: {
      progress: 'Sejauh mana rencana pengujian telah dijalani. Satu pertanyaan bisa memakan beberapa giliran sebelum ditutup.',
      saved: 'Setiap jawaban ditulis ke penyimpanan begitu selesai dinilai. Memuat ulang, atau kembali besok dari perangkat lain, tidak menghilangkan apa pun.',
      answer: 'Jawab dengan kata-kata Anda sendiri. Penguji menilai apakah Anda dapat mempertahankan poinnya, jadi jawaban pendek yang tepat lebih baik daripada yang panjang.',
      transcript: 'Seluruh percakapan, berurutan. Laporan penutup disusun dari sini, dan itulah sebabnya tidak ada yang dihapus darinya.',
      report: 'Disusun dari transkrip, bukan dari kesan baru. Poin yang tercatat bertahan dan celah yang tercatat terbuka sama-sama dibawa dengan kata-kata penguji sendiri.',
    },
  },

  sidebar: {
    plan: 'Rencana pengujian',
    planHint:
      'Disusun sebelum sidang dimulai, menurut seberapa keras penguji biasanya menekan tiap temuan. Pertanyaan di depan tetap tertutup: sidang yang dapat dibaca lebih dulu bukan sidang.',
    recurringGap: 'Celah berulang',
    done: 'Selesai',
    doneWithGap: 'Selesai, tercatat sebagai celah',
    active: 'Sedang diuji',
    locked: 'Belum dibuka',
    types: {
      opening: 'Pembuka',
      probe: 'Pendalaman',
      methodological: 'Metodologi',
      closing: 'Penutup',
    },
  },

  slideover: {
    label: 'Panel kontekstual',
    hints: {
      weakness: 'Tempat argumen melemah, masing-masing terikat pada kalimat yang dikutip dari naskah Anda sendiri.',
      evaluation: 'Bagaimana penguji membaca jawaban terakhir Anda, dan mengapa ia memutuskan menekan lebih jauh, memberi kesempatan klarifikasi, atau berpindah topik.',
      report: 'Catatan penutup sesi: apa yang bertahan, apa yang masih terbuka, dan pola yang layak dibawa ke sesi berikutnya.',
      quote: 'Kalimat yang dikutip dicocokkan kembali ke naskah yang Anda kirim. Temuan yang kutipannya tidak ditemukan di sana dibuang sebelum sampai ke panel ini.',
      adjustments: 'Aturan yang ditegakkan di kode, bukan di prompt. Celah tidak boleh dicatat sebelum Anda diberi kesempatan menjelaskan, dan pendalaman pada satu pertanyaan dibatasi, sehingga model tidak dapat memutuskan sebaliknya.',
      patterns: 'Bawa poin ini ke sesi berikutnya lewat kolom kelemahan yang belum selesai, dan poin itu akan diuji lebih dulu.',
      severity: 'Perkiraan seberapa keras penguji akan menekan hal ini, bukan penilaian atas mutu riset Anda. Inilah yang menentukan urutan pertanyaan.',
    },
    tabs: {
      weakness: 'Peta kelemahan',
      evaluation: 'Penilaian',
      report: 'Laporan',
    },
    weaknessIntro: 'Peta kelemahan hasil analisis draf',
    evaluationIntro: 'Penilaian oleh agent penguji',
    reportIntro: 'Laporan disusun oleh agent refleksi',
    quoteVerified: 'Kutipan terverifikasi ada di naskah Anda',
    noEvaluation:
      'Penilaian jawaban akan muncul di sini setelah Anda menjawab pertanyaan pertama.',
    reportPending:
      'Sidang selesai. Susun laporan untuk melihat apa yang bertahan, apa yang masih terbuka, dan pola yang dibawa ke sesi berikutnya.',
    reportLocked: 'Laporan tersedia setelah seluruh pertanyaan selesai dijawab.',
    writeReport: 'Susun laporan sesi',
    criteriaMet: 'Yang Anda penuhi',
    criteriaMissed: 'Yang belum tersentuh',
    defended: 'Berhasil dipertahankan',
    nothingDefended: 'Tidak ada poin yang bertahan pada sesi ini.',
    stillOpen: 'Masih belum terjawab',
    patterns: 'Pola yang dibawa ke sesi berikutnya',
    patternsHelp: 'Tempelkan poin ini saat memulai sesi berikutnya agar diuji lebih dulu.',
    closingRemark: 'Penutup penguji',
    score: {
      heading: 'Indikator latihan',
      outOf: '{score} dari {maximum}',
      hint:
        'Dihitung dari apa yang dicatat penguji selama sesi, bukan diminta ke model. Transkrip yang sama selalu menghasilkan angka yang sama, dan seluruh hitungannya ditampilkan di bawah. Ini indikator latihan, bukan nilai untuk riset Anda dan bukan ramalan hasil sidang sebenarnya.',
      scored: '{count} pertanyaan dinilai',
      unanswered: '{count} tidak sempat ditanyakan, dikeluarkan dari hitungan alih-alih dihitung nol',
      breakdown: 'Cara menghitungnya',
      weight: 'bobot {weight}',
      base: 'dinilai {strength}, bernilai {base}',
      advice: 'Yang perlu ditingkatkan',
      adviceHint:
        'Setiap baris menghitung sesuatu yang dicatat penguji selama sesi, jadi Anda bisa menemukan semuanya di transkrip.',
      advices: {
        close_the_gaps:
          '{count} poin berakhir tanpa pembelaan. Semuanya tercantum di atas, dan itu hal paling konkret untuk disiapkan sebelum sesi berikutnya.',
        answer_or_concede:
          '{count} jawaban dinilai mengelak. Mengatakan terus terang bahwa Anda belum tahu bernilai lebih tinggi di sini daripada berputar di sekitar poinnya, dan itu juga lebih baik di sidang sungguhan.',
        answer_the_question_asked:
          'Anda diberi kesempatan memperjelas sebanyak {count} kali, dan itu terjadi ketika jawaban menyasar hal lain dari yang ditanyakan. Baca ulang pertanyaannya sebelum menjawab.',
        try_without_the_rubric:
          'Anda membuka skema penilaian pada {count} pertanyaan. Coba sesi berikutnya tanpa itu dan lihat mana yang masih bertahan.',
        lead_with_the_limitation:
          'Anda mempertahankan {count} poin, tetapi baru setelah didesak. Menyebut sendiri keterbatasannya sebelum ditanya adalah yang justru dicari penguji.',
        answered_from_elsewhere:
          '{count} jawaban memuat teks yang Anda tempel. Itu tidak mengurangi skor Anda, dan mengutip naskah sendiri justru cara yang baik untuk mempertahankan poin. Tetap layak diketahui: di ruang sidang nanti tidak ada yang bisa ditempel.',
        weakest_question: 'Mulai dari yang ini. Paling mahal biayanya.',
        held_throughout:
          'Seluruh {count} pertanyaan bertahan. Bawa pola di bawah ke draf yang lebih berat, bukan mengulang yang ini.',
      },
    },
    judgments: {
      heading: 'Setiap pertanyaan, sebagaimana dinilai',
      current: 'Sedang diuji',
      pending: 'Belum dinilai',
      empty: 'Penilaian muncul di sini setiap kali satu pertanyaan selesai.',
      noDetail:
        'Apa yang dipenuhi dan apa yang terlewat tidak tercatat untuk pertanyaan ini. Ketiadaannya bukan berarti lulus: baca penilaian di atasnya.',
    },
    print: 'Simpan sebagai PDF',
    severity: { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' },
    strength: {
      strong: 'Bertahan',
      partial: 'Bertahan sebagian',
      weak: 'Lemah',
      evasive: 'Menghindar',
    },
    decision: {
      press_deeper: 'Ditekan lebih dalam',
      ask_clarification: 'Diberi kesempatan klarifikasi',
      move_on: 'Lanjut ke topik berikutnya',
      record_gap: 'Dicatat sebagai celah',
    },
    category: {
      unsupported_claim: 'Klaim tanpa dukungan',
      causal_language_non_experimental: 'Bahasa kausal, desain non-eksperimen',
      overgeneralization: 'Generalisasi berlebihan',
      unaddressed_limitation: 'Batasan tidak dijawab',
      other: 'Lainnya',
    },
  },

  claims: {
    nav: 'Periksa sitasi',
    hints: {
      claim: 'Satu kalimat, disalin persis seperti tertulis di naskah Anda. Vonisnya tentang kalimat ini dan sumber ini, bukan tentang topik yang sama-sama mereka bahas.',
      source: 'Detail bibliografis untuk catatan. Penilaiannya sendiri hanya bersandar pada teks yang Anda tempel di bawah.',
      abstract: 'Tempel abstrak, atau bagian spesifik yang Anda sitasikan. Yang tidak ada di teks ini tidak dapat dipakai, dan itulah yang membuat vonisnya dapat diperiksa.',
      verdict: 'Pernyataan tentang kecocokan satu klaim dengan satu sumber. Vonis mendukung wajib menunjuk bagian yang memuatnya, atau vonisnya turun menjadi tidak dapat dipastikan.',
      passage: 'Kalimat yang menjadi dasar vonis, dicocokkan kembali ke teks sumber yang Anda berikan.',
      question: 'Menandai sitasi salah tanpa jalan untuk menjawab adalah tuduhan. Vonis negatif wajib disertai pertanyaan, atau vonisnya turun menjadi tidak dapat dipastikan.',
    },
    heading: 'Apakah sumber ini benar-benar mendukung klaim tersebut?',
    lede: 'DOI yang resolve membuktikan makalahnya ada. Itu tidak membuktikan makalahnya memuat kalimat yang Anda sitasikan padanya, dan kesamaan topik lolos dari semua pemeriksaan mekanis yang pernah ditulis. Tempel klaim dan teks sumbernya, lalu agent menilai kecocokan spesifiknya.',
    claimLabel: 'Klaim, persis seperti tertulis di naskah Anda',
    claimPlaceholder: 'Satu kalimat, disalin dari draf Anda.',
    sourceLabel: 'Sumber yang Anda sitasikan',
    titleLabel: 'Judul',
    authorsLabel: 'Penulis',
    yearLabel: 'Tahun',
    doiLabel: 'DOI',
    abstractLabel: 'Abstrak atau kutipan',
    abstractHelp:
      'Penilaian tidak boleh bersandar pada apa pun selain ini. Yang tidak ada di teks ini tidak dapat dipakai, dan itulah yang membuat vonisnya dapat diperiksa.',
    useSample: 'Gunakan contoh',
    check: 'Periksa dukungannya',
    checking: 'Membaca sumber terhadap klaim Anda',
    failed: 'Pemeriksaan gagal diselesaikan.',
    verdictLabel: 'Vonis',
    reasoning: 'Alasan',
    passage: 'Bagian yang menjadi dasar',
    quoteVerified: 'Bagian ini terverifikasi ada di sumber yang Anda berikan',
    scopeMismatch: 'Di mana cakupannya berbeda',
    question: 'Pertanyaan untuk Anda, bukan vonis terhadap Anda',
    adjustments: 'Aturan yang diterapkan atas penilaian model',
    verdicts: {
      supports: 'Sumber mendukung klaim',
      partially_supports: 'Sumber hanya memuat sebagiannya',
      does_not_support: 'Sumber tidak memuat klaim tersebut',
      unrelated: 'Sumber membahas hal lain',
      cannot_tell: 'Tidak dapat dipastikan dari teks yang diberikan',
    },
    disclosure:
      'Verifikasi sitasi mekanis, pencocokan DOI ke Crossref atau OpenAlex, adalah proyek terpisah dan sengaja berada di luar submission ini. Yang berjalan di sini adalah lapisan penalaran di atasnya.',
  },





  guide: {
    nav: 'Panduan',
    heading: 'Cara kerja CITRA Viva',
    lede: 'Apa yang dilakukan agen terhadap naskah Anda, apa yang ditolaknya, dan bagaimana mendapatkan sesi yang berguna. Tidak ada yang di halaman ini butuh akun.',
    contents: 'Daftar isi',
    repoLink: 'Baca kodenya di GitHub',
    termsLink: 'Ketentuan Google Cloud',
    sections: [
      {
        id: 'what',
        title: 'Ini apa',
        lead: 'Sidang latihan yang dijalankan agen. Anda serahkan draf yang akan Anda pertahankan, empat agen membagi pekerjaan mengujinya, dan Anda ditanyai pada bagian yang akan dikejar penguji sungguhan.',
        points: [
          {
            title: 'Memang dibuat untuk melawan Anda',
            body: 'Kebanyakan alat tulis dibuat untuk menyetujui Anda. Yang ini dibuat untuk menemukan kalimat yang tidak sanggup ditopang argumen Anda, lalu terus menanyakannya. Itu tidak nyaman, dan memang itu maksudnya: ketidaknyamanan di sini jauh lebih murah daripada di ruang sidang.',
          },
          {
            title: 'Ia menguji, bukan menuliskan',
            body: 'Ia tidak akan menyusun jawaban untuk Anda, dan tidak akan menyodorkan kalimat yang bisa Anda ulangi. Yang dihasilkannya adalah pertanyaan, penilaian, dan catatan. Mempertahankannya tetap tugas Anda.',
          },
          {
            title: 'Pendamping CITRA',
            body: 'CITRA adalah ruang kerja menulis riset tempat argumen dibangun dan setiap klaim tetap bisa dilacak ke sumbernya. Viva mengerjakan kebalikannya pada naskah yang sama: mencari di mana argumen itu jebol, lalu menekan di situ sampai poinnya bertahan atau patah.',
          },
        ],
      },
      {
        id: 'start',
        title: 'Sesi pertama Anda',
        lead: 'Apa yang sebenarnya terjadi, berurutan. Gratis, dan yang Anda perlukan hanya akun Google dan draf yang akan Anda pertahankan.',
        points: [
          {
            title: 'Masuk dengan Google',
            body: 'Satu sesi memuat naskah Anda yang belum terbit dan peta di mana argumen Anda jebol. Masuk itulah yang membuat semua itu tetap milik Anda: sebuah sesi hanya bisa dibuka oleh akun yang membuatnya. Tidak ada biaya, dan tidak ada data lain yang diminta.',
          },
          {
            title: 'Berikan draf Anda',
            body: 'Tempel teksnya, atau unggah PDF atau DOCX. Kalau Anda ingin melihat dulu bagaimana sesi berjalan sebelum menyerahkan tulisan sendiri, ada naskah contoh di balik satu tombol, yang sudah membawa jenis kelemahan yang dicari penguji.',
          },
          {
            title: 'Tunggu sekitar setengah menit',
            body: 'Dua agen berjalan sebelum pertanyaan pertama muncul: satu membaca naskah selengkapnya dan memetakan titik lemahnya, satu lagi mengubah peta itu menjadi ujian yang terurut. Anda bisa melihat tahap mana yang sedang berjalan.',
          },
          {
            title: 'Jawab lima sampai delapan pertanyaan',
            body: 'Satu pertanyaan bisa memakan lebih dari satu giliran, karena jawaban yang kuat justru mendapat pendalaman yang lebih sulit dan jawaban yang lemah mendapat kesempatan memperjelas. Ketik atau bicara, mana yang lebih ingin Anda latih.',
          },
          {
            title: 'Baca laporannya, lalu simpan',
            body: 'Di akhir Anda mendapat apa yang bertahan, apa yang masih terbuka, dan kebiasaan di balik celahnya. Laporannya bisa diunduh sebagai berkas, jadi ia tetap ada setelah peramban ini ditutup.',
          },
          {
            title: 'Ia mengikuti bahasa draf Anda',
            body: 'Naskah berbahasa Indonesia dianalisis dan diuji dalam bahasa Indonesia. Bahasa antarmuka adalah pilihan terpisah, jadi Anda bisa menjalani sidang berbahasa Indonesia dengan tombol berbahasa Inggris, atau sebaliknya.',
          },
        ],
      },
      {
        id: 'how',
        title: 'Bagaimana satu sesi berjalan',
        lead: 'Empat agen menjalankan sidang, berurutan, masing-masing menyerahkan ke agen berikutnya sesuatu yang lebih sempit daripada yang ia terima. Yang kelima, pemeriksa sitasi, berjalan di sampingnya, bukan di dalamnya.',
        points: [
          {
            title: '1. Draf dibaca dan dipetakan',
            body: 'Naskah dibaca sekali, selengkapnya, dan kalimat yang akan membuat penguji berhenti ditandai di tempatnya. Masing-masing menjadi satu temuan: kutipannya, alasan kelemahannya, dan seberapa keras penguji kemungkinan akan menekan.',
          },
          {
            title: '2. Ujian disusun',
            body: 'Temuan menjadi pertanyaan, diurutkan menurut tekanan, bukan menurut letaknya di teks Anda. Kelemahan yang Anda bawa dari sesi sebelumnya ditanyakan lebih dulu, berapa pun tingkat keparahannya.',
          },
          {
            title: '3. Setiap jawaban dinilai',
            body: 'Jawaban Anda ditimbang terhadap apa yang sebenarnya diminta pertanyaan itu, lalu penguji memutuskan langkah berikutnya: menekan lebih dalam, memberi kesempatan memperjelas, berpindah, atau mencatat poin itu sebagai tidak terpertahankan.',
          },
          {
            title: '4. Sesi dilaporkan',
            body: 'Di akhir, apa yang Anda pertahankan dan apa yang masih terbuka sama-sama diambil dari transkrip, dengan kata-kata penguji sendiri, sehingga laporannya tidak mungkin bertentangan dengan sesi yang dilaporkannya.',
          },
        ],
      },
      {
        id: 'draft',
        title: 'Menyiapkan draf Anda',
        lead: 'Ujian hanya sebaik bahan yang diberikan kepadanya. Beberapa menit di tahap ini mengubah keseluruhan sesi.',
        points: [
          {
            title: 'Tempel atau unggah',
            body: 'PDF, DOCX, TXT, dan Markdown terbaca, sampai 10 MB. Dokumen hasil pindaian tidak punya teks yang bisa diseleksi dan tidak bisa dipakai: ekspor PDF teks sebagai gantinya. Berkasnya sendiri tidak pernah disimpan.',
          },
          {
            title: 'Periksa teks hasil ekstraksi sebelum mulai',
            body: 'Teks hasil ekstraksi mendarat di kotak yang bisa disunting, bukan langsung masuk sesi. Setiap kutipan yang dipakai penguji diperiksa terhadap persis apa yang Anda kirim di sini, jadi apa pun yang rusak saat ekstraksi layak diperbaiki sekarang.',
          },
          {
            title: 'Berikan argumennya, bukan halaman depannya',
            body: 'Pendahuluan, metodologi, dan temuan memberi penguji bahan paling banyak. Abstrak saja hampir tidak memberinya apa pun untuk ditekan.',
          },
          {
            title: 'Bawa kelemahan yang belum selesai',
            body: 'Kolom opsional itu menerima satu kelemahan per baris, biasanya ditempel dari laporan sesi sebelumnya. Pertanyaan yang menyerangnya ditanyakan lebih dulu. Kelemahan yang sudah sekali gagal Anda perbaiki adalah hal paling berharga untuk diuji lagi.',
          },
        ],
      },
      {
        id: 'defense',
        title: 'Di ruang sidang',
        lead: 'Tiga panel, masing-masing menggulir sendiri: rencana di kiri, percakapan di tengah, bukti di kanan.',
        points: [
          {
            title: 'Rencana di depan Anda tetap tertutup',
            body: 'Anda bisa melihat pertanyaan mana yang sedang diuji dan mana yang sudah selesai. Yang masih di depan tetap tertutup, karena sidang yang bisa dibaca lebih dulu bukan sidang.',
          },
          {
            title: 'Setiap pertanyaan menunjukkan asalnya',
            body: 'Masing-masing membawa kalimat naskah Anda yang melahirkannya, dikutip dan dicocokkan kembali ke teks Anda. Anda selalu bisa melihat mengapa Anda ditanyai sesuatu.',
          },
          {
            title: 'Naskah Anda satu klik saja',
            body: 'Draf yang Anda kirim bisa dibuka di samping ujian, sehingga pertanyaan tentang satu bagian tidak membuat Anda mencarinya di jendela lain.',
          },
          {
            title: 'Jawab dengan kata-kata Anda sendiri',
            body: 'Pendek dan tepat mengalahkan panjang. Penguji menilai apakah Anda sanggup mempertahankan poinnya, bukan apakah Anda hafal isi bab.',
          },
          {
            title: 'Satu pertanyaan berakhir, tidak berputar',
            body: 'Satu pertanyaan mengizinkan paling banyak dua pendalaman dan satu klarifikasi. Batas itu ditegakkan di kode, bukan diminta kepada model, sehingga ujian tidak mungkin mengitari satu poin sampai Anda menyerah.',
          },
          {
            title: 'Tidak ada yang bergantung pada tab ini',
            body: 'Setiap giliran ditulis ke penyimpanan begitu dinilai. Tutup tab di tengah sidang, kembali besok di mesin lain, dan ia melanjutkan dari pertanyaan tempat ia berhenti.',
          },
        ],
      },
      {
        id: 'voice',
        title: 'Bicara dan mendengar',
        lead: 'Anda bisa menjawab dengan suara, dan penguji membacakan pertanyaannya. Sidang sungguhan itu lisan, dan melatihnya dalam diam melatih hal yang salah.',
        points: [
          {
            title: 'Penguji bicara begitu pertanyaannya muncul',
            body: 'Audionya dibuat sementara pertanyaannya sedang diputuskan, bukan sesudahnya, jadi tidak ada yang perlu ditekan dan tidak ada tambahan waktu tunggu. Sakelar di header mematikannya kalau Anda lebih suka membaca.',
          },
          {
            title: 'Menjawab dengan suara',
            body: 'Tekan mikrofon lalu bicara. Audionya dikirim sambil Anda bicara, sehingga transkripnya siap kurang dari satu detik setelah Anda berhenti, bukan beberapa detik kemudian.',
          },
          {
            title: 'Anda yang memutuskan kapan selesai',
            body: 'Rekaman berhenti ketika Anda menghentikannya, tidak pernah ketika sistem menganggap jeda Anda sudah cukup lama. Orang yang sedang berpikir di tengah jawaban belum selesai, dan hanya Anda yang tahu bedanya.',
          },
          {
            title: 'Perhatikan meter tingkat suara',
            body: 'Batang di samping penghitung waktu bergerak saat Anda bicara. Kalau diam saja, tidak ada audio yang sampai ke halaman, dan itu hampir selalu berarti mikrofon yang salah sedang terpilih di suatu tempat. Rekaman yang sampai dalam keadaan senyap ditolak, bukan dikirim.',
          },
          {
            title: 'Transkripnya Anda koreksi dulu',
            body: 'Hasil suara mendarat di kotak jawaban, bukan langsung ke sesi. Baca, perbaiki yang salah dengar, baru kirim. Transkrip sidang adalah catatan permanen, dan kata yang salah dikenali harus bisa dikoreksi sebelum menjadi bagian darinya.',
          },
          {
            title: 'Suara tidak mengubah apa pun di bawahnya',
            body: 'Jawaban lisan menempuh jalur yang sama dengan jawaban ketik dan menemui aturan yang persis sama. Suara adalah jalan masuk dan jalan keluar, bukan mode terpisah dengan perilakunya sendiri.',
          },
        ],
      },
      {
        id: 'rubric',
        title: 'Meminta skema penilaian',
        lead: 'Ada bantuan yang tersedia di tengah pertanyaan, dan bantuan itu sengaja dibuat tidak bisa menjawab untuk Anda.',
        points: [
          {
            title: 'Apa yang Anda dapat',
            body: 'Skema penilaian untuk pertanyaan yang sedang di depan Anda: apa yang harus dimuat sebuah jawaban yang baik. Bukan jawabannya, bukan kalimat yang bisa Anda ulangi, dan bukan contoh yang bisa Anda sesuaikan.',
          },
          {
            title: 'Kenapa tidak ada rekomendasi jawaban',
            body: 'Fitur itu sudah dipertimbangkan dan ditolak. Orang yang membaca saran jawaban sebelum menjawab tidak lagi sedang mempertahankan apa pun, dan seluruh nilai alat ini terletak pada kenyataan bahwa jawabannya harus datang dari Anda.',
          },
          {
            title: 'Meminta bantuan itu tercatat',
            body: 'Setiap pembukaan skema ditulis ke transkrip dan muncul di laporan akhir. Bantuan yang menyembunyikan diri dari catatan bukan bantuan: itu cara tiba di sidang sungguhan sambil mengira diri lebih siap daripada kenyataannya.',
          },
        ],
      },
      {
        id: 'report',
        title: 'Laporan sesi',
        lead: 'Ditulis dari transkrip, bukan dari kesan yang baru dibentuk terhadapnya.',
        points: [
          {
            title: 'Apa yang bertahan',
            body: 'Poin yang dicatat penguji sebagai terpertahankan selama sesi, dikembalikan ke laporan kalau ringkasannya mencoba menghilangkannya. Laporan yang bilang tidak ada satu pun yang bertahan adalah laporan yang juga tidak akan Anda percaya soal kelemahan Anda.',
          },
          {
            title: 'Apa yang masih terbuka',
            body: 'Setiap poin yang tercatat sebagai celah, digambarkan sebagai celah dan tidak pernah sebagai perbaikan. Diberi tahu apa yang harus dikatakan justru menggagalkan latihannya.',
          },
          {
            title: 'Pola untuk lain kali',
            body: 'Kebiasaan di balik celah-celah itu. Tempelkan ke kolom kelemahan yang belum selesai saat Anda memulai sesi berikutnya, dan itulah yang akan diuji lebih dulu.',
          },
          {
            title: 'Bawa pulang',
            body: 'Laporannya diunduh sebagai berkas Markdown biasa yang terbuka di editor mana pun. Kemampuan Anda membacanya nanti tidak bergantung pada layanan ini masih ada atau tidak.',
          },
        ],
      },
      {
        id: 'memory',
        title: 'Apa yang terbawa ke sesi berikutnya',
        lead: 'Sidang kedua bukan pengulangan yang pertama. Kelemahan yang sudah sekali gagal Anda perbaiki adalah hal paling berharga untuk diuji lagi.',
        points: [
          {
            title: 'Pola, bukan transkrip',
            body: 'Yang terbawa adalah kebiasaan di balik celahnya, ditulis supaya masih bisa dikenali di naskah lain berbulan-bulan kemudian. Sesuatu seperti memperlakukan korelasi sebagai sebab ketika menulis kesimpulan, bukan pertanyaan tiga lemah.',
          },
          {
            title: 'Cara memakainya',
            body: 'Salin pola itu dari laporan Anda ke kolom kelemahan yang belum selesai saat memulai sesi berikutnya. Pertanyaan yang menyerangnya kemudian ditanyakan lebih dulu, bahkan ketika temuan lain terlihat lebih parah.',
          },
          {
            title: 'Tidak ada yang diingat tentang diri Anda',
            body: 'Tidak ada ingatan bebas tentang siapa Anda atau bagaimana penampilan Anda. Yang disimpan adalah daftar kelemahan yang terstruktur, masing-masing bisa dilacak ke temuan tertentu di naskah tertentu, sehingga Anda bisa membacanya, memeriksanya, dan tidak menyetujuinya.',
          },
        ],
      },
      {
        id: 'citation',
        title: 'Memeriksa sitasi',
        lead: 'Alat terpisah, untuk pertanyaan yang berbeda: apakah sumber ini benar-benar memuat kalimat yang Anda sitasikan kepadanya?',
        points: [
          {
            title: 'Kenapa DOI yang resolve saja tidak cukup',
            body: 'DOI membuktikan makalahnya ada. Ia tidak membuktikan makalah itu mengatakan apa yang Anda atributkan kepadanya, dan kemiripan topik lolos dari setiap pemeriksaan mekanis yang pernah ditulis orang.',
          },
          {
            title: 'Apa yang dibutuhkannya',
            body: 'Klaim persis seperti yang tertulis di naskah Anda, dan teks sumbernya, biasanya abstrak atau bagian yang Anda sitasi. Penilaiannya tidak boleh bersandar pada apa pun selain itu, dan justru itulah yang membuatnya bisa diperiksa.',
          },
          {
            title: 'Ia bertanya, bukan menuduh',
            body: 'Putusan negatif harus disertai pertanyaan untuk Anda, atau ia diturunkan menjadi tidak dapat dipastikan. Menyatakan sitasi seseorang salah tanpa memberi jalan untuk menjawab itu tuduhan, bukan telaah.',
          },
        ],
      },
      {
        id: 'privacy',
        title: 'Naskah Anda, dan siapa yang bisa melihatnya',
        lead: 'Anda sedang diminta menyerahkan tesis yang belum terbit kepada layanan yang bukan Anda tulis. Itu pantas dijawab lugas, bukan dengan halaman kebijakan.',
        points: [
          {
            title: 'Hanya akun Anda yang bisa membuka sesi Anda',
            body: 'Kepemilikan diperiksa pada catatannya sendiri, bukan ditebak dari alamatnya. Sesi milik orang lain dilaporkan sebagai tidak ada sama sekali, karena memberi tahu orang asing bahwa sebuah sesi ada tetapi bukan miliknya sudah memberitahukan sesuatu yang berharga.',
          },
          {
            title: 'Berkas yang Anda unggah tidak pernah disimpan',
            body: 'PDF atau DOCX dibaca ke memori, diubah menjadi teks, lalu dibuang. Yang disimpan adalah teks yang Anda periksa dan Anda pilih untuk dikirim, supaya Anda bisa membuka naskah di samping pertanyaan selama sidang dan supaya setiap kutipan bisa dicocokkan dengan persis apa yang Anda kirim.',
          },
          {
            title: 'Tidak ada yang keluar dari Google Cloud',
            body: 'Draf Anda dikirim ke model Gemini milik Google untuk dianalisis, dan tidak ke mana pun lagi. Tidak ada pihak ketiga dalam sistem ini: tidak ada layanan analitik yang membaca teks Anda, tidak ada vendor lain, tidak ada yang dijual kepada siapa pun. Apa yang Google sendiri lakukan terhadap data yang dikirim ke platform AI perusahaannya diatur oleh ketentuan Google, yang ditautkan di bawah alih-alih diparafrasekan di sini.',
          },
          {
            title: 'Pekerjaan Anda tidak pernah ditunjukkan ke pengguna lain',
            body: 'Tidak ada sesi, temuan, pertanyaan, atau laporan yang terlihat oleh orang lain, dan tidak ada satu pun yang diterbitkan di mana pun.',
          },
          {
            title: 'Anda bisa menghapus sesi, dan benar-benar hilang',
            body: 'Menghapus sesi menghilangkan sesi itu beserta naskah yang tersimpan bersamanya, secara permanen. Bukan disembunyikan, bukan diarsipkan, dan tidak bisa kami kembalikan sesudahnya. Produk yang mengatakan tesis Anda yang belum terbit itu milik Anda harus mengizinkan Anda menariknya kembali.',
          },
          {
            title: 'Proses masuk memberi kami hampir tidak ada apa-apa',
            body: 'Sesi dikaitkan ke pengenal akun yang dikembalikan Google, bukan ke alamat surel Anda, karena surel bisa berpindah tangan dan pengenal tidak. Tidak ada kata sandi yang bisa hilang di sini, karena memang tidak ada kata sandi sama sekali.',
          },
        ],
      },
      {
        id: 'integrity',
        title: 'Apa yang tidak akan dilakukannya',
        lead: 'Semua ini ditegakkan di kode, bukan diminta lewat prompt, yang berarti model tidak bisa memutuskan sebaliknya di hari yang buruk.',
        points: [
          {
            title: 'Ia tidak akan mengutip kalimat yang tidak Anda tulis',
            body: 'Setiap temuan wajib mengutip naskah Anda kata demi kata, dan setiap kutipan dicocokkan kembali ke teks Anda. Temuan yang kutipannya tidak ditemukan di sana dibuang, bukan ditampilkan, karena temuan tentang kalimat yang tidak pernah Anda tulis adalah tuduhan.',
          },
          {
            title: 'Ia tidak akan mencatat celah tanpa memperingatkan lebih dulu',
            body: 'Satu poin tidak bisa ditulis sebagai tidak terpertahankan sebelum Anda diberi setidaknya satu kesempatan memperjelasnya.',
          },
          {
            title: 'Ia tidak akan menilai mutu riset Anda',
            body: 'Tidak ada skor dan tidak ada batas lulus. Tingkat keparahan menggambarkan seberapa keras penguji kemungkinan akan menekan, dan itu pernyataan tentang penguji, bukan tentang mutu pekerjaan Anda.',
          },
          {
            title: 'Ia tidak akan menimpa model diam-diam',
            body: 'Ketika aturan sesi menggantikan keputusan model, penggantian itu ditunjukkan kepada Anda di transkrip, bukan diterapkan di luar pandangan.',
          },
        ],
      },
      {
        id: 'trouble',
        title: 'Ketika ada yang tidak beres',
        lead: 'Kegagalan yang benar-benar ditemui orang, dan arti masing-masing.',
        points: [
          {
            title: 'Jawaban lisan Anda kembali kosong',
            body: 'Hampir selalu mikrofon yang salah sedang terpilih, di peramban atau di sistem operasi. Meter tingkat suara adalah alat ujinya: kalau ia tidak bergerak saat Anda bicara, tidak ada audio yang sampai ke halaman. Kesenyapan ditolak, bukan dikirim, karena model yang diberi kesenyapan tetap akan menjawab dan menyerahkan kata-kata yang tidak pernah Anda ucapkan.',
          },
          {
            title: 'PDF Anda ditolak',
            body: 'Dokumen hasil pindaian adalah gambar dari teks dan tidak punya teks untuk diambil. Ekspor PDF teks dari perangkat lunak tempat Anda menulis, atau tempel teksnya langsung.',
          },
          {
            title: 'Teks hasil ekstraksi terlihat kacau',
            body: 'Perbaiki di kotaknya sebelum memulai. Tata letak dua kolom, header berulang, dan karakter tidak lazim semuanya tidak selamat sempurna dari ekstraksi, dan setiap kutipan yang dipakai penguji diperiksa terhadap persis apa yang Anda kirim.',
          },
          {
            title: 'Anda menutup tab di tengah jalan',
            body: 'Tidak ada yang hilang. Setiap giliran ditulis ke penyimpanan begitu dinilai, jadi sesinya melanjutkan dari pertanyaan tempat ia berhenti, dari mesin mana pun tempat Anda masuk.',
          },
          {
            title: 'Penguji terasa lama sekali',
            body: 'Menilai satu jawaban adalah pekerjaan penalaran sungguhan dan memakan waktu selama yang diperlukan. Model yang sedang sibuk dicoba ulang otomatis. Kalau satu giliran benar-benar gagal, tempat Anda tidak hilang: sesinya masih di pertanyaan itu dan bisa Anda jawab lagi.',
          },
        ],
      },
      {
        id: 'tech',
        title: 'Dibangun di atas apa',
        lead: 'Seluruhnya sumber terbuka, jadi tidak ada satu pun dari ini yang harus Anda percaya begitu saja.',
        points: [
          {
            title: 'Lima agen, dan tidak ada yang bisa memanggil yang lain',
            body: 'Satu memetakan kelemahan, satu menyusun ujian, satu menilai setiap jawaban sekaligus memutuskan apa yang dikatakan berikutnya, satu menulis laporan, dan satu memeriksa sitasi di sampingnya. Setiap pertukaran melewati satu orkestrator. Isolasinya ditegakkan oleh kerangka kerjanya, bukan diminta lewat prompt, jadi sebuah agen tidak akan bisa menyerahkan pekerjaan ke agen lain sekalipun ia mencoba.',
          },
          {
            title: 'Modelnya',
            body: 'Gemini 3.7 Flash yang melakukan penalaran. Dua model Gemini lain menangani suara: satu membacakan pertanyaan penguji, satu mentranskrip jawaban Anda sementara Anda masih bicara.',
          },
          {
            title: 'Berjalan di mana',
            body: 'Sepenuhnya di Google Cloud. Cloud Run melayani aplikasinya, Firestore memegang seluruh state, Firebase Authentication memutuskan siapa yang boleh membukanya, dan Cloud Trace mencatat satu span per pemanggilan agen, sehingga rantai keputusan di balik satu giliran bisa dibaca setelahnya.',
          },
          {
            title: 'Tidak ada yang disimpan di dalam model',
            body: 'Satu sesi hidup di basis data, bukan di ingatan agen. Itulah sebabnya menutup tab tidak merugikan apa pun, dan sebabnya dua jawaban yang dikirim pada saat yang sama tidak bisa saling menimpa.',
          },
          {
            title: 'Baca sendiri',
            body: 'Repositorinya memuat arsitekturnya, prompt-nya, aturan yang ditegakkan di kode, dan petunjuk menjalankan salinan Anda sendiri. Lisensinya MIT.',
          },
        ],
      },
    ],
  },

  workspace: {
    newSession: 'Sidang baru',
    history: 'Sesi Anda',
    historyHint:
      'Setiap sidang yang pernah Anda mulai, terbaru di atas. Yang belum selesai dilanjutkan persis dari tempatnya berhenti, termasuk dari perangkat berbeda, karena tidak ada bagian sesi yang hidup di tab ini.',
    empty: 'Sesi yang Anda mulai akan muncul di sini.',
    loading: 'Memuat sesi Anda',
    failed: 'Sesi Anda gagal dimuat.',
    retry: 'Coba lagi',
    inProgress: 'Berlangsung',
    completed: 'Selesai',
    answeredOf: '{answered} dari {total} terjawab',
    openGaps: '{count} tercatat sebagai celah',
    untitled: 'Sesi tanpa judul',
    today: 'Hari ini',
    yesterday: 'Kemarin',
    deleteLabel: 'Hapus sesi "{name}"',
    deleteConfirm: 'Hapus',
    deleteCancel: 'Batal',
    deleting: 'Menghapus',
    deleteFailed: 'Sesi tidak dapat dihapus.',
    signedInAs: 'Masuk sebagai',
  },





  report: {
    download: 'Unduh sebagai Markdown',
    downloadPdf: 'Unduh laporan sebagai PDF',
    preparing: 'Menyiapkan PDF',
    pdfFailed: 'PDF tidak dapat dibuat. Unduhan Markdown di bawah tetap bisa dipakai.',
    footer:
      'Dihasilkan oleh {name}. Setiap kutipan telah diverifikasi terhadap naskah yang dikirim untuk sesi ini. Ini sidang latihan dan tidak memuat penilaian apa pun atas mutu penelitiannya.',
  },


  limits: {
    tooLong:
      'Draf ini {count} karakter, dan batasnya {max}. Kirimkan bab yang ingin diuji, biasanya pendahuluan, metodologi, dan hasil. Satu tesis utuh sekaligus menghasilkan pengujian yang lebih tipis, bukan lebih dalam.',
    fileTooLarge:
      'Berkas itu {size} MB. Batasnya {max} MB, dan PDF teks sebuah tesis biasanya jauh di bawahnya.',
  },

  carry: {
    title: 'Dari sidang terakhir Anda',
    lede: 'Ini pola yang disimpulkan sidang tersebut untuk diuji lebih dulu. Membawanya masuk menempatkan pertanyaan yang menyasar pola ini di urutan depan, mendahului apa pun yang ditemukan analisis hari ini.',
    action: 'Bawa ke sidang ini',
    added: 'Sudah dibawa',
    dismiss: 'Tidak sekarang',
  },

  link: {
    attacks: 'Dari {id}',
    attacksHint:
      'Temuan asal pertanyaan ini. Setiap pertanyaan dalam sidang lahir dari satu bagian yang ditandai di naskah Anda, dan tombol ini membuka bagian itu, sehingga Anda dapat membaca sendiri kalimat yang sedang ditekan alih-alih mempercayai pertanyaannya begitu saja.',
    underExamination: 'Sedang diuji',
    opening: 'Pertanyaan pembuka, tidak terikat pada satu temuan',
  },


  document: {
    open: 'Dokumen tesis',
    title: 'Tesis Anda, sebagaimana dikirim untuk sesi ini',
    search: 'Cari di dokumen',
    matchOf: '{current} dari {total}',
    noMatches: 'Tidak ditemukan',
    previous: 'Hasil sebelumnya',
    next: 'Hasil berikutnya',
    loading: 'Membuka dokumen',
    failed: 'Dokumen gagal dibuka.',
    note: 'Ini teks yang menjadi dasar pengujian ini, persis seperti yang Anda kirim. Setiap kutipan yang dipakai penguji diverifikasi terhadapnya.',
  },

  rubric: {
    open: 'Apa yang sedang diuji?',
    opened: 'Kriteria dibuka',
    opening: 'Membuka kriteria',
    title: 'Apa yang diuji pertanyaan ini',
    close: 'Tutup',
    intent: 'Yang sedang ditelusuri penguji',
    criteria: 'Yang harus dipenuhi sebuah jawaban',
    recorded:
      'Ini skema penilaian, bukan jawaban. Membukanya dicatat pada pertanyaan ini dan muncul di laporan sesi Anda, karena laporan yang menyembunyikan bantuan yang Anda ambil bukanlah laporan sesi ini.',
    failed: 'Kriteria gagal dibuka.',
    revealed: 'Kriteria dibuka',
    reportTitle: 'Pertanyaan tempat Anda membuka kriteria',
    reportHelp:
      'Ditampilkan agar catatannya utuh. Menanyakan apa yang sedang diuji adalah cara belajar yang sah; ia dicatat semata agar sisa laporan ini dapat dipercaya.',
  },

  voice: {
    speak: 'Jawab dengan suara',
    stop: 'Berhenti dan transkripkan',
    transcribing: 'Mengubah jawaban Anda menjadi teks',
    play: 'Dengarkan',
    stopPlaying: 'Hentikan',
    loading: 'Menyiapkan suara',
    readAloud: 'Bacakan pertanyaan',
    denied:
      'Mikrofon tidak tersedia. Izinkan untuk situs ini di peramban Anda, atau ketik jawaban Anda.',
    unsupported: 'Peramban ini tidak dapat merekam audio. Silakan ketik jawaban Anda.',
    empty: 'Tidak ada yang terekam. Periksa mikrofon lalu coba lagi.',
    silent:
      'Mikrofon terbuka tetapi tidak ada suara yang sampai ke halaman ini. Periksa perangkat masukan yang terpilih dan pastikan peramban tidak dibisukan, lalu rekam lagi.',
    level: 'Tingkat masukan',
    cancel: 'Buang',
    cancelHint:
      'Buang rekaman tanpa mentranskripkannya. Tidak ada yang dikirim dan tidak ada yang dinilai, jadi mikrofon yang tidak sengaja terbuka tidak berbiaya apa pun.',
    failed: 'Rekaman gagal ditranskripkan.',
    playFailed: 'Bagian ini gagal dibacakan.',
    transcriptAdded:
      'Jawaban lisan Anda ada di kotak di bawah. Baca dulu sebelum mengirim: penguji menilai apa yang Anda kirim, bukan apa yang terdengar.',
    hint: 'Suara menjadi teks di kotak jawaban untuk Anda perbaiki, dan hanya terkirim ketika Anda mengirimnya. Penguji menilai kata-kata yang Anda kirim, dan jawaban lisan tunduk pada aturan sesi yang persis sama dengan jawaban tertulis.',
  },

  agent: {
    working: 'Agent sedang bekerja',
    dismiss: 'Sembunyikan',
    stages: {
      extracting: {
        title: 'Mengangkat teks dari dokumen Anda',
        body: 'Elemen halaman seperti header berulang dibuang, kata yang terpotong di ujung baris disambung kembali, dan hasilnya dikembalikan kepada Anda untuk diperiksa. Berkasnya sendiri tidak disimpan.',
      },
      reading: {
        title: 'Membaca draf dan menandai klaim kunci',
        body: 'Seluruh naskah dibaca sekali, dan kalimat yang akan membuat penguji berhenti ditandai di tempatnya.',
      },
      verifying: {
        title: 'Memeriksa setiap kutipan terhadap naskah',
        body: 'Tiap kalimat yang ditandai dicocokkan kembali ke teks Anda. Yang tidak ditemukan di sana dibuang, bukan ditampilkan, karena temuan atas kalimat yang tidak pernah Anda tulis adalah tuduhan.',
      },
      planning: {
        title: 'Menyusun urutan pertanyaan',
        body: 'Pertanyaan diurutkan menurut seberapa keras penguji biasanya menekan. Apa pun yang Anda bawa dari sesi sebelumnya dipindahkan ke depan.',
      },
      judging: {
        title: 'Menimbang jawaban Anda',
        body: 'Jawaban Anda dibaca terhadap apa yang sebenarnya diminta pertanyaan, lalu penguji memutuskan untuk menekan lebih jauh, memberi kesempatan klarifikasi, atau berpindah topik.',
      },
      reporting: {
        title: 'Menyusun laporan sesi',
        body: 'Yang berhasil Anda pertahankan dan yang masih terbuka sama-sama diambil dari transkrip dengan kata-kata penguji sendiri, sehingga laporannya tidak dapat bertentangan dengan sesi yang dilaporkannya.',
      },
      citation: {
        title: 'Membaca sumber terhadap klaim Anda',
        body: 'Teks sumber ditelusuri untuk bagian yang benar-benar memuat klaim Anda. Kesamaan topik bukan berarti dukungan atas sebuah kalimat.',
      },
    },
  },

  ai: {
    working: 'Agent sedang bekerja',
    elapsed: '{seconds} dtk',
    doNotClose: 'Tab ini boleh dibiarkan terbuka. Sesi tersimpan setelah setiap giliran.',
  },

  auth: {
    signIn: 'Masuk dengan Google',
    signOut: 'Keluar',
    signingIn: 'Sedang masuk',
    required: 'Masuk untuk memulai sidang',
    requiredHelp:
      'Naskah dan sesi Anda adalah milik Anda. Masuk adalah yang membuat layanan ini dapat memisahkannya dari milik orang lain.',
    restoring: 'Memulihkan sesi Anda',
    signedOutTitle: 'Anda telah keluar',
    signedOutBody:
      'Sidang ini tidak lagi ditampilkan di layar ini. Tidak ada yang hilang: masuk kembali dengan akun yang sama dan sidangnya dilanjutkan dari pertanyaan tempatnya berhenti.',
    lockedTitle: 'Masuk untuk membuka sidang ini',
    lockedBody:
      'Sebuah sidang adalah milik akun yang memulainya. Masuk dengan akun tersebut dan sidangnya terbuka dari tempatnya berhenti.',
    failed: 'Gagal masuk.',
    notYours: 'Sesi ini milik akun lain.',
  },

  errors: {
    notFoundTitle: 'Sesi tidak ditemukan',
    notFoundBody:
      'Sesi ini tidak ada, atau tautannya salah. Sesi yang sudah dimulai tidak pernah hilang, jadi periksa kembali alamatnya sebelum memulai dari awal.',
    startNew: 'Mulai sidang baru',
    unavailableTitle: 'Layanan sedang tidak dapat dihubungi',
    unavailableBody:
      'Ini biasanya kuota model, bukan kesalahan pada draf Anda. Sesi yang sedang berjalan sudah tersimpan dan dapat dilanjutkan begitu layanan pulih.',
    retry: 'Coba lagi',
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { en, id };

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Fill `{name}` placeholders. Kept deliberately small: no plural rules, no
 *  date formatting, nothing that would need a library. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}
