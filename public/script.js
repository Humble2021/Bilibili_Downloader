const form = document.getElementById('downloadForm');
const videoUrlInput = document.getElementById('videoUrl');
const status = document.getElementById('status');

const videoInfoPanel = document.getElementById('videoInfo');
const infoTitle = document.getElementById('infoTitle');
const infoFormat = document.getElementById('infoFormat');
const infoSize = document.getElementById('infoSize');
const infoTime = document.getElementById('infoTime');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = videoUrlInput.value.trim();
  if (!url) return;

  status.textContent = 'Preparing your download...';

  videoInfoPanel.style.display = 'none';

  try {
    const res = await fetch(`/info?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('Could not fetch video info');
    const info = await res.json();

    infoTitle.textContent = info.title || '-';
    infoFormat.textContent = info.format || '-';
    infoSize.textContent = info.size || '-';
    infoTime.textContent = info.duration || '-';

    videoInfoPanel.style.display = 'block';

    status.textContent = 'Download starting...';

    const link = document.createElement('a');
    link.href = `/download?url=${encodeURIComponent(url)}`;
    link.click();
  } catch (err) {
    status.textContent = 'Failed to get video info or start download.';
    console.error(err);
  }
});
