const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.DOCS_PORT || 3100;

app.use(express.static(path.join(__dirname, 'docs')));

app.get('*', (req, res) => {
    res.render('docs/index.html');
});

// Start up the Node server
app.listen(PORT, () => {
    console.log(`Node Express server listening on http://localhost:${PORT}`);
});
