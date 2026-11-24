/**
 * Builds data/import/gremu-poster-2026-11.csv from the two GREMU PARTS posters the owner sent
 * on 2026-11-24. Run: node scripts/build-poster-import.mjs
 *
 * Source of truth: poster 1 (its photos match its captions). Poster 2 adds 3 numbers that are
 * not on poster 1. Where the posters disagree, the poster-2 caption is kept in CONFLICTS
 * (written to data/import/gremu-poster-2026-11-conflicts.md) for the owner to resolve.
 *
 * Prices are PLACEHOLDERS (random per part type, at the owner's request). No stock and no fitment
 * rows are set. Every product is imported HIDDEN (published = no) until the owner confirms the
 * number, name and real price in the admin area.
 */
import { writeFileSync } from "node:fs";

// --publish: owner asked on 2026-11-24 to publish all items now (with placeholder prices).
const PUBLISH = process.argv.includes("--publish");

const TAIL = {
  ru: (oem) => `Номер детали: ${oem}. Применимость к конкретному автомобилю пока не подтверждена — перед заказом менеджер проверит её по VIN-коду.`,
  uz: (oem) => `Detal raqami: ${oem}. Muayyan avtomobilga mosligi hali tasdiqlanmagan — buyurtmadan oldin menejer uni VIN-kod boʻyicha tekshiradi.`,
};

