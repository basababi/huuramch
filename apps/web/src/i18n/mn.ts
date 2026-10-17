/**
 * Every user-facing string lives here (CLAUDE.md §5). Informal "чи", short, playful.
 * Add `en.ts` with the same shape later; components only read through this object.
 */
export const mn = {
  app: {
    name: 'ХУУРАМЧ',
    tagline: 'Хэн нь хуурамч вэ? Үгнээс нь барь.',
    description: 'Найзуудтайгаа нэг өрөөнд, утас бүр дээрээ тоглох монгол party тоглоом.',
  },

  home: {
    create: 'Өрөө үүсгэх',
    join: 'Нэгдэх',
    enter: 'Орох',
    rules: 'Дүрэм',
    codeLabel: 'Өрөөний код',
    codeHint: 'Хөтлөгчийн дэлгэц дээрх 4 оронтой код',
  },

  theme: {
    label: 'Өнгөний горим',
    auto: 'Авто',
    dark: 'Харанхуй',
    light: 'Гэгээтэй',
  },

  modes: {
    A: {
      title: 'Үггүй хуурамч',
      blurb: 'Хуурамч үгийг мэдэхгүй, зөвхөн ангиллыг нь мэднэ.',
    },
    B: {
      title: 'Өөр үгтэй хуурамч',
      blurb: 'Хуурамч өөр үгтэй. Өөрөө ч үүнийгээ мэдэхгүй.',
    },
  },

  settings: {
    mode: 'Тоглох горим',
    categories: 'Ангилал',
    imposters: 'Хуурамчийн тоо',
    timers: 'Хурд',
    timerPresets: { calm: 'Тайван', normal: 'Энгийн', fast: 'Хурдан' },
    locked: 'Удахгүй',
    lockedLabel: (name: string) => `${name}, удахгүй нээгдэнэ`,
    start: 'Эхлүүлэх',
    decrease: 'Цөөрүүлэх',
    increase: 'Нэмэх',
  },

  categories: {
    food: 'Монгол хоол',
    places: 'Газар орон',
    animals: 'Амьтан',
    daily: 'Өдөр тутам',
    arts: 'Хөгжим ба урлаг',
    sports: 'Спорт ба тоглоом',
    student: 'Оюутны амьдрал',
    kpop: 'K-pop ба аниме',
    singers: 'Монгол дуучид',
    tsagaanSar: 'Цагаан сар гэр бүл',
    night: '18+ шөнийн цэнгээн',
  },

  profile: {
    nickname: 'Нэр',
    nicknameHint: '1–12 тэмдэгт',
    nicknameTooLong: 'Нэр 12 тэмдэгтээс урт байна',
    pickAnimal: 'Амьтнаа сонго',
  },

  animals: {
    temee: 'Тэмээ',
    mori: 'Морь',
    khoni: 'Хонь',
    yamaa: 'Ямаа',
    ukher: 'Үхэр',
    sarlag: 'Сарлаг',
    uneg: 'Үнэг',
    chono: 'Чоно',
    tarvaga: 'Тарвага',
    irves: 'Ирвэс',
    shonkhor: 'Шонхор',
    burged: 'Бүргэд',
  },

  lobby: {
    needPlayers: '3+ тоглогч хэрэгтэй',
    start: 'Тоглоом эхлүүлэх',
    waitingForHost: 'Хөтлөгчийг хүлээж байна',
    hostWillStart: (name: string) => `${name} тоглоомыг эхлүүлнэ`,
    host: 'Хөтлөгч',
    eliminated: 'Хасагдсан',
  },

  roleCard: {
    holdToSee: 'Дарж байгаад хар',
    releaseToHide: 'Тавихад нуугдана',
    gotIt: 'Ойлголоо',
    lookFirst: 'Эхлээд картаа хар',
    secretWord: 'Нууц үг',
    yourWord: 'Чиний үг',
    noWord: 'Чамд үг алга',
    imposter: 'ЧИ ХУУРАМЧ',
    imposterLines: ['ЧИ', 'ХУУРАМЧ'],
    category: 'Ангилал',
    categoryHidden: 'Ангилал нууц. Сонсоод таа.',
    hiddenCard: 'Нууц карт',
  },

  turn: {
    yourTurn: 'ЧИНИЙ ЭЭЛЖ',
    yourTurnHint: 'Нэг үг эсвэл богино хэллэг хэл.',
    done: 'Дууслаа',
    speaking: (name: string) => `${name} ярьж байна`,
    lap: (current: number, total: number) => `${current}/${total}`,
    lapLabel: 'Тойрог',
  },

  timer: {
    seconds: 'сек',
    secondsLeft: (n: number) => `${n} секунд үлдлээ`,
  },

  discussion: {
    prompt: 'Хэлэлцээрэй!',
    toVoting: 'Санал хураалт руу',
  },

  voting: {
    title: 'Хэн нь хуурамч вэ?',
    cast: 'Санал өгөх',
    progress: (done: number, total: number) => `${done}/${total} санал өгсөн`,
    selected: 'Сонгосон',
  },

  reveal: {
    imposter: 'ХУУРАМЧ!',
    civilian: 'ЭНГИЙН',
  },

  guess: {
    waiting: 'Хуурамч таамаглаж байна…',
  },

  result: {
    civiliansWin: 'Энгийнүүд яллаа!',
    impostersWin: 'Хуурамч яллаа!',
    replay: 'Дахин тоглох',
    leave: 'Гарах',
    points: 'оноо',
    titles: {
      liar: 'Шилдэг худалч',
      detective: 'Мөрдөгч',
      victim: 'Гэм буруугүй хохирогч',
    },
  },

  connection: {
    lost: 'Холболт тасарлаа, дахин холбогдож байна…',
    back: 'Холбогдлоо',
    roomNotFound: 'Ийм кодтой өрөө олдсонгүй',
  },

  common: {
    close: 'Хаах',
    back: 'Буцах',
    replayDemo: 'Дахин үзүүлэх',
    secondsShort: (n: number) => `${n}с`,
    sound: 'Дуу',
  },

  /** Internal design sandbox (/dev/ui, /dev/type). Not shown to players. */
  dev: {
    uiTitle: 'Дизайн систем',
    uiIntro: 'Milestone 1: токен, үсэг, компонент. Тоглоомын логик алга.',
    typeTitle: 'Үсгийн шалгалт',
    typeIntro: 'Ө ө Ү ү үсэг жин бүр дээр зөв харагдах ёстой.',
    sections: {
      palette: 'Өнгө',
      type: 'Үсэг',
      buttons: 'Товчлуур',
      forms: 'Тохиргоо ба оролт',
      avatars: 'Аватар',
      lobby: 'Лобби',
      voting: 'Санал хураалт',
      roleCard: 'Үүргийн карт',
      roleFaces: 'Картын нүүр',
      timer: 'Цаг',
      stamp: 'Тамга',
      turn: 'Чиний ээлж',
      results: 'Үр дүн',
      states: 'Төлөв',
      ornament: 'Хээ',
    },
    addPlayer: 'Тоглогч нэмэх',
    removePlayer: 'Хасах',
    eliminatedRow: 'Хасагдсан төлөв',
    pressed: 'Дарагдсан',
    disabled: 'Идэвхгүй',
    busy: 'Ачаалж байна',
    sampleWord: 'Хуушуур',
    /** CLAUDE.md §6.3 glyph test line. */
    glyphLine: 'Өнөөдөр Үүрийн гэгээ ӨӨ үү Хуушуур Бууз',
    shortLine: 'Өнөөдөр Үүрийн гэгээ',
    glyphPass: 'Байна',
    glyphFail: 'Алга',
    glyphChecking: 'Шалгаж байна…',
    rejected: 'татгалзсан',
    tabular: 'Тэгш оронтой тоо',
    contrast: (ratio: string) => `Контраст ${ratio}:1`,
    paletteUse: {
      ink: 'Хүрээ, текст, хатуу сүүдэр',
      paper: 'Гэгээтэй дэвсгэр',
      tenger: 'Үндсэн үйлдэл, энгийн',
      al: 'Хуурамч, аюул',
      alt: 'Чиний ээлж, цаг',
      nogoon: 'Амжилт, бэлэн',
      tsenher: 'Чип, хоёрдогч гадаргуу',
      night: 'Харанхуй дэвсгэр',
    },
    seatColors: 'Тоглогчийн 12 өнгө',
    sizes: 'Хэмжээ',
  },
} as const;

export type Messages = typeof mn;
