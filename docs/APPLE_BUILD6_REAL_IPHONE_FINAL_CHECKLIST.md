# Tabyan Build 6 — Real iPhone Final Checklist

Use this card while recording the Apple review video. Replace every `—` with
the result and timestamp. Do not mark PASS from Simulator, Expo web, or Metro.

| Test | Action | Expected result | PASS / FAIL | Video timestamp |
|---|---|---|---|---|
| Launch | Open Tabyan from the physical iPhone Home Screen | App opens without crash or diagnostic placeholder | — | — |
| Registration | Open registration and submit valid test data | Validation and registration work | — | — |
| Login | Sign in with review account | User reaches the correct role home | — | — |
| Session restore | Close/reopen app | Valid session restores without obsolete OTP | — | — |
| Home | Navigate home and main sections | Navigation is complete and truthful | — | — |
| Mushaf | Open Mushaf and render pages 1, middle page, 604 | QCF pages render correctly | — | — |
| Mushaf zoom | Pinch/zoom or use available zoom control | Text remains usable and page does not crash | — | — |
| Placement | Open placement test | Permission explanation and recorder appear | — | — |
| Camera | Grant camera permission at placement | Camera preview and recording work | — | — |
| Microphone | Grant mic permission at placement/recitation | Audio is captured or truthful error appears | — | — |
| Placement preview | Stop recording and play preview | Recorded video plays locally | — | — |
| Placement retry | Delete recording and record again | Retry path resets safely | — | — |
| Placement upload | Submit final recording | Upload, finalize, and success reflect real server result | — | — |
| Review playback | Open as teacher/supervisor | Uploaded video actually plays | — | — |
| Recitation | Start live recitation if exposed | WebSocket/audio session starts truthfully | — | — |
| Recitation controls | Partial/final result, reveal, pause, resume, end, cancel | Each control updates server/client state correctly | — | — |
| Prayer | Open prayer times and allow location | Timings load for device location | — | — |
| Qibla | Open Qibla and allow location | Direction is calculated and explained | — | — |
| Location denied | Deny location in Prayer/Qibla | Clear fallback; no crash/dead end | — | — |
| Notifications | Open notification screen and test configured behavior | State is truthful; no fake delivery claim | — | — |
| Account deletion | Account → Settings → type `حذف حسابي` | Server deletes account and session returns to login | — | — |
| Delete failure | Use controlled network/server failure if safe | Error shown; no false success | — | — |
| Logout | Sign out and reopen protected route | Login is required again | — | — |
| Review account login | Repeat with every required role | Each dedicated account works without OTP/manual approval | — | — |