/** Part types: titles, category, and a factual description of what the part does. */
const T = {
  engine_mount: {
    ru: "Подушка двигателя", uz: "Dvigatel yostigʻi", cat: "engine",
    dru: "Подушка (опора) двигателя удерживает силовой агрегат на кузове и гасит вибрации. Изношенная опора проявляется стуком при трогании и переключении передач, повышенной вибрацией на холостом ходу и в салоне.",
    duz: "Dvigatel yostigʻi (tayanchi) kuch agregatini kuzovda ushlab turadi va tebranishlarni soʻndiradi. Yeyilgan tayanch joyidan qoʻzgʻalishda va uzatma almashtirishda taqillash, salt yurishda va salonda kuchli tebranish bilan namoyon boʻladi.",
  },
  belt_tensioner: {
    ru: "Натяжитель ремня", uz: "Tasma tarangligichi", cat: "engine",
    dru: "Натяжитель приводного ремня поддерживает нужное натяжение ремня навесного оборудования. Неисправность проявляется свистом ремня, шумом или вибрацией в районе ремня и ускоренным износом ремня.",
    duz: "Yuritma tasmasi tarangligichi osma uskunalar tasmasining kerakli tarangligini saqlaydi. Nosozlik tasmaning hushtak chalishi, tasma atrofida shovqin yoki tebranish va tasmaning tez yeyilishi bilan namoyon boʻladi.",
  },
  tensioner_pulley: {
    ru: "Ролик натяжителя", uz: "Taranglovchi rolik", cat: "engine",
    dru: "Натяжной (обводной) ролик направляет и натягивает приводной ремень. Изношенный подшипник ролика шумит, гудит или свистит, а люфт ролика ускоряет износ ремня. Ролик обычно меняют вместе с ремнём.",
    duz: "Taranglovchi (aylanma) rolik yuritma tasmasini yoʻnaltiradi va taranglaydi. Rolikning yeyilgan podshipnigi shovqin, gʻuvillash yoki hushtak chiqaradi, rolikdagi lyuft esa tasmaning yeyilishini tezlashtiradi. Rolik odatda tasma bilan birga almashtiriladi.",
  },
  thermostat: {
    ru: "Термостат", uz: "Termostat", cat: "cooling",
    dru: "Термостат регулирует циркуляцию охлаждающей жидкости и поддерживает рабочую температуру двигателя. Признаки неисправности: долгий прогрев или перегрев двигателя, плохая работа печки, скачки стрелки температуры.",
    duz: "Termostat sovutish suyuqligining aylanishini boshqaradi va dvigatelning ishchi haroratini ushlab turadi. Nosozlik belgilari: dvigatelning uzoq qizishi yoki qizib ketishi, isitgichning yomon ishlashi, harorat koʻrsatkichining sakrashi.",
  },
  water_pump: {
    ru: "Водяной насос (помпа)", uz: "Suv nasosi (pompa)", cat: "cooling",
    dru: "Водяной насос прокачивает охлаждающую жидкость по системе охлаждения двигателя. Признаки износа: подтёки антифриза, шум подшипника, перегрев двигателя. При замене ремня ГРМ помпу часто меняют вместе с ним.",
    duz: "Suv nasosi sovutish suyuqligini dvigatelni sovutish tizimi boʻylab haydaydi. Yeyilish belgilari: antifriz oqishi, podshipnik shovqini, dvigatelning qizib ketishi. GRM tasmasi almashtirilganda pompa koʻpincha u bilan birga almashtiriladi.",
  },
  ball_joint: {
    ru: "Шаровая опора", uz: "Sharli tayanch", cat: "suspension",
    dru: "Шаровая опора соединяет рычаг подвески с поворотным кулаком и позволяет колесу поворачиваться и ходить вверх-вниз. Изношенная опора даёт стук на неровностях, люфт колеса и неравномерный износ шин. Это влияет на безопасность, поэтому откладывать замену нельзя.",
    duz: "Sharli tayanch osma richagini burilish mushti bilan bogʻlaydi va gʻildirakning burilishi hamda yuqori-pastga harakatlanishiga imkon beradi. Yeyilgan tayanch notekisliklarda taqillash, gʻildirak lyufti va shinalarning notekis yeyilishiga olib keladi. Bu xavfsizlikka taʼsir qiladi, shuning uchun almashtirishni kechiktirib boʻlmaydi.",
  },
  stabilizer_link: {
    ru: "Стойка стабилизатора", uz: "Stabilizator ustuni", cat: "suspension",
    dru: "Стойка стабилизатора соединяет стабилизатор поперечной устойчивости с подвеской и уменьшает крен кузова в поворотах. Изношенная стойка стучит на неровностях и при проезде искусственных неровностей.",
    duz: "Stabilizator ustuni koʻndalang turgʻunlik stabilizatorini osma bilan bogʻlaydi va burilishlarda kuzovning ogʻishini kamaytiradi. Yeyilgan ustun notekisliklarda va sunʼiy toʻsiqlardan oʻtishda taqillaydi.",
  },
  control_arm: {
    ru: "Рычаг подвески", uz: "Osma richagi", cat: "suspension",
    dru: "Рычаг подвески удерживает колесо в правильном положении и передаёт нагрузки на кузов. Изношенные сайлентблоки или деформация рычага проявляются стуком, уводом автомобиля в сторону и нарушением развала-схождения. После замены рекомендуется проверить углы установки колёс.",
    duz: "Osma richagi gʻildirakni toʻgʻri holatda ushlab turadi va yuklamalarni kuzovga uzatadi. Yeyilgan saylentbloklar yoki richag deformatsiyasi taqillash, avtomobilning yon tomonga tortishi va gʻildiraklar burchaklarining buzilishi bilan namoyon boʻladi. Almashtirishdan soʻng gʻildiraklarni oʻrnatish burchaklarini tekshirish tavsiya etiladi.",
  },
  wheel_hub: {
    ru: "Ступица колеса", uz: "Gʻildirak gupchagi", cat: "suspension",
    dru: "Ступица колеса с подшипником обеспечивает вращение колеса и крепление тормозного диска. Признаки износа: гул, нарастающий со скоростью, люфт колеса, нагрев ступицы.",
    duz: "Podshipnikli gʻildirak gupchagi gʻildirakning aylanishini va tormoz diskining mahkamlanishini taʼminlaydi. Yeyilish belgilari: tezlik bilan kuchayadigan gʻuvillash, gʻildirak lyufti, gupchakning qizishi.",
  },
  brake_disc: {
    ru: "Тормозной диск", uz: "Tormoz diski", cat: "brakes",
    dru: "Тормозной диск вместе с колодками замедляет колесо при торможении. Диск меняют при износе ниже минимальной толщины, биении (вибрация руля или педали при торможении), глубоких бороздах и трещинах. Диски меняют парой на одной оси.",
    duz: "Tormoz diski kolodkalar bilan birga tormozlashda gʻildirakni sekinlashtiradi. Disk minimal qalinlikdan pastga yeyilganda, urilish (tormozlashda rul yoki pedalning tebranishi), chuqur egatlar va yoriqlar paydo boʻlganda almashtiriladi. Disklar bir oʻqda juft qilib almashtiriladi.",
  },
  brake_pads: {
    ru: "Тормозные колодки", uz: "Tormoz kolodkalari", cat: "brakes",
    dru: "Тормозные колодки прижимаются к тормозному диску и останавливают автомобиль. Колодки меняют комплектом на одной оси, когда фрикционный слой изношен, появился скрип или писк при торможении или увеличился тормозной путь.",
    duz: "Tormoz kolodkalari tormoz diskiga siqiladi va avtomobilni toʻxtatadi. Kolodkalar bir oʻqda toʻplam holida almashtiriladi: friksion qatlam yeyilganda, tormozlashda gʻijirlash yoki chiyillash paydo boʻlganda yoki tormozlash masofasi uzayganda.",
  },
  brake_caliper: {
    ru: "Суппорт тормозной", uz: "Tormoz supporti", cat: "brakes",
    dru: "Тормозной суппорт прижимает колодки к диску при нажатии на педаль тормоза. Признаки неисправности: автомобиль уводит при торможении, неравномерный износ колодок, перегрев колеса, подтёки тормозной жидкости.",
    duz: "Tormoz supporti tormoz pedali bosilganda kolodkalarni diskka siqadi. Nosozlik belgilari: tormozlashda avtomobilning yon tomonga tortishi, kolodkalarning notekis yeyilishi, gʻildirakning qizib ketishi, tormoz suyuqligining oqishi.",
  },
  brake_hose: {
    ru: "Тормозной шланг", uz: "Tormoz shlangi", cat: "brakes",
    dru: "Тормозной шланг подаёт тормозную жидкость от магистрали к суппорту колеса. Шланг меняют при трещинах, вздутиях, подтёках или «мягкой» педали тормоза. После замены тормозную систему нужно прокачать.",
    duz: "Tormoz shlangi tormoz suyuqligini magistraldan gʻildirak supportiga yetkazadi. Shlang yoriqlar, boʻrtishlar, oqishlar paydo boʻlganda yoki tormoz pedali «yumshoq» boʻlib qolganda almashtiriladi. Almashtirishdan soʻng tormoz tizimini haydash kerak.",
  },
  abs_sensor: {
    ru: "Датчик ABS", uz: "ABS datchigi", cat: "brakes",
    dru: "Датчик ABS считывает скорость вращения колеса для антиблокировочной системы и системы стабилизации. При неисправности на панели загорается лампа ABS, а ABS и ESP могут отключаться.",
    duz: "ABS datchigi blokirovkaga qarshi tizim va barqarorlashtirish tizimi uchun gʻildirakning aylanish tezligini oʻlchaydi. Nosozlikda panelda ABS chirogʻi yonadi, ABS va ESP esa oʻchib qolishi mumkin.",
  },
  alternator: {
    ru: "Генератор", uz: "Generator", cat: "electrics",
    dru: "Генератор вырабатывает электричество во время работы двигателя и заряжает аккумулятор. Признаки неисправности: горит лампа зарядки, аккумулятор разряжается, фары светят тускло, шумят подшипники генератора.",
    duz: "Generator dvigatel ishlayotganda elektr energiyasi ishlab chiqaradi va akkumulyatorni zaryadlaydi. Nosozlik belgilari: zaryad chirogʻi yonib turadi, akkumulyator zaryadsizlanadi, faralar xira yonadi, generator podshipniklari shovqin qiladi.",
  },
  starter: {
    ru: "Стартер", uz: "Starter", cat: "electrics",
    dru: "Стартер раскручивает двигатель при запуске. Признаки неисправности: щелчки без проворота, медленное вращение при заряженном аккумуляторе, посторонний скрежет при пуске.",
    duz: "Starter ishga tushirishda dvigatelni aylantiradi. Nosozlik belgilari: aylanmasdan chiqillash, akkumulyator zaryadlangan boʻlsa ham sekin aylanish, ishga tushirishda begona gʻichirlash.",
  },
  air_filter: {
    ru: "Воздушный фильтр", uz: "Havo filtri", cat: "filters",
    dru: "Воздушный фильтр очищает воздух, поступающий в двигатель, от пыли и песка. Засорённый фильтр снижает мощность и повышает расход топлива. В пыльных условиях фильтр меняют чаще регламента.",
    duz: "Havo filtri dvigatelga kiradigan havoni chang va qumdan tozalaydi. Ifloslangan filtr quvvatni pasaytiradi va yoqilgʻi sarfini oshiradi. Changli sharoitda filtr reglamentdan koʻra tez-tez almashtiriladi.",
  },
  cabin_filter: {
    ru: "Салонный фильтр", uz: "Salon filtri", cat: "filters",
    dru: "Салонный фильтр очищает воздух, поступающий в салон через вентиляцию и кондиционер, от пыли и пыльцы. Засорённый фильтр ослабляет поток воздуха из дефлекторов, вызывает запотевание стёкол и неприятный запах.",
    duz: "Salon filtri ventilyatsiya va konditsioner orqali salonga kiradigan havoni chang va gulchangdan tozalaydi. Ifloslangan filtr deflektorlardan havo oqimini susaytiradi, oynalarning terlashi va yoqimsiz hidga sabab boʻladi.",
  },
  oil_filter: {
    ru: "Масляный фильтр", uz: "Moy filtri", cat: "filters",
    dru: "Масляный фильтр задерживает продукты износа и загрязнения в моторном масле. Его меняют при каждой замене масла по регламенту производителя автомобиля.",
    duz: "Moy filtri motor moyidagi yeyilish mahsulotlari va ifloslanishlarni ushlab qoladi. U avtomobil ishlab chiqaruvchisining reglamentiga koʻra har bir moy almashtirishda almashtiriladi.",
  },
  fuel_filter: {
    ru: "Топливный фильтр", uz: "Yoqilgʻi filtri", cat: "filters",
    dru: "Топливный фильтр защищает топливную систему и форсунки от грязи и воды в топливе. Засорённый фильтр вызывает провалы при разгоне, трудный запуск и потерю мощности.",
    duz: "Yoqilgʻi filtri yoqilgʻi tizimi va forsunkalarni yoqilgʻidagi kir va suvdan himoya qiladi. Ifloslangan filtr tezlanishda uzilishlar, qiyin ishga tushish va quvvat yoʻqolishiga olib keladi.",
  },
  spark_plug: {
    ru: "Свеча зажигания", uz: "Oʻt oldirish shami", cat: "electrics",
    dru: "Свеча зажигания воспламеняет топливно-воздушную смесь в цилиндре. Изношенные свечи вызывают пропуски зажигания, неровную работу двигателя, трудный запуск и повышенный расход. Свечи меняют комплектом по регламенту.",
    duz: "Oʻt oldirish shami silindrdagi yoqilgʻi-havo aralashmasini yondiradi. Yeyilgan shamlar oʻt oldirishda uzilishlar, dvigatelning notekis ishlashi, qiyin ishga tushish va sarfning oshishiga olib keladi. Shamlar reglament boʻyicha toʻplam holida almashtiriladi.",
  },
  ignition_coil: {
    ru: "Катушка зажигания", uz: "Oʻt oldirish gʻaltagi", cat: "electrics",
    dru: "Катушка зажигания преобразует напряжение бортовой сети в высокое напряжение для свечи. Неисправная катушка вызывает пропуски зажигания в одном цилиндре, неровную работу двигателя и горящую лампу Check Engine.",
    duz: "Oʻt oldirish gʻaltagi bort tarmogʻi kuchlanishini shamga beriladigan yuqori kuchlanishga aylantiradi. Nosoz gʻaltak bitta silindrda oʻt oldirish uzilishlari, dvigatelning notekis ishlashi va Check Engine chirogʻining yonishiga sabab boʻladi.",
  },
  alternator_belt: {
    ru: "Ремень генератора", uz: "Generator tasmasi", cat: "engine",
    dru: "Ремень генератора передаёт вращение от коленчатого вала к генератору и, в зависимости от двигателя, к другому навесному оборудованию. Ремень меняют при трещинах, расслоении, свисте и по регламенту.",
    duz: "Generator tasmasi tirsakli valdan generatorga va dvigatelga qarab boshqa osma uskunalarga aylanishni uzatadi. Tasma yoriqlar, qatlamlanish, hushtak paydo boʻlganda va reglament boʻyicha almashtiriladi.",
  },
  timing_belt: {
    ru: "Ремень ГРМ", uz: "GRM tasmasi", cat: "engine",
    dru: "Ремень ГРМ синхронизирует вращение коленчатого и распределительного валов. Его меняют строго по регламенту производителя: обрыв ремня может повредить двигатель. Вместе с ремнём обычно меняют ролики и натяжитель.",
    duz: "GRM tasmasi tirsakli val va taqsimlash valining aylanishini sinxronlashtiradi. U ishlab chiqaruvchi reglamentiga qatʼiy amal qilgan holda almashtiriladi: tasmaning uzilishi dvigatelga zarar yetkazishi mumkin. Tasma bilan birga odatda roliklar va tarangligich ham almashtiriladi.",
  },
  drive_belt: {
    ru: "Ремень приводной", uz: "Yuritma tasmasi", cat: "engine",
    dru: "Приводной ремень передаёт вращение от коленчатого вала к навесному оборудованию: генератору, насосу ГУР, компрессору кондиционера. Ремень меняют при трещинах, расслоении, свисте и по регламенту.",
    duz: "Yuritma tasmasi tirsakli valdan osma uskunalarga — generator, GUR nasosi va konditsioner kompressoriga aylanishni uzatadi. Tasma yoriqlar, qatlamlanish, hushtak paydo boʻlganda va reglament boʻyicha almashtiriladi.",
  },
  bracket: {
    ru: "Кронштейн", uz: "Kronshteyn", cat: "engine",
    dru: "Кронштейн — крепёжный элемент, на котором устанавливается узел или агрегат. Назначение и место установки этого кронштейна уточняйте у менеджера по номеру детали.",
    duz: "Kronshteyn — uzel yoki agregat oʻrnatiladigan mahkamlash elementi. Ushbu kronshteynning vazifasi va oʻrnatish joyini detal raqami boʻyicha menejerdan aniqlang.",
  },
  hose: {
    ru: "Шланг", uz: "Shlang", cat: "engine",
    dru: "Шланг для подачи рабочей жидкости. Назначение и место установки этого шланга уточняйте у менеджера по номеру детали.",
    duz: "Ishchi suyuqlikni yetkazish uchun shlang. Ushbu shlangning vazifasi va oʻrnatish joyini detal raqami boʻyicha menejerdan aniqlang.",
  },
};

