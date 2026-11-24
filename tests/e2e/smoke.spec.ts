import { expect, test } from "@playwright/test";

/** Smoke: the paths a customer must always be able to complete. */

test("search → product → cart → checkout → order confirmation", async ({ page }) => {
  await page.goto("/ru/search?q=GR-DEMO-001");
  await page.getByRole("link", { name: /Фильтр масляный/ }).first().click();
  await expect(page).toHaveURL(/\/ru\/products\//);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Фильтр масляный");

  await page.getByRole("button", { name: "В корзину" }).first().click();
  await expect(page.getByRole("button", { name: /Добавлено/ }).first()).toBeVisible();

  await page.goto("/ru/cart");
  const toCheckout = page.getByRole("link", { name: "Оформить заказ" });
  await expect(toCheckout).not.toHaveAttribute("aria-disabled", "true");
  await toCheckout.click();
  await expect(page).toHaveURL(/\/ru\/checkout/);

  await page.getByLabel("Имя").fill("E2E Покупатель");
  await page.getByLabel("Телефон").fill("+998 90 000 00 01");
  await page.getByLabel("Регион").selectOption("tashkent_city");
  await page.getByLabel(/Город/).fill("Ташкент");
  await page.getByLabel(/Адрес|Улица/).first().fill("E2E, тестовая улица 1");
  await page.getByRole("checkbox", { name: /Согласен|согласие/i }).check();
  await page.getByRole("button", { name: "Подтвердить заказ" }).click();

  await expect(page).toHaveURL(/\/ru\/order\/GR-\d{6}-[A-Z0-9]{4}\?t=/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Заказ оформлен");
  await expect(page.getByText(/демо-товары/)).toBeVisible();
});

test("customer sign-in goes to Google (or says it is not configured)", async ({ page }) => {
  await page.goto("/ru/account/orders");
  await expect(page).toHaveURL(/\/ru\/account\/login\?next=/);
  const google = page.getByRole("link", { name: "Войти через Google" });
  if (await google.count()) {
    const [request] = await Promise.all([page.waitForRequest((r) => r.url().startsWith("https://accounts.google.com/")), google.click()]);
    const url = new URL(request.url());
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("redirect_uri")).toMatch(/\/api\/auth\/google\/callback$/);
  } else {
    await expect(page.getByText(/ещё не подключён/)).toBeVisible();
  }
});

test("manager inquiry from the contact form", async ({ page }) => {
  await page.goto("/ru/contact?topic=fitment");
  await page.getByLabel("Имя").fill("E2E Обращение");
  await page.getByLabel("Телефон").fill("+998 90 000 00 02");
  await page.getByLabel("Марка").selectOption("kia");
  await page.getByLabel("Модель").selectOption("Rio");
  await page.getByLabel("Год").selectOption("2019");
  await page.getByLabel("Сообщение").fill("E2E: нужен воздушный фильтр, проверьте совместимость");
  await page.getByRole("checkbox", { name: /Согласен/ }).check();
  await page.getByRole("button", { name: "Отправить" }).click();
  await expect(page.getByRole("status")).toContainText(/INQ-[A-Z0-9]+-[A-Z0-9]+/);
});

test("404 page and keyboard skip link", async ({ page }) => {
  await page.goto("/ru/products/this-part-does-not-exist");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/не найден/i).first()).toBeVisible();
  await page.goto("/ru");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Перейти к содержимому" })).toBeFocused();
});
