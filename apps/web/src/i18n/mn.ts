import type { CategoryId, LockedPackId, Result } from '@khuuramch/game-core';
import { shellCopy } from './mn-shell';

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
    title: 'Тохиргоо',
    mode: 'Тоглох горим',
    categories: 'Ангилал',
    imposters: 'Хуурамчийн тоо',
    impostersAuto: 'Авто',
    impostersAutoHint: '3–6 хүнд 1, 7–12 хүнд 2',
    impostersFixed: (n: number) => `${n} хуурамч`,
    timers: 'Хурд',
    timerPresets: { calm: 'Тайван', normal: 'Энгийн', fast: 'Хурдан' },
    turnTimer: 'Ээлж бүрт цаг',
    categoryHint: 'Хуурамчид ангиллыг нь харуулах',
    locked: 'Удахгүй',
    lockedLabel: (name: string) => `${name}, удахгүй нээгдэнэ`,
    needCategory: 'Дор хаяж нэг ангилал сонго',
    start: 'Эхлүүлэх',
    save: 'Хадгалах',
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
  } satisfies Record<CategoryId | LockedPackId, string>,

  premium: {
    title: (name: string) => name,
    body: 'Удахгүй нээгдэнэ. Хүлээлгийн жагсаалтад нэгдэх үү?',
    interested: 'Сонирхож байна',
    thanks: 'Баярлалаа! Сонирхлыг чинь тэмдэглэлээ.',
  },

  profile: {
    title: 'Чи хэн бэ?',
    nickname: 'Нэр',
    nicknamePlaceholder: 'Жишээ нь: Бат',
    nicknameHint: '1–12 тэмдэгт',
    nicknameTooLong: 'Нэр 12 тэмдэгтээс урт байна',
    nameChars: 'Нэрэнд зөвхөн үсэг, тоо ашиглаарай',
    nameProfane: 'Өөр нэр сонгоорой',
    pickAnimal: 'Амьтнаа сонго',
    taken: 'Сонгосон',
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

  create: {
    title: 'Өрөө үүсгэх',
    creating: 'Өрөө үүсгэж байна…',
  },

  join: {
    title: 'Тоглоомд нэгдэх',
    submit: 'Нэгдэх',
    joining: 'Нэгдэж байна…',
    gameRunning: 'Тоглолт явагдаж байна. Нэгдвэл дараагийн тоглолтод орно.',
    full: 'Өрөө дүүрсэн байна. 12-оос олон хүн тоглох боломжгүй.',
  },

  room: {
    label: 'Өрөө',
    notFoundTitle: 'Өрөө олдсонгүй',
    notFoundBody: 'Код буруу байна, эсвэл өрөөний хугацаа дууссан.',
    expired: 'Өрөөний хугацаа дууссан. Шинэ өрөө нээгээрэй.',
    kicked: 'Хөтлөгч чамайг өрөөнөөс гаргалаа.',
    home: shellCopy.home,
    leave: 'Гарах',
  },

  lobby: {
    shareTitle: 'Найзууд QR-ыг уншуулна',
    shareHint: (url: string) => `эсвэл ${url} хаягаар орж кодоо оруулна`,
    codeLabel: 'Өрөөний код',
    players: (n: number) => `${n} тоглогч`,
    needPlayers: '3+ тоглогч хэрэгтэй',
    ready: 'Бэлэн',
    start: 'Тоглоом эхлүүлэх',
    waitingForHost: 'Хөтлөгчийг хүлээж байна',
    hostWillStart: (name: string) => `${name} тоглоомыг эхлүүлнэ`,
    host: 'Хөтлөгч',
    you: 'Чи',
    eliminated: 'Хасагдсан',
    kick: (name: string) => `${name}-г гаргах`,
    tvScreen: 'ТВ дэлгэц',
    tvHint: (url: string) => `Том дэлгэц дээр ${url} нээгээрэй`,
    voided: 'Хуурамч гарсан тул тоглолт хүчингүй боллоо. Оноо тооцогдсонгүй.',
    rules: 'Дүрэм',
  },

  spectator: {
    title: 'Дараагийн тоглолтод орно',
    body: 'Одоогийн тоглолтыг хажуунаас нь харж бай.',
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
    waitingTitle: 'Бусдыгаа хүлээж байна',
    force: 'Үргэлжлүүлэх',
    forceHint: 'Зарим нь картаа хараахан хараагүй байна',
    peek: 'Үгээ дахин харах',
  },

  turn: {
    yourTurn: 'ЧИНИЙ ЭЭЛЖ',
    yourTurnHint: 'Нэг үг эсвэл богино хэллэг хэл.',
    done: 'Дууслаа',
    speaking: (name: string) => `${name} ярьж байна`,
    lap: (current: number, total: number) => `${current}/${total}`,
    lapLabel: 'Тойрог',
    next: 'Дараагийнх',
    upNext: (name: string) => `Дараа нь: ${name}`,
    order: 'Ярих дараалал',
  },

  timer: {
    seconds: 'сек',
    secondsLeft: (n: number) => `${n} секунд үлдлээ`,
  },

  discussion: {
    prompt: 'Хэлэлцээрэй!',
    hint: 'Хэн хачин үг хэлэв? Хэнийх хэт ерөнхий байв?',
    toVoting: 'Санал хураалт руу',
  },

  voting: {
    title: 'Хэн нь хуурамч вэ?',
    pick: 'Нэг хүнийг сонгоод санал өг',
    cast: 'Санал өгөх',
    progress: (done: number, total: number) => `${done}/${total} санал өгсөн`,
    selected: 'Сонгосон',
    locked: 'Санал өглөө',
    lockedHint: 'Бусдыг хүлээж байна',
    revote: 'Тэнцлээ! Дахин санал өг',
    revoteHint: 'Зөвхөн тэнцсэн хүмүүсээс сонгоно',
    watching: 'Чи хасагдсан. Санал хураалтыг харж байна.',
    notVoted: 'Санал өгөөгүй',
  },

  eliminated: {
    title: 'Чи хасагдсан',
    body: 'Бусдаа ажиглаарай. Үгээ битгий хэлээрэй!',
  },

  reveal: {
    imposter: 'ХУУРАМЧ!',
    civilian: 'ЭНГИЙН',
    tie: 'ТЭНЦЛЭЭ',
    tieHint: 'Дахин санал хураана',
    nobody: 'Хэн ч хасагдсангүй',
    noVotes: 'Хэн ч санал өгсөнгүй',
    counting: 'Санал тоолж байна…',
    eliminated: (name: string) => `${name} хасагдлаа`,
    votes: (n: number) => `${n} санал`,
  },

  guess: {
    waiting: 'Хуурамч таамаглаж байна…',
    guessing: (name: string) => `${name} энгийнүүдийн үгийг таах гэж байна`,
    title: 'Сүүлийн боломж!',
    pick: 'Энгийнүүдийн үг аль нь вэ?',
    submit: 'Таамаглах',
    hintA: 'Энгийнүүдийн үгийг тааж чадвал чи хожно.',
    hintB: 'Энгийнүүдийн үгийг тааж чадвал +2 оноо.',
    correct: 'Зөв таалаа!',
    wrong: 'Буруу таалаа',
    timeUp: 'Цаг дууслаа',
    guesserCorrect: (name: string) => `${name} зөв таалаа`,
    guesserWrong: (name: string) => `${name} таасангүй`,
  },

  result: {
    civiliansWin: 'Энгийнүүд яллаа!',
    impostersWin: 'Хуурамч яллаа!',
    word: 'Нууц үг',
    civilianWord: 'Энгийнүүдийн үг',
    imposterWord: 'Хуурамчийн үг',
    imposters: 'Хуурамч',
    showScores: 'Оноо харах',
    roundPoints: (n: number) => `+${n}`,
    reasons: {
      'imposter-hidden': 'Хуурамчийг олж чадсангүй',
      'no-elimination': 'Хэн ч хасагдсангүй',
      'guessed-word': 'Хуурамч үгийг таалаа',
      'missed-word': 'Хуурамч үгийг таасангүй',
      'all-imposters-out': 'Бүх хуурамчийг оллоо',
      'imposters-outnumber': 'Хуурамч олонх боллоо',
      stalemate: 'Хоёр удаа дараалан хэн ч хасагдсангүй',
    } satisfies Record<Result['reason'], string>,
    replay: 'Дахин тоглох',
    leave: 'Гарах',
    points: 'оноо',
    thisGame: 'Энэ тоглолтод',
    scoreboard: 'Онооны самбар',
    waitingHost: 'Хөтлөгч дахин эхлүүлэхийг хүлээж байна',
    waitingScores: (name: string) => `${name} онооны самбарыг нээнэ`,
    gamesPlayed: (n: number) => `${n} тоглолт`,
    titles: {
      liar: 'Шилдэг худалч',
      detective: 'Мөрдөгч',
      victim: 'Гэм буруугүй хохирогч',
    },
  },

  tv: {
    title: 'ТВ дэлгэц',
    scan: 'Утсаараа QR уншуулаад нэгдээрэй',
    roleReveal: 'Картаа дарж байгаад хар',
    confirmed: (done: number, total: number) => `${done}/${total} бэлэн`,
    secretsHidden: 'Нууц үг энд хэзээ ч харагдахгүй',
    mute: 'Дуу хаах',
    unmute: 'Дуу нээх',
  },

  rules: {
    title: 'Дүрэм',
    intro: '30 секундэд уншина.',
    steps: [
      {
        title: 'Өрөө нээ',
        body: 'Нэг хүн өрөө үүсгэнэ. Бусад нь QR уншуулж, утсан дээрээ нэгдэнэ. 3–12 хүн.',
      },
      {
        title: 'Картаа нууцаар хар',
        body: 'Бүгд нэг үг авна, хуурамч нь үг авахгүй эсвэл өөр үг авна. Дарж байж л харна.',
      },
      {
        title: 'Нэг үгээр тайлбарла',
        body: 'Ээлжээрээ үгээ шууд хэлэлгүй нэг үг эсвэл богино хэллэг хэлнэ. Хуурамч таах гэж оролдоно.',
      },
      {
        title: 'Санал өгч ил гарга',
        body: 'Хэлэлцээд хуурамчийг сонгоно. Баригдсан хуурамч үгийг тааж чадвал ялна.',
      },
    ],
    play: 'Тоглох',
    modes: 'Хоёр горим',
    scoring: 'Оноо',
    points: [
      'Хуурамчийг зөв барьсан санал: +1',
      'Баригдалгүй үлдсэн хуурамч: +3',
      'Баригдсан хуурамч үгийг таавал: +2',
      'Энгийнүүд хожвол үлдсэн энгийн бүрт: +1',
    ],
    firstTime: 'Анх удаа тоглож байна уу?',
    skip: 'Алгасах',
    next: 'Дараах',
    gotIt: 'Ойлголоо',
    step: (n: number, total: number) => `${n}/${total}`,
  },

  admin: {
    title: 'Статистик',
    secret: 'Админ нууц үг',
    load: 'Харах',
    denied: 'Нууц үг буруу байна',
    unavailable: 'Админ хэсэг идэвхгүй байна',
    roomsCreated: 'Нээгдсэн өрөө',
    gamesStarted: 'Эхэлсэн тоглолт',
    averagePlayers: 'Дундаж тоглогч',
    replayRate: 'Дахин тоглосон өрөө',
    gamesPerDay: 'Өдөр бүрийн тоглолт',
    modes: 'Горим',
    topCategories: 'Их тоглогдсон ангилал',
    winners: 'Ялагч',
    packInterest: 'Түгжээтэй багцын сонирхол',
    noData: 'Одоохондоо өгөгдөл алга',
  },

  notFound: {
    title: 'Ийм хуудас алга',
    body: 'Хаяг буруу байж магадгүй. Нүүр хуудаснаас дахин эхлээрэй.',
  },

  errorPage: {
    title: shellCopy.errorTitle,
    body: shellCopy.errorBody,
  },

  connection: {
    lost: 'Холболт тасарлаа, дахин холбогдож байна…',
    back: 'Холбогдлоо',
    connecting: 'Холбогдож байна…',
    timeout: 'Сервер хариу өгсөнгүй. Дахин оролдоорой.',
    roomNotFound: 'Ийм кодтой өрөө олдсонгүй',
  },

  common: {
    close: 'Хаах',
    back: 'Буцах',
    cancel: 'Болих',
    loading: 'Ачаалж байна…',
    retry: shellCopy.retry,
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