// [number as printed, type] — poster 1 in reading order, then the 3 numbers only on poster 2.
const ITEMS = [
  ["51750-M6000", "engine_mount"], ["51730-L1000", "belt_tensioner"], ["23040-2E000", "thermostat"], ["23060-2E100", "thermostat"],
  ["21020-2E001", "water_pump"], ["21810-AA000", "tensioner_pulley"], ["21810-N9540", "belt_tensioner"], ["54651-P2000", "ball_joint"],
  ["54650-P2000", "ball_joint"], ["55367-S1CB0", "stabilizer_link"], ["35310-2S000", "control_arm"], ["35310-2S001", "control_arm"],
  ["35310-2S100", "control_arm"], ["21810-J9000", "wheel_hub"], ["54551-L1100", "brake_disc"], ["24410-2JTA2", "brake_pads"],
  ["55307-AA110", "brake_caliper"], ["56820-R0000", "brake_hose"], ["54584-S1000", "abs_sensor"], ["18871-11075", "alternator"],
  ["21830-N9620", "starter"], ["22441-3CGA1", "air_filter"], ["22442-3CGA2", "cabin_filter"], ["39210-2J001", "oil_filter"],
  ["27301-2M385", "fuel_filter"], ["21810-N9720", "spark_plug"], ["31112-C9100", "ignition_coil"], ["56500AA000", "alternator_belt"],
  ["57770S8600", "timing_belt"], ["56500-L1010", "drive_belt"], ["56500N9000", "drive_belt"], ["49500L2230", "brake_disc"],
  ["49501L2230", "brake_disc"], ["495L2L2200", "brake_pads"], ["495R2L2250", "brake_pads"], ["49501-AA100", "brake_pads"],
  ["49500-AA100", "brake_pads"], ["495L1-AA100", "brake_pads"], ["495R1-AA100", "brake_pads"], ["49500-N9160", "brake_pads"],
  ["49501-N9160", "brake_pads"], ["495L1-N9160", "brake_pads"], ["495R1-N9160", "brake_pads"], ["49500P2200", "brake_pads"],
  ["49501P2250", "brake_pads"], ["495R2P2250", "brake_pads"], ["495L2P2200", "brake_pads"],
  // only on poster 2
  ["31111-C9000", "bracket"], ["56540-L1000", "hose"], ["56540-P2000", "hose"],
];

