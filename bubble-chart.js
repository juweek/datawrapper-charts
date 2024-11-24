import puppeteer from 'puppeteer';

async function generateChart() {
    // browser is created here
    const browser = await puppeteer.launch({
        headless: false
    });

    try {
        const page = await browser.newPage();
        page.on('console', msg => console.log('Browser console:', msg.text()));
        page.on('pageerror', err => console.error('Page error:', err));

        // Set proper HTML content first
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

        const loaded = await page.evaluate(async () => {
            function loadScript(src) {
                return new Promise((resolve, reject) => {
                    console.log(`Starting to load: ${src}`);
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = () => {
                        console.log(`Successfully loaded: ${src}`);
                        resolve(true);
                    };
                    script.onerror = (e) => {
                        console.error(`Failed to load ${src}`, e);
                        reject(new Error(`Failed to load ${src}`));
                    };
                    document.head.appendChild(script);
                });
            }

            try {
                // Load core first
                await loadScript('https://cdn.jsdelivr.net/npm/@rawgraphs/rawgraphs-core');

                const rawRelatedKeys = Object.keys(window).filter(key =>
                    key.toLowerCase().includes('raw'));
                console.log('Raw-related keys after loading core:', rawRelatedKeys);

                await new Promise(resolve => setTimeout(resolve, 500));


                // Load charts
                await loadScript('https://cdn.jsdelivr.net/npm/@rawgraphs/rawgraphs-charts');

                const allRelevantKeys = Object.keys(window).filter(key =>
                    key.toLowerCase().includes('raw') ||
                    key.toLowerCase().includes('chart'));
                console.log('All relevant keys after loading charts:', allRelevantKeys);

                if (document.readyState !== 'complete') {
                    await new Promise(resolve => {
                        document.addEventListener('DOMContentLoaded', resolve);
                    });
                }

                // Sample data
                const data = [
                    { age: 10, height: 130, group: 'A' },
                    { age: 18, height: 170, group: 'A' },
                    { age: 15, height: 150, group: 'B' },
                    { age: 20, height: 180, group: 'B' }
                ];

                // Define mapping
                const mapping = {
                    x: { value: 'age' },
                    y: { value: 'height' },
                    size: { value: 'age' },
                    color: { value: 'group' }
                };

                // Get the chart container
                const chartContainer = document.getElementById('chart');
                if (!chartContainer) {
                    throw new Error('Chart container not found');
                }

                const viz = raw.chart(rawcharts.bubblechart, {
                    data: data,
                    mapping: mapping,
                    options: {
                        width: chartContainer.offsetWidth,
                        height: chartContainer.offsetHeight,
                        margin: { top: 50, right: 50, bottom: 50, left: 50 }
                    }
                });

                // Render directly to the container element
                viz.renderToDOM(chartContainer);

                  // Get SVG content
        const svgElement = document.querySelector('#chart svg');
        if (!svgElement) {
            throw new Error('SVG element not found');
        }

                return {
                    success: true,
            svg: svgElement.outerHTML
                };

            } catch (error) {
                console.error('Error in script loading:', error);
                return false;
            }

        });

        // Write SVG to file if chart was created successfully
        let svgContent;
        if (loaded && loaded.success) {
            try {
                svgContent = await page.evaluate(() => {
                    const svg = document.querySelector('#chart svg');
                    if (!svg) return null;
        
                    // Get the original SVG content
                    let svgString = svg.outerHTML;
        
                    // Add XML declaration and namespace
                    const formattedSVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
        <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
        <svg 
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            version="1.1"
            ${svgString.slice(4)}`; // Remove original <svg and keep the rest
        
                    return formattedSVG;
                });
        
                if (svgContent) {
                    const fs = await import('fs/promises');
                    await fs.writeFile('chart.svg', svgContent);
                    console.log('SVG saved to chart.svg');
                } else {
                    console.error('No SVG content found');
                }
            } catch (error) {
                console.error('Error extracting SVG:', error);
            }
        } else {
            console.error('Chart creation failed:', loaded?.error || 'unknown error');
        }

        // Keep browser open to see what's happening
        await new Promise(resolve => setTimeout(resolve, 10000));


    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

// Run the function
generateChart().catch(console.error);