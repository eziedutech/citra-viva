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
  },

  sidebar: {
    plan: 'Examination plan',
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
  },

  sidebar: {
    plan: 'Rencana pengujian',
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