// Poster-2 captions that contradict poster 1 (number → poster-2 caption).
const CONFLICTS = {
  "51750-M6000": "Подушка двигателя (на фото — цепь)",
  "18871-11075": "Топливный фильтр",
  "21830-N9620": "Топливный насос",
  "27301-2M385": "Лямбда-зонд",
  "21810-N9720": "Датчик коленвала",
  "31112-C9100": "Парктроник",
  "56500AA000": "Катушка зажигания",
  "57770S8600": "Зеркало боковое",
  "56500-L1010": "Щётка стеклоочистителя",
  "56820-R0000": "Датчик ABS",
  "54584-S1000": "Опора амортизатора",
  "56500N9000": "Тормозной диск",
  "49500L2230": "Колодки тормозные",
  "49501L2230": "Колодки тормозные",
  "49501-AA100": "Ремень генератора",
  "49500-AA100": "Ремень приводной",
  "495L1-AA100": "Ремень приводной",
  "495R1-AA100": "Ремень приводной",
  "49500-N9160": "Ремень генератора",
  "49501-N9160": "Шаровая опора",
  "495L1-N9160": "Шаровая опора",
  "495R1-N9160": "Шаровая опора",
  "49500P2200": "Рычаг подвески",
  "49501P2250": "Рычаг подвески",
  "495R2P2250": "Ременной шкив",
  "495L2P2200": "Ременной шкив",
};

