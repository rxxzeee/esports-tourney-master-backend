const http = require('http');

const server = http.createServer((req, res) =>{
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>Hello World!</h1><p>Simple server with Node.js>/p>');
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log('Server is started on http://localhost:${PORT}');
})
