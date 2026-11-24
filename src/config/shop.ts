/**
 * Shop settings the owner controls. Only options listed here are offered at checkout.
 * Until the owner confirms real delivery/payment options, a single honest option is
 * enabled: the manager calls to agree delivery and payment. No fees or deadlines are invented.
 */
export const DELIVERY_METHODS = [
  {
    code: "agree_with_manager",
    feeMinor: null as number | null, // null = agreed with the manager, not added to the total
    needsAddress: true,
    label: { ru: "Согласовать с менеджером", uz: "Menejer bilan kelishish" },
    hint: {
      ru: "Менеджер свяжется, подтвердит заказ и согласует способ и стоимость доставки или самовывоз.",
      uz: "Menejer bogʻlanib, buyurtmani tasdiqlaydi va yetkazib berish usuli va narxini yoki olib ketishni kelishadi.",
    },
  },
] as const;

/**
 * `provider: null` methods are always offered. Online methods are offered only while their
 * provider adapter reports isConfigured() on the server (see src/features/payments).
 */
export const PAYMENT_METHODS = [
  {
    code: "after_confirmation",
    provider: null,
    label: { ru: "Оплата после подтверждения", uz: "Tasdiqlangandan soʻng toʻlov" },
    hint: {
      ru: "Менеджер подтвердит заказ и согласует с вами способ оплаты.",
      uz: "Menejer buyurtmani tasdiqlaydi va siz bilan toʻlov usulini kelishadi.",
    },
  },
  {
    code: "payme",
    provider: "payme",
    label: { ru: "Онлайн-оплата через Payme", uz: "Payme orqali onlayn toʻlov" },
    hint: {
      ru: "После оформления откроется страница оплаты Payme. Заказ считается оплаченным, только когда Payme подтвердит платёж.",
      uz: "Rasmiylashtirgandan soʻng Payme toʻlov sahifasi ochiladi. Buyurtma faqat Payme toʻlovni tasdiqlagandan soʻng toʻlangan hisoblanadi.",
    },
  },
] as const;

export type DeliveryCode = (typeof DELIVERY_METHODS)[number]["code"];
export type PaymentCode = (typeof PAYMENT_METHODS)[number]["code"];

/** Regions of Uzbekistan for the address form. */
export const REGIONS = [
  { code: "tashkent_city", ru: "Ташкент (город)", uz: "Toshkent shahri" },
  { code: "tashkent", ru: "Ташкентская область", uz: "Toshkent viloyati" },
  { code: "andijan", ru: "Андижанская область", uz: "Andijon viloyati" },
  { code: "bukhara", ru: "Бухарская область", uz: "Buxoro viloyati" },
  { code: "fergana", ru: "Ферганская область", uz: "Fargʻona viloyati" },
  { code: "jizzakh", ru: "Джизакская область", uz: "Jizzax viloyati" },
  { code: "kashkadarya", ru: "Кашкадарьинская область", uz: "Qashqadaryo viloyati" },
  { code: "khorezm", ru: "Хорезмская область", uz: "Xorazm viloyati" },
  { code: "namangan", ru: "Наманганская область", uz: "Namangan viloyati" },
  { code: "navoi", ru: "Навоийская область", uz: "Navoiy viloyati" },
  { code: "samarkand", ru: "Самаркандская область", uz: "Samarqand viloyati" },
  { code: "surkhandarya", ru: "Сурхандарьинская область", uz: "Surxondaryo viloyati" },
  { code: "syrdarya", ru: "Сырдарьинская область", uz: "Sirdaryo viloyati" },
  { code: "karakalpakstan", ru: "Республика Каракалпакстан", uz: "Qoraqalpogʻiston Respublikasi" },
] as const;

export type RegionCode = (typeof REGIONS)[number]["code"];