const SLUG = {
  engine_mount: "engine-mount", belt_tensioner: "belt-tensioner", tensioner_pulley: "tensioner-pulley", thermostat: "thermostat",
  water_pump: "water-pump", ball_joint: "ball-joint", stabilizer_link: "stabilizer-link", control_arm: "control-arm", wheel_hub: "wheel-hub",
  brake_disc: "brake-disc", brake_pads: "brake-pads", brake_caliper: "brake-caliper", brake_hose: "brake-hose", abs_sensor: "abs-sensor",
  alternator: "alternator", starter: "starter", air_filter: "air-filter", cabin_filter: "cabin-filter", oil_filter: "oil-filter",
  fuel_filter: "fuel-filter", spark_plug: "spark-plug", ignition_coil: "ignition-coil", alternator_belt: "alternator-belt",
  timing_belt: "timing-belt", drive_belt: "drive-belt", bracket: "bracket", hose: "hose",
};

/**
 * PLACEHOLDER prices (UZS) requested by the owner on 2026-11-24 — random within a range per part
 * type, to be replaced in the admin area. Seeded by the part number, so rebuilding gives the same values.
 */
const PRICE_RANGE = {
  engine_mount: [350_000, 900_000], belt_tensioner: [250_000, 700_000], tensioner_pulley: [120_000, 350_000],
  thermostat: [150_000, 450_000], water_pump: [400_000, 1_100_000], ball_joint: [150_000, 400_000],
  stabilizer_link: [90_000, 250_000], control_arm: [450_000, 1_300_000], wheel_hub: [500_000, 1_400_000],
  brake_disc: [350_000, 900_000], brake_pads: [250_000, 650_000], brake_caliper: [900_000, 2_200_000],
  brake_hose: [90_000, 250_000], abs_sensor: [250_000, 700_000], alternator: [2_500_000, 5_500_000],
  starter: [1_800_000, 4_000_000], air_filter: [70_000, 180_000], cabin_filter: [60_000, 160_000],
  oil_filter: [40_000, 110_000], fuel_filter: [120_000, 350_000], spark_plug: [60_000, 180_000],
  ignition_coil: [350_000, 900_000], alternator_belt: [90_000, 250_000], timing_belt: [250_000, 600_000],
  drive_belt: [90_000, 250_000], bracket: [150_000, 450_000], hose: [80_000, 250_000],
};
function placeholderPrice(oem, type) {
  let h = 2166136261; // FNV-1a hash of the part number → stable pseudo-random value
  for (const ch of oem) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const [min, max] = PRICE_RANGE[type];
  return Math.round((min + (h / 2 ** 32) * (max - min)) / 1000) * 1000;
}

