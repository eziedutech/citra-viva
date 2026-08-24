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
      'A thesis defense simulator that reads your research draft and tests the weakest points of your argument.',
  },

  nav: {
    label: 'Sections',
    defense: 'Practice defense',
    claims: 'Citation check',
  },

  landing: {
    eyebrow: 'Adversarial practice, before the committee does it for real',
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
    sections: [
      {
        id: 'what',
        title: 'What this is',
        lead: 'A practice viva. You give it the draft you are going to defend, and it examines you on the parts a committee would go after.',
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
        id: 'how',
        title: 'How a session runs',
        lead: 'Four agents, in order. Each one hands the next something narrower than what it received.',
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
        lead: 'You can answer out loud, and the examiner can read its questions to you. A real viva is spoken, and practising it silently trains the wrong thing.',
        points: [
          {
            title: 'Speaking an answer',
            body: 'The microphone records, and the transcript is placed in the answer box for you to read. It is not sent until you send it, because a defense transcript is a permanent record and a misheard word has to be correctable before it becomes part of one.',
          },
          {
            title: 'Hearing the examiner',
            body: 'Any examiner turn can be read aloud, and the switch in the header reads each new question as it arrives. The voice reads the text already in the transcript, never a second generation of it.',
          },
          {
            title: 'Voice changes nothing underneath',
            body: 'A spoken answer travels the same path as a typed one and meets exactly the same rules. Speech is a way in and a way out, not a separate mode with its own behaviour.',
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
    signedInAs: 'Signed in',
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
      'Simulator sidang skripsi yang membaca draf riset Anda dan menguji titik terlemah argumennya.',
  },

  nav: {
    label: 'Bagian',
    defense: 'Sidang latihan',
    claims: 'Periksa sitasi',
  },

  landing: {
    eyebrow: 'Latihan yang menekan, sebelum penguji sungguhan melakukannya',
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
    lede: 'Apa yang dilakukan agent terhadap naskah Anda, apa yang ditolaknya, dan bagaimana mendapatkan sesi yang benar-benar berguna. Tidak ada bagian di sini yang memerlukan akun.',
    contents: 'Daftar isi',
    sections: [
      {
        id: 'what',
        title: 'Apa ini',
        lead: 'Sidang latihan. Anda menyerahkan draf yang akan Anda pertahankan, lalu ia menguji Anda pada bagian yang akan dikejar penguji sungguhan.',
        points: [
          {
            title: 'Menekan, dan itu memang disengaja',
            body: 'Kebanyakan alat menulis dibangun untuk menyetujui Anda. Yang ini dibangun untuk menemukan kalimat yang tidak sanggup didukung argumen Anda, lalu terus menanyakannya. Itu tidak nyaman, dan justru itu maksudnya: ketidaknyamanan di sini jauh lebih murah daripada di ruang sidang.',
          },
          {
            title: 'Ia menguji, bukan menuliskan',
            body: 'Ia tidak akan menyusun jawaban untuk Anda, dan tidak akan menawarkan kalimat yang tinggal Anda ulang. Yang dihasilkannya adalah pertanyaan, penilaian, dan catatan. Mempertahankannya tetap tugas Anda.',
          },
          {
            title: 'Pendamping CITRA',
            body: 'CITRA adalah ruang kerja penulisan riset, tempat argumen dibangun dan setiap klaim tetap dapat ditelusuri ke sumbernya. Viva melakukan pekerjaan sebaliknya pada naskah yang sama: mencari tempat argumen itu melemah, lalu menekannya sampai poin itu bertahan atau patah.',
          },
        ],
      },
      {
        id: 'how',
        title: 'Bagaimana satu sesi berjalan',
        lead: 'Empat agent, berurutan. Masing-masing menyerahkan sesuatu yang lebih sempit daripada yang diterimanya.',
        points: [
          {
            title: '1. Draf dibaca dan dipetakan',
            body: 'Naskah dibaca sekali, utuh, dan kalimat yang akan membuat penguji berhenti ditandai di tempatnya. Tiap kalimat menjadi satu temuan: kutipannya, alasan lemahnya, dan seberapa keras penguji biasanya menekannya.',
          },
          {
            title: '2. Pengujian disusun',
            body: 'Temuan menjadi pertanyaan, diurutkan menurut tekanan, bukan menurut letaknya di naskah. Kelemahan yang Anda bawa dari sesi sebelumnya ditanyakan lebih dulu, berapa pun bobotnya.',
          },
          {
            title: '3. Tiap jawaban dinilai',
            body: 'Jawaban Anda ditimbang terhadap apa yang sebenarnya diminta pertanyaan, lalu penguji memutuskan langkah berikutnya: menekan lebih dalam, memberi kesempatan menjelaskan, berpindah topik, atau mencatat poin itu sebagai belum terjawab.',
          },
          {
            title: '4. Sesi dilaporkan',
            body: 'Di akhir, apa yang berhasil Anda pertahankan dan apa yang masih terbuka sama-sama diambil dari transkrip dengan kata-kata penguji sendiri, sehingga laporannya tidak mungkin bertentangan dengan sesi yang dilaporkannya.',
          },
        ],
      },
      {
        id: 'draft',
        title: 'Menyiapkan draf',
        lead: 'Kualitas pengujian mengikuti kualitas bahan yang diberikan. Beberapa menit di sini mengubah seluruh sesi.',
        points: [
          {
            title: 'Tempel atau unggah',
            body: 'PDF, DOCX, TXT, dan Markdown dapat dibaca, maksimal 10 MB. Dokumen hasil pindai tidak punya teks yang dapat dipilih dan tidak bisa dipakai: ekspor ulang sebagai PDF teks. Berkasnya sendiri tidak pernah disimpan.',
          },
          {
            title: 'Periksa hasil ekstraksi sebelum memulai',
            body: 'Teks hasil ekstraksi masuk ke kotak yang dapat disunting, bukan langsung ke sesi. Setiap kutipan yang dipakai penguji dicocokkan ke persis apa yang Anda kirim di sini, jadi kesalahan ekstraksi sebaiknya diperbaiki sekarang.',
          },
          {
            title: 'Berikan argumennya, bukan halaman depannya',
            body: 'Pendahuluan, metodologi, dan hasil memberi penguji bahan paling banyak. Abstrak saja nyaris tidak memberi apa pun untuk ditekan.',
          },
          {
            title: 'Bawa kelemahan yang belum selesai',
            body: 'Kolom opsional menerima satu kelemahan per baris, biasanya disalin dari laporan sesi sebelumnya. Pertanyaan yang menyasarnya diajukan lebih dulu. Kelemahan yang sekali gagal Anda perbaiki adalah hal paling berharga untuk diuji ulang.',
          },
        ],
      },
      {
        id: 'defense',
        title: 'Di ruang sidang',
        lead: 'Tiga panel, masing-masing bergulir sendiri: rencana di kiri, percakapan di tengah, bukti di kanan.',
        points: [
          {
            title: 'Rencana di depan Anda tetap tertutup',
            body: 'Anda dapat melihat pertanyaan mana yang sedang diuji dan mana yang selesai. Yang masih di depan tetap tertutup, karena sidang yang dapat dibaca lebih dulu bukan sidang.',
          },
          {
            title: 'Jawab dengan kata-kata Anda sendiri',
            body: 'Pendek dan tepat lebih baik daripada panjang. Penguji menilai apakah Anda dapat mempertahankan poinnya, bukan apakah Anda hafal isi bab.',
          },
          {
            title: 'Pertanyaan berakhir, bukan berputar',
            body: 'Satu pertanyaan memberi paling banyak dua pendalaman dan satu kesempatan klarifikasi. Batas itu ditegakkan di kode, bukan diminta pada model, sehingga pengujian tidak bisa mengitari satu poin sampai Anda menyerah.',
          },
          {
            title: 'Tidak ada yang bergantung pada tab ini',
            body: 'Setiap giliran ditulis ke penyimpanan begitu dinilai. Tutup tab di tengah sidang, kembali besok dari perangkat lain, dan sesinya dilanjutkan dari pertanyaan tempatnya berhenti.',
          },
        ],
      },
      {
        id: 'voice',
        title: 'Berbicara dan mendengarkan',
        lead: 'Anda dapat menjawab dengan suara, dan penguji dapat membacakan pertanyaannya. Sidang sungguhan itu lisan, dan berlatih dalam diam melatih hal yang salah.',
        points: [
          {
            title: 'Menjawab dengan suara',
            body: 'Mikrofon merekam, lalu transkripnya ditaruh di kotak jawaban untuk Anda baca. Ia tidak terkirim sampai Anda mengirimnya, karena transkrip sidang adalah catatan permanen dan kata yang salah dengar harus dapat diperbaiki sebelum menjadi bagian darinya.',
          },
          {
            title: 'Mendengarkan penguji',
            body: 'Setiap giliran penguji dapat dibacakan, dan sakelar di bilah atas membacakan tiap pertanyaan baru begitu muncul. Suaranya membacakan teks yang sudah ada di transkrip, bukan generasi kedua darinya.',
          },
          {
            title: 'Suara tidak mengubah apa pun di bawahnya',
            body: 'Jawaban lisan menempuh jalur yang sama dengan jawaban tertulis dan tunduk pada aturan yang persis sama. Suara adalah jalan masuk dan jalan keluar, bukan mode terpisah dengan perilakunya sendiri.',
          },
        ],
      },
      {
        id: 'report',
        title: 'Laporan sesi',
        lead: 'Disusun dari transkrip, bukan dari kesan baru atasnya.',
        points: [
          {
            title: 'Yang bertahan',
            body: 'Poin yang dicatat penguji sebagai berhasil dipertahankan selama sesi, dan dikembalikan ke laporan jika ringkasannya mencoba menghilangkannya. Laporan yang mengatakan tidak ada satu pun yang bertahan adalah laporan yang juga tidak akan Anda percaya soal kelemahan Anda.',
          },
          {
            title: 'Yang masih terbuka',
            body: 'Setiap poin yang tercatat sebagai celah, digambarkan sebagai celah dan tidak pernah sebagai solusinya. Diberi tahu apa yang harus dikatakan akan menggugurkan seluruh latihannya.',
          },
          {
            title: 'Pola untuk sesi berikutnya',
            body: 'Kebiasaan di balik celah-celah itu. Tempelkan ke kolom kelemahan yang belum selesai saat memulai sesi berikutnya, dan poin itu akan diuji lebih dulu.',
          },
        ],
      },
      {
        id: 'citation',
        title: 'Memeriksa sitasi',
        lead: 'Alat terpisah, untuk pertanyaan yang berbeda: apakah sumber ini benar-benar memuat kalimat yang Anda sitasikan padanya?',
        points: [
          {
            title: 'Mengapa DOI yang resolve tidak cukup',
            body: 'DOI membuktikan makalahnya ada. Itu tidak membuktikan makalahnya mengatakan apa yang Anda atributkan padanya, dan kemiripan topik lolos dari semua pemeriksaan mekanis yang pernah ditulis.',
          },
          {
            title: 'Apa yang dibutuhkannya',
            body: 'Klaim persis seperti tertulis di naskah Anda, dan teks sumbernya, biasanya abstrak atau bagian yang Anda sitasikan. Penilaiannya tidak boleh bersandar pada apa pun selain itu, dan itulah yang membuatnya dapat diperiksa.',
          },
          {
            title: 'Ia bertanya, bukan menuduh',
            body: 'Vonis negatif wajib disertai pertanyaan untuk Anda, atau vonisnya turun menjadi tidak dapat dipastikan. Menandai sitasi seseorang salah tanpa jalan untuk menjawab adalah tuduhan, bukan telaah.',
          },
        ],
      },
      {
        id: 'integrity',
        title: 'Yang tidak akan dilakukannya',
        lead: 'Semuanya ditegakkan di kode, bukan diminta lewat prompt, sehingga model tidak bisa memutuskan sebaliknya di hari yang buruk.',
        points: [
          {
            title: 'Tidak akan mengutip kalimat yang tidak Anda tulis',
            body: 'Setiap temuan wajib mengutip naskah Anda kata demi kata, dan setiap kutipan dicocokkan kembali ke teks Anda. Temuan yang kutipannya tidak ditemukan di sana dibuang, bukan ditampilkan, karena temuan atas kalimat yang tidak pernah Anda tulis adalah tuduhan.',
          },
          {
            title: 'Tidak akan mencatat celah tanpa memberi peringatan lebih dulu',
            body: 'Sebuah poin tidak dapat dicatat sebagai belum terjawab sebelum Anda diberi setidaknya satu kesempatan untuk menjelaskannya.',
          },
          {
            title: 'Tidak akan menilai mutu riset Anda',
            body: 'Tidak ada skor dan tidak ada batas lulus. Severity menggambarkan seberapa keras penguji biasanya menekan, dan itu pernyataan tentang penguji, bukan tentang mutu pekerjaan Anda.',
          },
          {
            title: 'Tidak akan menimpa model diam-diam',
            body: 'Ketika aturan sesi menggantikan keputusan model, penggantian itu ditampilkan kepada Anda di transkrip, bukan dijalankan di luar penglihatan.',
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
    signedInAs: 'Masuk sebagai',
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
