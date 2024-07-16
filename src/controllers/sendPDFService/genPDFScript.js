const puppeteer = require('puppeteer');
const axios = require('axios');

async function exportPDF() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(`<!DOCTYPE html>
        <html>
        <head>
            <title>PDF</title>
        </head>
        <body>
            <h1>PDF</h1>
            <p>aa</p>
        </body>
        </html>`);
        await page.pdf({ path: 'output.pdf', format: 'A4' });
        await browser.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

exportPDF().catch(console.error);
