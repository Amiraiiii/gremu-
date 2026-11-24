import type { Locale } from "@/i18n/config";

/**
 * Editable content for the info pages. Sections marked `pending` describe terms the shop has
 * not confirmed yet — the UI labels them, and nothing here invents prices, deadlines,
 * guarantees or addresses. Replace the pending text once the owner confirms the terms.
 */
export type InfoSection = { heading: string; body: string[]; pending?: boolean };
export type InfoPage = { title: string; lead: string; sections: InfoSection[] };

export const INFO_SLUGS = ["delivery", "payment", "returns", "faq"] as const;
export type InfoSlug = (typeof INFO_SLUGS)[number];

const ru: Record<InfoSlug, InfoPage> = {
  delivery: {
    title: "Доставка и самовывоз",
    lead: "Как получить заказ. Доступные варианты показываются при оформлении — только те, что настроил магазин.",
    sections: [
      {
        heading: "Способы получения",
        body: ["Список способов доставки и самовывоза, их стоимость и сроки задаёт магазин. Они появятся на этой странице и при оформлении заказа после подтверждения."],
        pending: true,
      },
      {
        heading: "Регионы",
        body: ["Города и регионы Узбекистана, куда доставляются заказы, будут перечислены здесь после подтверждения магазином."],
        pending: true,
      },
      {
        heading: "Самовывоз",
        body: ["Адрес и график пункта самовывоза будут опубликованы после подтверждения. До этого уточните у менеджера."],
        pending: true,
      },
      {
        heading: "Перед отправкой",
        body: [
          "Менеджер может связаться с вами, чтобы подтвердить состав заказа и совместимость деталей с вашим автомобилем.",
        ],
      },
    ],
  },
  payment: {
    title: "Оплата",
    lead: "Как оплатить заказ и что происходит с вашими платёжными данными.",
    sections: [
      {
        heading: "Способы оплаты",
        body: [
          "Онлайн-оплата через Payme будет доступна после подключения магазина к платёжному сервису.",
          "Оплата через Click — в планах.",
          "Оплата наличными или при получении появится, только если магазин включит этот вариант.",
        ],
        pending: true,
      },
      {
        heading: "Безопасность",
        body: [
          "Данные карты вы вводите на странице платёжного сервиса. gremu не получает и не хранит номер карты, CVV и пароли.",
        ],
      },
      {
        heading: "Когда заказ считается оплаченным",
        body: [
          "Только после подтверждения от платёжного сервиса на наш сервер. Возврат на сайт после оплаты сам по себе не меняет статус заказа — дождитесь подтверждения.",
        ],
      },
    ],
  },
  returns: {
    title: "Возврат и гарантия",
    lead: "Условия возврата и гарантии публикуются после подтверждения магазином.",
    sections: [
      {
        heading: "Возврат",
        body: ["Сроки и порядок возврата будут опубликованы здесь. До этого уточните условия у менеджера до покупки."],
        pending: true,
      },
      {
        heading: "Гарантия",
        body: ["Гарантийные условия зависят от производителя детали и будут указаны в карточке товара после подтверждения."],
        pending: true,
      },
      {
        heading: "Как избежать возврата",
        body: [
          "Проверьте статус совместимости в карточке товара. Если стоит «Уточните у менеджера» — отправьте запрос до покупки, приложив модель, год и фото детали.",
        ],
      },
    ],
  },
  faq: {
    title: "Частые вопросы",
    lead: "Ответы на вопросы о подборе, заказе и оплате.",
    sections: [
      {
        heading: "Как узнать, подойдёт ли деталь?",
        body: ["Выберите автомобиль в подборе или введите OEM-номер. В карточке товара указан статус совместимости. «Подходит» ставится только после проверки."],
      },
      {
        heading: "Где найти OEM-номер?",
        body: ["На самой детали, в каталоге запчастей или в документах после ремонта. Если номер не читается, пришлите фото детали менеджеру."],
      },
      {
        heading: "Чем оригинал отличается от аналога?",
        body: ["Оригинал имеет номер производителя автомобиля. Аналог выпускает другой производитель для той же задачи — бренд и номер аналога указаны в карточке."],
      },
      {
        heading: "Вы официальный дилер Hyundai или Kia?",
        body: ["Нет. gremu — независимый магазин запчастей для автомобилей Hyundai и Kia."],
      },
      {
        heading: "Как оплатить и получить заказ?",
        body: ["Доступные способы показываются при оформлении. Подробности — на страницах «Доставка» и «Оплата»."],
      },
    ],
  },
};

