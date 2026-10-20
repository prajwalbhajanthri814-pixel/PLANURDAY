# Daymark static site

Daymark is a flexible planner for daily tasks, reminders, journal check-ins, and progress insights. This edition is a static website: it does not require a Python server, database, login, or `start-daymark.bat`.

## Publish the website

Upload the files in this folder to a static website host. Keep the HTML pages, JavaScript, CSS, images, icon, and web manifest together in the same folder. Set `index.html` as the home page. GitHub Pages and most college website portals can serve these files as a static site.

Open the published HTTPS site, then select **Start planning**. No account is needed.

## How saving works

Daymark automatically stores tasks, completed-task history, journal entries, your display name, and preferences in this browser on this device. They remain when you leave and return using the same browser and website address.

This is browser storage, not an online account. Data does not sync to other devices or browsers. Clearing the browser’s site data can erase it. Use **Profile → Download a backup** to keep a copy, or choose **Restore a backup** there to bring one back. The journal is stored locally in the browser and is not encrypted by this app, so avoid writing highly sensitive information.

## Pages

- `index.html` — Daymark introduction, saving details, planning tips, and a link into the planner
- `dashboard.html` — today’s schedule and weekly progress
- `planner.html` — day, week, and month schedule views
- `insights.html` — completed-task bar chart and task-category chart
- `journal.html` — daily reflections saved in this browser
- `profile.html` — display name, personal planning preferences, backup download, and data clearing

## Reminders and suggestions

In-app reminders can appear while Daymark is open. Browser notifications require a supported browser, HTTPS, and permission; background or lock-screen delivery is not guaranteed by this static edition. Suggestions use the preferences and completed-task patterns you choose. They do not vary by gender and are not medical or scientific advice.

## Credit

Created by Prajwal with development assistance from OpenAI Codex.