const cell = (v) => {
  const s = String(v ?? "");
  return /[";\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const header = ["sku", "slug", "title_ru", "title_uz", "category", "brand", "vehicle_make", "part_type", "price_uzs", "stock", "availability", "published", "oem", "description_ru", "description_uz", "fitments", "image"];
const seen = new Set();
const lines = [header.join(";")];
for (const [oem, type] of ITEMS) {
  if (seen.has(oem)) throw new Error(`duplicate ${oem}`);
  seen.add(oem);
  const t = T[type];
  const sku = oem.toUpperCase();
  const slug = `${SLUG[type]}-${oem.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  lines.push(
    [
      sku, slug, `${t.ru} ${oem}`, `${t.uz} ${oem}`, t.cat, "", "hyundai", "original", placeholderPrice(oem, type), "", "on_request", PUBLISH ? "yes" : "no", oem,
      `${t.dru}\n\n${TAIL.ru(oem)}`, `${t.duz}\n\n${TAIL.uz(oem)}`, "",
      // photo cut from the poster by scripts/cut-poster-photos.mjs
      `/products/${oem.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.webp`,
    ].map(cell).join(";"),
  );
}
writeFileSync("data/import/gremu-poster-2026-11.csv", "﻿" + lines.join("\r\n") + "\r\n");

const md = [
  "# Позиции с постеров GREMU PARTS — что нужно подтвердить",
  "",
  PUBLISH
    ? `Импортировано ${ITEMS.length} позиций, все **опубликованы** по просьбе владельца, наличие «под заказ», совместимость не указана.`
    : `Импортировано ${ITEMS.length} позиций, все **скрыты** (published = no), наличие «под заказ», совместимость не указана.`,
  "**Цены — случайные заглушки** в правдоподобном диапазоне для типа детали (по просьбе владельца). Замените их на настоящие в админке перед публикацией.",
  "Перед публикацией по каждой позиции нужны: правильное название, цена, наличие и применимость (модели и годы).",
  "",
  "## Номера, у которых на двух постерах разные названия",
  "",
  "На сайт заведено название с первого постера (там фото совпадает с подписью). Проверьте по каталогу поставщика.",
  "",
  "| Номер | Постер 1 (заведено) | Постер 2 |",
  "|---|---|---|",
  ...ITEMS.filter(([o]) => CONFLICTS[o]).map(([o, t]) => `| ${o} | ${T[t].ru} | ${CONFLICTS[o]} |`),
  "",
  "## Другие замечания",
  "",
  "- `56820-R0000` на первом постере стоит дважды (две карточки «Тормозной шланг») — заведён один раз.",
  "- `31111-C9000` (кронштейн), `56540-L1000` и `56540-P2000` (шланги) есть только на втором постере; их назначение по подписи неясно, в описании это сказано.",
  "- Марка авто у всех позиций проставлена «Hyundai» как заглушка — поле обязательно в карточке; укажите Kia там, где нужно.",
  "- Бренд производителя детали не указан: на постере написано «оригинальные», но производитель не назван.",
  "- Фото вырезаны из постеров (`RAW=1 node scripts/cut-poster-photos.mjs …`) и увеличены нейросетью Real-ESRGAN x4plus локально (модель othytenk/realesrgan-x4plus, fp16, через onnxruntime-node); фото генератора 18871-11075 — апскейл Higgsfield (оригинал в data/photos-ai/). Итог — 1200×900 webp в public/products/. Настоящие фото от поставщика всё равно лучше — замените их в админке (поле «Фото»).",
  "",
].join("\n");
writeFileSync("data/import/gremu-poster-2026-11-conflicts.md", md);
console.log(`rows: ${ITEMS.length}, conflicts: ${Object.keys(CONFLICTS).length}`);
