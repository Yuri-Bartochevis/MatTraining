# Mat Strength

A strength training log for Brazilian jiu-jitsu athletes. It runs a 4-day gym program built to sit alongside 5 BJJ sessions a week, times your rest, tracks every set, and warns you when your weekly load gets too high.

It's a web app you install on your phone's home screen. No account, no server, no tracking: your data stays on your device.

## Features

- **4-day program**: two hard days and two light days, preloaded. See [PROGRAM.md](PROGRAM.md).
- **Set logging**: kg and reps, kg and meters for carries, seconds for holds. Last session's weights are prefilled.
- **Rest timer**: starts when you check off a set, using each exercise's rest time, and beeps when rest is over.
- **Timers**: stopwatch with laps, rest presets, and an interval timer for neck and grip work. Holds have a built-in Hold button.
- **Workout clock**: every session is timed, and the screen stays awake during a workout (iOS 16.4+).
- **7-week blocks**: the belt bar fills a stripe per week and shows how many reps to stop short of failure. Week 8 is a deload with fewer sets and 20% less weight.
- **Weekly load**: log BJJ (hard or drilling) and CrossFit in one tap, edit or delete with undo, and get warnings past 4 lifting days.
- **Progress**: estimated 1RM trends per exercise, an 8-week load chart, and bench, squat and deadlift compared with bodyweight targets.
- **Bodyweight log** with a trend chart.
- **Backups**: export to a JSON file and import it back.
- **Works offline** after the first load.


## Customizing the program

Edit `program.js`. Each exercise has a name, a type, a number of sets, a target shown on screen, and a rest time in seconds.

| Type | Logs |
|---|---|
| `wr` | kg and reps |
| `r` | reps, with optional added kg |
| `dist` | kg and meters |
| `time` | seconds |

Keep each exercise's `id` the same after you've logged it, because your history is linked to it. To add an exercise, give it a new id.

## Your data

- Everything is stored in the browser's local storage on your device, under the key `mat-strength-v1`. Nothing is sent anywhere.
- Deleting the home screen icon or clearing Safari's website data erases it. Export a backup from **Body → Backup** every week or two.
- Each web address has its own storage. If you move the app to a new URL, export from the old one and import into the new one.

## Releasing an update

1. Make your changes.
2. Bump `APP_VERSION` in `app.js` and `CACHE` in `sw.js` to the same new version.
3. Add an entry to `CHANGELOG.md`.
4. Commit. GitHub Pages redeploys automatically, and phones pick up the new version the next time the app opens online.

## Disclaimer

This app is a training log, not medical advice. The program is a general template drawn from public coaching sources. Adjust it to your injuries and recovery, and talk to a qualified coach or doctor if something hurts.

## License

[MIT](LICENSE)
