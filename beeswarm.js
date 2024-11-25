import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

async function readCSV(filePath) {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
}

async function generateBeeswarmChart() {
    const browser = await puppeteer.launch({
        headless: false,
    });

    try {

        // Adjust the file path according to your data location
        const filePath = path.resolve('data/beeswarm/data.csv');
        const data = await readCSV(filePath);

        //console.log('Data loaded from CSV:', data);

        const page = await browser.newPage();
        page.on('console', (msg) => console.log('Browser console:', msg.text()));
        page.on('pageerror', (err) => console.error('Page error:', err));

        // Set up the basic HTML structure
        await page.setContent(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>RAWGraphs Beeswarm Chart</title>
                </head>
                <body>
                    <div id="chart"></div>
                </body>
            </html>
        `);

          

        // Load RAWGraphs and create the chart
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

                    // Mapping for beeswarm chart
                    // Adjust these fields according to your CSV column names
                    const mapping = {
                        xValue: { value: ['sentiment_vader'] }, // Horizontal placement based on sentiment
                        series: { value: ['topic_nmf'] },      // Group points by topic
                        color: { value: ['topic_nmf'] },       // Color coding by topic
                        size: { value: ['likes'] },            // Size of points based on likes
                    };


                    const chartContainer = document.getElementById('chart');
                    if (!chartContainer) throw new Error('Chart container not found');

                    data.forEach((d) => {
                        d.likes = parseFloat(d.likes) || 0; // Convert likes to number
                        d.sentiment_vader = parseFloat(d.sentiment_vader) || 0; // Convert sentiment to number
                    });

                    // Create beeswarm chart
                    const viz = raw.chart(rawcharts.beeswarm, {
                        data: data,
                        mapping: mapping,
                        options: {
                            width: 800,
                            height: 600,
                            margin: { top: 50, right: 50, bottom: 50, left: 100 },                           
                            padding: 1,                    // Space between points
                            orientation: 'horizontal',     // 'horizontal' or 'vertical'
                            showLabels: false              // Show/hide labels
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
            data
        );

        if (!loaded.success) {
            throw new Error(`Failed to generate chart: ${loaded.error}`);
        }

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
                    const outputPath = path.resolve('charts/beeswarm_chart.svg');
                    await fs.promises.writeFile(outputPath, formattedSVG);
                    console.log(`SVG saved to ${outputPath}`);
                } catch (error) {
                    console.error('Error writing SVG to file:', error);
                }
            } else {
                console.error('No SVG content found');
            }
        }
    } catch (error) {
        console.error('Error generating chart:', error);
    } finally {
        await browser.close();
    }
}

// Execute the function
generateBeeswarmChart().catch(console.error);