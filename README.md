# Study Nano

Study Nano is a local, interactive study website for the nanotechnology and nanoelectronics syllabus. It turns the full exam-focused notes into a searchable chapter reader and includes original topic diagrams, saved chapters, completion tracking, adjustable reading text, focus mode, and a 12-question recall lab.

## Run the website

1. Install Node.js if it is not already available.
2. Double-click `start.bat`, or run `node server.js` from this folder.
3. Open `http://127.0.0.1:4177` in a browser.
4. Stop the local server with `Ctrl+C`.

Progress, bookmarks, and reading-size preferences are stored in this browser only. The notes and diagrams remain local files. MathJax and IBM Plex fonts load from their public CDNs when an internet connection is available; the rest of the site works locally.

The underlying course content is in `NANOTECHNOLOGY_EXAM_NOTES.md`; the website reads it at runtime, so edits to the notes appear on refresh.
