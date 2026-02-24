import { Actor } from 'apify';
import playwright from 'playwright';

await Actor.init();

const input = await Actor.getInput();
const { name } = input;

if (!name) throw new Error('Name is required');

const browser = await playwright.chromium.launch({
    headless: true,
});

const context = await browser.newContext();
const page = await context.newPage();

try {
    await page.goto(
        'https://inmate-search.cobbsheriff.org/enter_name.shtm',
        { waitUntil: 'domcontentloaded', timeout: 60000 }
    );

    await page.fill('input[name="inmate_name"]', name);

    await page.selectOption('select[name="qry"]', {
        label: 'Inquiry'
    });

    await page.waitForTimeout(500);

    await Promise.all([
        page.click('input[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'domcontentloaded' })
    ]);

    await Promise.all([
        page.click('text=Last Known Booking'),
        page.waitForNavigation({ waitUntil: 'domcontentloaded' })
    ]);

    const bookingData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('table tr'));
        const data = {};

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 2) {
                const key = cells[0].innerText.trim();
                const value = cells[1].innerText.trim();
                if (key && value) {
                    data[key] = value;
                }
            }
        });

        return data;
    });

    await Actor.pushData({
        found: true,
        data: bookingData
    });

} catch (error) {
    await Actor.pushData({
        found: false,
        error: error.message
    });
}

await browser.close();
await Actor.exit();
