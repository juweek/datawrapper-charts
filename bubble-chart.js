import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

async function readCSV(filePath) {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath) // Use the standard 'fs' module here
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
}



async function generateChart() {
    const browser = await puppeteer.launch({
        headless: false,
    });

    try {
        const filePath = path.resolve('data/bubblechart/data.csv');
        const data = await readCSV(filePath);

        console.log('Data loaded from CSV:', data);

        const page = await browser.newPage();
        page.on('console', (msg) => console.log('Browser console:', msg.text()));
        page.on('pageerror', (err) => console.error('Page error:', err));

        await page.setContent(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>RAWGraphs Chart</title>
                </head>
                <body>
                    <div id="chart"></div>
                </body>
            </html>
        `);

        const loaded = await page.evaluate(
            async (data) => {
                function loadScript(src) {
                    return new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = src;
                        script.onload = () => resolve(true);
                        script.onerror = (e) => reject(new Error(`Failed to load ${src}`));
                        document.head.appendChild(script);
                    });
                }

                try {
                    await loadScript('https://cdn.jsdelivr.net/npm/@rawgraphs/rawgraphs-core');
                    await loadScript('https://cdn.jsdelivr.net/npm/@rawgraphs/rawgraphs-charts');

                    const mapping = {
                        x: { value: 'size' },   // Use 'size' for the x-axis
                        y: { value: 'price' },  // Use 'price' for the y-axis
                        size: { value: 'size' }, // Use 'size' for bubble size
                        color: { value: 'cat' }, // Use 'cat' for grouping (colors)
                        series: { value: 'cat' } // Use 'cat' for grouping (colors)
                    };

                    const chartContainer = document.getElementById('chart');
                    if (!chartContainer) throw new Error('Chart container not found');

                    const viz = raw.chart(rawcharts.bubblechart, {
                        data: data,
                        mapping: mapping,
                        options: {
                            width: 800,
                            height: 600,
                            margin: { top: 50, right: 50, bottom: 50, left: 50 },
                        },
                    });

                    viz.renderToDOM(chartContainer);

                    const svgElement = document.querySelector('#chart svg');
                    if (!svgElement) throw new Error('SVG element not found');

                    return {
                        success: true,
                        svg: svgElement.outerHTML,
                    };
                } catch (error) {
                    console.error('Error in script loading:', error);
                    return { success: false, error: error.message };
                }
            },
            data // Pass the data to the browser context
        );

        if (loaded && loaded.success) {
            const svgContent = loaded.svg;
        
            if (svgContent) {
                try {
                    // Add XML declaration and namespaces
                    const formattedSVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">
        ${svgContent.replace(/<svg[^>]*>/, '').replace('</svg>', '')}
        </svg>`;
        
                    // Save to file
                    const outputPath = path.resolve('charts/bubblechart.svg');
                    await fs.promises.writeFile(outputPath, formattedSVG);
                    console.log(`SVG saved to ${outputPath}`);
                } catch (error) {
                    console.error('Error writing SVG to file:', error);
                }
            } else {
                console.error('No SVG content found');
            }
        } else {
            console.error('Chart creation failed:', loaded?.error || 'unknown error');
        }

        await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

// Run the function
generateChart().catch(console.error);