const uz: Record<InfoSlug, InfoPage> = {
  delivery: {
    title: "Yetkazib berish va olib ketish",
    lead: "Buyurtmani qanday olish mumkin. Mavjud variantlar rasmiylashtirishda koʻrsatiladi — faqat doʻkon sozlaganlari.",
    sections: [
      {
        heading: "Olish usullari",
        body: ["Yetkazib berish va olib ketish usullari, ularning narxi va muddatlarini doʻkon belgilaydi. Ular tasdiqlangandan soʻng shu sahifada va buyurtma rasmiylashtirilayotganda paydo boʻladi."],
        pending: true,
      },
      {
        heading: "Hududlar",
        body: ["Buyurtmalar yetkaziladigan Oʻzbekiston shahar va viloyatlari doʻkon tasdiqlaganidan soʻng shu yerda koʻrsatiladi."],
        pending: true,
      },
      {
        heading: "Olib ketish",
        body: ["Olib ketish punkti manzili va ish vaqti tasdiqlangandan soʻng eʼlon qilinadi. Hozircha menejerdan aniqlang."],
        pending: true,
      },
      {
        heading: "Joʻnatishdan oldin",
        body: ["Menejer buyurtma tarkibi va qismlarning avtomobilingizga mosligini tasdiqlash uchun siz bilan bogʻlanishi mumkin."],
      },
    ],
  },
  payment: {
    title: "Toʻlov",
    lead: "Buyurtmani qanday toʻlash va toʻlov maʼlumotlaringiz bilan nima boʻlishi.",
    sections: [
      {
        heading: "Toʻlov usullari",
        body: [
          "Payme orqali onlayn toʻlov doʻkon toʻlov xizmatiga ulangandan soʻng mavjud boʻladi.",
          "Click orqali toʻlov — rejada.",
          "Naqd yoki qabul qilishda toʻlov faqat doʻkon bu variantni yoqsa paydo boʻladi.",
        ],
        pending: true,
      },
      {
        heading: "Xavfsizlik",
        body: ["Karta maʼlumotlarini toʻlov xizmati sahifasida kiritasiz. gremu karta raqami, CVV va parollarni olmaydi va saqlamaydi."],
      },
      {
        heading: "Buyurtma qachon toʻlangan hisoblanadi",
        body: ["Faqat toʻlov xizmatidan serverimizga tasdiq kelgandan soʻng. Toʻlovdan keyin saytga qaytish buyurtma holatini oʻzgartirmaydi — tasdiqni kuting."],
      },
    ],
  },
  returns: {
    title: "Qaytarish va kafolat",
    lead: "Qaytarish va kafolat shartlari doʻkon tasdiqlaganidan soʻng eʼlon qilinadi.",
    sections: [
      {
        heading: "Qaytarish",
        body: ["Qaytarish muddatlari va tartibi shu yerda eʼlon qilinadi. Hozircha xariddan oldin shartlarni menejerdan aniqlang."],
        pending: true,
      },
      {
        heading: "Kafolat",
        body: ["Kafolat shartlari qism ishlab chiqaruvchisiga bogʻliq va tasdiqlangandan soʻng mahsulot kartochkasida koʻrsatiladi."],
        pending: true,
      },
      {
        heading: "Qaytarishdan qanday qochish mumkin",
        body: ["Mahsulot kartochkasidagi moslik holatini tekshiring. «Menejerdan aniqlang» boʻlsa — xariddan oldin model, yil va qism fotosi bilan soʻrov yuboring."],
      },
    ],
  },
  faq: {
    title: "Koʻp beriladigan savollar",
    lead: "Tanlash, buyurtma va toʻlov haqidagi savollarga javoblar.",
    sections: [
      {
        heading: "Qism mos kelishini qanday bilsam boʻladi?",
        body: ["Tanlovda avtomobilni belgilang yoki OEM-raqamni kiriting. Mahsulot kartochkasida moslik holati koʻrsatilgan. «Mos keladi» faqat tekshiruvdan soʻng qoʻyiladi."],
      },
      {
        heading: "OEM-raqamni qayerdan topsam boʻladi?",
        body: ["Qismning oʻzida, ehtiyot qismlar katalogida yoki taʼmirdan keyingi hujjatlarda. Raqam oʻqilmasa, qism fotosini menejerga yuboring."],
      },
      {
        heading: "Original analogdan nimasi bilan farq qiladi?",
        body: ["Original avtomobil ishlab chiqaruvchisi raqamiga ega. Analogni boshqa ishlab chiqaruvchi xuddi shu vazifa uchun chiqaradi — analog brendi va raqami kartochkada koʻrsatilgan."],
      },
      {
        heading: "Siz Hyundai yoki Kia rasmiy dileri hisoblanasizmi?",
        body: ["Yoʻq. gremu — Hyundai va Kia avtomobillari uchun mustaqil ehtiyot qismlar doʻkoni."],
      },
      {
        heading: "Buyurtmani qanday toʻlash va olish mumkin?",
        body: ["Mavjud usullar rasmiylashtirishda koʻrsatiladi. Batafsil — «Yetkazib berish» va «Toʻlov» sahifalarida."],
      },
    ],
  },
};

export function getInfoPage(locale: Locale, slug: InfoSlug): InfoPage {
  return (locale === "uz" ? uz : ru)[slug];
}

export const PENDING_LABEL: Record<Locale, string> = {
  ru: "Условия уточняются магазином",
  uz: "Shartlar doʻkon tomonidan aniqlanmoqda",
};
