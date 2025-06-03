const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  //console.log(`Incoming request: ${req.method} ${req.url}`);

  if (req.method === 'GET') {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const pathname = urlObj.pathname;

    if (pathname === '/download') {
      const videoUrl = urlObj.searchParams.get('url');

      if (!videoUrl || !videoUrl.includes('bilibili')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid Bilibili URL' }));
      }

      const titleProc = spawn('yt-dlp', ['--get-title', videoUrl]);
      let title = '';

      titleProc.stdout.on('data', data => (title += data.toString()));

      titleProc.on('close', () => {
        const safeTitle = title.trim().replace(/[^a-zA-Z0-9- ]/g, '').replace(/ /g, '');
        const filename = `${safeTitle || 'bilibili_video'}.mp4`;

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
        });

        const ytdlp = spawn('yt-dlp', ['-o', '-', videoUrl]);
        ytdlp.stdout.pipe(res);
        ytdlp.stderr.on('data', d => console.error('yt-dlp error:', d.toString()));
        ytdlp.on('close', () => res.end());
      });

    } else if (pathname === '/info') {
      const videoUrl = urlObj.searchParams.get('url');

      if (!videoUrl || !videoUrl.includes('bilibili')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid Bilibili URL' }));
      }

      const infoCmd = spawn('yt-dlp', [
        '--print', '%(title)s||%(ext)s||%(filesize_approx)s||%(duration)s',
        videoUrl
      ]);

      let output = '';
      infoCmd.stdout.on('data', data => output += data.toString());
      infoCmd.stderr.on('data', err => console.error('yt-dlp info error:', err.toString()));

      infoCmd.on('close', () => {
        const [title, ext, size, duration] = output.trim().split('||');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          title: title || 'Unknown',
          format: ext || 'unknown',
          size: size ? `${(Number(size) / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
          duration: duration ? `${(Number(duration) / 60).toFixed(1)} min` : 'Unknown',
        }));
      });

    } else {
      const filePath = pathname === '/' ? '/public/index.html' : '/public' + pathname;
      const fullPath = path.join(__dirname, filePath);
      const ext = path.extname(filePath).slice(1);

      const contentType = {
        html: 'text/html',
        css: 'text/css',
        js: 'application/javascript',
      }[ext] || 'text/plain';

      fs.readFile(fullPath, (err, content) => {
        if (err) {
          console.error('File read error:', err);
          res.writeHead(404);
          return res.end('Not Found');
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    }

  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});