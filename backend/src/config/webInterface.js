// Web Interface Configuration
// Sets up EJS templating and static file serving for the web interface

const path = require('path');
const express = require('express');

function setupWebInterface(app) {
    // Set up EJS as the templating engine
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));
    
    // Serve static files (CSS, JS, images)
    app.use('/css', express.static(path.join(__dirname, '../../public/css')));
    app.use('/js', express.static(path.join(__dirname, '../../public/js')));
    app.use('/images', express.static(path.join(__dirname, '../../public/images')));
    
    // Make the layout system work with EJS
    app.use((req, res, next) => {
        // Set up layout rendering helper
        const originalRender = res.render;
        res.render = function(view, options = {}) {
            // Default layout is 'main'
            const layout = options.layout !== false ? (options.layout || 'layouts/main') : false;
            
            if (layout) {
                // Render the view into a variable
                app.render(view, options, (err, html) => {
                    if (err) return next(err);
                    
                    // Render the layout with the view content
                    options.body = html;
                    originalRender.call(res, layout, options);
                });
            } else {
                // Render without layout
                originalRender.call(res, view, options);
            }
        };
        next();
    });

    console.log('✨ Web interface configured with EJS templates');
}

module.exports = { setupWebInterface };