const http = require('http');
const fs = require('fs');
const path = require('path');
const youtubedl = require('youtube-dl-exec');
const { URL } = require('url');
const PORT = process.env.PORT || 10000;

const server = http.createServer(async (req, res) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);

  if (req.method === 'GET') {
    if (req.url.startsWith('/download?')) {
      const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
      const videoUrl = urlParams.get('url');

      if (!videoUrl || !videoUrl.includes('bilibili')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid Bilibili URL' }));
      }

      try {
        // Get video info
        const info = await youtubedl(videoUrl, {
          dumpSingleJson: true,
          noWarnings: true,
          noCallHome: true,
          noCheckCertificate: true,
        });

        const safeTitle = (info.title || 'bilibili_video').replace(/[^a-zA-Z0-9- ]/g, '').replace(/ /g, '');
        const filename = `${safeTitle}.mp4`;

        // Set headers for file download
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
        });

        // Stream the video content to response
        const videoStream = youtubedl(videoUrl, {
          format: 'best',
          output: '-', // stdout
        });

        videoStream.stdout.pipe(res);

        videoStream.stderr.on('data', data => {
          console.error('yt-dlp error:', data.toString());
        });

        videoStream.on('close', () => {
          res.end();
        });
      } catch (err) {
        console.error('Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to download video' }));
      }

    } else {
      // Serve static files
      const filePath = req.url === '/' ? '/public/index.html' : '/public' + req.url;
      const fullPath = path.join(__dirname, filePath);
      console.log(`Serving file: ${fullPath}`);

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
    res.writeHead(405);
    res.end('Method Not Allowed');
  }
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
