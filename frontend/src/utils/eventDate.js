const DUTCH_MONTHS = { 'januari':0,'februari':1,'maart':2,'april':3,'mei':4,'juni':5,'juli':6,'augustus':7,'september':8,'oktober':9,'november':10,'december':11 };

export function parseEventDate(dateStr, timeStr = '00:00') {
  if (!dateStr) return null;
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    return new Date(y, mo - 1, d, h || 0, m || 0);
  }
  const p = dateStr.trim().split(' ');
  if (p.length < 3) return null;
  const month = DUTCH_MONTHS[p[1]?.toLowerCase()];
  if (month === undefined) return null;
  return new Date(parseInt(p[2]), month, parseInt(p[0]), h || 0, m || 0);
}

export function formatEventDate(dateStr) {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return dateStr;
}

function toICSDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

export function downloadICS(post) {
  const start = parseEventDate(post.event_date, post.event_time);
  if (!start) return;
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Streetfeed//NL',
    'BEGIN:VEVENT',
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${post.title}`,
    `DESCRIPTION:${(post.body||'').replace(/\n/g,'\\n')}`,
    `LOCATION:${post.event_location||''}`,
    'END:VEVENT','END:VCALENDAR',
  ].join('\r\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })),
    download: 'evenement.ics',
  });
  a.click();
}

export function googleCalendarUrl(post) {
  const start = parseEventDate(post.event_date, post.event_time);
  if (!start) return '#';
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const fmt = d => d.toISOString().replace(/[-:.]/g,'').slice(0,15);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(post.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(post.body||'')}&location=${encodeURIComponent(post.event_location||'')}`;
}
